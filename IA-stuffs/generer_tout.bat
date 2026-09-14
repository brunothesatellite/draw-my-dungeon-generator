@echo off
setlocal

set PYTHON="%~dp0.venv\Scripts\python.exe"
set SCRIPT="%~dp0description_tuile.py"
set DEST="%~dp0tilesflavor"
set START=%1

if "%START%"=="" set START=1

if not exist %DEST% mkdir %DEST%

for /L %%i in (%START%,1,460) do (
    echo.
    echo ========================================
    echo  Tuile %%i/460
    echo ========================================
    %PYTHON% %SCRIPT% %%i 
    if exist "%~dp0tile_%%i_analysis.json" (
        move /Y "%~dp0tile_%%i_analysis.json" %DEST%\
    )
)

echo.
echo ========================================
echo  Repart de la tuile %START% a 460
echo ========================================
pause
