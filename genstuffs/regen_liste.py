"""Regenere les tuiles d'une liste (tiles_to_regen.txt)."""
import subprocess, sys, time

PYTHON = ".venv\\Scripts\\python.exe"
SCRIPT = "regenerer_descriptions.py"
DELAY = 3  # secondes entre chaque tuile

with open("tiles_to_regen.txt", "r") as f:
    lines = f.readlines()

tiles = []
for line in lines:
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    for t in line.split(","):
        t = t.strip()
        if t.isdigit():
            tiles.append(int(t))

print(f"=== {len(tiles)} tuiles a regenerer ===")

for i, tile_num in enumerate(tiles, 1):
    print(f"\n[{i}/{len(tiles)}] Tuile {tile_num}")
    result = subprocess.run(
        [PYTHON, SCRIPT, "--start", str(tile_num), "--end", str(tile_num)],
        capture_output=False,
    )
    if result.returncode != 0:
        print(f"  ERREUR sur tuile {tile_num}")
    time.sleep(DELAY)

print(f"\n=== TERMINE ===")
