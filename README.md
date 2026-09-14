# Draw My Dungeon - Générateur de donjons

Cette application web permet de créer des grilles de donjons à partir de tuiles image en sélectionnant des packs de tuiles, en les plaçant sur une grille et en les faisant pivoter facilement.

Le projet est basé sur une interface HTML/CSS/JavaScript simple, sans framework, et fonctionne directement dans un navigateur.

![Aperçu de l'application](screenshots/screen1.png)

## Fonctionnalités

- Sélection d'un dossier de tuiles depuis une liste déroulante
- Placement de tuiles aléatoires dans une grille
- Rotation des tuiles par clic
- Suppression d'une tuile par clic droit
- Redimensionnement de la grille (ajout/suppression de lignes et colonnes)
- Zoom avant/arrière avec auto-zoom au chargement
- Déplacement de tuiles par glisser-déposer (swap ou écrasement)
- Thème clair (parchemin) et sombre (donjon)
- Panneau **FLAVOR** : affiche les informations détaillées d'une tuile au survol (titre, description OSR immersive, tags, caractéristiques)
- Export PDF avec choix : grille seule ou grille + descriptions des salles
- Import/Export de la grille au format JSON
- Sauvegarde automatique dans le navigateur (localStorage)
- Compatible **file://** (ouverture directe) et serveur web

## Structure du projet

- [index.html](index.html) : page principale de l'application
- [style.css](style.css) : styles de l'interface (thème RPG Fantasy Old School Revival)
- [script.js](script.js) : logique principale (grille, placement, rotation, zoom, export PDF, panneau FLAVOR)
- [tile_configuration.js](tile_configuration.js) : configuration des dossiers de tuiles disponibles
- [tiles_index.js](tiles_index.js) : descriptions courtes des tuiles (dictionnaire `TILES_DESCRIPTIONS`)
- [tiles_flavor.js](tiles_flavor.js) : descriptions OSR détaillées des tuiles (variable `TILES_FLAVOR_DATA`, chargée au démarrage)
- [tileswebp/](tileswebp/) : images des tuiles au format WebP, classées par dossier
- [tilesflavor/](tilesflavor/) : fichiers JSON individuels par tuile (source des données de `tiles_flavor.js`)
- [Tiles_index.csv](Tiles_index.csv) : index original des tuiles (anglais)
- [Tiles_index_fr.csv](Tiles_index_fr.csv) : index des tuiles traduit en français
- [IA-stuffs/](IA-stuffs/) : scripts et prompts pour la génération automatique des descriptions OSR via IA

## Comment ça marche

1. L'application charge la configuration depuis `tile_configuration.js`.
2. Elle affiche les dossiers de tuiles disponibles dans la liste déroulante.
3. Quand vous sélectionnez un dossier, le moteur choisit aléatoirement une tuile parmi celles du dossier.
4. Un clic sur une cellule place une tuile.
5. Un autre clic sur la même tuile la fait tourner de 90°.
6. Un clic droit supprime la tuile.
7. Un cliquer-glisser permet de déplacer une tuile ou d'échanger sa position avec une autre.
8. Le panneau FLAVOR s'affiche automatiquement au survol d'une tuile (après 800ms) et reste visible jusqu'à ce qu'une autre tuile soit survolée.
9. Le bouton d'export PDF propose de n'exporter que la grille ou la grille avec les descriptions des salles.

## Structure attendue du répertoire tileswebp

Le dossier `tileswebp/` doit contenir des sous-dossiers, chacun correspondant à une famille de tuiles. Chaque sous-dossier contient des fichiers WebP.

```text
tileswebp/
  abyss/
    tile_287.webp
    tile_288.webp
  cave/
    tile_151.webp
    tile_152.webp
  donjon/
    tile_1.webp
    tile_6.webp
  room/
    tile_156.webp
  sewer/
    tile_241.webp
  stair/
    tile_181.webp
```

## Règles pour ajouter des tuiles

- Chaque sous-dossier de `tileswebp/` représente un "pack" de tuiles.
- Les fichiers doivent être au format WebP.
- Les noms de fichiers doivent correspondre à ceux déclarés dans `tile_configuration.js`.
- Le nom du sous-dossier est utilisé comme catégorie dans l'interface.

## Génération automatique de tile_configuration.js

Sous Windows, exécutez `genere_structure_js.bat` pour régénérer automatiquement le fichier de configuration à partir du contenu du dossier `tileswebp/`.

## Export PDF

L'export PDF fonctionne en **file://** (ouverture directe) comme sur serveur web. Le rendu est effectué manuellement via Canvas (sans dépendance CORS).

Lors du clic sur "Exporter en PDF", un modal propose :
- **Grille seule** : exporte uniquement la page 1 avec la grille
- **Grille + descriptions** : exporte la grille puis ajoute des pages avec les descriptions de chaque tuile (position, thumbnail, titre, description OSR complète) organisées en 2 colonnes

## Scripting : génération des descriptions OSR

Le dossier [IA-stuffs/](IA-stuffs/) contient les outils pour générer automatiquement les descriptions de donjon au style Old School Revival (OSR) à partir des images de tuiles.

### Principe

La génération se fait en **3 phases** via le script `description_tuile.py` :

1. **Analyse visuelle** (`phase1_vision`) : le modèle `qwen2.5vl:7b` (via Ollama) analyse l'image de la tuile et extrait les caractéristiques (`sourceFeatures` : taille, forme, éclairage, décorations, dangers, etc.)
2. **Génération narrative** (`phase2_writer`) : un prompt détaillé transforme les caractéristiques + la description CSV en une description immersive de 200-350 mots au style DCC/OSE/Shadowdark
3. **Post-traitement** : correction orthographique via LanguageTool, variation des ouvertures narratives (pour éviter les répétitions)

### Prérequis

```bash
cd IA-stuffs
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Installer Ollama et le modèle
ollama pull qwen2.5vl:7b
```

### Générer une tuile

```bash
cd IA-stuffs
analyser.bat <numero_tuile>

# Exemple :
analyser.bat 42
```

Le fichier `tile_42_analysis.json` est généré dans le répertoire courant.

### Générer toutes les tuiles

```bash
cd IA-stuffs
generer_tout.bat              # commence à la tuile 1
generer_tout.bat 100          # commence à la tuile 100
```

Les JSON sont déplacés automatiquement dans `tilesflavor/`.

### Traduire le CSV d'origine

Le fichier `Tiles_index.csv` (anglais) peut être traduit en français :

```bash
cd IA-stuffs
.venv\Scripts\python.exe traduire_csv.py
```

Le résultat est écrit dans `Tiles_index_fr.csv`.

### Modifier les prompts

Les prompts sont définis dans `description_tuile.py` :

- **`VISION_PROMPT`** (ligne 13) : prompt d'analyse visuelle envoyé à qwen2.5vl. Il définit les règles d'interprétation des formes sur les cartes (spirales = cercles rituels, croix = piliers, etc.)
- **Prompt de phase 2** (ligne 178, variable `writer_prompt`) : prompt du générateur de texte OSR. Il contient les règles stylistiques, les ouvertures bannies, la structure narrative obligatoire et le format de sortie JSON

Les prompts des différentes itérations sont also disponibles dans :
- `agent-ecrivain-osr.md` à `agent-ecrivain-osr-v4.md` : versions successives du prompt écrivain
- `agent-vision-osr.md` : prompt d'analyse visuelle

### Architecture du pipeline

```text
Tiles_index.csv ──► traduire_csv.py ──► Tiles_index_fr.csv
                                              │
tileswebp/tile_X.webp ──► description_tuile.py ──► tilesflavor/tile_X_analysis.json
                             │                          │
                             ├── phase1: vision (qwen2.5vl)   │
                             ├── phase2: writer (OSR)          │
                             ├── phase3: orthographe            │
                             └── phase4: variation ouvertures   │
                                                                 │
tiles_flavor.js ◄── génération batch (tilesflavor/*.json) ◄─────┘
```

## Utilisation

1. Ouvrir `index.html` dans un navigateur (ou via un serveur local comme Live Server)
2. Sélectionner un dossier de tuiles
3. Cliquer sur la grille pour placer des tuiles
4. Cliquer à nouveau pour les faire pivoter
5. Faire un clic droit pour les retirer
6. Glisser-déposer pour déplacer ou échanger des tuiles
7. Survoler une tuile pour afficher son panneau FLAVOR
8. Exporter en PDF avec le bouton dédié

## Notes techniques

- Le script charge les tuiles depuis `tileswebp/<dossier>/<fichier>`
- Le panneau FLAVOR utilise des données pré-générées (`tiles_flavor.js`) pour fonctionner en local sans requête CORS
- L'export PDF utilise un rendu Canvas manuel (pas `html2canvas`) pour être compatible `file://`
- La rotation est gérée en CSS (`transform: rotate()`) et prise en compte dans l'export PDF
- Le zoom s'adapte automatiquement à la taille de la grille (`autoFitZoom`)

## Licence

Ce projet est fourni à titre pédagogique et peut être adapté librement selon vos besoins.
