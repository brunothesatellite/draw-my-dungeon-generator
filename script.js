// Script pour la grille de tuiles

// Variables globales
const gridContainer = document.getElementById('gridContainer');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomDisplay = document.getElementById('zoomDisplay');
const tileFolderSelect = document.getElementById('tileFolderSelect');
const debugLog = document.getElementById('debugLog');
const tooltip = document.getElementById('customTooltip');

const gridColumnsInput = document.getElementById('gridColumns');
const gridRowsInput = document.getElementById('gridRows');
const setGridDimensionsBtn = document.getElementById('setGridDimensions');
const gridArea = document.querySelector('.grid-area');

let tooltipTimer;

const exportPdfBtn = document.getElementById('exportPdf');
const themeToggleBtn = document.getElementById('themeToggle');

// --- GESTION DU THÈME ---
function getPreferredTheme() {
    const saved = localStorage.getItem('dmd-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.textContent = '🌙';
        themeToggleBtn.title = 'Passer en thème clair';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleBtn.textContent = '☀️';
        themeToggleBtn.title = 'Passer en thème sombre';
    }
}

function toggleTheme() {
    const current = document.documentElement.hasAttribute('data-theme') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('dmd-theme', next);
    applyTheme(next);
    logToDebug(`Thème changé : ${next === 'dark' ? 'Sombre (Donjon)' : 'Clair (Parchemin)'}`);
}

// --- ZOOM ---
let zoomLevel = 0.7;
const minZoom = 0.3;
const maxZoom = 2;
const zoomStep = 0.1;

// --- PERSISTANCE localStorage ---
function saveState() {
    try {
        localStorage.setItem('dmd-grid-cols', currentCols);
        localStorage.setItem('dmd-grid-rows', currentRows);
        localStorage.setItem('dmd-grid-data', JSON.stringify(getGridData()));
        localStorage.setItem('dmd-zoom', zoomLevel);
        localStorage.setItem('dmd-tile-folder', currentTileFolder);
    } catch (e) {
        logToDebug(`Erreur sauvegarde: ${e.message}`);
    }
}

function loadState() {
    try {
        const cols = parseInt(localStorage.getItem('dmd-grid-cols'));
        const rows = parseInt(localStorage.getItem('dmd-grid-rows'));
        const gridDataStr = localStorage.getItem('dmd-grid-data');
        const zoom = parseFloat(localStorage.getItem('dmd-zoom'));
        const folder = localStorage.getItem('dmd-tile-folder');

        if (!gridDataStr || isNaN(cols) || isNaN(rows) || cols < 1 || rows < 1) {
            logToDebug('Aucune sauvegarde trouvée, grille par défaut');
            return false;
        }

        const gridData = JSON.parse(gridDataStr);
        if (!Array.isArray(gridData) || gridData.length !== rows) {
            logToDebug('Données de grille invalides');
            return false;
        }

        currentCols = cols;
        currentRows = rows;
        if (gridColumnsInput) gridColumnsInput.value = cols;
        if (gridRowsInput) gridRowsInput.value = rows;

        if (!isNaN(zoom) && zoom >= minZoom && zoom <= maxZoom) {
            zoomLevel = zoom;
        }

        if (folder && tileFolders.includes(folder)) {
            currentTileFolder = folder;
            tileFolderSelect.value = folder;
            updateAvailableTiles(folder);
        }

        logToDebug(`Sauvegarde restaurée: ${cols}x${rows}, zoom ${zoomLevel}, dossier "${currentTileFolder}"`);
        return gridData;
    } catch (e) {
        logToDebug(`Erreur chargement sauvegarde: ${e.message}`);
        return false;
    }
}

// --- EXPORT / IMPORT DONJON ---
function getExportData() {
    saveState();
    return {
        'dmd-export-version': 1,
        'dmd-grid-cols': parseInt(localStorage.getItem('dmd-grid-cols')),
        'dmd-grid-rows': parseInt(localStorage.getItem('dmd-grid-rows')),
        'dmd-grid-data': JSON.parse(localStorage.getItem('dmd-grid-data')),
        'dmd-zoom': parseFloat(localStorage.getItem('dmd-zoom')),
        'dmd-tile-folder': localStorage.getItem('dmd-tile-folder')
    };
}

