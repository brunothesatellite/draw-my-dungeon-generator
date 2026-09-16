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
const gridWrapper = document.querySelector('.grid-wrapper');

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
                await showMessage('Erreur', 'Format de fichier invalide. Veuillez sélectionner un fichier JSON exporté par Draw My Dungeon.');
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
            await showMessage('Erreur', 'Erreur lors de la lecture du fichier: ' + err.message);
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
        cancelFlavorClear();
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
            updateFlavor(getTileInfoFromCell(targetCell), targetCell);
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
    if (choice === "1") {
        moveTile(sourceImg, sourceCell, targetCell);
        updateFlavor(getTileInfoFromCell(targetCell), targetCell);
    } else if (choice === "2") {
        swapTiles(sourceCell, targetCell);
        updateFlavor(getTileInfoFromCell(targetCell), targetCell);
    }
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
function loadFileAsBase64(path) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            const reader = new FileReader();
            reader.onloadend = function () { resolve(reader.result); };
            reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = reject;
        xhr.open('GET', path);
        xhr.responseType = 'blob';
        xhr.send();
    });
}

function loadBase64AsImage(base64) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = base64;
    });
}

async function renderGridToCanvas() {
    const cells = gridContainer.querySelectorAll('.cell');
    const cols = currentCols;
    const rows = currentRows;
    if (cells.length === 0) return null;

    const firstCell = cells[0];
    const cellW = firstCell.getBoundingClientRect().width;
    const cellH = firstCell.getBoundingClientRect().height;
    const gap = 1;
    const totalW = cols * cellW + (cols - 1) * gap;
    const totalH = rows * cellH + (rows - 1) * gap;
    const scale = 2;

    const srcSet = new Set();
    cells.forEach((cell) => {
        const img = cell.querySelector('img');
        if (img && img.src) srcSet.add(img.src);
    });
    const b64Map = new Map();
    await Promise.all([...srcSet].map((src) =>
        loadFileAsBase64(src).then((b64) => b64Map.set(src, b64))
    ));

    const canvas = document.createElement('canvas');
    canvas.width = totalW * scale;
    canvas.height = totalH * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue('--bg-cell-empty').trim() || '#f0e6cc';
    const borderColor = style.getPropertyValue('--border-light').trim() || '#d9c48e';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalW, totalH);

    for (const cell of cells) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const x = col * (cellW + gap);
        const y = row * (cellH + gap);

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, cellW, cellH, 3);
        ctx.fill();
        ctx.stroke();

        const img = cell.querySelector('img');
        if (img && img.src && b64Map.has(img.src)) {
            const transformStyle = img.style.transform;
            const rotationMatch = transformStyle.match(/rotate\((\d+)deg\)/);
            const rotation = rotationMatch ? parseInt(rotationMatch[1]) : 0;
            const mirrorH = transformStyle.includes('scaleX(-1)');
            const mirrorV = transformStyle.includes('scaleY(-1)');
            const safeImg = await loadBase64AsImage(b64Map.get(img.src));
            ctx.save();
            ctx.translate(x + cellW / 2, y + cellH / 2);
            ctx.rotate(rotation * Math.PI / 180);
            if (mirrorH) ctx.scale(-1, 1);
            if (mirrorV) ctx.scale(1, -1);
            const margin = cellW * 0.05;
            ctx.drawImage(safeImg, -cellW / 2 + margin, -cellH / 2 + margin, cellW - margin * 2, cellH - margin * 2);
            ctx.restore();
        }
    }

    return canvas;
}

