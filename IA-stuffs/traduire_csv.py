import csv
import json
from pathlib import Path
from ollama import Client

MODEL = "qwen2.5vl:7b"
INPUT = Path("Tiles_index.csv")
OUTPUT = Path("Tiles_index_fr.csv")


def main():
    client = Client()

    with open(INPUT, "r", encoding="utf-8") as f_in, \
         open(OUTPUT, "w", encoding="utf-8", newline="") as f_out:

        reader = csv.reader(f_in)
        writer = csv.writer(f_out)

        header = next(reader)
        writer.writerow(["N°", "Tile description"])

        # Lire toutes les descriptions pour les batcher
        rows = list(reader)
        total = len(rows)

        # Traiter par batch de 50
        batch_size = 50
        for i in range(0, total, batch_size):
            batch = rows[i:i+batch_size]
            descriptions = [row[1] if len(row) > 1 else "" for row in batch]

            prompt = (
                "Traduis ces descriptions de salles de donjon en français. "
                "Garde le style court et descriptif. Retourne UNIQUEMENT un JSON "
                "qui est une liste de chaînes, dans le même ordre.\n\n"
                + json.dumps(descriptions, ensure_ascii=False)
            )

            response = client.chat(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
            )

            content = response["message"]["content"]
            # Extraire le JSON
            import re
            match = re.search(r"\[.*\]", content, re.DOTALL)
            if match:
                translated = json.loads(match.group())
            else:
                # Fallback : garder l'original
                translated = descriptions

            for j, row in enumerate(batch):
                num = row[0]
                desc_fr = translated[j] if j < len(translated) else (row[1] if len(row) > 1 else "")
                writer.writerow([num, desc_fr])

            done = min(i + batch_size, total)
            print(f"  {done}/{total} traduites")

    print(f"\n[OK] CSV traduit dans {OUTPUT}")


if __name__ == "__main__":
    main()