function validateImportData(data) {
    if (!data || typeof data !== 'object') return false;
    if (data['dmd-export-version'] !== 1) return false;
    if (typeof data['dmd-grid-cols'] !== 'number' || data['dmd-grid-cols'] < 1) return false;
    if (typeof data['dmd-grid-rows'] !== 'number' || data['dmd-grid-rows'] < 1) return false;
    if (!Array.isArray(data['dmd-grid-data'])) return false;
    if (typeof data['dmd-zoom'] !== 'number') return false;
    if (typeof data['dmd-tile-folder'] !== 'string') return false;
    return true;
}

async function exportDungeon() {
    logToDebug('Export du donjon...');
    const data = getExportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const defaultName = `draw-my-dungeon-${dateStr}.json`;

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultName,
                types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            logToDebug('Export réussi !');
        } catch (e) {
            if (e.name !== 'AbortError') logToDebug(`Erreur export: ${e.message}`);
        }
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
        logToDebug('Export réussi !');
    }
}

async function importDungeon() {
    document.getElementById('importFile').click();
}

function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!validateImportData(data)) {
                alert('Format de fichier invalide. Veuillez sélectionner un fichier JSON exporté par Draw My Dungeon.');
                logToDebug('Import annulé: format invalide');
                return;
            }

            const modal = document.getElementById('importModal');
            const btnConfirm = document.getElementById('importModalConfirm');
            const btnCancel = document.getElementById('importModalCancel');
            modal.style.display = 'flex';

            const confirmed = await new Promise(resolve => {
                btnConfirm.onclick = () => { modal.style.display = 'none'; resolve(true); };
                btnCancel.onclick = () => { modal.style.display = 'none'; resolve(false); };
            });

            if (!confirmed) {
                logToDebug('Import annulé par l\'utilisateur');
                return;
            }

            localStorage.setItem('dmd-grid-cols', data['dmd-grid-cols']);
            localStorage.setItem('dmd-grid-rows', data['dmd-grid-rows']);
            localStorage.setItem('dmd-grid-data', JSON.stringify(data['dmd-grid-data']));
            localStorage.setItem('dmd-zoom', data['dmd-zoom']);
            localStorage.setItem('dmd-tile-folder', data['dmd-tile-folder']);

            logToDebug('Données importées, rechargement...');
            init();
        } catch (err) {
            alert('Erreur lors de la lecture du fichier: ' + err.message);
            logToDebug(`Erreur import: ${err.message}`);
        }
    };
    reader.readAsText(file);
}

let currentTileFolder = '';
let availableTiles = [];
let tileFolders = [];
let tileIndex = {};

let currentCols = 6;
let currentRows = 8;

// --- DRAG & DROP ---
let isDragging = false;

function setupDragAndDrop() {
    gridContainer.addEventListener('dragstart', (e) => {
        const img = e.target.closest('img');
        if (!img) return;
        isDragging = true;
        e.dataTransfer.setData('text/plain', img.src);
        const sourceCell = img.closest('.cell');
        const row = sourceCell.dataset.row;
        const col = sourceCell.dataset.col;
        e.dataTransfer.setData('sourceCoords', `${row}|${col}`);
        e.dataTransfer.effectAllowed = 'move';
        logToDebug(`Drag start: ${img.src} depuis (${row},${col})`);
    });

    gridContainer.addEventListener('dragend', () => {
        isDragging = false;
    });

    gridContainer.addEventListener('dragover', (e) => {
        const cell = e.target.closest('.cell');
        if (cell) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    });

    gridContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetCell = e.target.closest('.cell');
        if (!targetCell) return;

        const imgSrc = e.dataTransfer.getData('text/plain');
        const coords = e.dataTransfer.getData('sourceCoords');
        if (!imgSrc || !coords) return;

        const [sRow, sCol] = coords.split('|');
        const sourceCell = gridContainer.querySelector(`.cell[data-row="${sRow}"][data-col="${sCol}"]`);
        if (!sourceCell || sourceCell === targetCell) return;

        const sourceImg = sourceCell.querySelector('img');
        if (!sourceImg) return;

        if (targetCell.classList.contains('empty')) {
            moveTile(sourceImg, sourceCell, targetCell);
            saveState();
        } else {
            handleOccupiedCell(targetCell, sourceCell, sourceImg);
        }
    });
}

