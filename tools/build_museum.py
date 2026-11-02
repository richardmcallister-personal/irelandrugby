import csv,re,os,json,sys,collections
from PIL import Image
from urllib.parse import urlparse
X=sys.argv[1]
R=list(csv.DictReader(open('kit-history.csv')))
def season(l):
    l=l.strip()
    m=re.match(r'(\d{4})[ /\-–]+(\d{2,4})$',l)
    if m:
        a=int(m.group(1)); b=m.group(2); b=int(b) if len(b)==4 else int(str(a)[:2]+b)
        if b-a==1: return f'{a}/{str(b)[2:]}'
        return f'{a}-{str(b)[2:]}'
    return l
def bad(r):
    n=(r['name']+' '+r['file']).lower()
    if r['team']=='combined-provinces' or r['squad']!='not specified': return True
    if re.search(r'eagles|academy|women|woman|emerging|u19|u20|\bkids\b|youth|\ba\b.*(player|no)|launch|ulster a |wolfhounds',n): return True
    return False
def rank(r):
    n=(r['name']+r['file']).lower(); s=0
    if re.search(r'match.?worn|signed',n): s+=3
    if re.search(r'player.?issue|players|no-?\d',n): s+=2
    if re.search(r'-l-s-|long',n): s+=1
    if 'official' in r['notes'].lower(): s-=5
    return s
G=collections.defaultdict(list)
for r in R:
    if not bad(r): G[(r['team'],season(r['date_label']),r['kit_type'])].append(r)
items=[]
for (t,s,k),rs in sorted(G.items()):
    r=sorted(rs,key=rank)[0]
    if not os.path.exists(r['file']): continue
    name=f"{t}-{re.sub(r'[^0-9a-z]+','-',s.lower())}-{re.sub(r'[^a-z]+','-',k)}.webp"
    im=Image.open(r['file']).convert('RGB'); im.thumbnail((400,450),Image.LANCZOS); im.save(os.path.join(X,'shirts',name),'WEBP',quality=74,method=6)
    items.append({'t':t,'s':s,'k':k,'f':name,'src':r['page'],'host':urlparse(r['page']).netloc.replace('www.','')})
json.dump(items,open(os.path.join(X,'museum.json'),'w'),separators=(',',':'))
print(len(items),collections.Counter(i['t'] for i in items),collections.Counter(i['k'] for i in items)); print(sorted({i['s'] for i in items if i['t']=='ireland'})[:50])
for f in os.listdir('comps/world-cup'):
    if f.startswith('men-') and 'preview' not in f:
        im=Image.open('comps/world-cup/'+f).convert('RGBA'); im.thumbnail((160,120)); im.save(os.path.join(X,'logos/wc',f[:-4]+'.webp'),'WEBP',quality=82)
for f in ['h-cup','heineken-champions-cup-2018','celtic-league','magners-league','rabodirect-pro12','guinness-pro12','guinness-pro14','european-rugby-challenge-cup-2015-16']:
    im=Image.open('comps/historical/'+f+'.png').convert('RGBA'); im.thumbnail((200,80)); im.save(os.path.join(X,'logos/old',f+'.webp'),'WEBP',quality=82)
