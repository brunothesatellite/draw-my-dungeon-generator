@echo off
setlocal enabledelayedexpansion

:: --- CONFIGURATION ---
set "TILE_DIR=tile"
set "OUTPUT_FILE=tile_configuration.js"

:: Initialisation du fichier de sortie
echo const TILE_CONFIGURATION = { > "%OUTPUT_FILE%"

echo Generation en cours...

:: 1. On boucle sur tous les sous-dossiers de "tile"
for /d %%D in ("%TILE_DIR%\*") do (
    set "folderName=%%~nxD"
    echo Dossier detecte : !folderName!
    
    echo. >> "%OUTPUT_FILE%"
    echo     "!folderName!": [ >> "%OUTPUT_FILE%"

    :: 2. On liste les fichiers .png avec une virgule à la fin de CHAQUE ligne
    for /f "delims=" %%F in ('dir /b "%%D\*.png" 2^>nul') do (
        echo         "%%F", >> "%OUTPUT_FILE%"
    )

    echo     ], >> "%OUTPUT_FILE%"
)

:: Fermeture de l'objet JavaScript
echo }; >> "%OUTPUT_FILE%"

:: --- PHASE DE NETTOYAGE (L'astuce magique) ---
echo Nettoyage des virgules en trop...

:: On utilise un petit script PowerShell (disponible sur tous les Windows) 
:: pour supprimer proprement les virgules traînantes dans le fichier généré.
powershell -Command "$content = Get-Content '%OUTPUT_FILE%' -Raw; $content = $content -replace ',\s*(\n\s*\]|\n\s*\})', '$1'; Set-Content '%OUTPUT_FILE%' $content"

echo.
echo ======================================================
echo TERMINE !
echo Le fichier "%OUTPUT_FILE%" est propre et valide.
echo Copiez son contenu dans votre fichier script.js
echo ======================================================
pause