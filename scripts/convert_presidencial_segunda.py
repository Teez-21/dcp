#!/usr/bin/env python3
"""Convertir el MMV de la segunda vuelta presidencial de Bogotá al modelo del dashboard.

Uso:
  python3 scripts/convert_presidencial_segunda.py entrada.csv salida.json

El CSV de la Registraduría se conserva fuera del repositorio; este script deja
reproducible la transformación de sus filas a localidades y puestos, enlazando
las coordenadas de la capa pública de puestos de votación.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

LOCALITIES = {
    1: "Usaquén", 2: "Chapinero", 3: "Santa Fe", 4: "San Cristóbal", 5: "Usme",
    6: "Tunjuelito", 7: "Bosa", 8: "Kennedy", 9: "Fontibón", 10: "Engativá",
    11: "Suba", 12: "Barrios Unidos", 13: "Teusaquillo", 14: "Los Mártires",
    15: "Antonio Nariño", 16: "Puente Aranda", 17: "La Candelaria",
    18: "Rafael Uribe Uribe", 19: "Ciudad Bolívar", 20: "Sumapaz",
}
CANDIDATES = {
    "IVÁN CEPEDA CASTRO": {
        "id": "pres2-ivan-cepeda-castro",
        "name": "Iván Cepeda Castro",
        "party": "MOVIMIENTO POLÍTICO PACTO HISTÓRICO",
        "color": "#E9A800",
    },
    "ABELARDO DE LA ESPRIELLA": {
        "id": "pres2-abelardo-de-la-espriella",
        "name": "Abelardo De La Espriella",
        "party": "DEFENSORES DE LA PATRIA",
        "color": "#6B7280",
    },
}
SPECIAL = {"VOTOS EN BLANCO", "VOTOS NULOS", "VOTOS NO MARCADOS"}
VERSION = "presidencial-bogota-segunda-vuelta-v1"


def code(value: str) -> str:
    value = (value or "").strip()
    return str(int(value)) if value.isdigit() else value.upper()


def to_votes(value: str) -> int:
    return int((value or "0").replace(".", "").replace(",", "").strip() or "0")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument(
        "--stations",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "src/data/polling-stations.json",
    )
    args = parser.parse_args()

    station_source = json.loads(args.stations.read_text(encoding="utf-8"))
    stations = {}
    for item in station_source.get("stations", []):
        key = f"{code(item.get('zone_code', ''))}-{code(item.get('station_number', ''))}"
        stations[key] = item

    candidates = [dict(value) for value in CANDIDATES.values()]
    candidate_by_name = {key: value for key, value in CANDIDATES.items()}
    locality_votes: dict[str, dict[str, int]] = defaultdict(dict)
    post_data: dict[str, dict[str, Any]] = {}
    row_count = 0
    used_rows = 0
    skipped_rows = 0
    skipped_votes = Counter()
    total_by_candidate = Counter()
    zones = Counter()

    with args.input.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source, delimiter=";")
        required = {"ZONA", "NUMPUESTO", "PUESTO", "CANDIDATO", "VOTOS"}
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise SystemExit(f"Faltan columnas requeridas: {', '.join(sorted(missing))}")
        for row in reader:
            row_count += 1
            candidate_name = (row.get("CANDIDATO") or "").strip()
            zone_raw = (row.get("ZONA") or "").strip()
            station_raw = (row.get("NUMPUESTO") or "").strip()
            if candidate_name in SPECIAL:
                skipped_rows += 1
                skipped_votes[candidate_name] += to_votes(row.get("VOTOS", "0"))
                continue
            candidate = candidate_by_name.get(candidate_name)
            if not candidate:
                skipped_rows += 1
                continue
            zone = int(zone_raw) if zone_raw.isdigit() else None
            votes = to_votes(row.get("VOTOS", "0"))
            zones[zone_raw] += votes
            total_by_candidate[candidate["name"]] += votes
            if zone in LOCALITIES:
                key = f"L{zone}"
                bucket = locality_votes[key]
                bucket[candidate["id"]] = bucket.get(candidate["id"], 0) + votes
            if not zone_raw or not station_raw:
                continue
            post_id = f"{code(zone_raw)}-{code(station_raw)}"
            post = post_data.setdefault(post_id, {
                "id": post_id,
                "zona": zone,
                "num": code(station_raw),
                "name": (row.get("PUESTO") or "").strip() or f"Puesto {station_raw}",
                "localidad": LOCALITIES.get(zone, ""),
                "votes": {},
            })
            post["votes"][candidate["id"]] = post["votes"].get(candidate["id"], 0) + votes
            geo = stations.get(post_id)
            if geo:
                post["lat"] = geo.get("latitude")
                post["lng"] = geo.get("longitude")
            used_rows += 1

    for post in post_data.values():
        post.setdefault("lat", None)
        post.setdefault("lng", None)

    def post_sort_key(key: str) -> tuple[int, int, str]:
        zone, number = key.split("-", 1)
        return (int(zone) if zone.isdigit() else 10**9, int(number) if number.isdigit() else 10**9, number)

    election = {
        "id": "pres2",
        "name": "Presidencial · 2ª vuelta · Bogotá",
        "dataVersion": VERSION,
        "candidates": candidates,
        "localidades": {key: locality_votes[key] for key in sorted(locality_votes, key=lambda k: int(k[1:]))},
        "puestos": [post_data[key] for key in sorted(post_data, key=post_sort_key)],
        "sourceMetadata": {
            "sourceFile": args.input.name,
            "sourceDescription": "MMV de la segunda vuelta presidencial para Bogotá, archivo aportado por la usuaria.",
            "version": VERSION,
            "rows": row_count,
            "candidateRows": used_rows,
            "skippedRows": skipped_rows,
            "pollingStations": len(post_data),
            "localityCount": len(locality_votes),
            "candidateCount": len(candidates),
            "votesByCandidate": dict(total_by_candidate),
            "skippedVotesByType": dict(skipped_votes),
            "votesByZone": dict(zones),
            "unmappedZoneCodes": [zone for zone in sorted(zones, key=lambda z: (int(z) if z.isdigit() else 10**9, z)) if not (zone.isdigit() and 1 <= int(zone) <= 20)],
            "coordinatesMatched": sum(1 for p in post_data.values() if p.get("lat") is not None and p.get("lng") is not None),
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(election, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "rows": row_count,
        "candidateRows": used_rows,
        "skippedRows": skipped_rows,
        "pollingStations": len(post_data),
        "localities": len(locality_votes),
        "coordinatesMatched": election["sourceMetadata"]["coordinatesMatched"],
        "votesByCandidate": total_by_candidate,
        "skippedVotesByType": skipped_votes,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
