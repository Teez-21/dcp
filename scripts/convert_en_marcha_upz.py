#!/usr/bin/env python3
"""Convert votes by UPZ into an app election with direct UPZ aggregates."""
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

COLORS = ["#264653", "#e9a800", "#2a9d8f", "#b56576"]


def clean(value: object) -> str:
    return str(value or "").strip()


def code(value: object) -> str:
    raw = clean(value)
    return str(int(raw)) if raw.isdigit() else raw


def candidate_id(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().encode("ascii", "ignore").decode()).strip("-")
    return f"enmarcha-{slug}"


def run(input_csv: Path, upz_localities_csv: Path, output_json: Path) -> None:
    rows = list(csv.DictReader(input_csv.open(encoding="utf-8-sig", newline="")))
    if not rows:
        raise ValueError("El CSV no contiene registros")
    required = {"nombre_candidato", "upz_code", "upz_name", "total_votos"}
    missing = required - set(rows[0])
    if missing:
        raise ValueError(f"Faltan columnas: {', '.join(sorted(missing))}")

    mapping = {}
    with upz_localities_csv.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            mapping[code(row.get("codigo_upz"))] = {
                "locality_key": clean(row.get("clave_localidad")),
                "locality_name": clean(row.get("nombre_localidad")),
            }

    candidates: list[dict[str, object]] = []
    candidate_by_name: dict[str, dict[str, object]] = {}
    upz_votes: dict[str, dict[str, int]] = defaultdict(dict)
    upz_names: dict[str, str] = {}
    locality_votes: dict[str, dict[str, int]] = defaultdict(dict)

    for row in rows:
        name = clean(row["nombre_candidato"])
        upz = code(row["upz_code"])
        if not name or not upz:
            raise ValueError(f"Registro incompleto: {row}")
        if name not in candidate_by_name:
            candidate = {
                "id": candidate_id(name),
                "name": name.title(),
                "color": COLORS[len(candidates) % len(COLORS)],
                "party": "En Marcha",
            }
            candidate_by_name[name] = candidate
            candidates.append(candidate)
        candidate = candidate_by_name[name]
        if candidate["id"] in upz_votes[upz]:
            raise ValueError(f"Registro duplicado para candidato/UPZ: {name} / {upz}")
        upz_names[upz] = clean(row["upz_name"]).title()
        upz_votes[upz][candidate["id"]] = int(clean(row["total_votos"]).replace(".", "").replace(",", ""))

    for upz, votes in upz_votes.items():
        locality = mapping.get(upz, {}).get("locality_key", "")
        if not locality:
            raise ValueError(f"No se encontró localidad para la UPZ {upz} ({upz_names[upz]})")
        for cid, value in votes.items():
            locality_votes[locality][cid] = locality_votes[locality].get(cid, 0) + value

    election = {
        "id": "enmarcha-concejo-upz",
        "name": "Votos de En Marcha al Concejo de Bogotá",
        "dataVersion": "enmarcha-concejo-upz-v1",
        "candidates": candidates,
        "localidades": dict(sorted(locality_votes.items())),
        "upzVotes": dict(sorted(upz_votes.items(), key=lambda item: int(item[0]) if item[0].isdigit() else item[0])),
        "upzNames": dict(sorted(upz_names.items(), key=lambda item: int(item[0]) if item[0].isdigit() else item[0])),
        "puestos": [],
        "partyMode": False,
    }
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(election, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    totals = {c["name"]: sum(v.get(c["id"], 0) for v in upz_votes.values()) for c in candidates}
    print(json.dumps({"upzs": len(upz_votes), "candidates": len(candidates), "totals": totals, "output": str(output_json)}, ensure_ascii=False, indent=2))


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("--upz-localities", type=Path, default=root / "public/data/upz-localidades.csv")
    parser.add_argument("--output", type=Path, default=root / "src/data/en-marcha-concejo-upz.json")
    args = parser.parse_args()
    run(args.input_csv, args.upz_localities, args.output)


if __name__ == "__main__":
    main()
