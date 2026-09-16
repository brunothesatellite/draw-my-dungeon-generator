import json, re, os, glob, unicodedata

DIR = r"D:\draw-my-dungeon-generator\tilesflavor2"

def norm_text(text):
    text = text.lower()
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^\w\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def tokens(text):
    return set(norm_text(text).split())

def word_list(text):
    return norm_text(text).split()

# Concrete objects only (NOT room types, NOT materials, NOT prepositions)
OBJ = {
    'obelisque': ['obelisque'],
    'colonne': ['colonne','colonnes','pilier','piliers'],
    'colonnes': ['colonne','colonnes','pilier','piliers'],
    'trou': ['trou','trous','ouverture','fente','fentes'],
    'trous': ['trou','trous','ouverture','fente','fentes'],
    'grille': ['grille','grilles','barreaux'],
    'grilles': ['grille','grilles','barreaux'],
    'statue': ['statue','statues','sculpture'],
    'statues': ['statue','statues','sculpture'],
    'vortex': ['vortex','tourbillon'],
    'cheminee': ['cheminee','cheminees','foyer'],
    'cheminees': ['cheminee','cheminees'],
    'lit': ['lit','lits'],
    'lits': ['lit','lits'],
    'table': ['table','tables','pupitre','autel'],
    'tables': ['table','tables','pupitre','autel'],
    'chaises': ['chaise','chaises','tabouret','tabourets'],
    'chaise': ['chaise','chaises','tabouret','tabourets'],
    'tonneau': ['tonneau','tonneaux','baril','barils'],
    'tonneaux': ['tonneau','tonneaux','baril','barils'],
    'baril': ['baril','barils','tonneau','tonneaux'],
    'barils': ['baril','barils','tonneau','tonneaux'],
    'coffre': ['coffre','coffres','caisse','caisses'],
    'coffres': ['coffre','coffres','caisse','caisses'],
    'caisse': ['caisse','caisses','coffre','coffres'],
    'caisses': ['caisse','caisses','coffre','coffres'],
    'boite': ['boite','boites','caisse','coffre'],
    'boites': ['boite','boites','caisse','coffre'],
    'escalier': ['escalier','escaliers','marche','marches'],
    'escaliers': ['escalier','escaliers','marche','marches'],
    'fontaine': ['fontaine','fontaines','vasque'],
    'bassin': ['bassin','bassins'],
    'sarcophage': ['sarcophage','sarcophages','tombe','tombeau','cercueil'],
    'tombe': ['sarcophage','tombe','tombeau','cercueil'],
    'cercueil': ['cercueil','cercueils','sarcophage','tombe'],
    'amphore': ['amphore','amphores','jarre'],
    'amphores': ['amphore','amphores','jarre'],
    'crane': ['crane','cranes'],
    'epee': ['epee','pees','lame','sabre'],
    'ecu': ['ecu','ecus','bouclier'],
    'mandala': ['mandala','mandalas'],
    'lion': ['lion','lions','lionne','taureau'],
    'temple': ['temple','temples'],
    'ossuaire': ['ossuaire','ossuaires','charnier'],
    'latrines': ['latrines','toilettes'],
    'armillaire': ['armillaire','sphere'],
    'telescope': ['telescope','telescopes','lunette'],
    'glacee': ['glace','glacee','glacees','glacial','gele'],
    'cage': ['cage','cages','enclos'],
    'portail': ['portail','portails','porte','portes'],
    'porte': ['porte','portes','portail','portails'],
    'dragon': ['dragon','dragons'],
    'echiquier': ['echiquier'],
    'passerelle': ['passerelle','passerelles','pont'],
    'passerelles': ['passerelle','passerelles','pont'],
    'arche': ['arche','arches','arc'],
    'arches': ['arche','arches'],
    'corde': ['corde','cordes'],
    'ponton': ['ponton','pontons'],
    'tuyau': ['tuyau','tuyaux','conduit'],
    'tuyaux': ['tuyau','tuyaux','conduit'],
    'champignon': ['champignon','champignons'],
    'champignons': ['champignon','champignons'],
    'creature': ['creature','creatures','monstre','monstres','bete'],
    'araignee': ['araignee','araignees'],
    'serpent': ['serpent','serpents'],
    'soleil': ['soleil','soleils'],
    'brasier': ['brasier','brasiers'],
    'toile': ['toile','toiles','tissu'],
    'piege': ['piege','pieges','trappe','trappes'],
    'pieges': ['piege','pieges','trappe','trappes'],
    'trappe': ['trappe','trappes','piege'],
    'demon': ['demon','demons'],
    'planche': ['planche','planches'],
    'pont': ['pont','ponts','passerelle'],
    'squelette': ['squelette','squelettes','ossements','os'],
    'ossements': ['ossements','squelette','os'],
    'tentacule': ['tentacule','tentacules'],
    'tentacules': ['tentacule','tentacules'],
    'cellule': ['cellule','cellules'],
    'cellules': ['cellule','cellules'],
    'barreaux': ['barreaux','grille'],
    'etageres': ['etagere','etageres','rayon'],
    'etagere': ['etagere','etageres','rayon'],
    'bougies': ['bougie','bougies'],
    'bougie': ['bougie','bougies'],
    'potions': ['potion','potions'],
    'potion': ['potion'],
    'livre': ['livre','livres','tome'],
    'runes': ['rune','runes'],
    'tabourets': ['tabouret','tabourets'],
    'tabouret': ['tabouret','tabourets'],
    'alligators': ['alligator','alligators','crocodile'],
    'alligator': ['alligator','crocodile'],
    'octopus': ['octopus','pieuvre','creature'],

    'labyrinthe': ['labyrinthe'],
    'rack': ['rack'],
    'levier': ['levier','leviers'],
    'leviers': ['levier','leviers'],
    'mecanisme': ['mecanisme','mecanismes','engrenage'],
    'roue': ['roue','roues','rouages'],
    'pioche': ['pioche','pioches'],
    'puits': ['puits'],
    'banniere': ['banniere','bannieres'],
    'miroir': ['miroir','miroirs'],
    'horloge': ['horloge','horloges'],
    'peinture': ['peinture','peintures','fresque'],
    'mosaique': ['mosaique','mosaiques'],
    'etoile': ['etoile','etoiles'],
    'etoiles': ['etoile','etoiles'],
    'coffret': ['coffret','coffrets'],
    'sang': ['sang'],
    'feu': ['feu','feux'],
    'poison': ['poison'],
    'fumee': ['fumee'],
    'conduit': ['conduit','conduits','tuyau'],
    'conduits': ['conduit','conduits'],
    'pierre': ['pierre','pierres','caillou','rocher'],
    'pierres': ['pierre','pierres','caillou','rocher'],
    'eau': ['eau','eaux'],
    'reseau': ['reseau','filet','toile'],
    'branches': ['branche','branches'],
    'branche': ['branche','branches'],
    'fissure': ['fissure','fissures','fissuree','fissurees','fissur','fente','fentes'],
    'fentes': ['fente','fentes','fissure','fissuree','fissurees'],
    'fente': ['fente','fentes','fissure','fissuree','fissurees'],
    'assiette': ['assiette','assiettes'],
    'assiettes': ['assiette','assiettes'],
    'crane': ['crane','cranes'],
    'creatures': ['creature','creatures','monstre'],
    'table': ['table','tables'],
}

