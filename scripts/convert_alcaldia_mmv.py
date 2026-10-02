#!/usr/bin/env python3
"""Convert a Registraduría MMV CSV into the dashboard's Alcaldía Election JSON.

Usage:
  python3 scripts/convert_alcaldia_mmv.py INPUT.csv [BASE.json] [OUTPUT.json]

The converter retains the existing candidate IDs/colors and replaces only the
Alcaldía locality totals and polling-place aggregates. It excludes non-city
records (Código Comuna outside 01–20) from the Bogotá locality map.
"""
from __future__ import annotations

import csv
import json
import re
import shutil
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

LOC_NAMES = {
    1: "Usaquén", 2: "Chapinero", 3: "Santa Fe", 4: "San Cristóbal", 5: "Usme",
    6: "Tunjuelito", 7: "Bosa", 8: "Kennedy", 9: "Fontibón", 10: "Engativá",
    11: "Suba", 12: "Barrios Unidos", 13: "Teusaquillo", 14: "Los Mártires",
    15: "Antonio Nariño", 16: "Puente Aranda", 17: "La Candelaria",
    18: "Rafael Uribe Uribe", 19: "Ciudad Bolívar", 20: "Sumapaz",
}
NON_CANDIDATE = re.compile(r"^(votos en blanco|votos nulos|votos no marcados|blanco|nulos|no marcados)$")
REQUIRED = {
    "Código Departamento", "Código Municipio", "Código Zona", "Código Puesto",
    "Nombre Puesto", "Código Comuna", "Nombre Comuna", "Nombre Corporación",
    "Nombre Candidato", "Total Votos",
}


def norm(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text.strip().lower())


def int_value(value: object) -> int:
    digits = re.sub(r"[^0-9]", "", str(value or ""))
    return int(digits or 0)

def station_code(value: object) -> str:
    code = re.sub(r"\s+", "", str(value or "").strip()).upper()
    if code.isdigit() and len(code) < 2:
        code = code.zfill(2)
    return code