function moveTile(img, sourceCell, targetCell) {
    const newImg = document.createElement('img');
    newImg.src = img.src;
    newImg.style.transform = img.style.transform;
    newImg.style.zIndex = '2';
    newImg.alt = img.alt;

    sourceCell.innerHTML = '';
    sourceCell.classList.add('empty');

    targetCell.innerHTML = '';
    targetCell.classList.remove('empty');
    targetCell.appendChild(newImg);

    logToDebug(`Déplacement effectué vers (${targetCell.dataset.row}, ${targetCell.dataset.col})`);
}

async function handleOccupiedCell(targetCell, sourceCell, sourceImg) {
    isDragging = false;
    const modal = document.getElementById('collisionModal');
    const btnOverwrite = document.getElementById('modalOverwrite');
    const btnSwap = document.getElementById('modalSwap');
    const btnCancel = document.getElementById('modalCancel');

    modal.style.display = 'flex';

    const getChoice = new Promise((resolve) => {
        btnOverwrite.onclick = () => { modal.style.display = 'none'; resolve('1'); };
        btnSwap.onclick = () => { modal.style.display = 'none'; resolve('2'); };
        btnCancel.onclick = () => { modal.style.display = 'none'; resolve('0'); };
    });

    const choice = await getChoice;
    if (choice === "1") moveTile(sourceImg, sourceCell, targetCell);
    else if (choice === "2") swapTiles(sourceCell, targetCell);
    if (choice === "1" || choice === "2") saveState();
    positionOverlays();
}

function swapTiles(cell1, cell2) {
    const content1 = cell1.innerHTML;
    const content2 = cell2.innerHTML;
    cell1.innerHTML = content2;
    cell2.innerHTML = content1;
    [cell1, cell2].forEach(cell => {
        if (cell.querySelector('img')) cell.classList.remove('empty');
        else cell.classList.add('empty');
    });
    logToDebug(`Échange effectué`);
}

// --- EXPORT PDF ---
async function exportGridToPdf() {
    logToDebug('Début de l\'exportation PDF...');
    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = 'Exportation...';
    try {
        const canvas = await html2canvas(gridContainer, {
            scale: 2, useCORS: true, allowTaint: false, logging: true, backgroundColor: "#e0e0e0"
        });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = imgProps.width / imgProps.height;
        let finalWidth = pdfWidth - 20;
        let finalHeight = finalWidth / ratio;
        if (finalHeight > (pdfHeight - 20)) {
            finalHeight = pdfHeight - 20;
            finalWidth = finalHeight * ratio;
        }
        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pdfHeight - finalHeight) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
        pdf.save('ma_grille_de_tuiles.pdf');
        logToDebug('Exportation PDF réussie !');
    } catch (error) {
        console.error(error);
        logToDebug(`ERREUR lors de l'exportation : ${error.message}`);
    } finally {
        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = 'Exporter en PDF';
    }
}

// --- DEBUG ---
function logToDebug(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    debugLog.value += logMessage + '\n';
    debugLog.scrollTop = debugLog.scrollHeight;
}

// --- TILE DATA ---
function initializeTileData() {
    logToDebug('Initialisation des données à partir de tile_configuration.js...');
    if (typeof TILE_CONFIGURATION !== 'undefined') {
        tileIndex = TILE_CONFIGURATION;
        tileFolders = Object.keys(tileIndex);
        logToDebug(`Configuration chargée avec succès: ${tileFolders.length} dossiers`);
        for (const folder in tileIndex) {
            logToDebug(`Dossier "${folder}": ${tileIndex[folder].length} tuiles`);
        }
        tileIndex['all'] = [];
        for (const folder in tileIndex) {
            if (folder !== 'all') tileIndex['all'] = tileIndex['all'].concat(tileIndex[folder]);
        }
        tileFolders.unshift('all');
    } else {
        logToDebug('ERREUR : La variable TILE_CONFIGURATION est introuvable !');
        tileFolders = [];
    }
}

