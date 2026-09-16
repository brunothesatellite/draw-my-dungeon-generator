# ERRORS.md — Audit script.js

## Format
Chaque erreur suit ce format :
```
### [SEVERITE] Titre
- **Lignes** : numéros
- **Code** : snippet
- **Problème** : explication
- **Fix** : (vide, à remplir lors de la correction)
- **Statut** : pending | fixed
```

---

## 🔴 CRITICAL

### [CRITICAL] Accumulation listeners via init()
- **Lignes** : 1475-1503, 211
- **Code** :
```js
function init() {
    setupDragAndDrop();
    setupOverlayControls();
    setupFlavorEvents();
    setupToolbarEvents();
    document.querySelectorAll('.collapsible').forEach(el => {
        el.addEventListener('toggle', () => { ... });
    });
}
// appelé depuis handleImportFile ligne 211
init();
```
- **Problème** : Chaque import rappelle `init()` qui réenregistre tous les listeners sans retirer les anciens. Après N imports, N+1 copies s'empilent → boutons +/- déclenchent N+1 fois → freeze garanti.
- **Fix** :
- **Statut** : pending

### [CRITICAL] debugLog.value concaténation O(n²)
- **Lignes** : 624
- **Code** :
```js
debugLog.value += logMessage + '\n';
debugLog.scrollTop = debugLog.scrollHeight;
```
- **Problème** : Chaque concaténation recrée une string complète copiant toute la précédente. Avec des centaines de logs, croissance sans borne. Chaque assignment déclenche reflow du textarea. Limite textarea ~65K chars.
- **Fix** :
- **Statut** : pending

### [CRITICAL] innerHTML détruit les nœuds
- **Lignes** : 293-298 (moveTile), 333-337 (swapTiles)
- **Code** :
```js
// moveTile
sourceCell.innerHTML = '';
targetCell.innerHTML = '';
targetCell.appendChild(newImg);

// swapTiles
cell1.innerHTML = content2;
cell2.innerHTML = content1;
```
- **Problème** : `innerHTML = ''` détruit tous les nœuds enfants et leurs closures. Les timer/observer référant un ancien img deviennent zombies. swapTiles reconvertit HTML textuel en DOM à chaque fois → CPU inutile + perte identité objet.
- **Fix** :
- **Statut** : pending

---

## 🟠 HIGH

### [HIGH] saveState sérialise toute la grille dans localStorage
- **Lignes** : 58-72, appelé aux lignes 278, 329, 750, 922, 1262, 1318, 1329
- **Code** :
```js
function saveState() {
    if (saveStateTimer) clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => {
        localStorage.setItem('dmd-grid-data', JSON.stringify(getGridData()));
    }, 50);
}
```
- **Problème** : `getGridData()` itère toutes les cellules + regex + splits, puis JSON.stringify. Sur 50×50 = 2500 itérations synchronisées dans setTimeout(50ms).
- **Fix** :
- **Statut** : pending

### [HIGH] renderGridToCanvas await séquentiel
- **Lignes** : 427
- **Code** :
```js
for (const cell of cells) {
    const safeImg = await loadBase64AsImage(b64Map.get(img.src));
    ctx.drawImage(safeImg, ...);
}
```
- **Problème** : 400 cellules = 400 micro-promesses + 400 allocations Image() séquentielles. Devrait utiliser Promise.all.
- **Fix** :
- **Statut** : pending

### [HIGH] Modals sans cleanup des onclick
- **Lignes** : 303-331
- **Code** :
```js
const getChoice = new Promise((resolve) => {
    btnOverwrite.onclick = () => { modal.style.display = 'none'; resolve('1'); };
    btnSwap.onclick = () => { modal.style.display = 'none'; resolve('2'); };
    btnCancel.onclick = () => { modal.style.display = 'none'; resolve('0'); };
});
```
- **Problème** : Les .onclick closures capturent resolve et maintiennent la Promise vivante. Contrairement à showExportPdfModal (cleanup ligne 548), ici les onclick sont écrasés mais jamais mis à null → fuite mémoire.
- **Fix** :
- **Statut** : pending

### [HIGH] TILES_DESCRIPTIONS accès sans garde typeof
- **Lignes** : 1157
- **Code** :
```js
const description = TILES_DESCRIPTIONS[tileNumber] || 'Aucune description';
```
- **Problème** : À la ligne 453, le même accès est protégé par `typeof TILES_DESCRIPTIONS !== 'undefined'`. Ici aucune garde → ReferenceError non catché si fichier non chargé → panneau flavor corrompu.
- **Fix** :
- **Statut** : pending

---

## 🟡 MEDIUM

