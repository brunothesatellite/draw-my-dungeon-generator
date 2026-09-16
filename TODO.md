**TODO**
* l'export PDF doit fonctionner en file:\\ ou sur serveur web


PROMPT ANALYSE 
Dans les descriptions il y a encore beaucoup de salles des anciens, ou xxx des anciens. Je veux vraiment renforcer les notes de l'auteur (csvDescription) pour qu'elles soient absolument prises dans la description. Par exemple tuile 427 :
  "csvDescription": "Magasin avec table, boîtes, étagères et barils",
  "description": "La salle est petite et rectangulaire, avec un sol vieilli et des marquages de cercles rituels gravés au sol. La faible lumière qui pénètre à travers les voiles déchirés ajoute à l'atmosphère mystérieuse et menaçante de la pièce. Des piliers robustes soutiennent les murs, et des têtes de mort et des tentacules étranges sont suspendus aux parois, ajoutant une touche d'horreur à l'ambiance. Un autel central, orné de symboles obscurs, domine la pièce. Des barils et des boîtes sont empilés sur une table au milieu de la salle, et des étagères remplies de mystérieux objets sont visibles à l'arrière. L'eau stagnante dans un coin de la pièce rend l'atmosphère encore plus menaçante.",
    La description devrait vraiment mentionner un magasin.
Analyse les descriptions de tilesflavor2/ pour voir quand le csvDescription n'a pas du tout été pris en compte dans la description et liste les numéros des tuiles à reprendre. Propose aussi un vrai plan de régénération des tuiles pour obligatoirement utiliser csvDescription 



Tests NBE
[23:30, 15/09/2026] Nicolas Beyleix: J'ai testé un peu, c'est pas mal. Tu t'es bien amusé 👍.
=> [FAIT]

J'ai vue qu'elle point: le zoom sur la grille c'est que via le +/-  et pas le contrôle souris qui zoom tout sauf la grille. A voir si c'est voulue ou pas.
=> [HOLD] Voulu car quand la grille est zoomé, la molette souris risque d'interférer avec les scrollbar

Le mode nuit, c'est volontaire que la carte en gros reste en noir et blanc flash ?
=> [FAIT] fix à faire sur flavor vec l'imagette

Apres j'ai eu deux réflexions : la première  c'est que c'est dommage de tirer des cartes complètement hachuré. 
=> [FAIT] supprimer room\S1 à S13

Du coup peut être pré-remplie la grille avec les cartes hachuré ou les mettre sur le côté et c'est l'utilisateur qui peut le glisser comme il veut sur la carte. Du coup les retirer du tirage.
=> [REJECT] Tuiles retirées du tirage, c'est le plus simple

[23:33, 15/09/2026] Nicolas Beyleix: La deuxième réflexion c'est que c'est pas si bien de faire tourner la tuile quand tu clics dessus. Peut être ne pas le faire auto, cliquer c'est juste sélectionné la tuille et a droite tu as des outils pas exemple rotation et ajouter peut-être des transformations miroirs pour certains cas. Du coup ca permettrait potentiellement d'ajouter d'autre action, style tagger entrée, zone actuelle....
=> [THINK] Bonne idée

[23:37, 15/09/2026] Nicolas Beyleix: Après j'ai un petit problème avec les tuiles qui aboutissent a des zones de 2, 4 etc cases. En fait c'est bizarre de changer la description d'une grande grotte, mais c'est plus compliqué a faire sans pregenerer des blocs de plusieurs cases. Du coup indiquer qu'elle tuiles peuvent en faire partie et savoir quand arrêté. Donc pour le moment c'est juste une impression comme cela. Apres c'est aussi que moi je dessines mes zones et après je mets mes trucs dedans. Du coup tirer case par case c'est plus compliqué.
=> [THINK] à réfléchir, très complexe