function updateFolderSelect() {
    logToDebug('Mise à jour de la liste déroulante des dossiers...');
    tileFolderSelect.innerHTML = '<option value="">Sélectionnez un dossier de tuiles</option>';
    if (tileFolders.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Aucun dossier trouvé';
        option.disabled = true;
        tileFolderSelect.appendChild(option);
    } else {
        tileFolders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            const capitalizedFolder = folder === 'all' ? 'Toutes les tuiles' : folder.charAt(0).toUpperCase() + folder.slice(1);
            const count = tileIndex[folder].length;
            option.textContent = `${capitalizedFolder} (${count} tuiles trouvées)`;
            tileFolderSelect.appendChild(option);
        });
        if (tileFolders.includes('all')) {
            tileFolderSelect.value = 'all';
            updateAvailableTiles('all');
            logToDebug('Sélection automatique de "Toutes les tuiles"');
        }
        logToDebug(`Liste déroulante mise à jour avec ${tileFolders.length} dossiers`);
    }
}

function updateAvailableTiles(folder) {
    logToDebug(`Mise à jour des tuiles disponibles pour le dossier: ${folder}`);
    currentTileFolder = folder;
    if (folder && tileIndex[folder]) {
        availableTiles = tileIndex[folder];
        logToDebug(`Tuiles disponibles pour ${folder}: ${availableTiles.length} tuiles`);
    } else {
        availableTiles = [];
    }
}

// --- GRID ---
function fitCells() {
    const gridAreaPad = 100;
    const containerPad = 32;
    const containerBorder = 4;
    const gap = 5;
    const contentW = gridArea.clientWidth - gridAreaPad;
    const contentH = gridArea.clientHeight - gridAreaPad;
    if (contentW <= 0 || contentH <= 0) return;

    const cellAreaW = contentW - containerPad - containerBorder;
    const cellAreaH = contentH - containerPad - containerBorder;
    const cellW = (cellAreaW - gap * (currentCols - 1)) / currentCols;
    const cellH = (cellAreaH - gap * (currentRows - 1)) / currentRows;
    const baseCellSize = Math.floor(Math.min(cellW, cellH));
    const cellSize = Math.max(10, Math.floor(baseCellSize * zoomLevel));

    gridContainer.style.gridTemplateColumns = `repeat(${currentCols}, ${cellSize}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${currentRows}, ${cellSize}px)`;
}

function createGrid(cols = currentCols, rows = currentRows) {
    logToDebug(`Création de la grille (${cols}x${rows})...`);
    gridContainer.innerHTML = '';
    currentCols = cols;
    currentRows = rows;
    fitCells();

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell empty';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleCellRightClick);
            // cell.addEventListener('mouseenter', (e) => handleMouseEnter(e, cell));
            // cell.addEventListener('mouseleave', handleMouseLeave);
            // cell.addEventListener('mousemove', handleMouseMove);
            gridContainer.appendChild(cell);
        }
    }
    logToDebug(`Grille créée (${cols}x${rows} cellules)`);
    updateOverlayStates();
    saveState();
    clearFlavor();
    requestAnimationFrame(() => {
        autoFitZoom();
        positionOverlays();
    });
}

