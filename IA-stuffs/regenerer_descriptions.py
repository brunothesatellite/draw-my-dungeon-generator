import json, re, sys, gc, time
from pathlib import Path
from ollama import Client

MODEL = "qwen2.5vl:7b"
INPUT_DIR = Path("tilesflavor")
OUTPUT_DIR = Path("tilesflavor2")
OUTPUT_DIR.mkdir(exist_ok=True)


def extract_keywords(csv_desc: str) -> tuple:
    """Extrait les mots-clés d'une csvDescription. Retourne (concrets, abstraits)."""
    import re
    stop_words = {
        "avec", "dans", "pour", "sur", "sous", "chez", "vers", "entre",
        "une", "des", "les", "un", "du", "de", "la", "le", "et", "ou",
        "est", "sont", "été", "être", "avoir", "fait", "faites",
        "ce", "se", "ne", "pas", "plus", "moins", "très", "peu",
        "que", "qui", "quoi", "où", "comment", "quand",
        "je", "tu", "il", "elle", "nous", "vous", "ils", "elles",
        "mon", "ton", "son", "ma", "ta", "sa", "mes", "tes", "ses",
        "par", "comme", "mais", "aussi", "quelque", "quelques",
        "tout", "tous", "toute", "toutes", "autre", "autres",
        "même", "mêmes", "encore", "bien", "mal", "ici",
        "salle", "couloir", "passage", "corridor", "pièce",
    }
    abstract_words = {
        "magique", "étrange", "étranges", "ancien", "ancienne", "anciens",
        "mystérieux", "mystérieuse", "sombre", "sombres", "sinistre",
        "effrayant", "effrayante", "lugubre", "menaçant", "menaçante",
        "obscur", "obscure", "magiques", "ouvert", "ouverte", "ouverts", "ouvertes",
        "complet", "complète", "complets", "complètes",
    }
    text = csv_desc.lower()
    text = re.sub(r"[/\\]", " ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    words = text.split()
    concrets = []
    abstracts = []
    for w in words:
        if w in stop_words or len(w) <= 2:
            continue
        if w in abstract_words:
            abstracts.append(w)
        else:
            concrets.append(w)
    return list(dict.fromkeys(concrets)), list(dict.fromkeys(abstracts))


# Synonymes acceptés pour la vérification
SYNONYMS = {
    "égout": ["souterrain", "canalisation", "drainage", "égouts"],
    "souterrain": ["égout", "canalisation"],
    "couloir": ["corridor", "passage", "couloirs"],
    "corridor": ["couloir", "passage", "corridors"],
    "tonneau": ["baril", "tonneaux", "barils"],
    "baril": ["tonneau", "barils", "tonneaux"],
    "caisse": ["coffre", "boîte", "caisses", "coffres", "boîtes"],
    "coffre": ["caisse", "boîte", "coffres", "caisses", "boîtes"],
    "boîte": ["caisse", "coffre", "boîtes", "caisses", "coffres"],
    "escalier": ["marches", "rampe", "escaliers"],
    "escaliers": ["escalier", "marches", "rampe"],
    "colonne": ["pilier", "colonnade", "colonnes", "piliers"],
    "pilier": ["colonne", "colonnade", "piliers", "colonnes"],
    "porte": ["entrée", "sortie", "ouverture", "portes"],
    "dessin": ["gravure", "symbole", "marque", "peinture", "dessins", "gravures", "symboles", "marques"],
    "gravure": ["dessin", "symbole", "marque", "gravures"],
    "trou": ["ouverture", "passage", "trous"],
    "grille": ["barreaux", "treillis", "grilles"],
    "table": ["pupitre", "tables"],
    "chaise": ["tabouret", "chaises", "tabourets"],
    "étagère": ["rayon", "étagères", "rayons"],
    "sarcophage": ["tombe", "cercueil", "sarcophages", "tombes", "cercueils"],
    "tombe": ["sarcophage", "cercueil", "tombes", "cercueils"],
    "fontaine": ["bassin", "fontaines", "bassins"],
    "bassin": ["fontaine", "bassins", "fontaines"],
    "araignée": ["araignées"],
    "grotte": ["caverne", "antre", "grottes"],
    "abîme": ["gouffre", "précipice", "abîmes", "gouffres"],
    "gouffre": ["abîme", "précipice", "gouffres"],
    "obélisque": ["monolithe", "obélisques", "monolithes"],
    "statue": ["figurine", "sculpture", "statues", "figurines", "sculptures"],
    "lit": ["couche", "grabat", "lits", "couches", "grabats"],
    "cheminée": ["foyer", "âtre", "cheminées"],
    "prison": ["cellule", "geôle", "prisons", "cellules", "geôles"],
    "cellule": ["prison", "geôle", "cellules", "geôles"],
    "mur": ["paroi", "murs", "parois"],
    "sol": ["pavé", "dallage", "sols", "pavés", "dallages"],
    "eau": ["flaque", "mare", "eaux", "flaques", "mares"],
    "monstre": ["créature", "bête", "monstres", "créatures", "bêtes"],
    "créature": ["monstre", "bête", "créatures", "monstres", "bêtes"],
    "trésor": ["richesse", "butin", "trésors", "richesses", "butins"],
    "piège": ["trap", "snare", "pièges", "trappes"],
    "épée": ["lame", "sabre", "épées", "lames", "sabres"],
    "potion": ["elixir", "philtre", "potions", "elixirs", "philtres"],
    "livre": ["tome", "grimoire", "livres", "tomes", "grimoires"],
    "bougie": ["chandelle", "torche", "bougies", "chandelles", "torches"],
    "corde": ["cordage", "liane", "cordes", "cordages", "lianes"],
    "pont": ["passerelle", "viaduc", "ponts", "passerelles", "viaducs"],
    "arche": ["arc", "passerelle", "arches"],
    "escalier descendant": ["descente", "pente descendante"],
    "escalier montant": ["montée", "pente montante"],
    "champignon": ["champignons", "champignon"],
    "dragon": ["dragons"],
    "vortex": ["tourbillon", "vortex"],
    "grille carrée": ["carré", "quadrangulaire"],
}


def keywords_present(keywords: list, description: str) -> list:
    """Vérifie quels mots-clés sont présents dans la description. Retourne les manquants."""
    desc_lower = description.lower()
    missing = []
    for kw in keywords:
        if kw in desc_lower:
            continue
        # Variations : pluriel, singulier
        variants = [kw + "s", kw + "es", kw.rstrip("s"), kw.rstrip("es")]
        if any(v in desc_lower for v in variants):
            continue
        # Synonymes
        syns = SYNONYMS.get(kw, [])
        if any(s in desc_lower for s in syns):
            continue
        missing.append(kw)
    return missing


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
    concrets, abstracts = extract_keywords(csv_desc)
    keywords_str = ", ".join(concrets)

    return (
        "Tu es un auteur de donjons pour jeux de role OSR (DCC, OSE, Shadowdark). "
        "Tu ecris en francais.\n\n"
        "Tu dois decrire un lieu de donjon.\n\n"
        "### DESCRIPTION DE L'AUTEUR (source de verite ABSOLUE) ###\n"
        "C'est la seule donnee fiable sur le CONTENU et le TYPE de lieu.\n"
        "Tu DOIS respecter le type de lieu mentionne.\n"
        'Si la description dit "couloir", c est un couloir, PAS une salle.\n'
        'Si la description dit "grotte", c est une grotte, PAS une salle.\n'
        'Si la description dit "escalier", decris l escalier.\n'
        'Si la description dit "riviere", decris la riviere.\n'
        'Si la description dit "egout", decris l egout.\n'
        'Si la description dit "abime", decris l abime.\n'
        'Ne JAMAIS remplacer le type de lieu par "salle" ou "piece".\n\n'
        f'"{csv_desc}"\n\n'
        f"### MOTS-CLES OBLIGATOIRES ###\n"
        f"Les mots suivants doivent IMPERATIVEMENT apparaitre dans ta description :\n"
        f"**{keywords_str}**\n"
        f"Chaque mot doit etre mentionne au moins une fois.\n"
        f"Tu peux utiliser des synonymes (baril=tonneau, pilier=colonne, etc.).\n"
        f"Si tu oublies un mot, la description sera REJETEE.\n\n"
        "### AMBIANCE VISUELLE (complement) ###\n"
        "Ces informations decrivent l'atmosphere et l'etat du lieu. "
        "Utilise-les pour enrichir la description, mais ne les prefere PAS a la description de l'auteur.\n"
        f"{features_json}\n\n"
        "### REGLES IMPERATIVES ###\n"
        "1. La description de l'auteur est la BASE. Les details visuels sont un COMPLEMENT.\n"
        "2. Respecte le TYPE de lieu (couloir, grotte, salle, etc.).\n"
        "3. Si la description mentionne un element (coffre, baril, escalier, "
        "fontaine, sarcophage, champignon, araignee, alligator, cheminée, etc.), "
        "tu DOIS le decrire en detail.\n"
        "4. NE PAS ajouter d'elements absents de la description de l'auteur.\n"
        "5. NE PAS mentionner de tentacules, autels, têtes de mort, cercles rituels, "
        "sang, squelettes, crânes, momies, zombies, squelette, "
        "SAUF si la description de l'auteur le mentionne explicitement.\n"
        "6. Les mots-cles OBLIGATOIERS doivent tous apparaitre.\n"
        "7. NE PAS ecrire 'salle des anciens', 'crypte des anciens' ou tout titre avec 'des anciens'.\n\n"
        "### TITRE ###\n"
        "Cree un titre unique et evocateur, lie a ce que le lieu contient.\n"
        "Le titre doit refleter le type de lieu (Couloir, Grotte, Passage, etc.).\n"
        "Le titre doit contenir un element concret du lieu (pas 'des anciens').\n"
        "INTERDIT: 'Crypte des Anciens', 'Salle des Sacrifices', 'Salle des Anciens', "
        "'Chambre Sacrée', 'Abîme des Tentacules', 'Salle des Rituels', "
        "tout titre se terminant par 'des Anciens', tout titre avec 'Anciens'.\n\n"
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


_initial_ram = None

def log_memory():
    global _initial_ram
    import psutil
    p = psutil.Process()
    ram = p.memory_info().rss / 1024 / 1024
    sys_mem = psutil.virtual_memory()
    sys_free = sys_mem.available / 1024 / 1024 / 1024
    if _initial_ram is None:
        _initial_ram = sys_free
    delta = _initial_ram - sys_free
    print(f"  [mem] RAM process: {ram:.0f} Mo | RAM libre: {sys_free:.1f} Go (delta: {delta:+.1f} Go)")


def restart_ollama():
    """Tue et relance ollama pour liberer la memoire."""
    import subprocess, time
    print("  [ollama] Arret d'ollama...")
    subprocess.run(["taskkill", "/F", "/IM", "ollama.exe"], capture_output=True)
    time.sleep(2)
    print("  [ollama] Demarrage...")
    subprocess.Popen(["C:/Users/bruno/AppData/Local/Programs/Ollama/ollama.exe", "serve"],
                     creationflags=subprocess.DETACHED_PROCESS)
    time.sleep(5)
    # Verifier que le modele est dispo
    from ollama import Client
    client = Client()
    client.list()
    print("  [ollama] Pret")


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
            skipped += 1
            continue

        print(f"\n--- [{i}/{total}] Tuile {tile_num} ---")

        try:
            with open(input_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            tile = data.get(str(tile_num), data.get(tile_num, {}))
            sf = tile.get("sourceFeatures", {})
            csv_desc = sf.get("csvDescription", "")
            del data, tile

            if not csv_desc:
                print("  Pas de csvDescription, skip")
                skipped += 1
                continue

            filtered_sf = filter_features(sf, csv_desc)

            # Retry jusqu'a 3 fois
            saved = False
            for attempt in range(3):
                prompt = build_prompt(tile_num, csv_desc, filtered_sf, sf)
                response = client.chat(
                    model=MODEL,
                    messages=[{"role": "user", "content": prompt}],
                )
                content = response["message"]["content"]
                del response

                # Extraire JSON (gere les blocs markdown)
                json_str = None

                # 1. Essayer bloc markdown
                code_block = re.search(r"```(?:json)?\s*(.*?)\s*```", content, re.DOTALL)
                raw = code_block.group(1) if code_block else content

                # 2. Extraire l'objet principal {"tile_num": {...}}
                key = f'"{tile_num}"'
                key_pos = raw.find(key)
                if key_pos >= 0:
                    # Remonter au { precedant la cle
                    start = raw.rfind("{", 0, key_pos)
                    if start >= 0:
                        depth = 0
                        for i in range(start, len(raw)):
                            if raw[i] == "{": depth += 1
                            elif raw[i] == "}":
                                depth -= 1
                                if depth == 0:
                                    json_str = raw[start:i+1]
                                    break

                # Fallback : si pas de clé, prendre le premier objet JSON complet
                if not json_str:
                    start = raw.find("{")
                    if start >= 0:
                        depth = 0
                        for i in range(start, len(raw)):
                            if raw[i] == "{": depth += 1
                            elif raw[i] == "}":
                                depth -= 1
                                if depth == 0:
                                    candidate = raw[start:i+1]
                                    try:
                                        parsed = json.loads(candidate)
                                        if isinstance(parsed, dict) and any(k.isdigit() for k in parsed):
                                            json_str = candidate
                                        elif isinstance(parsed, dict) and "description" in parsed:
                                            json_str = json.dumps({str(tile_num): parsed}, ensure_ascii=False)
                                    except json.JSONDecodeError:
                                        pass
                                    break

                # Dernier recours : parser directement le raw
                if not json_str:
                    try:
                        parsed = json.loads(raw)
                        if isinstance(parsed, dict):
                            if str(tile_num) in parsed:
                                json_str = json.dumps(parsed, ensure_ascii=False)
                            elif "description" in parsed:
                                json_str = json.dumps({str(tile_num): parsed}, ensure_ascii=False)
                    except json.JSONDecodeError:
                        pass

                if not json_str:
                    print(f"  [retry {attempt+1}/3] Pas de JSON (key='{key}' found={key_pos >= 0})")
                    del content, json_str
                    time.sleep(args.delay)
                    continue

                try:
                    result = json.loads(json_str)
                except json.JSONDecodeError as e:
                    print(f"  [retry {attempt+1}/3] JSON invalide: {e}")
                    del content, json_str
                    time.sleep(args.delay)
                    continue

                # Verifier que les mots-cles sont presents dans la description
                concrets, abstracts = extract_keywords(csv_desc)
                tile_data = result.get(str(tile_num), result.get(tile_num, {}))
                desc = tile_data.get("description", "")
                missing = keywords_present(concrets, desc)
                if missing:
                    print(f"  [retry {attempt+1}/3] Mots-cles manquants: {', '.join(missing)}")
                    del result, content, json_str
                    time.sleep(args.delay)
                    continue

                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                del result, content, json_str, prompt
                saved = True
                done += 1
                print(f"  [OK] {tile_num}")
                break

            if not saved:
                print(f"  [ERREUR] 3 tentatives echouees")

            del sf, csv_desc, filtered_sf

        except Exception as e:
            print(f"  [ERREUR] {e}")

        gc.collect()

        if i < total:
            time.sleep(args.delay)

        if i % 10 == 0:
            log_memory()

        # Restart ollama toutes les 50 tuiles pour liberer la memoire
        if i % 50 == 0 and i < total:
            restart_ollama()
            client = Client()

    print(f"\n=== TERMINE - {done} regenerees, {skipped} sautees ===")


if __name__ == "__main__":
    main()