function collectTilesForDescriptions() {
    const cells = gridContainer.querySelectorAll('.cell');
    const tiles = [];
    cells.forEach((cell) => {
        const img = cell.querySelector('img');
        if (!img || !img.src) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const fileName = img.src.split('/').pop().replace(/\.[^/.]+$/, '');
        const tileNumber = fileName.replace('tile_', '');
        const flavorData = (typeof TILES_FLAVOR_DATA !== 'undefined' && TILES_FLAVOR_DATA[tileNumber]) ? TILES_FLAVOR_DATA[tileNumber] : null;
        const csvDesc = (typeof TILES_DESCRIPTIONS !== 'undefined') ? TILES_DESCRIPTIONS[tileNumber] : '';
        tiles.push({ row, col, tileNumber, fileName, flavorData, imgSrc: img.src, csvDesc });
    });
    tiles.sort((a, b) => a.row - b.row || a.col - b.col);
    return tiles;
}

function addDescriptionPages(pdf, tiles, b64Map) {
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const colCount = 2;
    const colGap = 10;
    const colWidth = (pdfWidth - margin * 2 - colGap * (colCount - 1)) / colCount;
    const thumbSize = 22;
    const titleFontSize = 11;
    const descFontSize = 9;
    const posFontSize = 8;
    const lineHeight = 4.5;

    let col = 0;
    let colY = margin;

    pdf.addPage();

    function needsNewPage(estimatedHeight) {
        return colY + estimatedHeight > pdfHeight - margin;
    }

    function advanceColOrPage() {
        col++;
        if (col >= colCount) {
            col = 0;
            colY = margin;
            pdf.addPage();
        } else {
            colY = margin;
        }
    }

    for (const tile of tiles) {
        const title = tile.flavorData ? tile.flavorData.title : `Tuile ${tile.tileNumber}`;
        const desc = tile.flavorData ? tile.flavorData.description : tile.csvDesc || 'Aucune description';
        const posLabel = `L${tile.row + 1} C${tile.col + 1}`;

        const textW = colWidth - thumbSize - 8;
        const descLines = pdf.splitTextToSize(desc, textW);
        const titleLines = pdf.splitTextToSize(title, textW);
        const titleHeight = titleLines.length * lineHeight;
        const descHeight = descLines.length * lineHeight;
        const headerHeight = 14;
        const blockHeight = Math.max(thumbSize + 4, headerHeight + titleHeight + descHeight);

        if (needsNewPage(Math.min(blockHeight, pdfHeight - margin * 2))) {
            advanceColOrPage();
        }

        const x = margin + col * (colWidth + colGap);

        const b64 = b64Map.get(tile.imgSrc);
        if (b64) {
            try {
                pdf.addImage(b64, 'PNG', x, colY, thumbSize, thumbSize);
            } catch (e) {
                pdf.setFillColor(200, 200, 200);
                pdf.rect(x, colY, thumbSize, thumbSize, 'F');
            }
        }

        const textX = x + thumbSize + 4;

        pdf.setFontSize(posFontSize);
        pdf.setTextColor(150, 100, 50);
        pdf.text(posLabel, textX, colY + 4);

        pdf.setFontSize(titleFontSize);
        pdf.setTextColor(139, 26, 26);
        pdf.text(titleLines, textX, colY + 9);

        pdf.setFontSize(descFontSize);
        pdf.setTextColor(60, 36, 21);
        pdf.text(descLines, textX, colY + 9 + titleHeight);

        colY += blockHeight;
    }
}

function showExportPdfModal() {
    return new Promise((resolve) => {
        const modal = document.getElementById('exportPdfModal');
        const gridOnlyBtn = document.getElementById('exportPdfGridOnly');
        const withDescBtn = document.getElementById('exportPdfWithDesc');
        const cancelBtn = document.getElementById('exportPdfCancel');
        modal.style.display = 'flex';

        function cleanup(result) {
            modal.style.display = 'none';
            gridOnlyBtn.onclick = null;
            withDescBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(result);
        }

        gridOnlyBtn.onclick = () => cleanup('gridOnly');
        withDescBtn.onclick = () => cleanup('withDesc');
        cancelBtn.onclick = () => cleanup('cancel');
    });
}

