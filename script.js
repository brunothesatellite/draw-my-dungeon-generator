// Script pour la grille de tuiles

// Variables globales
const gridContainer = document.getElementById('gridContainer');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomDisplay = document.getElementById('zoomDisplay'); // <-- Nouvelle variable
const tileFolderSelect = document.getElementById('tileFolderSelect');
const debugLog = document.getElementById('debugLog');
const tooltip = document.getElementById('customTooltip'); // <-- Nouvelle variable

// --- NOUVELLES RÉFÉRENCES POUR LA GRILLE ---
const gridColumnsInput = document.getElementById('gridColumns');
const gridRowsInput = document.getElementById('gridRows');
const setGridDimensionsBtn = document.getElementById('setGridDimensions');

const addRowTopBtn = document.getElementById('addRowTop');
const addRowBottomBtn = document.getElementById('addRowBottom');
const removeRowTopBtn = document.getElementById('removeRowTop');
const removeRowBottomBtn = document.getElementById('removeRowBottom');

const addColLeftBtn = document.getElementById('addColLeft');
const addColRightBtn = mostColRightBtn = document.getElementById('addColRight');
const removeColLeftBtn = document.getElementById('removeColLeft');
const removeColRightBtn = document.getElementById('removeColRight');
// -------------------------------------------

let tooltipTimer; // Variable pour gérer le délai d'une seconde

// Nouvel élément pour le bouton
const exportPdfBtn = document.getElementById('exportPdf');

let zoomLevel = 0.7;
const minZoom = 0.5;
const maxZoom = 2;
const zoomStep = 0.1;

let currentTileFolder = '';
let availableTiles = [];
let tileFolders = [];
let tileIndex = {};

// Variables pour suivre la taille actuelle de la grille
let currentCols = 6;
let currentRows = 8;

// Fonction pour exporter la grille en PDF
async function exportGridToPdf() {
    logToDebug('Début de l\'exportation PDF...');
    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = 'Exportation...';

    try {
        // 1. Capturer la grille avec html2canvas
        // On utilise scale: 2 pour une meilleure résolution (qualité impression)
        const canvas = await html2canvas(gridContainer, {
            scale: 2,
            useCORS: true,         // <--- Crucial
            allowTaint: false,     // <--- Force le respect de CORS (ne pas autoriser la souillure)
            logging: true,         // <--- Active les logs html2canvas pour voir l'erreur précise si ça échoue
            backgroundColor: "#e0e0e0"
        });

        const imgData = canvas.toDataURL('image/png');

        // 2. Initialiser jsPDF (format A4, unité mm)
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // 3. Calculer les proportions pour remplir la page A4
        // On veut que l'image occupe le maximum de place sans être déformée
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = imgProps.width / imgProps.height;
        
        let finalWidth = pdfWidth - 20; // 10mm de marge de chaque côté
        let finalHeight = finalWidth / ratio;

        // Si la hauteur calculée dépasse la page, on ajuste par la hauteur
        if (finalHeight > (pdfHeight - 20)) {
            finalHeight = pdfHeight - 20;
            finalWidth = finalHeight * ratio;
        }

        // Centrer l'image sur la page
        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pdfHeight - finalHeight) / 2;

        // 4. Ajouter l'image au PDF
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
        
        // 5. Sauvegarder le fichier
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

// Fonction pour ajouter un message au journal de debug
function logToDebug(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    debugLog.value += logMessage + '\n';
    debugLog.scrollTop = debugLog.scrollHeight;
}

// Initialiser les données à partir de la configuration chargée via tile_configuration.js
function initializeTileData() {
    logToDebug('Initialisation des données à partir de tile_configuration.js...');
    
    // On vérifie si la variable globale existe (chargée par le fichier externe)
    if (typeof TILE_CONFIGURATION !== 'undefined') {
        tileIndex = TILE_CONFIGURATION;
        tileFolders = Object.keys(tileIndex);
        
        logToDebug(`Configuration chargée avec succès: ${tileFolders.length} dossiers`);
        
        for (const folder in tileIndex) {
            logToDebug(`Dossier "${folder}": ${tileIndex[folder].length} tuiles`);
        }
    } else {
        logToDebug('ERREUR : La variable TILE_CONFIGURATION est introuvable !');
        logToDebug('Assurez-vous que tile_configuration.js est chargé AVANT script.js dans index.html');
        tileFolders = [];
    }
}

// Mettre à jour la liste déroulante des dossiers
function updateFolderSelect() {
    logToDebug('Mise à jour de la liste déroulante des dossiers...');
    
    tileFolderSelect.innerHTML = '<option value="">Sélectionnez un dossier de tuiles</option>';
    
    if (tileFolders.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Aucun dossier trouvé';
        option.disabled = true;
        tileFolderSelect.appendChild(option);
        logToDebug('Aucun dossier disponible dans la configuration.');
    } else {
        tileFolders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            
            // Transformation cosmétique : Majuscule + (x tuiles trouvées)
            const capitalizedFolder = folder.charAt(0).toUpperCase() + folder.slice(1);
            const count = tileIndex[folder].length;
            option.textContent = `${capitalizedFolder} (${count} tuiles trouvées)`;
            
            tileFolderSelect.appendChild(option);
        });
        logToDebug(`Liste déroulante mise à jour avec ${tileFolders.length} dossiers`);
    }
}