// --- GRID DIMENSIONS ---
async function setDimensions() {
    const newCols = parseInt(gridColumnsInput.value);
    const newRows = parseInt(gridRowsInput.value);
    if (isNaN(newCols) || isNaN(newRows) || newCols < 1 || newRows < 1) {
        alert("Veuillez entrer des dimensions valides (minimum 1).");
        return;
    }
    const modal = document.getElementById('resetModal');
    const btnConfirm = document.getElementById('resetModalConfirm');
    const btnCancel = document.getElementById('resetModalCancel');
    modal.style.display = 'flex';
    const confirmed = await new Promise(resolve => {
        btnConfirm.onclick = () => { modal.style.display = 'none'; resolve(true); };
        btnCancel.onclick = () => { modal.style.display = 'none'; resolve(false); };
    });
    if (confirmed) {
        createGrid(newCols, newRows);
    }
}

function isRowOrColNotEmpty(type, index) {
    const allCells = Array.from(gridContainer.querySelectorAll('.cell'));
    return allCells.some(cell => {
        const cellIdx = parseInt(cell.dataset[type]);
        return cellIdx === index && !cell.classList.contains('empty');
    });
}

async function checkDeletionSafety(type, index) {
    if (!isRowOrColNotEmpty(type, index)) return true;
    const modal = document.getElementById('deleteModal');
    const msg = document.getElementById('deleteModalMsg');
    const btnConfirm = document.getElementById('deleteModalConfirm');
    const btnCancel = document.getElementById('deleteModalCancel');
    const label = type === 'row' ? 'ligne' : 'colonne';
    msg.textContent = `Attention : la ${label} ${index} contient des tuiles. Voulez-vous vraiment la supprimer ?`;
    modal.style.display = 'flex';
    const choice = await new Promise(resolve => {
        btnConfirm.onclick = () => { modal.style.display = 'none'; resolve(true); };
        btnCancel.onclick = () => { modal.style.display = 'none'; resolve(false); };
    });
    return choice;
}

function addRowTop() {
    const oldData = getGridData();
    const newData = [new Array(currentCols).fill(null), ...oldData];
    applyNewGridData(newData);
}

function addRowBottom() {
    const oldData = getGridData();
    const newData = [...oldData, new Array(currentCols).fill(null)];
    applyNewGridData(newData);
}

function addColLeft() {
    const oldData = getGridData();
    const newData = oldData.map(row => [null, ...row]);
    currentCols++;
    applyNewGridData(newData);
}

function addColRight() {
    const oldData = getGridData();
    const newData = oldData.map(row => [...row, null]);
    currentCols++;
    applyNewGridData(newData);
}

async function removeRowTop() {
    if (currentRows <= 1) return;
    if (!await checkDeletionSafety('row', 0)) return;
    const oldData = getGridData();
    oldData.shift();
    currentRows--;
    applyNewGridData(oldData);
}

async function removeRowBottom() {
    if (currentRows <= 1) return;
    if (!await checkDeletionSafety('row', currentRows - 1)) return;
    const oldData = getGridData();
    oldData.pop();
    currentRows--;
    applyNewGridData(oldData);
}

async function removeColLeft() {
    if (currentCols <= 1) return;
    if (!await checkDeletionSafety('col', 0)) return;
    const oldData = getGridData();
    const newData = oldData.map(row => row.slice(1));
    currentCols--;
    applyNewGridData(newData);
}

async function removeColRight() {
    if (currentCols <= 1) return;
    if (!await checkDeletionSafety('col', currentCols - 1)) return;
    const oldData = getGridData();
    const newData = oldData.map(row => row.slice(0, -1));
    currentCols--;
    applyNewGridData(newData);
}

function getGridData() {
    const data = [];
    for (let r = 0; r < currentRows; r++) data[r] = new Array(currentCols).fill(null);
    gridContainer.querySelectorAll('.cell').forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const img = cell.querySelector('img');
        if (img) {
            const transformStyle = img.style.transform;
            const rotationMatch = transformStyle.match(/rotate\((\d+)deg\)/);
            const rotation = rotationMatch ? rotationMatch[1] : "0";
            const parts = img.src.split('/');
            const fileName = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
            const folderName = parts[parts.length - 2];
            data[r][c] = { fileName, folderName, rotation };
        }
    });
    return data;
}

