import json,glob,re
LAB=re.compile(r'^\s*(Tr(?:y|ies)|Cons?|Conv(?:ersions?)?|Pens?|Penalt(?:y|ies)|Drops?|DG|D\.?G\.?|GM|Mark)\b\s*(?:\.\s*:?|:)\s*(.*)$',re.I)
def key(k):
    k=k.lower(); return 'try' if k.startswith('tr') else 'con' if k.startswith('con') else 'pen' if k.startswith('pen') else 'drop'
def fix(side):
    if not side: return 0
    new={'try':[],'con':[],'pen':[],'drop':[]}; n=0
    for k in ('try','con','pen','drop'):
        cur=k
        for r in side.get(k,[]):
            m=LAB.match(r[1]) or LAB.match(r[0])
            if m:
                cur=key(m.group(1)); n+=1
                nm=m.group(2).strip()
                if not nm: continue
                r=[re.sub(r'^.*?:\s*','',r[0]).strip() or nm,nm,r[2],r[3]]
            new[cur].append(r)
    side.clear(); side.update(new); return n
tot=0
for f in glob.glob('public/data/comp/*.json'):
    d=json.load(open(f)); n=0
    for m in d['matches']+([d['final']] if d.get('final') else []):
        for s in m['sc'].values(): n+=fix(s)
    if n: json.dump(d,open(f,'w'),ensure_ascii=False,separators=(',',':')); tot+=n
print('fixed labels',tot)
d=json.load(open('public/data/comp/ch-1977.json'))
print(d['matches'][0]['sc'])
# anything left that still looks like a label
for f in glob.glob('public/data/comp/*.json'):
    for m in json.load(open(f))['matches']:
        for s in m['sc'].values():
            for k,v in s.items():
                for r in v:
                    if ':' in r[1] or re.search(r'\b(Con|Pen|Try|DG)\b',r[1]): print(f,k,r[:2])