// Mettre à jour la liste des tuiles disponibles
function updateAvailableTiles(folder) {
    logToDebug(`Mise à jour des tuiles disponibles pour le dossier: ${folder}`);
    currentTileFolder = folder;
    
    if (folder && tileIndex[folder]) {
        availableTiles = tileIndex[folder];
        logToDebug(`Tuiles disponibles pour ${folder}: ${availableTiles.length} tuiles`);
    } else {
        availableTiles = [];
        logToDebug(`Aucune tuile disponible pour ${folder}`);
    }
}

// Créer la grille
function createGrid(cols = currentCols, rows = currentRows) {
    logToDebug(`Création de la grille (${cols}x${rows})...`);
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    
    currentCols = cols;
    currentRows = rows;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell empty';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleCellRightClick);
            
            // --- AJOUT DES ÉCOUTEURS POUR LE TOOLTIP ---
            cell.addEventListener('mouseenter', (e) => handleMouseEnter(e, cell));
            cell.addEventListener('mouseleave', handleMouseLeave);
            cell.addEventListener('mousemove', handleMouseMove);
            // ------------------------------------------
            
            gridContainer.appendChild(cell);
        }
    }
    logToDebug(`Grille créée (${cols}x${rows} cellules)`);
}

// --- FONCTIONS DE MANIPULATION DE LA GRILLE ---

function setDimensions() {
    const newCols = parseInt(gridColumnsInput.value);
    const newRows = parseInt(gridRowsInput.value);

    if (isNaN(newCols) || isNaN(newRows) || newCols < 1 || newRows < 1) {
        alert("Veuillez entrer des dimensions valides (minimum 1).");
        return;
    }

    if (confirm("Voulez-vous créer une nouvelle grille vide ? Cela effacera la grille actuelle.")) {
        createGrid(newCols, newRows);
    }
}

function addRowTop() {
    const newRows = currentRows + 1;
    // On recrée la grille en ajoutant une ligne vide au début
    // Pour garder les tuiles, c'est complexe car les data-row/col changent.
    // Mais la consigne dit "elle sera vide", et on efface les tuiles si on accepte la nouvelle grille.
    // Cependant, l'ajout de ligne/col via les boutons est séparé de la validation des dimensions.
    // Si on ajoute une ligne, on va reconstruire la grille en décalant les données.
    
    // Pour simplifier et respecter "elle sera vide" pour l'ajout :
    // On va reconstruire la grille en conservant les tuiles existantes mais en décalant les indices
    // OU plus simplement, reconstruire la structure.
    
    // Étant donné que la demande pour les 8 boutons est spécifique :
    // "ajouter une ligne en haut : elle sera vide"
    // "ajouter une colonne à gauche : elle sera vide"
    // On va reconstruire la grille en récupérant l'état actuel.
    
    const oldData = getGridData();
    const newData = [];
    
    // Création d'une ligne vide en haut
    newData.push(new Array(currentCols).fill(null));
    
    // On réinsère les anciennes données
    oldData.forEach(row => {
        newData.push(row);
    });

    applyNewGridData(newData);
}