function applyNewGridData(newData, restoreZoom = false) {
    currentRows = newData.length;
    currentCols = newData[0].length;
    if (gridColumnsInput) gridColumnsInput.value = currentCols;
    if (gridRowsInput) gridRowsInput.value = currentRows;

    gridContainer.innerHTML = '';
    fitCells();

    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell empty';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleCellRightClick);
            // cell.addEventListener('mouseenter', (e) => handleMouseEnter(e, cell));
            // cell.addEventListener('mouseleave', handleMouseLeave);
            // cell.addEventListener('mousemove', handleMouseMove);

            const tileInfo = newData[r][c];
            if (tileInfo) {
                const img = document.createElement('img');
                img.src = `tileswebp/${tileInfo.folderName}/${tileInfo.fileName}.webp`;
                img.alt = `Tuile ${tileInfo.fileName}`;
                img.style.transform = `rotate(${tileInfo.rotation}deg)`;
                img.style.zIndex = '2';
                cell.appendChild(img);
                cell.classList.remove('empty');
            }
            gridContainer.appendChild(cell);
        }
    }
    logToDebug(`Grille mise à jour : ${currentCols}x${currentRows}`);
    updateOverlayStates();
    saveState();
    if (!restoreZoom) {
        requestAnimationFrame(() => {
            autoFitZoom();
            positionOverlays();
        });
    } else {
        positionOverlays();
    }
}

// --- TOOLTIP ---
function handleMouseEnter(e, cell) {
    if (cell.classList.contains('empty')) return;
    const img = cell.querySelector('img');
    if (!img) return;
    tooltipTimer = setTimeout(() => {
        const parts = img.src.split('/');
        const fileName = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
        const folderName = parts[parts.length - 2];
        const transformStyle = img.style.transform;
        const rotationMatch = transformStyle.match(/rotate\((\d+)deg\)/);
        const rotation = rotationMatch ? rotationMatch[1] : "0";
        tooltip.innerHTML = `Tuile <b>${fileName}</b>, dossier <b>${folderName}</b>, rotation <b>${rotation}</b>°`;
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
    }, 1000);
}