### [MEDIUM] showMessage écrase silencieusement les messages
- **Lignes** : 635-637
- **Code** :
```js
function showMessage(title, message) {
    if (modalOpen) return Promise.resolve();
```
- **Problème** : Si modalOpen est vrai, le message est ignoré silencieusement. L'utilisateur ne voit jamais l'erreur.
- **Fix** :
- **Statut** : pending

### [MEDIUM] renderGridToCanvas double getBoundingClientRect
- **Lignes** : 377-378
- **Code** :
```js
const cellW = firstCell.getBoundingClientRect().width;
const cellH = firstCell.getBoundingClientRect().height;
```
- **Problème** : Deux lectures de layout sur le même élément. Un seul appel suffit.
- **Fix** :
- **Statut** : pending

### [MEDIUM] isRowOrColNotEmpty requête DOM sur toutes les cellules
- **Lignes** : 779-785
- **Code** :
```js
function isRowOrColNotEmpty(type, index) {
    const allCells = Array.from(gridContainer.querySelectorAll('.cell'));
    return allCells.some(cell => {
        const cellIdx = parseInt(cell.dataset[type]);
        return cellIdx === index && !cell.classList.contains('empty');
    });
}
```
- **Problème** : querySelectorAll('.cell') retourne toutes les cellules. Sur 100×100 = 10K éléments pour vérifier UNE ligne. Devrait cibler `.cell[data-row="X"]` → O(cols) au lieu de O(rows×cols).
- **Fix** :
- **Statut** : pending

### [MEDIUM] addColLeft/addColRight mutation redondante currentCols
- **Lignes** : 818, 825
- **Code** :
```js
function addColLeft() {
    const oldData = getGridData();
    const newData = oldData.map(row => [null, ...row]);
    currentCols++;           // redondant
    applyNewGridData(newData); // écrase currentCols
}
```
- **Problème** : currentCols++ est immédiatement écrasé par applyNewGridData. Incohérence de design.
- **Fix** :
- **Statut** : pending

### [MEDIUM] Pas de gestion d'erreur sur chargement image
- **Lignes** : 1284-1299
- **Code** :
```js
img.src = tilePath;
cell.appendChild(img);
cell.classList.remove('empty');
```
- **Problème** : Si le fichier image n'existe pas, cellule marquée non-empty avec icône cassée. Pas de onerror handler.
- **Fix** :
- **Statut** : pending

### [MEDIUM] tileFlavorCache croissance non bornée
- **Lignes** : 982
- **Code** :
```js
const tileFlavorCache = {};
```
- **Problème** : Données JSON cachées mais jamais évincées. Duplique TILES_FLAVOR_DATA globale.
- **Fix** :
- **Statut** : pending

### [MEDIUM] tooltip.innerHTML injection DOM
- **Lignes** : 945
- **Code** :
```js
tooltip.innerHTML = `Tuile <b>${fileName}</b>, dossier <b>${folderName}</b>, rotation <b>${rotation}</b>°`;
```
- **Problème** : fileName et folderName injectés via innerHTML sans sanitisation. Risque faible mais mauvaise pratique.
- **Fix** :
- **Statut** : pending

---

## 🟢 LOW

### [LOW] toLocaleTimeString coûteux pour debug
- **Lignes** : 621
- **Code** :
```js
const timestamp = new Date().toLocaleTimeString();
```
- **Problème** : Opération coûteuse (résolution locale, formatage). Préférer performance.now().
- **Fix** :
- **Statut** : pending

### [LOW] getGridData parsing regex sur chaque cellule
- **Lignes** : 873-881
- **Code** :
```js
const rotationMatch = transformStyle.match(/rotate\((\d+)deg\)/);
const parts = img.src.split('/');
const fileName = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
```
- **Problème** : 400 regex + 400 splits + 400 replace à chaque saveState. Devrait stocker en dataset.
- **Fix** :
- **Statut** : pending

### [LOW] fitCells constantes magiques
- **Lignes** : 710-727
- **Code** :
```js
const pad = 60;
const containerBorder = 4;
const gap = 1;
```
- **Problème** : Constantes en dur. Si CSS change, faut aussi changer JS.
- **Fix** :
- **Statut** : pending

### [LOW] e.preventDefault() inutile sur clic normal
- **Lignes** : 1319
- **Code** :
```js
e.preventDefault();
```
- **Problème** : Empêche focus/selection du navigateur. Effets de bord subtils.
- **Fix** :
- **Statut** : pending

### [LOW] Variables globales non encapsulées
- **Lignes** : 4-16, 220-231
- **Code** :
```js
let modalOpen = false; // boolean partagé entre tous les modals
```
- **Problème** : Tout le state est en globales. modalOpen partagé entre import/collision/message. Deux flux async avec modals différents corrompent le flag.
- **Fix** :
- **Statut** : pending