function addRowBottom() {
    const oldData = getGridData();
    const newData = [...oldData];
    newData.push(new Array(currentCols).fill(null));
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

function removeRowTop() {
    if (currentRows <= 1) return;
    const oldData = getGridData();
    oldData.shift();
    currentRows--;
    applyNewGridData(oldData);
}

function removeRowBottom() {
    if (currentRows <= 1) return;
    const oldData = getGridData();
    oldData.pop();
    currentRows--;
    applyNewGridData(oldData);
}

function removeColLeft() {
    if (currentCols <= 1) return;
    const oldData = getGridData();
    const newData = oldData.map(row => row.slice(1));
    currentCols--;
    applyNewGridData(newData);
}

function removeColRight() {
    if (currentCols <= 1) return;
    const oldData = getGridData();
    const newData = oldData.map(row => row.slice(0, -1));
    currentCols--;
    applyNewGridData(newData);
}

// Helper pour extraire les données actuelles (tuiles et rotations)
function getGridData() {
    const data = [];
    const cells = Array.from(gridContainer.querySelectorAll('.cell:not(.empty)'));
    
    // On initialise une matrice vide
    for(let r=0; r<currentRows; r++) {
        data[r] = new Array(currentCols).fill(null);
    }

    const allCells = gridContainer.querySelectorAll('.cell');
    allCells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const img = cell.querySelector('img');
        if (img) {
            const transformStyle = img.style.transform;
            const rotationMatch = transformStyle.match(/rotate\((\d+)deg\)/);
            const rotation = rotationMatch ? rotationMatch[1] : "0";
            
            // On extrait le nom de la tuile de l'URL
            const src = img.src;
            const parts = src.split('/');
            const fileNameWithExt = parts[parts.length - 1];
            const fileName = fileNameWithExt.replace(/\.[^/.]+$/, "");
            // On retrouve le dossier
            const folderName = parts[parts.length - 2];

            data[r][c] = { fileName, folderName, rotation };
        }
    });
    return data;
}

