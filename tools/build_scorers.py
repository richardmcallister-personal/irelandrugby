# Reads Wikipedia match boxes and matches them to the site's match list. Every side is checked: 5 per try, 2 per conversion, 3 per penalty or drop goal must equal the score.
import re,json,sys,time,urllib.request,urllib.parse,datetime as dt,collections,os
UA='irelandrugby-builder/1.0 (personal fan site; richardmcallister@gmail.com)'
def get(u):
    r=urllib.request.Request(u,headers={'User-Agent':UA}); return urllib.request.urlopen(r,timeout=30).read().decode('utf8')
PAGES=['2020 Six Nations Championship','Autumn Nations Cup','2020 Autumn Nations Cup','2021 Six Nations Championship','2022 Six Nations Championship','2023 Six Nations Championship','2024 Six Nations Championship','2025 Six Nations Championship','2026 Six Nations Championship','2026 Nations Championship','2026 Nations Championship Southern Hemisphere Series','2026 Nations Championship Northern Hemisphere Series',
'2021 July rugby union tests','2021 end-of-year rugby union internationals','2022 mid-year rugby union internationals','2022 end-of-year rugby union internationals','2023 Rugby World Cup warm-up matches','2023 Rugby World Cup Pool B','2023 Rugby World Cup knockout stage','2024 mid-year rugby union internationals','2024 end-of-year rugby union internationals','2025 mid-year rugby union internationals','2025 end-of-year rugby union internationals',
'2020–21 Pro14','2021 Pro14 Rainbow Cup','2021–22 United Rugby Championship','2022–23 United Rugby Championship','2023–24 United Rugby Championship','2024–25 United Rugby Championship','2025–26 United Rugby Championship','2026–27 United Rugby Championship']
for y in range(2020,2027):
    s=f'{y}–{str(y+1)[2:]}'
    PAGES+=[f'{s} European Rugby Champions Cup',f'{s} EPCR Challenge Cup',f'{s} European Rugby Challenge Cup']
    for t in ['Munster','Leinster','Ulster','Connacht']: PAGES.append(f'{s} {t} Rugby season')
MON={m:i+1 for i,m in enumerate('January February March April May June July August September October November December'.split())}
def parse_date(s,sy=None):
    s=re.sub(r'<ref[\s\S]*','',s); s=re.sub(r'\{\{[^{}]*?\|(\d{4})\|(\d{1,2})\|(\d{1,2})[^{}]*\}\}',r'\3 \2 \1',s)
    m=re.search(r'(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})',s) or None
    if m and m.group(2) in MON: return dt.date(int(m.group(3)),MON[m.group(2)],int(m.group(1)))
    m=re.search(r'([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})',s)
    if m and m.group(1) in MON: return dt.date(int(m.group(3)),MON[m.group(1)],int(m.group(2)))
    m=re.search(r'(\d{1,2})\s+([A-Z][a-z]+)',s)
    if m and m.group(2) in MON and sy:
        mo=MON[m.group(2)]; return dt.date(sy if mo>=7 else sy+1,mo,int(m.group(1)))
    m=re.search(r'(\d{1,2})\s+(\d{1,2})\s+(\d{4})',s)
    return dt.date(int(m.group(3)),int(m.group(2)),int(m.group(1))) if m else None
def templates(s):
    i=0;out=[]
    for m in re.finditer(r'\{\{\s*(?:#invoke:\s*)?(?:rugby ?box)[^|]*\|(?:\s*main\s*\|)?',s,re.I):
        j=m.end();d=1
        while j<len(s)-1 and d>0:
            if s[j:j+2]=='{{':d+=1;j+=2
            elif s[j:j+2]=='}}':d-=1;j+=2
            else:j+=1
        out.append(s[m.end():j-2])
    return out