def main() -> None:
    if len(sys.argv) not in (2, 3, 4):
        raise SystemExit(__doc__)

    source = Path(sys.argv[1])
    base_path = Path(sys.argv[2]) if len(sys.argv) >= 3 else Path("src/data/alcaldia-2023.json")
    output_path = Path(sys.argv[3]) if len(sys.argv) >= 4 else base_path
    base = json.loads(base_path.read_text(encoding="utf-8"))

    candidates = base["candidates"]
    candidate_by_name = {norm(c["name"]): c for c in candidates}
    if len(candidate_by_name) != len(candidates):
        raise ValueError("La base contiene nombres de candidatos ambiguos después de normalizar.")

    locality_votes: dict[str, dict[str, int]] = {f"L{i}": {} for i in LOC_NAMES}
    posts: dict[tuple[int, str], dict] = {}
    mesas_by_post: dict[tuple[int, str], set[str]] = defaultdict(set)
    skipped_options = Counter()
    unknown_names = Counter()
    outside_city_votes = Counter()
    row_count = city_row_count = candidate_row_count = 0
    all_post_keys: set[tuple[int, str]] = set()

    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        sample = handle.read(65536)
        handle.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        reader = csv.DictReader(handle, dialect=dialect)
        missing = REQUIRED - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Faltan columnas requeridas: {', '.join(sorted(missing))}")

        for row in reader:
            row_count += 1
            corporation = norm(row.get("Nombre Corporación"))
            if corporation and corporation != "alcalde":
                raise ValueError(f"El archivo contiene una corporación inesperada: {row.get('Nombre Corporación')}")
            if (row.get("Código Departamento") or "").strip() != "16":
                raise ValueError(f"Departamento inesperado en fila {row_count + 1}.")
            if int_value(row.get("Código Municipio")) != 1:
                raise ValueError(f"Municipio inesperado en fila {row_count + 1}.")

            zone_raw = (row.get("Código Zona") or "").strip()
            number_raw = (row.get("Código Puesto") or "").strip()
            if not zone_raw or not number_raw:
                raise ValueError(f"Zona o puesto vacío en fila {row_count + 1}.")
            zone = int_value(zone_raw)
            number = station_code(number_raw)
            post_key = (zone, number)
            all_post_keys.add(post_key)

            comuna = int_value(row.get("Código Comuna"))
            vote_count = int_value(row.get("Total Votos"))
            candidate_name = (row.get("Nombre Candidato") or "").strip()
            candidate_key = norm(candidate_name)

            if not 1 <= comuna <= 20:
                if candidate_key in candidate_by_name:
                    outside_city_votes[candidate_name] += vote_count
                else:
                    skipped_options[candidate_name] += vote_count
                continue

            if zone != comuna:
                raise ValueError(
                    f"Código Zona ({zone}) no coincide con Código Comuna ({comuna}) "
                    f"en fila {row_count + 1}; se requiere una clave geográfica inequívoca."
                )
            city_row_count += 1
            locality = LOC_NAMES[comuna]
            post_name = (row.get("Nombre Puesto") or "").strip()
            post = posts.get(post_key)
            if post is None:
                post = {
                    "id": f"{zone}-{number}",
                    "zona": zone,
                    "num": number,
                    "name": post_name,
                    "localidad": locality,
                    "votes": {},
                }
                posts[post_key] = post
            elif post["name"] != post_name or post["localidad"] != locality:
                raise ValueError(f"Metadatos inconsistentes para el puesto {zone}-{number}.")

            mesa = (row.get("Mesa") or "").strip()
            if mesa:
                mesas_by_post[post_key].add(mesa)

            candidate = candidate_by_name.get(candidate_key)
            if candidate is None:
                if NON_CANDIDATE.match(candidate_key):
                    skipped_options[candidate_name] += vote_count
                    continue
                unknown_names[candidate_name] += vote_count
                continue

            candidate_row_count += 1
            cid = candidate["id"]
            post["votes"][cid] = post["votes"].get(cid, 0) + vote_count
            locality_key = f"L{comuna}"
            locality_votes[locality_key][cid] = locality_votes[locality_key].get(cid, 0) + vote_count

    if unknown_names:
        raise ValueError(f"Hay etiquetas no reconocidas como candidato ni voto no-candidato: {dict(unknown_names)}")
    if not posts:
        raise ValueError("No se encontraron puestos en las localidades de Bogotá.")

    # Confirm every old candidate exists in the new result set (zero-vote candidates are retained).
    new_candidate_ids = {cid for values in locality_votes.values() for cid in values}
    missing_candidates = [c["name"] for c in candidates if c["id"] not in new_candidate_ids]
    if missing_candidates:
        raise ValueError(f"No hay votos registrados para los candidatos: {missing_candidates}")

    updated = dict(base)
    updated["dataVersion"] = "alcaldia-mmv-2023-v1"
    updated["localidades"] = locality_votes
    updated["puestos"] = [posts[key] for key in sorted(posts)]

    # Keep an untouched local backup before atomically replacing the database.
    backup = Path.home() / ".cache" / "dcpdashboard" / "alcaldia-2023-before-mmv.json"
    if output_path.exists() and output_path.resolve() == base_path.resolve() and not backup.exists():
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(output_path, backup)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp = output_path.with_suffix(output_path.suffix + ".tmp")
    temp.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # Parse back the produced file before replacing the original.
    check = json.loads(temp.read_text(encoding="utf-8"))
    if check.get("id") != base.get("id") or len(check["localidades"]) != 20:
        raise ValueError("La salida no pasó la validación del formato de elección.")
    temp.replace(output_path)

    total_new = sum(sum(v.values()) for v in locality_votes.values())
    total_old = sum(sum(v.values()) for v in base["localidades"].values())
    old_by_candidate = Counter()
    new_by_candidate = Counter()
    for loc, values in base["localidades"].items():
        old_by_candidate.update(values)
    for values in locality_votes.values():
        new_by_candidate.update(values)

    print(f"CSV rows: {row_count:,}; city rows: {city_row_count:,}; candidate rows in city: {candidate_row_count:,}")
    print(f"City polling places: {len(posts):,}; distinct mesas represented: {sum(map(len, mesas_by_post.values())):,}")
    print(f"Noncandidate votes in city excluded from candidate totals: {sum(skipped_options.values()):,} ({dict(skipped_options)})")
    print(f"Candidate votes outside localities 01–20 excluded: {sum(outside_city_votes.values()):,}")
    print(f"Old candidate-vote total: {total_old:,}; MMV total: {total_new:,}; delta: {total_new - total_old:+,}")
    print("Candidate deltas versus previous locality aggregate:")
    for candidate in candidates:
        cid = candidate["id"]
        delta = new_by_candidate[cid] - old_by_candidate[cid]
        if delta:
            print(f"  {candidate['name']}: {delta:+,}")
    print(f"Updated database: {output_path}")
    if backup.exists():
        print(f"Backup: {backup}")


if __name__ == "__main__":
    main()