// Helper pour appliquer une nouvelle matrice de données à la grille
function applyNewGridData(newData) {
    currentRows = newData.length;
    currentCols = newData[0].length;
    
    // On reconstruit la structure visuelle
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${currentCols}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${currentRows}, 1fr)`;

    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell empty';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleCellRightClick);
            cell.addEventListener('mouseenter', (e) => handleMouseEnter(e, cell));
            cell.addEventListener('mouseleave', handleMouseLeave);
            cell.addEventListener('mousemove', handleMouseMove);
            
            const tileInfo = newData[r][c];
            if (tileInfo) {
                const img = document.createElement('img');
                img.src = `tile/${tileInfo.folderName}/${tileInfo.fileName}.png`; // Note: on suppose .png
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
}


// --- NOUVELLES FONCTIONS POUR LE TOOLTIP ---

function handleMouseEnter(e, cell) {
    // On ne montre le tooltip que si la cellule n'est pas vide
    if (cell.classList.contains('empty')) return;

    const img = cell.querySelector('img');
    if (!img) return;

    // On lance un timer de 1000ms (1 seconde)
    tooltipTimer = setTimeout(() => {
        const fullSrc = img.src; // ex: "tile/abyss/tile_287.png"
        
        // Extraction du nom du dossier et du nom de la tuile via regex ou split
        // On suppose le format: tile/[dossier]/[nom].png
        const parts = fullSrc.split('/');
        const fileNameWithExt = parts[parts.length - 1];
        const folderName = parts[parts.length - 2];
        
        // Enlever l'extension (ex: .png)
        const fileName = fileNameWithExt.replace(/\.[^/.]+$/, "");

        // --- AJOUT DE LA LOGIQUE DE ROTATION ---
        // On récupère la valeur de la rotation depuis le style transform
        // ex: "rotate(90deg)" -> on cherche le nombre
        const transformStyle = img.style.transform;
        const rotationMatch = transformStyle.match(/rotate\((\d+)deg\)/);
        const rotation = rotationMatch ? rotationMatch[1] : "0";
        // ---------------------------------------
        
        // Préparer le contenu HTML
        tooltip.innerHTML = `Tuile <b>${fileName}</b>, dossier <b>${folderName}</b>, rotation <b>${rotation}</b>°`;
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
    }, 1000);
}

function handleMouseMove(e) {
    // Faire suivre le tooltip avec la souris
    if (tooltip.style.display === 'block') {
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    }
}

function handleMouseLeave() {
    // Si la souris quitte la cellule avant la fin de la seconde, on annule
    clearTimeout(tooltipTimer);
    tooltip.style.display = 'none';
    tooltip.style.opacity = '0';
}
// -------------------------------------------

// Gérer le clic gauche sur une cellule
function handleCellClick(e) {
    const cell = e.target.closest('.cell');
    
    if (!cell) return;
    
    if (cell.classList.contains('empty')) {
        if (availableTiles.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableTiles.length);
            const tileName = availableTiles[randomIndex];
            const img = document.createElement('img');
            img.src = `tile/${currentTileFolder}/${tileName}`;
            //img.crossOrigin = "anonymous"; 
            img.alt = `Tuile ${tileName}`;
            img.style.transform = 'rotate(0deg)';
            img.style.zIndex = '2';
            cell.appendChild(img);
            cell.classList.remove('empty');
            logToDebug(`Tuile ajoutée: ${currentTileFolder}/${tileName} à (${cell.dataset.row}, ${cell.dataset.col})`);
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
    e.preventDefault();
}

// Gérer le clic droit sur une cellule
function handleCellRightClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    if (!cell.classList.contains('empty')) {
        cell.innerHTML = '';
        cell.classList.add('empty');
        logToDebug(`Tuile supprimée à (${cell.dataset.row}, ${cell.dataset.col})`);
    }
    e.preventDefault();
}

// Gérer le zoom
function applyZoom() {
    gridContainer.style.transform = `scale(${zoomLevel})`;
    
    // Mise à jour de l'affichage du pourcentage
    // On multiplie par 100 et on utilise Math.round pour éviter les problèmes de virgule flottante
    const percentage = Math.round(zoomLevel * 100);
    zoomDisplay.textContent = `${percentage}%`;
}

// Écouteurs d'événements
exportPdfBtn.addEventListener('click', exportGridToPdf);

// --- NOUVEAUX ÉCOUTEURS ---
setGridDimensionsBtn.addEventListener('click', setDimensions);
addRowTopBtn.addEventListener('click', addRowTop);
addRowBottomBtn.addEventListener('click', addRowBottom);
removeRowTopBtn.addEventListener('click', removeRowTop);
removeRowBottomBtn.addEventListener('click', removeRowBottom);
addColLeftBtn.addEventListener('click', addColLeft);
addColRightBtn.addEventListener('click', addColRight);
removeColLeftBtn.addEventListener('click', removeColLeft);
removeColRightBtn.addEventListener('click', removeColRight);
// -------------------------


zoomInBtn.addEventListener('click', () => {
    zoomLevel = Math.min(zoomLevel + zoomStep, maxZoom);
    applyZoom();
    logToDebug(`Zoom augmenté : ${zoomLevel.toFixed(1)}x`);
});

zoomOutBtn.addEventListener('click', () => {
    zoomLevel = Math.max(zoomLevel - zoomStep, minZoom);
    applyZoom();
    logToDebug(`Zoom diminué : ${zoomLevel.toFixed(1)}x`);
});

tileFolderSelect.addEventListener('change', (e) => {
    updateAvailableTiles(e.target.value);
});

// Initialisation
function init() {
    logToDebug('=== Initialisation de l\'application ===');
    
    initializeTileData();
    updateFolderSelect();
    createGrid();
    applyZoom();
    
    logToDebug('=== Initialisation terminée ===');
}

// Démarrer l'application
init();