def fields(b):
    b=re.sub(r'<!--[\s\S]*?-->','',b); b=re.sub(r'<ref[^>]*?/>','',b); b=re.sub(r'<ref[\s\S]*?</ref>','',b)
    # split on top-level pipes
    parts=[];cur='';d=0;i=0
    while i<len(b):
        two=b[i:i+2]
        if two in('{{','[['):d+=1;cur+=two;i+=2;continue
        if two in('}}',']]'):d-=1;cur+=two;i+=2;continue
        if b[i]=='|' and d==0:parts.append(cur);cur='';i+=1;continue
        cur+=b[i];i+=1
    parts.append(cur);f={}
    for p in parts:
        if '=' in p:
            k,v=p.split('=',1);f[k.strip().lower()]=v.strip()
    return f
SL=[(r'^ireland$','ireland'),(r'^munster','munster'),(r'^leinster','leinster'),(r'^ulster','ulster'),(r'^connacht','connacht'),(r'^bath','bath'),(r'bayonn','bayonne'),(r'benetton|treviso','benetton'),(r'black lion','black-lion'),(r'bordeaux','bordeaux-begles'),(r'bristol','bristol-bears'),(r'bulls','bulls'),(r'cardiff','cardiff'),(r'castres','castres'),(r'cheetahs','cheetahs'),(r'clermont','clermont'),(r'dragons','dragons'),(r'edinburgh','edinburgh'),(r'exeter','exeter-chiefs'),(r'glasgow','glasgow-warriors'),(r'gloucester','gloucester'),(r'harlequins','harlequins'),(r'rochel','la-rochelle'),(r'leicester','leicester-tigers'),(r'^(10bet |emirates |golden |ellis park )?lions','lions'),(r'lyon','lyon'),(r'montpellier','montpellier'),(r'newcastle','newcastle'),(r'northampton','northampton-saints'),(r'ospreys','ospreys'),(r'section paloise|^pau','pau'),(r'perpignan|usap','perpignan'),(r'racing','racing-92'),(r'^sale','sale-sharks'),(r'saracens','saracens'),(r'scarlets','scarlets'),(r'sharks','sharks'),(r'stade fran','stade-francais'),(r'stormers','stormers'),(r'toulon','toulon'),(r'toulous','toulouse'),(r'vannes','vannes'),(r'zebre','zebre-parma'),(r'wasps','wasps'),(r'worcester','worcester'),(r'london irish','london-irish'),(r'brive','brive'),(r'montauban','montauban'),(r'^(eng|england)$','england'),(r'^(fra|france)$','france'),(r'^(sco|scotland)$','scotland'),(r'^(wal|wales)$','wales'),(r'^(ita|italy)$','italy'),(r'^(nzl|new zealand)$','new-zealand'),(r'^(rsa|south africa)$','south-africa'),(r'^(aus|australia)$','australia'),(r'^(arg|argentina)$','argentina'),(r'^(fij|fiji)$','fiji'),(r'^(jpn|japan)$','japan'),(r'^(geo|georgia)$','georgia'),(r'^(sam|samoa)$','samoa'),(r'^(ton|tonga)$','tonga'),(r'^(rom|romania)$','romania'),(r'^(usa|united states)$','usa'),(r'^(can|canada)$','canada'),(r'^(ire|irl)$','ireland'),(r'^(tga)$','tonga'),(r'^(nz)$','new-zealand'),(r'^(por|portugal)$','portugal'),(r'^(chi|chile)$','chile'),(r'^(uru|uruguay)$','uruguay'),(r'^(nam|namibia)$','namibia')]
def slug(raw):
    t=re.sub(r'\(\d+ ?BP\)|\(\d+\)','',raw)
    c=re.search(r'\{\{\s*ru(?:-rt)?\s*\|\s*([A-Za-z]{2,3})\b',t,re.I)
    if c: t=c.group(1)
    else:
        t=re.sub(r'\{\{[^{}]*\}\}','',t); t=re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]',r'\1',t)
    t=re.sub(r"[^\w\s\-']",' ',t.lower()).strip(); t=t.replace('é','e').replace('è','e')
    t=re.sub(r'\s+',' ',t)
    for r,s in SL:
        if re.search(r,t): return s
    return None
