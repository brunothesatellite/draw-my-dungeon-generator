**TODO**
* ensuite générer pour chaque description de tuile un flavor text dans l'esprit OSR/DCC avec la possibilité d'une rencontre, d'un loot, d'un piège ou d'un combat. Pour le combat 3 tiers de difficulté. S'inspirer de Axelbane Deck of Dungeons
* remplacer ensuite la description de la tuile par le texte généré par l'IA pour du solo.


Prompt AGENT VISION
*******************
Travaille dans D:\VS_Code_Workspaces\draw-my-dungeon-generator, il y a des tuiles dans l'arborescence tileswebp
Analyse la tuile graphique suivante :
tile_128.webp
Retrouve la ligne correspondante dans Tiles_index.csv
(ID = 128).
Ta mission est uniquement d'analyser visuellement la tuile.
Ne génère aucun texte de lore.
Retourne uniquement un JSON valide.
Décris de façon factuelle :
- taille de la salle
- forme générale
- état de conservation
- niveau de luminosité
- thème principal
- éléments remarquables visibles
- mobilier
- structures
- accès visibles
- éventuels dangers
- ambiance générale
Format :
{
"id": 128,
"theme": "",
"shortDescription": "",
"sourceFeatures": {
"roomSize": "",
"roomShape": "",
"lighting": "",
"condition": "",
"elements": [],
"furniture": [],
"structures": [],
"exits": [],
"hazards": [],
"atmosphere": ""
}
}

Ne pas inventer d'éléments invisibles.
Ne produire que des éléments déduits de l'image et du CSV.

Prompt AGENT ECRIVAIN
********************
Utilise l'agent-ecrivain-osr-v4.md.
Voici les informations de la tuile 
Génère la sortie finale au format JSON défini dans l'agent.
Conserve sourceFeatures.
Ne retourne qu'un JSON valide.



Promp AGENTS COMBINES
*********************
Utilise agent-vision-osr.md puis agent-ecrivain-osr-v4.md.
Analyse :
Tile_128.webp
Utilise également la ligne 128 de Tiles_index.csv.
Étape 1 :
produis sourceFeatures.
Étape 2 :
génère le lore définitif.
Retourne uniquement :
{
"128": {
"title": "",
"description": "",
"tags": [],
"sourceFeatures": {}
}
}
