**TODO**
* l'export PDF doit fonctionner en file:\\ ou sur serveur web

----------
* safeguard : analyser le code pour trouver des risques de Freeze de l'application, ralentissement progressif, CPU inutile, fuite mémoire, état DOM transitoire, visuel cassé : corriger ERRORS.md

------
Changelog futur
- Nouvelles descriptions qui prennent plus en compte la description du créateur (j'ai fait du cherry picking ça semble bon, je vais vérifier plus en détail le avant / après)
- Refonte de l'IHM !!! A gauche la tuile zoomée et une barre d'outil pour la modifier, à droite la description et les caractéristiques
- Bug résiduels : voir ERRORS.md
- Bug fixé : quelques bugs de fuite mémoire & co identifiés et corrigés
- Bug fixé : l'export PDF avec les descriptions est cassé
- Bug fixé : l'imagette est assombrie en thème sombre
- Bug fixé : les tuiles S1 à S13 (celles 100% hachurées) sont exclues des tirages
- Evolutions : changement d'ergonomie, pour afficher la description d'une tuile, on la pose ou on fait un clic sur une tuile existante. Double-clic = rotation 90°, Clic droit = supprime la tuile. Sinon y'a la barre d'outil à gauche

