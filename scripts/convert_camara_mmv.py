#!/usr/bin/env python3
"""Convertir el MMV de Cámara de Bogotá por mesa al modelo electoral del dashboard.

Uso:
  python3 scripts/convert_camara_mmv.py entrada.csv salida.json

El CSV fuente suele venir delimitado por punto y coma y codificado en Windows-1252.
Se agregan filas tipo `candidato` a candidaturas y filas `lista` a votos no
preferentes de partido. Las filas `especial` no se mezclan con candidaturas.
Se conservan en puestos los códigos zonales 90/98, pero las localidades y UPZ
sólo se agregan para zonas 01–20, que corresponden a las localidades del mapa.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

VERSION = "camara-bogota-mmv-2026-v1"
ELECTION_NAME = "Cámara de Representantes · Bogotá 2026–2030"
PALETTE = [
    "#2a9d8f", "#e9a800", "#457b9d", "#f4722b", "#43aa8b",
    "#8d99ae", "#b56576", "#264653", "#a68a64", "#5f7d4f",
    "#7b2cbf", "#d62828", "#0081a7", "#6a994e", "#f28482",
]
LOCALITIES = {
    1: "Usaquén", 2: "Chapinero", 3: "Santa Fe", 4: "San Cristóbal", 5: "Usme",
    6: "Tunjuelito", 7: "Bosa", 8: "Kennedy", 9: "Fontibón", 10: "Engativá",
    11: "Suba", 12: "Barrios Unidos", 13: "Teusaquillo", 14: "Los Mártires",
    15: "Antonio Nariño", 16: "Puente Aranda", 17: "La Candelaria",
    18: "Rafael Uribe Uribe", 19: "Ciudad Bolívar", 20: "Sumapaz",
}


def code(value: str) -> str:
    value = (value or "").strip()
    return str(int(value)) if value.isdigit() else value.upper()


def title_name(value: str) -> str:
    particles = {"de", "del", "la", "las", "los", "y", "e"}
    words = (value or "").strip().lower().split()
    return " ".join(w if i and w in particles else w[:1].upper() + w[1:] for i, w in enumerate(words))


def sum_map(target: dict[str, int], key: str, value: int) -> None:
    target[key] = target.get(key, 0) + value


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    candidates: dict[tuple[str, str], dict[str, str]] = {}
    party_names: dict[str, str] = {}
    post_data: dict[str, dict[str, Any]] = {}
    locality_votes: dict[str, dict[str, int]] = defaultdict(dict)
    locality_party_votes: dict[str, dict[str, int]] = defaultdict(dict)
    zone_totals: Counter[str] = Counter()
    kind_rows: Counter[str] = Counter()
    kind_votes: Counter[str] = Counter()
    table_keys: set[tuple[str, str, str]] = set()
    row_count = 0

    with args.input.open("r", encoding="cp1252", newline="") as source:
        reader = csv.DictReader(source, delimiter=";")
        required = {"zona", "puesto", "n_puesto", "mesa", "partido", "n_partido", "candidato", "n_candidato", "tipo_fila", "votos"}
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise SystemExit(f"Faltan columnas requeridas: {', '.join(sorted(missing))}")

        for row in reader:
            row_count += 1
            kind = (row.get("tipo_fila") or "").strip().lower()
            zone_raw = (row.get("zona") or "").strip()
            post_raw = (row.get("puesto") or "").strip()
            party_code = code(row.get("partido", ""))
            candidate_code = code(row.get("candidato", ""))
            party_name = (row.get("n_partido") or "").strip()
            candidate_name = (row.get("n_candidato") or "").strip()
            try:
                votes = int((row.get("votos") or "0").strip() or "0")
            except ValueError:
                votes = 0

            kind_rows[kind] += 1
            kind_votes[kind] += votes
            zone_totals[zone_raw] += votes
            table_keys.add((zone_raw, post_raw, (row.get("mesa") or "").strip()))

            if not zone_raw or not post_raw:
                continue
            zone_num = int(zone_raw) if zone_raw.isdigit() else None
            post_num = code(post_raw)
            post_id = f"{zone_num if zone_num is not None else zone_raw}-{post_num}"
            post = post_data.setdefault(post_id, {
                "id": post_id,
                "zona": zone_num,
                "num": post_num,
                "name": (row.get("n_puesto") or "").strip() or f"Puesto {post_raw}",
                "localidad": LOCALITIES.get(zone_num, ""),
                "votes": {},
                "partyVotes": {},
            })

            if kind not in {"candidato", "lista"} or votes == 0:
                continue
            if party_code and party_name:
                party_names[party_code] = party_name

            if kind == "candidato":
                identity = (party_code, candidate_code)
                record = candidates.setdefault(identity, {
                    "id": f"camara-{party_code}-{candidate_code}".lower(),
                    "name": title_name(candidate_name),
                    "party_code": party_code,
                })
                candidate_id = record["id"]
                sum_map(post["votes"], candidate_id, votes)
                if zone_num in LOCALITIES:
                    sum_map(locality_votes[f"L{zone_num}"], candidate_id, votes)
            elif kind == "lista":
                if not party_name:
                    continue
                sum_map(post["partyVotes"], party_name, votes)
                if zone_num in LOCALITIES:
                    sum_map(locality_party_votes[f"L{zone_num}"], party_name, votes)

    ordered_parties = sorted(party_names, key=lambda value: (int(value) if value.isdigit() else 10**9, value))
    party_color = {party_code: PALETTE[index % len(PALETTE)] for index, party_code in enumerate(ordered_parties)}
    party_label = {party_names[party_code]: party_code for party_code in party_names}

    candidate_rows = []
    for identity in sorted(candidates, key=lambda item: (int(item[0]) if item[0].isdigit() else 10**9, int(item[1]) if item[1].isdigit() else 10**9, item)):
        item = candidates[identity]
        party_code = item["party_code"]
        party = party_names.get(party_code, "")
        candidate_rows.append({
            "id": item["id"],
            "name": item["name"],
            "color": party_color.get(party_code, PALETTE[0]),
            "party": party,
        })

    election = {
        "id": "camara",
        "name": ELECTION_NAME,
        "dataVersion": VERSION,
        "partyMode": True,
        "partyColors": {party_names[party_code]: party_color[party_code] for party_code in ordered_parties},
        "candidates": candidate_rows,
        "localidades": {key: locality_votes[key] for key in sorted(locality_votes, key=lambda k: int(k[1:]))},
        "partyVotes": {key: locality_party_votes[key] for key in sorted(locality_party_votes, key=lambda k: int(k[1:]))},
        "puestos": [post_data[key] for key in sorted(post_data, key=lambda k: (int(k.split("-", 1)[0]) if k.split("-", 1)[0].isdigit() else 10**9, k.split("-", 1)[1]))],
        "sourceMetadata": {
            "sourceFile": args.input.name,
            "sourceDescription": "MMV de Cámara de Representantes de Bogotá, archivo aportado por la usuaria.",
            "version": VERSION,
            "rows": row_count,
            "tables": len(table_keys),
            "pollingStations": len(post_data),
            "localityCount": len(locality_votes),
            "candidateCount": len(candidate_rows),
            "partyCount": len(ordered_parties),
            "rowCountsByType": dict(sorted(kind_rows.items())),
            "votesByType": dict(sorted(kind_votes.items())),
            "votesByZone": dict(sorted(zone_totals.items())),
            "unmappedZoneCodes": [zone for zone in sorted(zone_totals, key=lambda z: (int(z) if z.isdigit() else 10**9, z)) if not (zone.isdigit() and 1 <= int(zone) <= 20)],
            "partyCodes": {party_names[code]: code for code in ordered_parties},
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as target:
        json.dump(election, target, ensure_ascii=False, separators=(",", ":"))
        target.write("\n")

    print(json.dumps({
        "output": str(args.output),
        "bytes": args.output.stat().st_size,
        "rows": row_count,
        "tables": len(table_keys),
        "pollingStations": len(post_data),
        "localities": len(locality_votes),
        "candidates": len(candidate_rows),
        "parties": len(ordered_parties),
        "votesByType": dict(kind_votes),
        "votesByZone": dict(zone_totals),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