async function exportGridToPdf() {
    const choice = await showExportPdfModal();
    if (choice === 'cancel') return;

    const spinner = document.getElementById('pdfSpinner');
    spinner.style.display = 'flex';
    logToDebug('Début de l\'exportation PDF...');
    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = 'Exportation...';
    try {
        const canvas = await renderGridToCanvas();
        if (!canvas) {
            await showMessage('Attention', 'La grille est vide.');
            return;
        }
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

        if (choice === 'withDesc') {
            const tiles = collectTilesForDescriptions();
            if (tiles.length > 0) {
                const srcSet = new Set(tiles.map(t => t.imgSrc));
                const b64Map = new Map();
                await Promise.all([...srcSet].map((src) =>
                    loadFileAsBase64(src).then((b64) => b64Map.set(src, b64))
                ));
                addDescriptionPages(pdf, tiles, b64Map);
            }
        }

        pdf.save('ma_grille_de_tuiles.pdf');
        logToDebug('Exportation PDF réussie !');
    } catch (error) {
        console.error(error);
        logToDebug(`ERREUR lors de l\'exportation : ${error.message}`);
    } finally {
        spinner.style.display = 'none';
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

// --- MESSAGE MODAL ---
function showMessage(title, message) {
    const modal = document.getElementById('messageModal');
    const titleEl = document.getElementById('messageModalTitle');
    const msgEl = document.getElementById('messageModalMsg');
    const okBtn = document.getElementById('messageModalOk');
    titleEl.textContent = title;
    msgEl.textContent = message;
    modal.style.display = 'flex';
    return new Promise((resolve) => {
        okBtn.onclick = () => { modal.style.display = 'none'; resolve(); };
    });
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
    const pad = 60;
    const containerBorder = 4;
    const gap = 1;
    const contentW = gridArea.clientWidth - pad;
    const contentH = gridArea.clientHeight - pad;
    if (contentW <= 0 || contentH <= 0) return;

    const cellAreaW = contentW - containerBorder;
    const cellAreaH = contentH - containerBorder;
    const cellW = (cellAreaW - gap * (currentCols - 1)) / currentCols;
    const cellH = (cellAreaH - gap * (currentRows - 1)) / currentRows;
    const baseCellSize = Math.floor(Math.min(cellW, cellH));
    const cellSize = Math.max(20, Math.floor(baseCellSize * zoomLevel));

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
        await showMessage('Erreur', 'Veuillez entrer des dimensions valides (minimum 1).');
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
            const mirrorH = transformStyle.includes('scaleX(-1)');
            const mirrorV = transformStyle.includes('scaleY(-1)');
            const parts = img.src.split('/');
            const fileName = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
            const folderName = parts[parts.length - 2];
            data[r][c] = { fileName, folderName, rotation, mirrorH, mirrorV };
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
                const transform = buildTransform(tileInfo.rotation, tileInfo.mirrorH || false, tileInfo.mirrorV || false);
                img.style.transform = transform;
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
const flavorEnvironment = document.getElementById('flavorEnvironment');
const flavorDescription = document.getElementById('flavorDescription');
let flavorHoverTimer = null;
const flavorHoverDelay = 800;
let activeFlavorCell = null;
let activeTileData = null;

function buildTransform(rotation, mirrorH, mirrorV) {
    let transform = `rotate(${rotation}deg)`;
    if (mirrorH) transform += ' scaleX(-1)';
    if (mirrorV) transform += ' scaleY(-1)';
    return transform;
}

// Cache pour les données JSON des tuiles
const tileFlavorCache = {};

// Fonction pour charger les données JSON d'une tuile
async function loadTileFlavorData(tileNumber) {
    if (tileFlavorCache[tileNumber]) {
        return tileFlavorCache[tileNumber];
    }
    
    // 1. Essayer la variable globale (fonctionne en local et en serveur)
    if (typeof TILES_FLAVOR_DATA !== 'undefined' && TILES_FLAVOR_DATA[tileNumber]) {
        const nested = TILES_FLAVOR_DATA[tileNumber][tileNumber] || TILES_FLAVOR_DATA[tileNumber];
        tileFlavorCache[tileNumber] = nested;
        return nested;
    }
    
    // 2. Fallback fetch (pour les serveurs web sans tiles_flavor.js) — impossible en file://
    if (location.protocol === 'file:') {
        return null;
    }
    try {
        const response = await fetch(`tilesflavor/tile_${tileNumber}_analysis.json`);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        tileFlavorCache[tileNumber] = data;
        return data;
    } catch (error) {
        console.error(`Erreur lors du chargement des données pour la tuile ${tileNumber}:`, error);
        return null;
    }
}

// Fonction pour formater le nom de la caractéristique
function formatFeatureName(key) {
    const names = {
        'roomSize': 'Taille',
        'roomShape': 'Forme',
        'lighting': 'Éclairage',
        'condition': 'État',
        'centralFeature': 'Élément central',
        'wallDecorations': 'Décorations murales',
        'floorMarkings': 'Marques au sol',
        'architecturalDetails': 'Détails architecturaux',
        'objectsOrFurniture': 'Objets/Mobilier',
        'creaturesOrTraces': 'Créatures/Traces',
        'exits': 'Sorties',
        'hazards': 'Dangers',
        'atmosphere': 'Atmosphère',
        'roomPurpose': 'Usage de la pièce',
        'csvDescription': 'Notes de l\'auteur',
        'tileNumber': 'Numéro de tuile'
    };
    return names[key] || key;
}

// Fonction pour formater la valeur
function formatValue(value) {
    if (Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : 'Aucun';
    }
    return value || 'Non spécifié';
}

// Fonction pour générer le HTML des caractéristiques
function generateFeaturesHTML(features) {
    let html = '<div class="section-title">Caractéristiques</div>';
    html += '<div class="features-grid">';
    
    const orderedKeys = ['csvDescription', ...Object.keys(features).filter(k => k !== 'csvDescription')];
    
    for (const key of orderedKeys) {
        if (key === 'tileNumber') continue;
        const value = features[key];
        const fullW = key === 'csvDescription' ? ' feature-item--full' : '';
        
        html += `<div class="feature-item${fullW}">`;
        html += `<div class="feature-label">${formatFeatureName(key)}</div>`;
        
        if (Array.isArray(value) && value.length > 0) {
            html += `<ul class="feature-list">`;
            value.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += `</ul>`;
        } else {
            html += `<div class="feature-value">${formatValue(value)}</div>`;
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

// Fonction pour afficher les données JSON de la tuile
function displayTileFlavorData(tileData, tileNumber) {
    if (!tileData) {
        return `<div class="label">Données non disponibles pour la tuile ${tileNumber}</div>`;
    }
    
    const tileInfo = tileData[tileNumber] || tileData;
    let html = '';
    
    // Titre
    html += `<div class="tile-title">${tileInfo.title}</div>`;
    
    // Description
    html += `<div class="tile-description">"${tileInfo.description}"</div>`;
    
    // Tags
    if (tileInfo.tags && tileInfo.tags.length) {
        html += '<div class="tile-tags">';
        tileInfo.tags.forEach(tag => {
            html += `<span class="tag">${tag}</span>`;
        });
        html += '</div>';
    }
    
    // Caractéristiques
    html += generateFeaturesHTML(tileInfo.sourceFeatures);
    
    return html;
}

async function updateFlavor(tileInfo, cell) {
    if (!tileInfo) {
        clearFlavor();
        return;
    }
    
    // Retirer la surbrillance de l'ancienne tuile active
    if (activeFlavorCell && activeFlavorCell !== cell) {
        activeFlavorCell.classList.remove('flavor-active');
    }
    
    // Ajouter la surbrillance à la nouvelle tuile active
    if (cell) {
        cell.classList.add('flavor-active');
        activeFlavorCell = cell;
    }
    
    activeTileData = {
        fileName: tileInfo.fileName,
        folderName: tileInfo.folderName,
        rotation: tileInfo.rotation || '0',
        mirrorH: tileInfo.mirrorH || false,
        mirrorV: tileInfo.mirrorV || false
    };
    
    const imgSrc = `tileswebp/${tileInfo.folderName}/${tileInfo.fileName}.webp`;
    const transform = buildTransform(activeTileData.rotation, activeTileData.mirrorH, activeTileData.mirrorV);
    flavorTile.innerHTML = `<img src="${imgSrc}" alt="Tuile ${tileInfo.fileName}" style="transform: ${transform}">`;
    flavorTile.classList.remove('empty');
    updateFlavorText(activeTileData);
    const folderLabels = {
        'abyss': 'Abysse',
        'cave': 'Grotte',
        'donjon': 'Donjon',
        'room': 'Salle',
        'sewer': 'Égout',
        'stair': 'Escalier'
    };
    const envName = folderLabels[tileInfo.folderName] || tileInfo.folderName;
    flavorEnvironment.innerHTML = `<span class="label">Environnement :</span> ${envName}`;
    const tileNumber = tileInfo.fileName.replace('tile_', '');
    
    // Charger et afficher les données JSON de la tuile
    const tileFlavorData = await loadTileFlavorData(tileNumber);
    if (tileFlavorData) {
        flavorDescription.innerHTML = displayTileFlavorData(tileFlavorData, tileNumber);
    } else {
        // Fallback sur la description simple si les données JSON ne sont pas disponibles
        const description = TILES_DESCRIPTIONS[tileNumber] || 'Aucune description';
        flavorDescription.innerHTML = `<span class="label">Description de la salle :</span> ${description}`;
    }
    const descBody = flavorDescription.closest('.collapsible-body');
    if (descBody) descBody.scrollTop = 0;
}

function clearFlavor() {
    // Retirer la surbrillance de la tuile active
    if (activeFlavorCell) {
        activeFlavorCell.classList.remove('flavor-active');
        activeFlavorCell = null;
    }
    activeTileData = null;
    flavorTile.innerHTML = '';
    flavorTile.classList.add('empty');
    flavorText.innerHTML = '';
    flavorEnvironment.innerHTML = '';
    flavorDescription.innerHTML = '';
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
    const mirrorH = transformStyle.includes('scaleX(-1)');
    const mirrorV = transformStyle.includes('scaleY(-1)');
    return { fileName, folderName, rotation, mirrorH, mirrorV };
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
    // Hover events removed — flavor updates only via click
}

function setupToolbarEvents() {
    const btnRotate = document.getElementById('btnRotate');
    const btnMirrorH = document.getElementById('btnMirrorH');
    const btnMirrorV = document.getElementById('btnMirrorV');
    const btnReset = document.getElementById('btnReset');
    const btnDelete = document.getElementById('btnDelete');

    btnRotate.addEventListener('click', () => {
        if (!activeFlavorCell || !activeTileData) return;
        activeTileData.rotation = (parseInt(activeTileData.rotation) + 90) % 360;
        applyTransformToActive();
    });

    btnMirrorH.addEventListener('click', () => {
        if (!activeFlavorCell || !activeTileData) return;
        activeTileData.mirrorH = !activeTileData.mirrorH;
        applyTransformToActive();
    });

    btnMirrorV.addEventListener('click', () => {
        if (!activeFlavorCell || !activeTileData) return;
        activeTileData.mirrorV = !activeTileData.mirrorV;
        applyTransformToActive();
    });

    btnReset.addEventListener('click', () => {
        if (!activeFlavorCell || !activeTileData) return;
        activeTileData.rotation = '0';
        activeTileData.mirrorH = false;
        activeTileData.mirrorV = false;
        applyTransformToActive();
    });

    btnDelete.addEventListener('click', () => {
        if (!activeFlavorCell) return;
        activeFlavorCell.innerHTML = '';
        activeFlavorCell.classList.add('empty');
        logToDebug(`Tuile supprimée via toolbar à (${activeFlavorCell.dataset.row}, ${activeFlavorCell.dataset.col})`);
        clearFlavor();
        saveState();
    });
}

function applyTransformToActive() {
    const img = activeFlavorCell.querySelector('img');
    if (!img) return;
    const transform = buildTransform(activeTileData.rotation, activeTileData.mirrorH, activeTileData.mirrorV);
    img.style.transform = transform;
    const flavorImg = flavorTile.querySelector('img');
    if (flavorImg) flavorImg.style.transform = transform;
    updateFlavorText(activeTileData);
    saveState();
}

function updateFlavorText(tileData) {
    flavorText.innerHTML = `
        <div><span class="label">Chemin :</span> ${tileData.folderName}/${tileData.fileName}</div>
        <div><span class="label">Rotation :</span> ${tileData.rotation}°</div>
        <div><span class="label">Miroir H :</span> ${tileData.mirrorH ? 'Oui' : 'Non'}</div>
        <div><span class="label">Miroir V :</span> ${tileData.mirrorV ? 'Oui' : 'Non'}</div>
    `;
}

// --- CELL EVENTS ---
async function handleCellClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    cancelFlavorClear();

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
            }, cell);
        } else if (currentTileFolder) {
            await showMessage('Attention', 'Aucune tuile disponible dans ce dossier.');
        } else {
            await showMessage('Attention', 'Veuillez sélectionner un dossier de tuiles.');
        }
    } else {
        const tileInfo = getTileInfoFromCell(cell);
        if (tileInfo) {
            updateFlavor(tileInfo, cell);
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
    logToDebug('Auto-zoom : 1.0x (grid fit)');
}

// Position overlays centered on the visual grid edges
function positionOverlays() {
    const wrapperRect = gridWrapper.getBoundingClientRect();
    const gridRect = gridContainer.getBoundingClientRect();

    const gLeft = gridRect.left - wrapperRect.left;
    const gTop = gridRect.top - wrapperRect.top;
    const gWidth = gridRect.width;
    const gHeight = gridRect.height;
    const midX = gLeft + gWidth / 2;
    const midY = gTop + gHeight / 2;
    const margin = 4;

    const topGroup = gridWrapper.querySelector('.top-group');
    const bottomGroup = gridWrapper.querySelector('.bottom-group');
    const leftGroup = gridWrapper.querySelector('.left-group');
    const rightGroup = gridWrapper.querySelector('.right-group');

    if (topGroup) {
        topGroup.style.top = (gTop - margin) + 'px';
        topGroup.style.left = midX + 'px';
        topGroup.style.transform = 'translate(-50%, -100%)';
    }
    if (bottomGroup) {
        bottomGroup.style.top = (gTop + gHeight + margin) + 'px';
        bottomGroup.style.left = midX + 'px';
        bottomGroup.style.transform = 'translate(-50%, 0)';
    }
    if (leftGroup) {
        leftGroup.style.top = midY + 'px';
        leftGroup.style.left = (gLeft - margin) + 'px';
        leftGroup.style.transform = 'translate(-100%, -50%)';
    }
    if (rightGroup) {
        rightGroup.style.top = midY + 'px';
        rightGroup.style.left = (gLeft + gWidth + margin) + 'px';
        rightGroup.style.transform = 'translate(0, -50%)';
    }
}

// --- OVERLAY CONTROLS ---
const actionMap = {
    addRowTop, addRowBottom, addColLeft, addColRight,
    removeRowTop, removeRowBottom, removeColLeft, removeColRight
};

function setupOverlayControls() {
    gridWrapper.querySelectorAll('.ctrl button').forEach(btn => {
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
    gridWrapper.querySelectorAll('.ctrl button.disabled').forEach(b => b.classList.remove('disabled'));
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
    const btn = gridWrapper.querySelector(`[data-action="${action}"]`);
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
    setupToolbarEvents();

    document.querySelectorAll('.collapsible').forEach(el => {
        el.addEventListener('toggle', () => {
            requestAnimationFrame(() => {
                fitCells();
                positionOverlays();
            });
        });
    });
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
        positionOverlays();
    }, 100);
});


