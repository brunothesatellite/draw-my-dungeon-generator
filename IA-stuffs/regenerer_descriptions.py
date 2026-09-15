import json, re, sys, gc, time
from pathlib import Path
from ollama import Client

MODEL = "qwen2.5vl:7b"
INPUT_DIR = Path("tilesflavor")
OUTPUT_DIR = Path("tilesflavor2")
OUTPUT_DIR.mkdir(exist_ok=True)


def filter_features(sf, csv_desc):
    """Filtre les features : garde l'ambiance, supprime les hallucinations."""
    csv_lower = csv_desc.lower()
    filtered_sf = {}
    safe_keys = ["roomSize", "roomShape", "lighting", "condition",
                 "architecturalDetails", "floorMarkings", "objectsOrFurniture",
                 "exits", "hazards", "atmosphere", "roomPurpose",
                 "csvDescription", "tileNumber"]

    for k, v in sf.items():
        if k in safe_keys:
            filtered_sf[k] = v

    central = sf.get("centralFeature", "")
    if central:
        central_lower = central.lower()
        is_hallucination = any(h in central_lower for h in ["autel","altar","tentacule","tentacle","skull","tete de mort","tête de mort"])
        if not is_hallucination:
            filtered_sf["centralFeature"] = central

    walls = sf.get("wallDecorations", [])
    if walls:
        has_hallucination = any(
            any(h in w.lower() for h in ["tentacule","tentacle","tete de mort","tête de mort","skull"])
            for w in walls
        )
        if not has_hallucination:
            filtered_sf["wallDecorations"] = walls

    return filtered_sf


def build_prompt(tile_num, csv_desc, filtered_sf, full_sf):
    """Construit le prompt de regeneration."""
    features_json = json.dumps(filtered_sf, indent=2, ensure_ascii=False)

    return (
        "Tu es un auteur de donjons pour jeux de role OSR (DCC, OSE, Shadowdark). "
        "Tu ecris en francais.\n\n"
        "Tu dois decrire une salle de donjon.\n\n"
        f"### DESCRIPTION DE L'AUTEUR (source de verite ABSOLUE) ###\n"
        f"C'est la seule donnee fiable sur le CONTENU de la salle. "
        f"Tu DOIS decrire CHAQUE element mentionne. Ne rien inventer qui contredise.\n"
        f'"{csv_desc}"\n\n'
        f"### AMBIANCE VISUELLE (complement) ###\n"
        f"Ces informations decrivent l'atmosphere et l'etat de la salle. "
        f"Utilise-les pour enrichir la description, mais ne les prefere PAS a la description de l'auteur.\n"
        f"{features_json}\n\n"
        "### REGLES IMPERATIVES ###\n"
        "1. La description de l'auteur est la BASE. Les details visuels sont un COMPLEMENT.\n"
        "2. Si la description de l'auteur mentionne un element (coffre, baril, escalier, "
        "fontaine, sarcophage, champignon, araignee, alligator, cheminée, etc.), "
        "tu DOIS le decrire en detail.\n"
        "3. NE PAS ajouter d'elements absents de la description de l'auteur.\n"
        "4. NE PAS mentionner de tentacules, autels, têtes de mort SAUF si "
        "la description de l'auteur le mentionne explicitement.\n\n"
        "### TITRE ###\n"
        "Cree un titre unique et evocateur, lie a ce que la salle contient.\n"
        "INTERDIT: 'Crypte des Anciens', 'Salle des Sacrifices', 'Salle des Anciens', "
        "'Chambre Sacrée', 'Abîme des Tentacules', 'Salle des Rituels'.\n\n"
        "### STYLE ###\n"
        "- 200 a 350 mots, deuxieme personne.\n"
        "- Evocateur, immersif, utilisable en jeu.\n"
        "- Pas de listes ni de markdown.\n"
        "- 3 a 8 tags.\n\n"
        "### JSON DE SORTIE ###\n"
        "{\n"
        f'    "{tile_num}": {{\n'
        '        "title": "",\n'
        '        "description": "",\n'
        '        "tags": [],\n'
        '        "sourceFeatures": ' + json.dumps(full_sf, ensure_ascii=False) + "\n"
        "    }\n"
        "}"
    )


def log_memory():
    import psutil
    p = psutil.Process()
    ram = p.memory_info().rss / 1024 / 1024
    sys_mem = psutil.virtual_memory()
    sys_free = sys_mem.available / 1024 / 1024 / 1024
    print(f"  [mem] RAM process: {ram:.0f} Mo | RAM libre: {sys_free:.1f} Go")


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--end", type=int, default=460)
    parser.add_argument("--delay", type=int, default=2)
    args = parser.parse_args()

    client = Client()
    total = args.end - args.start + 1
    skipped = 0
    done = 0

    print(f"=== Regeneration {args.start} -> {args.end} ({total} tuiles) ===")
    log_memory()

    for i, tile_num in enumerate(range(args.start, args.end + 1), 1):
        input_file = INPUT_DIR / f"tile_{tile_num}_analysis.json"
        output_file = OUTPUT_DIR / f"tile_{tile_num}_analysis.json"

        if not input_file.exists():
            print(f"\n--- [{i}/{total}] Tuile {tile_num} --- ABSENTE, skip")
            skipped += 1
            continue

        print(f"\n--- [{i}/{total}] Tuile {tile_num} ---")

        try:
            with open(input_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            tile = data.get(str(tile_num), data.get(tile_num, {}))
            sf = tile.get("sourceFeatures", {})
            csv_desc = sf.get("csvDescription", "")

            if not csv_desc:
                print("  Pas de csvDescription, skip")
                skipped += 1
                continue

            filtered_sf = filter_features(sf, csv_desc)
            prompt = build_prompt(tile_num, csv_desc, filtered_sf, sf)

            response = client.chat(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
            )

            content = response["message"]["content"]
            match = re.search(r"\{.*\}", content, re.DOTALL)

            if match:
                result = json.loads(match.group())
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                done += 1
                print(f"  [OK] {tile_num}")
            else:
                print(f"  [ERREUR] JSON non detecte")

        except Exception as e:
            print(f"  [ERREUR] {e}")

        if i < total:
            time.sleep(args.delay)

        if i % 10 == 0:
            gc.collect()
            log_memory()

    print(f"\n=== TERMINE - {done} regenerees, {skipped} sautees ===")


if __name__ == "__main__":
    main()
