"""Turn the Mac build (competitions.json, imgs.json and downloaded images in one folder) into site files.

Usage: python3 tools/publish_competitions.py <folder>
Writes public/data/competitions.json (index, team names, image credits),
public/data/comp/<id>.json (one per competition) and public/img/seasons/*.webp.
Keeps image credits already in public/data/competitions.json.
"""
import json, os, re, sys
from PIL import Image

I = sys.argv[1]
OUT = 'public/img/seasons'
D = json.load(open(f'{I}/competitions.json'))
J = json.load(open(f'{I}/imgs.json'))
old = 'public/data/competitions.json'
imgs = json.load(open(old))['images'] if os.path.exists(old) else {}
GROUNDS = {'Eden Park': 'eden-park', 'Twickenham Stadium': 'twickenham', 'Ellis Park Stadium': 'ellis-park', 'Millennium Stadium': 'millennium',
           'Stadium Australia': 'stadium-australia', 'Stade de France': 'stade-de-france', 'Nissan Stadium (Yokohama)': 'yokohama', 'Webb Ellis Cup': 'webb-ellis-cup'}


def clean(by):
    by = re.sub(r"This image's author is\s*", '', by).split('\n')[0].strip()
    return re.sub(r'\s+', ' ', by)[:60]


def slug(k):
    return re.sub(r'[^a-z0-9]+', '-', k[5:].lower())[:40]


for title, key in GROUNDS.items():
    f = J['lead'][title].replace('_', ' ')
    v = J['info'][f]
    im = Image.open(f'{I}/{slug(f)}.jpg').convert('RGB')
    im.thumbnail((1600, 1600))
    im.save(f'{OUT}/{key}.webp', quality=80)
    imgs.setdefault(key, {}).update({'lic': v['lic'], 'src': v['url'], 'w': im.width, 'h': im.height})
    imgs[key].setdefault('by', clean(v['by']))
for f, v in J['info'].items():
    m = re.search(r'(\d{4}-\d\d-\d\d)\.svg$', f)
    if not m or not os.path.exists(f'{I}/kit-{m.group(1)}.png'):
        continue
    key = 'kit-' + m.group(1)
    im = Image.open(f'{I}/{key}.png').convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    im = bg.convert('RGB')
    im.thumbnail((900, 900))
    im.save(f'{OUT}/{key}.webp', quality=82)
    imgs[key] = {'lic': v['lic'], 'by': clean(v['by']), 'src': v['url'], 'w': im.width, 'h': im.height}

os.makedirs('public/data/comp', exist_ok=True)
idx = []
for c in D['comps']:
    c.pop('files', None)
    if c.get('final'):
        c['final'].pop('files', None)
    json.dump(c, open(f"public/data/comp/{c['id']}.json", 'w'), ensure_ascii=False, separators=(',', ':'))
    s = {k: c.get(k) for k in ('id', 'kind', 'y', 'comp', 'won', 'shared', 'with', 'pos', 'of', 'spoon', 'gs', 'tc', 'rec', 'finish', 'winner', 'runner')}
    idx.append({k: v for k, v in s.items() if v not in (None, False, [])})
json.dump({'comps': idx, 'names': D['names'], 'images': imgs}, open(old, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(idx), 'competitions')