results = []
for fpath in sorted(glob.glob(os.path.join(DIR, "tile_*_analysis.json"))):
    with open(fpath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for tile_id, td in data.items():
        sf = td.get('sourceFeatures', {})
        csv = sf.get('csvDescription', '')
        desc = td.get('description', '')
        num = int(sf.get('tileNumber', tile_id))
        if not csv or not desc:
            continue
        csv_words = word_list(csv)
        desc_tok = tokens(desc)
        negated = set()
        for i, w in enumerate(csv_words):
            if w == 'sans' and i+1 < len(csv_words):
                negated.add(csv_words[i+1])
        missing = []
        seen = set()
        # Handle "ou" alternatives: if csv has "X ou Y", either X or Y in desc is OK
        ou_alternatives = {}
        for i, w in enumerate(csv_words):
            if w == 'ou' and i > 0:
                left = csv_words[i-1]
                # Find next noun-like word (skip adjectives)
                for j in range(i+1, min(i+4, len(csv_words))):
                    right = csv_words[j]
                    if right in OBJ or right not in {'petit', 'petite', 'grand', 'grande', 'gros', 'grosse', 'petits', 'petites', 'grands', 'grandes'}:
                        ou_alternatives[left] = right
                        ou_alternatives[right] = left
                        break
        for trigger, expected in OBJ.items():
            if trigger in seen or trigger not in csv_words:
                continue
            seen.add(trigger)
            if trigger in negated:
                continue
            found = any(e in desc_tok for e in expected)
            # Check "ou" alternative
            if not found and trigger in ou_alternatives:
                alt = ou_alternatives[trigger]
                if alt in OBJ:
                    found = any(e in desc_tok for e in OBJ[alt])
                else:
                    found = alt in desc_tok
            if not found:
                missing.append(trigger)
        if missing:
            results.append((num, missing))
results.sort()
print(','.join(str(t) for t, _ in results))