function handleMouseMove(e) {
    if (tooltip.style.display === 'block') {
        tooltip.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`;
    }
}

function handleMouseLeave() {
    clearTimeout(tooltipTimer);
    tooltip.style.display = 'none';
    tooltip.style.opacity = '0';
}

// --- FLAVOR PANEL ---
const flavorTile = document.getElementById('flavorTile');
const flavorText = document.getElementById('flavorText');
let flavorHoverTimer = null;
const flavorHoverDelay = 800;

function updateFlavor(tileInfo) {
    if (!tileInfo) {
        clearFlavor();
        return;
    }
    const imgSrc = `tileswebp/${tileInfo.folderName}/${tileInfo.fileName}.webp`;
    flavorTile.innerHTML = `<img src="${imgSrc}" alt="Tuile ${tileInfo.fileName}">`;
    flavorTile.classList.remove('empty');
    flavorText.innerHTML = `
        <div><span class="label">Chemin :</span> ${tileInfo.folderName}/${tileInfo.fileName}</div>
        <div><span class="label">Rotation :</span> ${tileInfo.rotation}°</div>
    `;
}

function clearFlavor() {
    flavorTile.innerHTML = '';
    flavorTile.classList.add('empty');
    flavorText.innerHTML = '';
}

function getTileInfoFromCell(cell) {
    if (cell.classList.contains('empty')) return null;
    const img = cell.querySelector('img');
    if (!img) return null;
    const parts = img.src.split('/');
    const fileName = parts[parts.length - 1].replace(/\.[^/.]+$/, '');
    const folderName = parts[parts.length - 2];
    const transformStyle = img.style.transform;
    const rotationMatch = transformStyle.match(/rotate\((\d+)deg\)/);
    const rotation = rotationMatch ? rotationMatch[1] : '0';
    return { fileName, folderName, rotation };
}

function scheduleFlavorClear() {
    cancelFlavorClear();
    flavorHoverTimer = setTimeout(() => {
        clearFlavor();
    }, flavorHoverDelay);
}

function cancelFlavorClear() {
    if (flavorHoverTimer) {
        clearTimeout(flavorHoverTimer);
        flavorHoverTimer = null;
    }
}

function setupFlavorEvents() {
    gridContainer.addEventListener('mouseenter', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        cancelFlavorClear();
        const tileInfo = getTileInfoFromCell(cell);
        if (tileInfo) {
            flavorHoverTimer = setTimeout(() => {
                updateFlavor(tileInfo);
            }, flavorHoverDelay);
        } else {
            scheduleFlavorClear();
        }
    }, true);

    gridContainer.addEventListener('mouseleave', (e) => {
        const cell = e.target.closest('.cell');
        if (cell) {
            scheduleFlavorClear();
        }
    }, true);
}

// --- CELL EVENTS ---
function handleCellClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell) return;

    if (cell.classList.contains('empty')) {
        if (availableTiles.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableTiles.length);
            const tileName = availableTiles[randomIndex];
            const img = document.createElement('img');
            let tilePath = `tileswebp/${currentTileFolder}/${tileName}`;
            if (currentTileFolder === 'all') {
                for (const folder in tileIndex) {
                    if (folder !== 'all' && tileIndex[folder].includes(tileName)) {
                        tilePath = `tileswebp/${folder}/${tileName}`;
                        break;
                    }
                }
            }
            img.src = tilePath;
            img.alt = `Tuile ${tileName}`;
            img.style.transform = 'rotate(0deg)';
            img.style.zIndex = '2';
            cell.appendChild(img);
            cell.classList.remove('empty');
            logToDebug(`Tuile ajoutée: ${currentTileFolder}/${tileName} à (${cell.dataset.row}, ${cell.dataset.col})`);
            const parts = img.src.split('/');
            updateFlavor({
                fileName: parts[parts.length - 1].replace(/\.[^/.]+$/, ''),
                folderName: parts[parts.length - 2],
                rotation: '0'
            });
        } else if (currentTileFolder) {
            alert('Aucune tuile disponible dans ce dossier.');
        } else {
            alert('Veuillez sélectionner un dossier de tuiles.');
        }
    } else {
        const img = cell.querySelector('img');
        if (img) {
            const currentRotation = parseInt(img.style.transform.replace('rotate(', '').replace('deg)', '')) || 0;
            const newRotation = (currentRotation + 90) % 360;
            img.style.transform = `rotate(${newRotation}deg)`;
            logToDebug(`Rotation à ${newRotation}°`);
        }
    }
    saveState();
    e.preventDefault();
}

function handleCellRightClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    if (!cell.classList.contains('empty')) {
        cell.innerHTML = '';
        cell.classList.add('empty');
        logToDebug(`Tuile supprimée à (${cell.dataset.row}, ${cell.dataset.col})`);
        saveState();
        clearFlavor();
    }
    e.preventDefault();
}

// --- ZOOM & AUTO-FIT ---
function applyZoom() {
    fitCells();
    const percentage = Math.round(zoomLevel * 100);
    zoomDisplay.textContent = `${percentage}%`;
    positionOverlays();
}

function autoFitZoom() {
    zoomLevel = 1.0;
    applyZoom();
    logToDebug('Auto-zoom : 1.00x (grid fit)');
}

// Position overlays centered on the visual grid edges
function positionOverlays() {
    const areaRect = gridArea.getBoundingClientRect();
    const gridRect = gridContainer.getBoundingClientRect();

    // Convert viewport-relative coords to content-space (absolute positioning context)
    const gLeft = gridRect.left - areaRect.left + gridArea.scrollLeft;
    const gTop = gridRect.top - areaRect.top + gridArea.scrollTop;
    const gWidth = gridRect.width;
    const gHeight = gridRect.height;
    const midX = gLeft + gWidth / 2;
    const midY = gTop + gHeight / 2;

    const topGroup = gridArea.querySelector('.top-group');
    const bottomGroup = gridArea.querySelector('.bottom-group');
    const leftGroup = gridArea.querySelector('.left-group');
    const rightGroup = gridArea.querySelector('.right-group');

    if (topGroup) {
        topGroup.style.top = (gTop - 36) + 'px';
        topGroup.style.left = midX + 'px';
        topGroup.style.transform = 'translateX(-50%)';
    }
    if (bottomGroup) {
        bottomGroup.style.top = (gTop + gHeight + 10) + 'px';
        bottomGroup.style.left = midX + 'px';
        bottomGroup.style.transform = 'translateX(-50%)';
    }
    if (leftGroup) {
        leftGroup.style.top = midY + 'px';
        leftGroup.style.left = (gLeft - 36) + 'px';
        leftGroup.style.transform = 'translateY(-50%)';
    }
    if (rightGroup) {
        rightGroup.style.top = midY + 'px';
        rightGroup.style.left = (gLeft + gWidth + 10) + 'px';
        rightGroup.style.transform = 'translateY(-50%)';
    }
}

// --- OVERLAY CONTROLS ---
const actionMap = {
    addRowTop, addRowBottom, addColLeft, addColRight,
    removeRowTop, removeRowBottom, removeColLeft, removeColRight
};

function setupOverlayControls() {
    gridArea.querySelectorAll('.ctrl button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            if (actionMap[action]) actionMap[action]();
            updateOverlayStates();
        });
    });

    updateOverlayStates();
}

function updateOverlayStates() {
    gridArea.querySelectorAll('.ctrl button.disabled').forEach(b => b.classList.remove('disabled'));
    if (currentRows <= 1) {
        disableBtn('removeRowTop');
        disableBtn('removeRowBottom');
    }
    if (currentCols <= 1) {
        disableBtn('removeColLeft');
        disableBtn('removeColRight');
    }
}

function disableBtn(action) {
    const btn = gridArea.querySelector(`[data-action="${action}"]`);
    if (btn) btn.classList.add('disabled');
}

// --- EVENT LISTENERS ---
exportPdfBtn.addEventListener('click', exportGridToPdf);
themeToggleBtn.addEventListener('click', toggleTheme);
setGridDimensionsBtn.addEventListener('click', setDimensions);

const exportDungeonBtn = document.getElementById('exportDungeon');
const importDungeonBtn = document.getElementById('importDungeon');
const importFileInput = document.getElementById('importFile');

exportDungeonBtn.addEventListener('click', exportDungeon);
importDungeonBtn.addEventListener('click', importDungeon);
importFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImportFile(e.target.files[0]);
        e.target.value = '';
    }
});

zoomInBtn.addEventListener('click', () => {
    zoomLevel = Math.min(zoomLevel + zoomStep, maxZoom);
    applyZoom();
    saveState();
    logToDebug(`Zoom augmenté : ${zoomLevel.toFixed(1)}x`);
});

zoomOutBtn.addEventListener('click', () => {
    zoomLevel = Math.max(zoomLevel - zoomStep, minZoom);
    applyZoom();
    saveState();
    logToDebug(`Zoom diminué : ${zoomLevel.toFixed(1)}x`);
});

tileFolderSelect.addEventListener('change', (e) => {
    updateAvailableTiles(e.target.value);
    saveState();
});

// --- INIT ---
function init() {
    logToDebug('=== Initialisation de l\'application ===');
    applyTheme(getPreferredTheme());
    initializeTileData();
    updateFolderSelect();
    const savedGridData = loadState();
    if (savedGridData) {
        const savedZoom = zoomLevel;
        applyNewGridData(savedGridData, true);
        zoomLevel = savedZoom;
        applyZoom();
    } else {
        createGrid();
    }
    setupDragAndDrop();
    setupOverlayControls();
    setupFlavorEvents();
    logToDebug('=== Initialisation terminée ===');
}

init();

// Auto-fit on resize
let resizeTimer;
let resizeOverlaysPending = false;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        fitCells();
        autoFitZoom();
        if (!resizeOverlaysPending) {
            resizeOverlaysPending = true;
            requestAnimationFrame(() => {
                resizeOverlaysPending = false;
                positionOverlays();
            });
        }
    }, 100);
});


