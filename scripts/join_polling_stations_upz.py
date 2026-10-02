#!/usr/bin/env python3
"""Cross Bogotá polling-place points with UPZ polygons and emit app-ready geography.

Source points are EPSG:4326 from Datos Abiertos Bogotá. UPZ polygons are the
project's RFC 7946 GeoJSON, also EPSG:4326. Spatial assignment uses point-in-
polygon (covers); locality codes are used to disambiguate overlaps. Points not
covered by the UPZ layer are retained with an empty upz_code, never guessed.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

from shapely.geometry import Point, shape
from shapely.prepared import prep
from shapely.validation import make_valid

SOURCE_URL = (
    "https://datosabiertos.bogota.gov.co/dataset/"
    "d03ad429-75f7-4307-9521-da7442154289/resource/"
    "acc0e326-b82c-46f7-8af6-9a46f2ff79de/download/puesto_de_votacion.geojson"
)


def normalize_code(value: Any) -> str:
    raw = str(value if value is not None else "").strip().upper()
    if not raw:
        return ""
    return str(int(raw)) if raw.isdigit() else raw


def text(value: Any) -> str:
    return str(value if value is not None else "").strip()


def normalize_locality_name(value: Any) -> str:
    raw = unicodedata.normalize("NFD", text(value)).encode("ascii", "ignore").decode("ascii").lower()
    raw = re.sub(r"\blocalidad\b", " ", raw)
    raw = re.sub(r"[^a-z0-9]+", " ", raw).strip()
    return re.sub(r"^(la|las|los|el)\s+", "", raw)


def read_collection(path: Path, label: str) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if data.get("type") != "FeatureCollection" or not data.get("features"):
        raise ValueError(f"{label} debe ser una FeatureCollection GeoJSON no vacía")
    return data


def run(
    points_path: Path,
    upz_path: Path,
    output_json: Path,
    output_csv: Path,
    output_upz: Path,
) -> None:
    points_data = read_collection(points_path, "GeoJSON de puestos")
    upz_data = read_collection(upz_path, "GeoJSON UPZ")

    if points_data.get("crs", {}).get("properties", {}).get("name") not in (
        None,
        "EPSG:4326",
        "urn:ogc:def:crs:OGC:1.3:CRS84",
    ):
        raise ValueError("El GeoJSON de puestos no está en EPSG:4326")

    polygons: list[dict[str, Any]] = []
    seen_upz: set[str] = set()
    for feature in upz_data["features"]:
        props = feature.get("properties") or {}
        code = text(props.get("CODIGO_UPZ"))
        name = text(props.get("NOMBRE"))
        locality_code = normalize_code(props.get("CODIGO_LOCALIDAD"))
        if not code or not name:
            raise ValueError(f"UPZ sin código/nombre: {props}")
        if code in seen_upz:
            raise ValueError(f"Código UPZ duplicado: {code}")
        seen_upz.add(code)
        geom = shape(feature["geometry"])
        if not geom.is_valid:
            geom = make_valid(geom)
        polygons.append({
            "code": code,
            "name": name,
            "locality_code": locality_code,
            "locality_name": text(props.get("NOMBRE_LOCALIDAD")),
            "locality_name_key": normalize_locality_name(props.get("NOMBRE_LOCALIDAD")),
            "geometry": geom,
            "prepared": prep(geom),
            "properties": props,
        })

    output_rows: list[dict[str, Any]] = []
    per_upz: Counter[str] = Counter()
    statuses: Counter[str] = Counter()
    seen_keys: set[str] = set()

    for feature in points_data["features"]:
        props = feature.get("properties") or {}
        if feature.get("geometry", {}).get("type") != "Point":
            raise ValueError(f"Se esperaba Point; se recibió {feature.get('geometry', {}).get('type')}")
        coordinates = feature["geometry"].get("coordinates") or []
        if len(coordinates) < 2:
            raise ValueError(f"Puesto sin coordenadas: {props}")
        lng, lat = float(coordinates[0]), float(coordinates[1])
        if not (-180 <= lng <= 180 and -90 <= lat <= 90):
            raise ValueError(f"Coordenadas fuera de rango: {coordinates}")

        source_locality_code = normalize_code(props.get("Código_de_localidad"))
        locality_name = text(props.get("Nombre_de_localidad"))
        locality_name_key = normalize_locality_name(locality_name)
        station_number = normalize_code(props.get("Número_del_puesto"))
        geo_code = text(props.get("Código_del_puesto"))
        if not source_locality_code or not station_number or not geo_code:
            raise ValueError(f"Puesto sin localidad/número/código: {props}")
        # This source field also matches the MMV ZONA key; special facilities
        # sometimes use values such as 90/98, so names—not these codes—identify
        # the geographic locality when cross-checking UPZ boundaries.
        zone_code = source_locality_code
        station_key = f"{zone_code}-{station_number}"
        if station_key in seen_keys:
            raise ValueError(f"Clave localidad-puesto duplicada en la fuente: {station_key}")
        seen_keys.add(station_key)

        point = Point(lng, lat)
        local_matches = [
            polygon for polygon in polygons
            if locality_name_key
            and polygon["locality_name_key"] == locality_name_key
            and polygon["prepared"].covers(point)
        ]
        matches = local_matches
        status = "inside_source_locality"
        if not matches:
            code_matches = [
                polygon for polygon in polygons
                if polygon["locality_code"] == source_locality_code and polygon["prepared"].covers(point)
            ]
            matches = code_matches
        if not matches:
            matches = [polygon for polygon in polygons if polygon["prepared"].covers(point)]
            if matches:
                status = "inside_different_locality"
        selected: dict[str, Any] | None = None
        if matches:
            interiors = [polygon for polygon in matches if polygon["geometry"].contains(point)]
            if len(interiors) == 1:
                selected = interiors[0]
            elif len(matches) == 1:
                selected = matches[0]
            else:
                # A point on a shared boundary is rare; keep locality preference,
                # then use nearest representative point and flag the decision.
                selected = min(
                    matches,
                    key=lambda polygon: (
                        0 if polygon["locality_code"] == locality_code else 1,
                        polygon["geometry"].representative_point().distance(point),
                        polygon["code"],
                    ),
                )
                status = "ambiguous_boundary"
        else:
            status = "outside_upz"

        upz_code = selected["code"] if selected else ""
        upz_name = selected["name"] if selected else ""
        if selected:
            per_upz[upz_code] += 1
        statuses[status] += 1

        output_rows.append({
            "station_key": station_key,
            "geo_code": geo_code,
            "zone_code": zone_code,
            "source_locality_code": source_locality_code,
            "locality_name": locality_name,
            "station_number": station_number,
            "name": text(props.get("Nombre_del_puesto")),
            "site_name": text(props.get("Nombre_del_Sitio")),
            "address": text(props.get("Dirección")),
            "longitude": lng,
            "latitude": lat,
            "upz_code": upz_code,
            "upz_name": upz_name,
            "join_status": status,
        })

    # Attach transparent counts to every UPZ; a zero is a genuine no-point zone.
    enriched_features = []
    for feature in upz_data["features"]:
        clone = dict(feature)
        props = dict(feature.get("properties") or {})
        code = text(props.get("CODIGO_UPZ"))
        props["PUESTOS_GEOJSON_COUNT"] = int(per_upz.get(code, 0))
        props["PUESTOS_GEOJSON_STATUS"] = "con_puestos" if per_upz.get(code, 0) else "sin_puestos"
        clone["properties"] = props
        enriched_features.append(clone)
    upz_output = dict(upz_data)
    upz_output["features"] = enriched_features
    upz_output.pop("crs", None)

    no_station_upzs = [
        {
            "codigo_upz": row["properties"]["CODIGO_UPZ"],
            "nombre_upz": row["properties"]["NOMBRE"],
            "localidad": row["properties"].get("NOMBRE_LOCALIDAD", ""),
        }
        for row in enriched_features
        if not row["properties"]["PUESTOS_GEOJSON_COUNT"]
    ]
    summary = {
        "source_url": SOURCE_URL,
        "source_points": len(output_rows),
        "assigned_to_upz": sum(per_upz.values()),
        "outside_upz": statuses.get("outside_upz", 0),
        "ambiguous_boundary": statuses.get("ambiguous_boundary", 0),
        "different_locality_match": statuses.get("inside_different_locality", 0),
        "upz_count": len(enriched_features),
        "upz_with_stations": sum(1 for feature in enriched_features if feature["properties"]["PUESTOS_GEOJSON_COUNT"]),
        "upz_without_stations": len(no_station_upzs),
        "upzs_without_stations": no_station_upzs,
        "join_status_counts": dict(sorted(statuses.items())),
    }

    payload = {
        "source_url": SOURCE_URL,
        "crs": "EPSG:4326",
        "summary": summary,
        "stations": output_rows,
    }
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    output_upz.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    output_upz.write_text(json.dumps(upz_output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    columns = list(output_rows[0].keys()) if output_rows else []
    with output_csv.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        writer.writerows(output_rows)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"JSON para la app: {output_json} ({output_json.stat().st_size:,} bytes)")
    print(f"CSV de auditoría: {output_csv} ({output_csv.stat().st_size:,} bytes)")
    print(f"GeoJSON UPZ actualizado: {output_upz} ({output_upz.stat().st_size:,} bytes)")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--points", type=Path, default=root / "public/data/puestos-de-votacion.geojson")
    parser.add_argument("--upz", type=Path, default=root / "public/data/upz-localidades.geojson")
    parser.add_argument("--json-out", type=Path, default=root / "src/data/polling-stations.json")
    parser.add_argument("--csv-out", type=Path, default=root / "public/data/puestos-upz.csv")
    parser.add_argument("--upz-out", type=Path, default=root / "public/data/upz-localidades.geojson")
    args = parser.parse_args()
    run(args.points, args.upz, args.json_out, args.csv_out, args.upz_out)


if __name__ == "__main__":
    main()