def people(v):
    """Pull [full name, shown name, count, minutes] from one field."""
    out=[]
    v=re.sub(r'\{\{(?:nowrap|small|nobr)\|','',v,flags=re.I).replace('}}','')
    for line in re.split(r'<br\s*/?>|\n|;',v):
        line=line.strip()
        if not line: continue
        for part in re.findall(r"(\[\[[^\]]+\]\][^\[]*|[A-Z][^\[]*)",line):
            m=re.match(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\](.*)',part,re.S)
            if m: full,show,rest=m.group(1),m.group(2) or m.group(1),m.group(3)
            else:
                m2=re.match(r"([^\d(]+)(.*)",part,re.S)
                if not m2: continue
                full=show=m2.group(1).strip();rest=m2.group(2)
            full=re.sub(r'\s*\(.*?\)\s*$','',full).strip()
            mins=[int(x) for x in re.findall(r"(\d{1,3})(?:\+\d+)?\s*['′’]",rest)]
            cnt=re.search(r'\((\d+)(?:/\d+)?\)',rest); made=int(cnt.group(1)) if cnt else (len(mins) or 1)
            out.append([full,show.strip(),made,mins])
    return out
hist=json.loads(get('https://irelandrugby.richardmcallister.workers.dev/api/history'))
fin=[m for m in hist if m['state'].startswith('Finished') and m['score']]
idx=collections.defaultdict(list)
for m in fin: idx[(m['h']['s'],m['a']['s'])].append(m)
res={};seen=set();pg=collections.Counter()
for p in dict.fromkeys(PAGES):
    try: s=get('https://en.wikipedia.org/w/index.php?'+urllib.parse.urlencode({'title':p,'action':'raw'}))
    except Exception: continue
    time.sleep(.4)
    sy=int(p[:4]) if re.match(r'\d{4}–',p) else None
    for b in templates(s):
        f=fields(b); t1=f.get('team1') or f.get('home') or ''; t2=f.get('team2') or f.get('away') or ''
        d=parse_date(f.get('date',''),sy); a,c=slug(t1),slug(t2)
        if not d or not a or not c: continue
        if not any(f.get(k) for k in('try1','try2','pen1','pen2')): continue
        cand=[m for m in idx.get((a,c),[]) if abs((dt.date.fromisoformat(m['date'][:10])-d).days)<=1]
        if not cand: continue
        m=cand[0];rec={}
        for key,n in (('h','1'),('a','2')):
            side={k:people(f.get(k+n,'')) for k in('try','con','pen','drop')}
            names={r[1]:r[0] for k in side for r in side[k] if r[0]!=r[1]}
            for k in side:
                for r in side[k]:
                    if r[0]==r[1] and r[1] in names: r[0]=names[r[1]]
            pts=0
            for k,w in(('try',5),('con',2),('pen',3),('drop',3)):
                for row in side[k]:
                    v=w*row[2]
                    if k=='try' and re.search(r'penalty try',row[0],re.I): v=7
                    pts+=v
            rec[key]=side;rec[key+'ok']=pts==m['score'][0 if key=='h' else 1]
        old=res.get(m['id'])
        if old and (old['hok']+old['aok'])>=(rec['hok']+rec['aok']): continue
        res[m['id']]=rec;pg[p]+=1
ok=sum(1 for r in res.values() if r['hok'] and r['aok'])
print('matches',len(fin),'with scorers',len(res),'both sides check',ok,'one side',sum(1 for r in res.values() if r['hok']!=r['aok']))
by=collections.Counter();tot=collections.Counter()
for m in fin:
    y=(m['date'][:4]);k=m['compName'];tot[k]+=1
    if m['id'] in res and res[m['id']]['hok'] and res[m['id']]['aok']: by[k]+=1
for k in tot: print(k,by[k],'/',tot[k])
miss=[m for m in fin if m['id'] not in res]; print('missing sample',[(m['date'][:10],m['h']['n'],m['a']['n'],m['compName'][:12]) for m in miss[:14]])
bad=[(k,res[k]['hok'],res[k]['aok']) for k in list(res) if not(res[k]['hok'] and res[k]['aok'])][:6]; print('bad',bad)
print(sorted(pg.items(),key=lambda x:-x[1])[:40])
json.dump(res,open('scorers.json','w'),separators=(',',':'),ensure_ascii=False); print(os.path.getsize('scorers.json'))
