import json
import os
import re
import glob

TILES_DIR = os.path.join(os.path.dirname(__file__), "tilesflavor")
OUTPUT = os.path.join(os.path.dirname(__file__), "tiles_flavor.js")


def num_sort_key(path):
    m = re.search(r"(\d+)", os.path.basename(path))
    return int(m.group(1)) if m else 0


def main():
    files = sorted(glob.glob(os.path.join(TILES_DIR, "tile_*_analysis.json")), key=num_sort_key)
    lines = ["const TILES_FLAVOR_DATA = {"]

    for i, f in enumerate(files):
        with open(f, encoding="utf-8") as fh:
            data = json.load(fh)
        num = str(num_sort_key(f))
        content = json.dumps(data, ensure_ascii=False, separators=(", ", ": "))
        if i > 0:
            lines.append(",")
        lines.append(f'  "{num}": {content}')

    lines.append("};")

    with open(OUTPUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines))

    print(f"OK: {len(files)} tuiles ecrites dans tiles_flavor.js")


if __name__ == "__main__":
    main()
