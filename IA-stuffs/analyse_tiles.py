import os, json
from collections import Counter

folder = 'tilesflavor'
titles = []
csv_elements = {'autel':0, 'tentacule':0, 'tete de mort':0, 'champignon':0}
csv_ignored = []

for f in sorted(os.listdir(folder)):
    if not f.endswith('.json'): continue
    num = f.replace('tile_','').replace('_analysis.json','')
    with open(os.path.join(folder, f), 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    tile = data.get(num, data.get(str(num), {}))
    title = tile.get('title', '')
    titles.append(title)
    desc = tile.get('description', '').lower()
    csv_desc = tile.get('sourceFeatures', {}).get('csvDescription', '').lower()

    for word in ['champignon','araignee','alligator','sarcophage','baril','coffre','piege','escalier','eau','fontaine','bassin','tombe','os','squelette']:
        if word in csv_desc and word not in desc:
            csv_ignored.append((num, word, csv_desc[:60]))

    for w in ['tentacule','tentacles']:
        if w in desc: csv_elements['tentacule'] += 1
    for w in ['autel','autels']:
        if w in desc: csv_elements['autel'] += 1
    for w in ['tete de mort','tetes de mort']:
        if w in desc: csv_elements['tete de mort'] += 1
    for w in ['champignon']:
        if w in desc: csv_elements['champignon'] += 1

print('=== TITLES (frequence) ===')
for t, c in Counter(titles).most_common(10):
    print(f'  {c}x {t}')

print(f'\n=== ELEMENTS REPE-CHES dans descriptions ===')
for k,v in sorted(csv_elements.items(), key=lambda x:-x[1]):
    print(f'  {k}: {v}/458')

print(f'\n=== CSV IGNOREE (elements manquants) ===')
for num, word, csv_d in csv_ignored[:15]:
    print(f'  tile {num}: "{word}" manque | CSV: {csv_d}')
print(f'  Total ignores: {len(csv_ignored)}')
