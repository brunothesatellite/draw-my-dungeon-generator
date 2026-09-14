# Agent Vision OSR pour Draw My Dungeon

## Objectif

Créer un agent OpenCode capable d'analyser automatiquement les images WebP des tuiles puis de générer une description fixe et définitive pour chaque salle.

L'IA n'est utilisée qu'une seule fois lors de la génération des données.

La webapp finale ne dépend d'aucune IA.

---

## Pipeline recommandé

```text
Tile_459.webp
        │
        ▼
Analyse visuelle IA
        │
        ▼
Résumé structuré
        │
        ├── éléments détectés
        ├── thème probable
        ├── architecture
        ├── ambiance
        └── objets remarquables
        ▼
Fusion avec Tiles_index.csv
        ▼
Génération du lore
        ▼
tile_descriptions.json
```

---

## Pourquoi analyser l'image ?

Le CSV contient souvent des descriptions très courtes.

Exemple :

```csv
459,Abyss,Large room
460,Abyss,Large room
```

Si l'agent lit uniquement le CSV, il risque de produire deux salles très proches.

En lisant l'image il peut au contraire détecter :

- un autel
- une faille
- des chaînes
- un puits
- des colonnes brisées
- un escalier
- un sarcophage
- un cercle magique

Ces éléments orienteront la génération et éviteront les doublons.

---

## Ce que l'agent doit faire

### Étape 1

Parcourir tous les fichiers du dossier :

```text
tileswebp/
```

### Étape 2

Pour chaque image :

- ouvrir l'image
- analyser son contenu
- identifier les éléments remarquables
- résumer la scène

Exemple :

```json
{
  "theme": "crypt",
  "size": "large",
  "objects": [
    "altar",
    "bones",
    "pillars"
  ],
  "condition": "ruined"
}
```

### Étape 3

Lire la ligne correspondante dans :

```text
Tiles_index.csv
```

### Étape 4

Fusionner :

- les informations du CSV
- les informations visuelles
- l'identifiant de la tuile

### Étape 5

Générer :

- un titre unique
- une description OSR en français

### Étape 6

Sauvegarder le résultat dans :

```json
{
  "459": {
    "title": "Le Caveau des Sept Clous",
    "description": "..."
  }
}
```

---

## Gestion des doublons

Même si deux lignes du CSV sont identiques, les descriptions ne doivent jamais être identiques.

L'agent doit :

- prendre en compte l'analyse visuelle
- prendre en compte le numéro de tuile
- comparer avec les descriptions déjà produites
- éviter de réutiliser les mêmes idées

---

## Graine déterministe

Utiliser le numéro de tuile comme seed.

Exemple :

```text
seed = tileId
```

Conséquences :

- Tile 459 produit toujours le même résultat.
- Tile 460 produit toujours un autre résultat.
- La génération est reproductible.

---

## Sortie finale

La webapp ne doit jamais appeler l'IA.

Elle doit uniquement :

```text
Ouverture de la tuile
        ▼
Lecture du JSON
        ▼
Affichage du titre
        ▼
Affichage de la description
```

Le projet reste ainsi portable, rapide et compatible avec GitHub Pages ou une utilisation hors ligne.
