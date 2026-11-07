"""Clean the Mac build (sides.json from tools/build_sides.py) into public/data/sides.json.

Usage: python3 tools/publish_sides.py <sides.json>
Wikipedia infoboxes are messy, so grounds, capacities and a few coaches are tidied here.
"""
import json, re, sys

S = json.load(open(sys.argv[1]))
IRISH = {'ireland', 'munster', 'leinster', 'ulster', 'connacht'}
# Hand fixes where the infobox is unclear or wrong (checked 7 Nov 2026)
FIX = {
    'montpellier': {'coach': 'Joan Caudullo'},
    'northampton-saints': {'coach': 'Phil Dowson (director of rugby)'},
    'bath': {'coach': 'Johann van Graan'},
    'ospreys': {'grounds': [['St Helens, Swansea', 8000]], 'note': 'Moved from the Brewery Field, Bridgend, in 2026.'},
    'italy': {'grounds': [['Stadio Olimpico, Rome', 70634]]},
    'scotland': {'grounds': [['Murrayfield Stadium, Edinburgh', 67144]]},
    'england': {'grounds': [['Twickenham Stadium, London', 82000]]},
    'france': {'grounds': [['Stade de France, Saint-Denis', 81338]]},
    'wales': {'grounds': [['Principality Stadium, Cardiff', 73931]]},
    'edinburgh': {'grounds': [['Edinburgh Rugby Stadium', 7800]]},
}
LEAGUE = {'France': 'Top 14', 'United Kingdom': 'Premiership Rugby'}


def num(s):
    m = re.search(r'\d[\d,]*', s or '')
    return int(m.group(0).replace(',', '')) if m else None


def grounds(g, cap):
    if not g or g.lower().startswith('various'):
        return []
    parts = re.findall(r'(?:(?:Main|Secondary) Ground:\s*)?([^,(]+?)\s*\((?:[Cc]apacity:?\s*)?([\d,]+)(?:\s*capacity)?\)', g)
    if parts:
        return [[re.sub(r'^(?:Main|Secondary) Ground:\s*', '', n.strip()), num(c)] for n, c in parts]
    return [[g.split(',')[0].strip() if 'Stadio Sergio' not in g else g, num(cap)]]


out = {}
for slug, t in S.items():
    if slug in IRISH:
        continue
    o = {k: t.get(k) for k in ('name', 'page', 'kind', 'nick', 'founded', 'coach', 'captain', 'location', 'country', 'record_att', 'opened', 'lat', 'lon', 'web', 'x', 'ig', 'fb', 'tt', 'yt', 'squad', 'squad_kind', 'most_caps', 'top_scorer', 'top_try', 'ground_page')}
    o['league'] = t.get('league') or (LEAGUE.get(t.get('country')) if t['kind'] == 'club' else '')
    o['grounds'] = grounds(t.get('ground'), t.get('capacity'))
    if o['coach'] and (len(o['coach']) > 60 or ' was ' in o['coach']):
        o['coach'] = None
    o['record_att'] = re.sub(r'\s*\(\s*$', '', o['record_att'] or '').strip() or None
    o['name'] = re.sub(r"^(.*?)(?: men's)? national rugby union team$", r'\1', o['name'] or t['page'])
    cap = [p['n'] for p in t.get('squad', []) if p.get('c')]
    if t['kind'] == 'nation' and cap:
        o['captain'] = cap[0]  # the latest squad is newer than the infobox
    if not re.search(r'\d{4}', o.get('founded') or ''):
        o['founded'] = t.get('inception')
    o.update(FIX.get(slug, {}))
    o = {k: v for k, v in o.items() if v not in (None, '', [])}
    out[slug] = o
json.dump(out, open('public/data/sides.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for s, o in out.items():
    print(s, '|', o.get('grounds'), '|', o.get('coach'), '|', o.get('league', '')[:40], '|', len(o.get('squad', [])))
