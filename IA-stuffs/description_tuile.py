import sys
import json
import re
import csv
import argparse
from pathlib import Path
from ollama import Client

MODEL = "qwen2.5vl:7b"
TILES_DIR = Path("tileswebp")
CSV_FILE = Path("Tiles_index_fr.csv") if Path("Tiles_index_fr.csv").exists() else Path("Tiles_index.csv")

VISION_PROMPT = """Tu es un expert en cartographie de donjons pour jeux de rôle.

Cette image est une carte de salle de donjon vue du dessus, dessinée à la main.

Ignore :
- le numéro de la tuile
- le style du dessin
- les artefacts graphiques

Règles d'interprétation :
- Les formes spirales au sol = cercles rituels, glyphes runiques, enchantements anciens.
- Les motifs sur les murs = reliefs sculptés, têtes de mort, tentacules, tentures.
- Les formes en croix = piliers, colonnes, statues, autels.
- Les formes centrales = créatures, autels, trésors, pièges, mobilier.
- Les lignes et hachures = textures de pierre, bois pourri, eau stagnante.
- Ne décris JAMAIS de formes géométriques pures (carré, cercle, croix).
- Chaque forme doit être interprétée comme un objet physique de donjon.

Retourne UNIQUEMENT un JSON valide :

{
    "roomSize": "",
    "roomShape": "",
    "lighting": "",
    "condition": "",
    "centralFeature": "",
    "wallDecorations": [],
    "floorMarkings": [],
    "architecturalDetails": [],
    "objectsOrFurniture": [],
    "creaturesOrTraces": [],
    "exits": [],
    "hazards": [],
    "atmosphere": "",
    "roomPurpose": ""
}"""


def find_tile_image(tile_number: int) -> Path:
    """Cherche l'image de la tuile avec différents patterns de nommage."""
    candidates = [
        TILES_DIR / f"tile_{tile_number}.webp",
        TILES_DIR / f"Tile_{tile_number}.webp",
        TILES_DIR / f"Tile {tile_number}.webp",
        TILES_DIR / f"tile {tile_number}.webp",
    ]
    for p in candidates:
        if p.exists():
            return p
    raise FileNotFoundError(
        f"Aucune image trouvée pour la tuile {tile_number} dans {TILES_DIR}/"
    )


def get_csv_description(tile_number: int) -> str:
    """Lit la description courte depuis Tiles_index.csv."""
    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)  # skip header
        for row in reader:
            if row and row[0].strip() == str(tile_number):
                return row[1].strip() if len(row) > 1 else ""
    return ""


