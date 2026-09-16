@echo off
setlocal

set DEST="%~dp0tiles_flavor.js"

echo Generation de tiles_flavor.js depuis tilesflavor/*.json ...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$jsonFiles = Get-ChildItem '%~dp0tilesflavor' -Filter '*.json' | Sort-Object { [int]($_.BaseName -replace '[^0-9]','') }; " ^
  "$lines = [System.Collections.ArrayList]@(); " ^
  "[void]$lines.Add('const TILES_FLAVOR_DATA = {'); " ^
  "$first = $true; " ^
  "foreach ($f in $jsonFiles) { " ^
  "  $num = ($f.BaseName -replace '[^0-9]',''); " ^
  "  $content = (Get-Content $f.FullName -Raw -Encoding UTF8).Trim() -replace \"`r`n\",\" \" -replace \"`n\",\" \"; " ^
  "  if (-not $first) { [void]$lines.Add(',') }; " ^
  "  $first = $false; " ^
  "  [void]$lines.Add(\"  `"`$num`\": `$content\"); " ^
  "}; " ^
  "[void]$lines.Add('};'); " ^
  "$lines -join \"`n\" | Set-Content -Path %DEST% -Encoding UTF8 -NoNewline; " ^
  "Write-Host \"OK: $($jsonFiles.Count) tuiles ecrites dans tiles_flavor.js\""

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Fichier genere: %DEST%
) else (
    echo.
    echo ERREUR lors de la generation
)

pause
