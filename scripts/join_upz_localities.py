#!/usr/bin/env python3
"""Join Bogotá UPZ polygons to localities by maximum projected intersection area.

Input UPZ source: ArcGIS JSON in EPSG:4686.
Input localities: GeoJSON in EPSG:4326 (RFC 7946 default).
Outputs: RFC 7946 GeoJSON enriched with locality fields and a CSV crosswalk.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any

from pyproj import Transformer
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.ops import transform, unary_union
from shapely.validation import make_valid


def ring_signed_area(ring: list[list[float]]) -> float:
    return sum(
        ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
        for i in range(len(ring) - 1)
    ) / 2


def arcgis_rings_to_geometry(rings: list[list[list[float]]]):
    """Build polygon(s) from Esri rings (clockwise shells, CCW holes)."""
    shells: list[Polygon] = []
    holes: list[Polygon] = []
    for ring in rings:
        polygon = Polygon(ring)
        if polygon.is_empty or polygon.area == 0:
            continue
        if ring_signed_area(ring) < 0:
            shells.append(polygon)
        else:
            holes.append(polygon)

    # Esri defines clockwise rings as exteriors. If a source violates that
    # convention and has no clockwise ring, retain its first ring as a shell.
    if not shells and rings:
        shells = [Polygon(rings[0])]
        holes = [Polygon(r) for r in rings[1:]]

    holes_by_shell: list[list[list[tuple[float, float]]]] = [[] for _ in shells]
    orphan_holes: list[Polygon] = []
    for hole in holes:
        point = hole.representative_point()
        owners = [i for i, shell in enumerate(shells) if shell.contains(point)]
        if owners:
            owner = min(owners, key=lambda i: shells[i].area)
            holes_by_shell[owner].append(list(hole.exterior.coords))
        else:
            # A counterclockwise ring not contained in a shell is an exterior
            # despite the nominal winding; keep it rather than dropping data.
            orphan_holes.append(hole)

    parts = [
        Polygon(list(shell.exterior.coords), holes=holes_by_shell[i])
        for i, shell in enumerate(shells)
    ] + orphan_holes
    if not parts:
        raise ValueError("UPZ feature has no usable polygon rings")
    geom = unary_union(parts)
    return make_valid(geom) if not geom.is_valid else geom


def read_localities(path: Path, to_area):
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if data.get("type") != "FeatureCollection":
        raise ValueError("La capa de localidades no es una GeoJSON FeatureCollection")
    rows = []
    for feature in data.get("features", []):
        props = feature.get("properties") or {}
        name = str(props.get("Nombre de la localidad", "")).strip()
        code = str(props.get("Identificador unico de la localidad", "")).strip().zfill(2)
        if not name or not code:
            raise ValueError(f"Localidad sin nombre/código: {props}")
        geom = shape(feature["geometry"])
        geom = transform(to_area, geom)
        if not geom.is_valid:
            geom = make_valid(geom)
        rows.append({"code": code, "name": name, "geom": geom})
    if not rows:
        raise ValueError("La capa de localidades está vacía")
    return rows


def run(upz_path: Path, localities_path: Path, geojson_out: Path, csv_out: Path) -> None:
    upz_data = json.loads(upz_path.read_text(encoding="utf-8-sig"))
    features = upz_data.get("features", [])
    if not features or upz_data.get("geometryType") != "esriGeometryPolygon":
        raise ValueError("El archivo de UPZ no parece ArcGIS JSON de polígonos")

    wkid = (
        (upz_data.get("spatialReference") or {}).get("latestWkid")
        or (upz_data.get("spatialReference") or {}).get("wkid")
    )
    if not wkid:
        raise ValueError("El ArcGIS JSON no declara su sistema de referencia espacial")

    to_area_upz = Transformer.from_crs(int(wkid), 3116, always_xy=True).transform
    to_area_locality = Transformer.from_crs(4326, 3116, always_xy=True).transform
    to_wgs84 = Transformer.from_crs(int(wkid), 4326, always_xy=True).transform
    localities = read_localities(localities_path, to_area_locality)

    out_features: list[dict[str, Any]] = []
    crosswalk_rows: list[dict[str, Any]] = []
    counts: Counter[str] = Counter()
    review_rows: list[dict[str, Any]] = []

    for feature in features:
        attrs = feature.get("attributes") or {}
        code = str(attrs.get("CODIGO_UPZ", "")).strip()
        name = str(attrs.get("NOMBRE", "")).strip()
        if not code or not name:
            raise ValueError(f"UPZ sin CODIGO_UPZ/NOMBRE: {attrs}")

        original = arcgis_rings_to_geometry((feature.get("geometry") or {}).get("rings", []))
        area_geom = transform(to_area_upz, original)
        if not area_geom.is_valid:
            area_geom = make_valid(area_geom)
        upz_area = area_geom.area
        if upz_area <= 0:
            raise ValueError(f"Área no positiva para UPZ {code} {name}")

        overlaps = []
        for locality in localities:
            area = area_geom.intersection(locality["geom"]).area
            if area > 0.01:  # ignore sub-centimeter numerical noise
                overlaps.append((area, locality))
        overlaps.sort(key=lambda item: item[0], reverse=True)
        if not overlaps:
            code_loc, name_loc, top_share = "", "", 0.0
            covered_share = 0.0
            status = "sin_interseccion"
            secondaries = []
        else:
            top_area, top_locality = overlaps[0]
            code_loc = top_locality["code"]
            name_loc = top_locality["name"]
            top_share = top_area / upz_area
            covered_share = sum(area for area, _ in overlaps) / upz_area
            secondaries = [
                {
                    "codigo": loc["code"],
                    "nombre": loc["name"],
                    "area_m2": round(area, 2),
                    "porcentaje_upz": round(area / upz_area * 100, 6),
                }
                for area, loc in overlaps[1:]
                if area / upz_area >= 0.0001
            ]
            material_overlaps = [area for area, _ in overlaps if area / upz_area >= 0.0001]
            second_share = material_overlaps[1] / upz_area if len(material_overlaps) > 1 else 0.0
            if len(material_overlaps) == 1:
                status = "una_sola_localidad" if covered_share >= 0.999 else "cobertura_parcial"
            elif len(material_overlaps) > 1 and top_share >= 0.99:
                status = "dominante_99_con_solape"
            elif len(material_overlaps) > 1 and top_share >= 0.9:
                status = "mayoria_90_con_solape"
            elif len(material_overlaps) > 1 and top_share >= 0.5:
                status = "mayoria_compartida"
            elif covered_share < 0.999:
                status = "cobertura_parcial"
            else:
                status = "revisar"
            counts[name_loc] += 1
            if status != "una_sola_localidad" or covered_share < 0.999 or secondaries:
                review_rows.append({
                    "codigo_upz": code,
                    "nombre_upz": name,
                    "localidad_principal": name_loc,
                    "porcentaje_principal": round(top_share * 100, 6),
                    "cobertura_total_localidades": round(covered_share * 100, 6),
                    "otras_localidades": secondaries,
                    "estado": status,
                })

        locality_key = f"L{int(code_loc)}" if code_loc.isdigit() else ""
        out_props = dict(attrs)
        out_props.update({
            "CODIGO_LOCALIDAD": code_loc,
            "NOMBRE_LOCALIDAD": name_loc,
            "CLAVE_LOCALIDAD": locality_key,
            "PORCENTAJE_EN_LOCALIDAD": round(top_share * 100, 6),
            "COBERTURA_LOCALIDADES_PCT": round(covered_share * 100, 6),
            "ESTADO_CRUCE": status,
            "OTRAS_INTERSECCIONES": secondaries,
        })

        wgs84_geom = transform(to_wgs84, original)
        if not wgs84_geom.is_valid:
            wgs84_geom = make_valid(wgs84_geom)
        out_features.append({
            "type": "Feature",
            "id": code,
            "properties": out_props,
            "geometry": mapping(wgs84_geom),
        })
        crosswalk_rows.append({
            "codigo_upz": code,
            "nombre_upz": name,
            "codigo_localidad": code_loc,
            "nombre_localidad": name_loc,
            "clave_localidad": locality_key,
            "porcentaje_upz_en_localidad_principal": round(top_share * 100, 6),
            "cobertura_total_localidades_pct": round(covered_share * 100, 6),
            "estado_cruce": status,
            "otras_intersecciones": json.dumps(secondaries, ensure_ascii=False),
        })

    def code_sort(row):
        val = row["codigo_upz"]
        return (0, int(val)) if val.isdigit() else (1, val)

    out_features.sort(key=lambda f: code_sort({"codigo_upz": str(f["properties"]["CODIGO_UPZ"])}))
    crosswalk_rows.sort(key=code_sort)
    geojson_out.parent.mkdir(parents=True, exist_ok=True)
    csv_out.parent.mkdir(parents=True, exist_ok=True)
    geojson_out.write_text(
        json.dumps({"type": "FeatureCollection", "name": "UPZ de Bogotá con localidad asignada", "features": out_features}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    columns = list(crosswalk_rows[0].keys()) if crosswalk_rows else []
    with csv_out.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        writer.writerows(crosswalk_rows)

    print(f"UPZ procesadas: {len(out_features)}")
    print("UPZ por localidad:")
    for name, count in sorted(counts.items()):
        print(f"  {name}: {count}")
    print(f"Casos para revisar: {len(review_rows)}")
    for row in review_rows:
        print("  " + json.dumps(row, ensure_ascii=False))
    print(f"GeoJSON: {geojson_out} ({geojson_out.stat().st_size:,} bytes)")
    print(f"Cruce CSV: {csv_out} ({csv_out.stat().st_size:,} bytes)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upz", required=True, type=Path, help="ArcGIS JSON de polígonos UPZ")
    parser.add_argument("--localities", required=True, type=Path, help="GeoJSON de localidades EPSG:4326")
    parser.add_argument("--geojson-out", required=True, type=Path, help="GeoJSON enriquecido de salida")
    parser.add_argument("--csv-out", required=True, type=Path, help="Tabla CSV UPZ→localidad")
    args = parser.parse_args()
    run(args.upz, args.localities, args.geojson_out, args.csv_out)


if __name__ == "__main__":
    main()
