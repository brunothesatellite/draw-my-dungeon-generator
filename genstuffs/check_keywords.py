import json, os, re, unicodedata

TILES_DIR = "tilesflavor2"

STOP_WORDS = {
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

ABSTRACT_WORDS = {
    "magique", "étrange", "étranges", "ancien", "ancienne", "anciens",
    "mystérieux", "mystérieuse", "sombre", "sombres", "sinistre",
    "effrayant", "effrayante", "lugubre", "menaçant", "menaçante",
    "obscur", "obscure", "magiques", "ouvert", "ouverte", "ouverts", "ouvertes",
    "complet", "complète", "complets", "complètes",
}

# Mêmes synonymes que regenerer_descriptions.py
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

def extract_concrete(csv_desc):
    text = csv_desc.lower()
    text = re.sub(r"[/\\]", " ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    words = text.split()
    concrete = []
    for w in words:
        if w in STOP_WORDS or len(w) <= 2:
            continue
        if w in ABSTRACT_WORDS:
            continue
        concrete.append(w)
    return list(dict.fromkeys(concrete))

def word_in_desc(word, desc_lower):
    if word in desc_lower:
        return True
    variants = [word + "s", word + "es", word.rstrip("s"), word.rstrip("es")]
    if any(v in desc_lower for v in variants):
        return True
    syns = SYNONYMS.get(word, [])
    if any(s in desc_lower for s in syns):
        return True
    return False

ok = 0
missing_count = 0
no_csv = 0
missing_tiles = []

for fname in sorted(os.listdir(TILES_DIR)):
    if not fname.startswith("tile_") or not fname.endswith("_analysis.json"):
        continue
    fpath = os.path.join(TILES_DIR, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    tile_key = fname.replace("tile_", "").replace("_analysis.json", "")
    tile_data = data.get(tile_key, {})
    
    sf = tile_data.get("sourceFeatures", {})
    csv_desc = sf.get("csvDescription", "")
    desc = tile_data.get("description", "")
    
    if not csv_desc:
        no_csv += 1
        continue
    
    if not desc:
        missing_count += 1
        missing_tiles.append((tile_key, csv_desc, ["(description vide)"]))
        continue
    
    concrete = extract_concrete(csv_desc)
    desc_lower = desc.lower()
    
    still_missing = [w for w in concrete if not word_in_desc(w, desc_lower)]
    
    if still_missing:
        missing_count += 1
        missing_tiles.append((tile_key, csv_desc, still_missing))
    else:
        ok += 1

print(f"=== RESULTATS ===")
print(f"OK:       {ok}")
print(f"MANQUANT: {missing_count}")
print(f"PAS CSV:  {no_csv}")
print(f"TOTAL:    {ok + missing_count + no_csv}")
print()
if missing_tiles:
    print("=== TUILES A REPRENDRE ===")
    for tile_num, csv, elems in sorted(missing_tiles, key=lambda x: int(x[0]) if x[0].isdigit() else 0):
        print(f"  Tile {tile_num}: {csv}")
        print(f"    Manquant: {', '.join(elems)}")