def extract_json(text: str) -> dict:
    """Extrait le premier JSON trouvé dans le texte."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("Aucun JSON détecté dans la réponse")
    return json.loads(match.group())


def corriger_texte(texte: str) -> str:
    """Corrige grammaire et orthographe du texte français via LanguageTool."""
    import language_tool_python
    tool = language_tool_python.LanguageTool("fr")
    matches = tool.check(texte)
    if matches:
        print(f"  [ortho] {len(matches)} erreur(s) corrigee(s)")
    return language_tool_python.utils.correct(texte, matches)


import random

OUVERTURES_BANNEES = [
    "lorsque tu pénètres", "tu pénètres", "tu entres dans",
    "la salle", "devant toi", "tu découvres", "cette pièce",
    "un frisson te parcourt", "la lumière", "l'odeur",
    "la porte s'ouvre", "tu aperçois", "l'espace",
    "la crypte", "le passage", "un corridor",
]

OPENINGS = [
    "{feature}. {room}",
    "{mood}. {room}",
    "{room} {feature}.",
    "{detail}. {room}",
    "{smell}. {room}",
    "{room} {mood}.",
]


def varier_ouverture(texte: str, tile_number: int, features: dict) -> str:
    """Remplace les ouvertures bannies par des variantes basées sur les features."""
    lower = texte.lower()
    for banni in OUVERTURES_BANNEES:
        if lower.startswith(banni):
            random.seed(tile_number)
            room_size = features.get("roomSize", "")
            mood = features.get("atmosphere", "")
            central = features.get("centralFeature", "")
            detail = ""
            if features.get("wallDecorations"):
                detail = features["wallDecorations"][0]
            elif features.get("floorMarkings"):
                detail = features["floorMarkings"][0]

            # Extraire le contenu après la première phrase
            parts = texte.split(".", 1)
            rest = parts[1].strip() if len(parts) > 1 else ""
            if not rest:
                rest = texte

            # Construire une nouvelle phrase d'accroche
            accroches = []
            if central:
                accroches.append(f"Un {central} occupe le centre de l'espace.")
            if detail:
                accroches.append(f"Des {detail} couvrent les murs.")
            if mood:
                accroches.append(f"L'ambiance {mood} pèse sur la pièce.")

            if not accroches:
                accroches = ["Un espace silencieux."]

            new_opening = random.choice(accroches) + " "
            print(f"  [style] Ouverture variee (tuile {tile_number})")
            return new_opening + rest
    return texte


def phase1_vision(client: Client, tile_path: Path) -> dict:
    """Analyse visuelle de la tuile avec qwen2.5vl."""
    print(f"  [1/2] Analyse visuelle de {tile_path.name}...")
    response = client.chat(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": VISION_PROMPT,
                "images": [str(tile_path)],
            }
        ],
    )
    content = response["message"]["content"]
    return extract_json(content)


def phase2_writer(client: Client, tile_number: int, csv_desc: str, features: dict) -> dict:
    """Génère la description OSR détaillée à partir des features extraites."""
    print("  [2/2] Génération de la description OSR...")

    features_json = json.dumps(features, indent=2, ensure_ascii=False)

    writer_prompt = (
        "Tu es un auteur spécialisé dans Dungeon Crawl Classics, Old School Essentials, "
        "Shadowdark, Sword & Sorcery et la fantaisie sombre.\n\n"
        "Tu écris exclusivement en français.\n\n"
        "Transforme les données suivantes en une description immersive et vivante "
        "pour un jeu de rôle.\n\n"
        f"Identifiant de la tuile : {tile_number}\n"
        f"Description CSV : {csv_desc}\n\n"
        f"Features extraites de l'image :\n{features_json}\n\n"
        "--- SOURCE DE VÉRITÉ ---\n"
        "La description CSV est la base. Elle décrit ce que la salle contient RÉELLEMENT.\n"
        "Tout le reste (features visuelles) est un COMPLÉMENT qui ajoute du détail.\n"
        "Tu ne dois JAMAIS ignorer un élément mentionné dans la CSV.\n"
        "Si la CSV dit '4 colonnes', tu dois mentionner 4 colonnes.\n"
        "Si la CSV dit 'old one drawing', tu dois interpréter (créature ancienne, tentacules, etc.).\n"
        "Si la CSV dit 'barrels', tu dois mentionner des barils.\n"
        "Les features visuelles viennent EN PLUS de la CSV, pas à la place.\n\n"
        "--- STYLE LITTÉRAIRE ---\n"
        "Chaque description doit être UNIQUE. Tu dois varier EN PERMANENCE :\n\n"
        "INTERDICTION ABSOLUE - Ces phrases sont BANNIES :\n"
        "- 'Lorsque tu pénètres dans...'\n"
        "- 'Tu pénètres dans...'\n"
        "- 'Tu entres dans...'\n"
        "- 'La salle...'\n"
        "- 'Devant toi...'\n"
        "- 'Tu découvres...'\n"
        "- 'Cette pièce...'\n"
        "- 'Un frisson te parcourt...'\n"
        "- 'La lumière...'\n"
        "- 'L'odeur...'\n"
        "- 'La porte s'ouvre...'\n"
        "- 'Tu aperçois...'\n"
        "- 'L'espace...'\n"
        "- 'La crypte...'\n"
        "- 'Le passage...'\n"
        "- 'Un corridor...'\n\n"
        "EXEMPLES D'OUVERTURES AUTORISÉES (à ne pas copier, juste pour l'inspiration) :\n"
        "- 'Trois marches usées, puis le vide. Le sol s'ouvre sur une crypte rectangulaire.'\n"
        "- 'Le crâne gravé dans le linteau t'observe. Sous ses orbites, un escalier.'\n"
        "- 'Un cloisonnement de pierre. Quatre colonnes. Un autel au centre.'\n"
        "- 'Le sang a séché sur les murs depuis longtemps. Les glyphes, non.'\n"
        "- 'Passage étroit, mur de gauche, mur de droite. Puis ça s'ouvre.'\n"
        "- 'L'eau coule encore. Quelque part, un murmure.'\n"
        "- 'Tu ne sens pas la pièce avant de la voir. Chaleur humide, odeur de soufre.'\n\n"
        "VARIÉTÉ OBLIGATOIRE :\n"
        "- Les ouvertures : phrases courtes, longues, interrogatives, elliptiques, "
        "in media res, flashbacks, dialogues intérieurs, métaphores.\n"
        "- Le vocabulaire : synonymes rares, termes archaïques, images poétiques. "
        "Ne répète JAMAIS le même mot-clé entre deux tuiles.\n"
        "- Le rythme : alterne phrases saccadées et phrases fluides.\n"
        "- Le point de vue : descriptif, intime, omniscient, journalistique, épistolaire.\n"
        "- L'humeur : glauque, épique, humoristique, surréaliste, mélancolique.\n"
        "- Les connecteurs : commence TOUJOURS différemment.\n\n"
        "--- STRUCTURE NARRATIVE ---\n"
        "La description doit suivre cet ordre (sans les nommer explicitement) :\n"
        "1. Ce que le personnage VOIT en entrant (luminosité, impression générale)\n"
        "2. La salle elle-même (murs, sol, plafond, matériaux, état)\n"
        "3. L'élément central (créature, autel, piège, trésor)\n"
        "4. Les détails qui attirent l'attention (inscriptions, objets, traces)\n"
        "5. Ce que le personnage RESSENT (odeur, température, ambiance)\n"
        "6. Un élément qui crée la TENSION (menace latente, son étrange)\n\n"
        "--- RÈGLES ---\n"
        "- Tu dois produire UN OBJET JSON unique (pas de texte avant ou après).\n"
        "- Longueur de la description : entre 200 et 350 mots.\n"
        "- Écrire à la deuxième personne.\n"
        "- Le texte doit être évocateur, immersif et immédiatement utilisable en jeu.\n"
        "- Ne jamais produire de listes, tableaux ou markdown dans le champ description.\n"
        "- Tous les éléments doivent être intégrés dans une narration naturelle.\n"
        "- Le texte doit donner envie d'explorer cette salle.\n"
        "- Chaque mot doit paraître choisi, jamais automatique.\n\n"
        "--- PNJ (40% de chance) ---\n"
        "Si présent, décrire apparence, équipement, attitude.\n"
        "Émotion : colère, méfiance, neutralité, effroi, ruse ou amical.\n"
        "Comportement : pragmatique, prudent, courageux, empathique, agressif ou spirituel.\n\n"
        "--- CHOIX OBLIGATOIRES ---\n"
        "- 1 perception dominante (Vue, Ouïe, Pensées, Sensations, Mouvement ou Odeur)\n"
        "- 1 impact narratif (rebondissement, bonne surprise, changement de l'environnement, "
        "le jeu en vaut la chandelle, mauvaise surprise ou moment de calme)\n"
        "- 1 activité possible (développement de mes compétences, préparation, repos, "
        "événement inattendu, balade, repas et nourriture)\n"
        "- 1 élément climatique (courant d'air glacial, humidité, brume, vent, chaleur ou froid)\n\n"
        "Produire entre 3 et 8 tags.\n\n"
        "JSON de sortie :\n"
        "{\n"
        f'    "{tile_number}": {{\n'
        '        "title": "",\n'
        '        "description": "",\n'
        '        "tags": [],\n'
        '        "sourceFeatures": ' + json.dumps(features, ensure_ascii=False) + "\n"
        "    }\n"
        "}"
    )

    response = client.chat(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": writer_prompt,
            }
        ],
    )
    content = response["message"]["content"]
    return extract_json(content)


def main():
    parser = argparse.ArgumentParser(description="Analyse OSR d'une tuile de donjon")
    parser.add_argument("tile_number", type=int, help="Numero de la tuile a analyser")
    parser.add_argument("--no-correct", action="store_true", help="Desactiver la correction orthographique")
    args = parser.parse_args()

    tile_number = args.tile_number
    do_correct = not args.no_correct

    tile_path = find_tile_image(tile_number)
    csv_desc = get_csv_description(tile_number)

    print(f"Tuile {tile_number} : {tile_path.name}")
    if csv_desc:
        print(f"  CSV : {csv_desc}")

    client = Client()

    # Phase 1 : analyse visuelle
    features = phase1_vision(client, tile_path)
    print(f"  Features : {json.dumps(features, ensure_ascii=False)[:120]}...")

    # Phase 2 : generation OSR
    result = phase2_writer(client, tile_number, csv_desc, features)

    # Phase 3 : correction orthographique
    if do_correct:
        print("  [3/3] Correction orthographique...")
        tile_data = result.get(str(tile_number), result)
        if "description" in tile_data:
            tile_data["description"] = corriger_texte(tile_data["description"])
        if "title" in tile_data:
            tile_data["title"] = corriger_texte(tile_data["title"])

    # Phase 4 : variation des ouvertures
    tile_data = result.get(str(tile_number), result)
    if "description" in tile_data:
        tile_data["description"] = varier_ouverture(tile_data["description"], tile_number, features)

    # Ajouter la description CSV dans sourceFeatures
    if "sourceFeatures" not in tile_data:
        tile_data["sourceFeatures"] = {}
    tile_data["sourceFeatures"]["csvDescription"] = csv_desc
    tile_data["sourceFeatures"]["tileNumber"] = tile_number

    # Sauvegarde
    output_file = Path(f"tile_{tile_number}_analysis.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Description enregistree dans {output_file}")


if __name__ == "__main__":
    main()
