@echo off
setlocal

set PYTHON="%~dp0.venv\Scripts\python.exe"
set SCRIPT="%~dp0description_tuile.py"
set DEST="%~dp0tilesflavor"
set START=%1
set END=%2

if "%START%"=="" set START=1
if "%END%"=="" set END=460

if not exist %DEST% mkdir %DEST%

echo ========================================
echo  Generation des tuiles %START% a %END%
echo  Correction ortho activee, delay 2s
echo ========================================

%PYTHON% %SCRIPT% --start %START% --end %END% --delay 2

echo.
echo Deplacement des JSON dans tilesflavor...
for /L %%i in (%START%,1,%END%) do (
    if exist "%~dp0tile_%%i_analysis.json" (
        move /Y "%~dp0tile_%%i_analysis.json" %DEST%\
    )
)

echo.
echo ========================================
echo  TERMINE
echo ========================================
pause
