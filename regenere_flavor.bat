@echo off
python "%~dp0regenere_flavor.py"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Fichier genere: %~dp0tiles_flavor.js
) else (
    echo.
    echo ERREUR lors de la generation
)
pause
