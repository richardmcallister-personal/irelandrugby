import re,json,os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from comp_lib import *
import comp_lib as lib
NAMES={'IRE':'Ireland','ENG':'England','SCO':'Scotland','WAL':'Wales','FRA':'France','ITA':'Italy','NZL':'New Zealand','AUS':'Australia','RSA':'South Africa','ARG':'Argentina','FIJ':'Fiji','SAM':'Samoa','WSM':'Western Samoa','TGA':'Tonga','TON':'Tonga','JPN':'Japan','CAN':'Canada','USA':'United States','ROM':'Romania','ROU':'Romania','GEO':'Georgia','NAM':'Namibia','URU':'Uruguay','RUS':'Russia','ZIM':'Zimbabwe','CIV':'Ivory Coast','ESP':'Spain','POR':'Portugal','CHI':'Chile'}
WON={t['y']:t for t in json.load(open(os.path.expanduser('~/wiki/ire_titles.json')))}
def code_of(v):
    m=re.search(r'\{\{\s*ru(?:-rt)?\s*\|\s*([A-Za-z]{3})',v,re.I)
    if m: return m.group(1).upper()
    p=plain(v).lower()
    for k,n in NAMES.items():
        if n.lower() in p: return k
    return None
lib.team=code_of
lib.CODE.update(NAMES)
def heads(s):
    return [(m.start(),len(m.group(1)),m.group(2).strip()) for m in re.finditer(r'^(=+)\s*(.*?)\s*=+\s*$',s,re.M)]
def norm_stage(t):
    t=t.lower()
    if 'bronze' in t or 'third' in t or '3rd' in t: return 'Third-place play-off'
    if 'quarter-final play' in t: return 'Quarter-final play-offs'
    if 'quarter' in t: return 'Quarter-finals'
    if 'semi' in t: return 'Semi-finals'
    if 'place play-off' in t: return t[:1].upper()+t[1:]
    if t.startswith('final') or t=='grand final': return 'Final'
    return None
def stage_at(H,pos):
    st=[h for h in H if h[0]<pos]
    for h in reversed(st):
        n=norm_stage(h[2])
        if n: return n
    return st[-1][2] if st else ''
def matches(s,ire_lineups_only=True,keep=None):
    H=heads(s); ms=[]; seen=set()
    for a,b,body in templates(s,r'(?:#invoke:\s*)?rugby ?box'):
        f=fields(body); h=code_of(f.get('home') or f.get('team1','')); w=code_of(f.get('away') or f.get('team2',''))
        sc=re.search(r'(\d+)\s*[–\-]\s*(\d+)',plain(f.get('score','')))
        if not h or not w or not sc: continue
        stg=stage_at(H,a)
        if keep and not keep(a,stg,h,w): continue
        side={}
        for key,n in (('h','1'),('a','2')):
            if any(f.get(k+n) for k in('try','con','pen','drop')): side[key]={k:names(f.get(k+n,'')) for k in('try','con','pen','drop')}
            else: side[key]=labelled(f.get('homescore' if key=='h' else 'awayscore',''))
        want=('IRE' in (h,w)) or not ire_lineups_only or stg=='Final'
        key=(date(f.get('date','')),h,w)
        if key in seen:
            continue
        seen.add(key)
        ms.append({'date':date(f.get('date','')),'h':h,'a':w,'s':[int(sc.group(1)),int(sc.group(2))],'venue':plain(f.get('stadium','')) or None,'att':re.sub(r'[^\d]','',plain(f.get('attendance','')))or None,'ref':plain(f.get('referee','')) or None,'stage':stg,'sc':side,'xi':lineups(s[b:],[h,w]) if want else {}})
    return ms
def sports_tables(s):
    out=[]
    for a,b,body in templates(s,r'#invoke:\s*sports table'):
        f=fields(body); codes=[f[k].strip().upper() for k in sorted([k for k in f if re.match(r'team\d+$',k)],key=lambda k:int(k[4:]))]
        tab=[]
        for c in codes:
            g=lambda k:int(re.sub(r'\D','',f.get(f'{k}_{c}'.lower(),'0')) or 0)
            tab.append({'c':c,'w':g('win'),'d':g('draw'),'l':g('loss'),'pf':g('pf'),'pa':g('pa'),'tf':g('tf') if f'tf_{c}'.lower() in f else None,'bp':g('b')+g('tb')+g('lb')+g('gs')})
        out.append(tab)
    return out
def wikitables(s):
    """{|...|} tables with rows: team cell {{ru|XXX}} then numbers P W D L PF PA Pts"""
    out=[]
    for t in re.findall(r'\{\|[\s\S]*?\n\|\}',s):
        rows=[]
        for m in re.finditer(r'\{\{\s*ru\s*\|\s*([A-Za-z]{3})[^}]*\}\}[^\n]*\n\|([^\n]*)',t,re.I):
            nums=[int(x) for x in re.findall(r'-?\d+',re.sub(r"'''",'',m.group(2)))]
            if len(nums)>=7: p,w,d,l,pf,pa=nums[:6]; rows.append({'c':m.group(1).upper(),'w':w,'d':d,'l':l,'pf':pf,'pa':pa,'tf':None,'bp':0,'pts':nums[-1]})
        if len(rows)>=3: out.append(rows)
    return out
def table_from(ms):
    agg={}
    for m in ms:
        for c,x,y in ((m['h'],m['s'][0],m['s'][1]),(m['a'],m['s'][1],m['s'][0])):
            r=agg.setdefault(c,{'c':c,'w':0,'d':0,'l':0,'pf':0,'pa':0,'tf':None,'bp':0}); r['pf']+=x;r['pa']+=y
            r['w' if x>y else 'l' if x<y else 'd']+=1
    return list(agg.values())
def rec(ms):
    w=d=l=0
    for m in ms:
        if 'IRE' not in (m['h'],m['a']): continue
        x,y=m['s'] if m['h']=='IRE' else m['s'][::-1]
        if x>y:w+=1
        elif x<y:l+=1
        else:d+=1
    return [w,d,l]
def infobox(s):
    ib=templates(s,'Infobox'); return fields(ib[0][2]) if ib else {}
def files(s,inf): return [x.strip() for x in re.findall(r'\[\[(?:File|Image):([^|\]]+)',s)+[inf.get('image','')] if x.strip()]
OUT=[]
# ---- championships
P=json.load(open('pages.json'))
for ys,page in sorted(P.items()):
    y=int(ys); s=open(f'{y}.txt').read(); inf=infobox(s)
    ms=matches(s); st=sports_tables(s); tab=st[0] if st else (wikitables(s) or [None])[0] or table_from(ms)
    rule=4 if y>=2017 else 2
    for r in tab: r['pts']=rule*r['w']+(rule//2)*r['d']+r['bp']
    if y>=1994: tab.sort(key=lambda r:(-r['pts'],-(r['pf']-r['pa'])))
    else: tab.sort(key=lambda r:(-r['pts'],-(r['pf']-r['pa'])))
    ire=next((r for r in tab if r['c']=='IRE'),None)
    if ire:
        key=(lambda r:(r['pts'],r['pf']-r['pa'])) if y>=1994 else (lambda r:(r['pts'],))
        pos=1+sum(1 for r in tab if key(r)>key(ire))
    else: pos=None
    im=[m for m in ms if 'IRE' in (m['h'],m['a'])]
    beat=set((m['a'] if m['h']=='IRE' else m['h']) for m in im if (m['s'][0]>m['s'][1])==(m['h']=='IRE') and m['s'][0]!=m['s'][1])
    tc={'ENG','SCO','WAL'}<=beat; gs=len(im)>0 and len(beat)==len(im) and len(tab)>=5
    t=WON.get(y); won=bool(t)
    if won: pos=1
    comp=re.sub(r'^\d{4} ','',page)
    last=pos==len(tab) and ire and ire['w']==0 if False else (ire is not None and pos==len(tab) and not won)
    OUT.append({'id':f'ch-{y}','kind':'ch','y':y,'comp':comp,'page':page,'won':won,'shared':bool(t and t['shared']),'with':[NAMES.get(c,c) for c in (t['others'] if t else []) if c!='IRE'],
      'pos':pos,'of':len(tab),'spoon':bool(last),'gs':gs,'tc':tc,'rec':rec(ms),'dates':plain(inf.get('date','')),'top_pts':plain(inf.get('top point scorer','')),'top_tries':plain(inf.get('top try scorer','')),
      'tables':[{'name':'Table','rows':tab,'rule':'4' if y>=2017 else '2'}],'matches':ms,'files':files(s,inf)})
    print(y,comp[:12],len(tab),len(ms),pos,'W' if won else '','GS' if gs else '','TC' if tc else '','spoon' if last else '',rec(ms))
# ---- World Cups and the Autumn Nations Cup
W=json.load(open('wcpages.json')); rd=lambda p:open('wc/'+p.replace(' ','_')+'.txt').read()
POOL={1987:'2',1991:'2',1995:'C',1999:'E',2003:'A',2007:'D',2011:'C',2015:'D',2019:'A',2023:'B'}
def section(s,title):
    H=heads(s); i=[k for k,h in enumerate(H) if h[2].lower()==title.lower()]
    if not i: return ''
    k=i[0]; a=H[k][0]; lvl=H[k][1]; b=next((h[0] for h in H[k+1:] if h[1]<=lvl),len(s)); return s[a:b]
def wcdates(inf,y):
    b=re.sub(r'\s*\(.*|\s*\d{4}$','',plain(inf.get('dateto','')))
    return f"{plain(inf.get('datefrom',''))} – {b} {y}"
def wchosts(inf): return ', '.join(plain(v) for k,v in inf.items() if re.match(r'(joint)?host\d*$',k))
def ko_text(s):
    a=[s.find(x) for x in ('\n==Play-off stage==','\n==Knockout stage==') if s.find(x)>=0]
    b=s.find('\n==Statistics')
    return s[min(a):b if b>0 else len(s)]
for y,pl in POOL.items():
    main=rd(W[f'{y} Rugby World Cup']); inf=infobox(main)
    pk=f'{y} Rugby World Cup Pool {pl}'; kk=f'{y} Rugby World Cup knockout stage'
    if pk in W and W[pk]!=W[f'{y} Rugby World Cup']:
        ps=rd(W[pk]); tpl=f'wc/Template_{y}_Rugby_World_Cup_Pool_{pl}.txt'
        if os.path.exists(tpl): ps=open(tpl).read()+ps
    else: ps=section(main,f'Pool {pl}')
    ks=rd(W[kk]) if kk in W else ko_text(main)
    pm=[dict(m,stage=f'Pool {pl}') for m in matches(ps)]
    km=matches(ks,keep=lambda a,stg,h,w: True)
    seen=set(); ms=[]
    for m in pm+km:
        k=(m['date'],m['h'],m['a'])
        if k in seen: continue
        seen.add(k); ms.append(m)
    pool_codes=None
    st=[t for t in sports_tables(ps)+wikitables(ps) if any(r['c']=='IRE' for r in t)]
    tab=st[0] if st else table_from(pm)
    rule={1987:(2,1,0),1991:(3,2,1),1995:(3,2,1),1999:(3,2,1)}.get(y,(4,2,0))
    for r in tab:
        if 'pts' not in r or y>=2003 or y==1987: r['pts']=rule[0]*r['w']+rule[1]*r['d']+rule[2]*r['l']+r['bp']
    tab.sort(key=lambda r:(-r['pts'],-(r['pf']-r['pa'])))
    fin=[m for m in km if m['stage']=='Final']
    fin=fin[-1] if fin else None
    FP=json.load(open('finals.json'))
    if str(y) in FP and fin:
        fs=open(f'wc/final_{y}.txt').read(); fi=infobox(fs)
        fm=[m for m in matches(fs,ire_lineups_only=False) if {m['h'],m['a']}=={fin['h'],fin['a']}]
        if fm:
            g=fm[0]
            for k in ('xi','sc','venue','att','ref'):
                if (k=='xi' and sum(map(len,g['xi'].values()))>sum(map(len,fin['xi'].values()))) or (k!='xi' and not fin.get(k) and g.get(k)): fin[k]=g[k]
            if not any(v for side in fin['sc'].values() for v in side.values()): fin['sc']=g['sc']
        fin['page']=FP[str(y)]; fin['motm']=plain(next((v for k,v in fi.items() if re.match(r'(man|player)[ _]of[ _]the[ _]match',k)),''))
        fin['weather']=plain(re.sub(r'<br\s*/?>',', ',fi.get('weather',''))); fin['files']=files(fs,fi)
        for m in ms:
            if m['stage']=='Final': m.update(fin)
    im=[m for m in ms if 'IRE' in (m['h'],m['a'])]
    lastm=im[-1] if im else None
    finish='Pool stage'
    if lastm and lastm['stage'].lower().startswith('quarter-final play'): finish='Quarter-final play-off'
    elif lastm and lastm['stage'].lower().startswith('quarter'): finish='Quarter-finals'
    win=run=None
    if fin: win,run=(fin['h'],fin['a']) if fin['s'][0]>fin['s'][1] else (fin['a'],fin['h'])
    OUT.append({'id':f'wc-{y}','kind':'wc','y':y,'comp':'Rugby World Cup','page':W[f'{y} Rugby World Cup'],'won':False,'finish':finish,'pool':pl,'rec':rec(im),
      'dates':wcdates(inf,y),'hosts':wchosts(inf),'winner':win,'runner':run,'final':fin,
      'top_pts':plain(re.sub(r'<br\s*/?>',', ',inf.get('top_scorer',''))),'top_tries':plain(re.sub(r'<br\s*/?>',', ',inf.get('most_tries',''))),'att':plain(inf.get('attendance','')),
      'tables':[{'name':f'Pool {pl}','rows':tab,'rule':'-'.join(map(str,rule))}],'matches':ms,'files':files(main,inf)})
    print(y,'WC',len(tab),len(pm),len(km),finish,rec(im),'final',fin and (fin['h'],fin['s'],fin['a'],len(fin['xi'].get(fin['h'],[])),len(fin['xi'].get(fin['a'],[]))))
s=open('wc/2020_Autumn_Nations_Cup.txt').read(); inf=infobox(s)
gb=section(s,'Group A'); fn=section(s,'Finals')
pm=[dict(m,stage='Group A') for m in matches(gb)]; km=matches(fn)
tab=table_from(pm)
for r in tab: r['pts']=4*r['w']+2*r['d']
tab.sort(key=lambda r:(-r['pts'],-(r['pf']-r['pa'])))
ms=pm+[m for m in km if 'IRE' in (m['h'],m['a']) or m['stage']=='Final']
im=[m for m in ms if 'IRE' in (m['h'],m['a'])]
OUT.append({'id':'anc-2020','kind':'anc','y':2020,'comp':'Autumn Nations Cup','page':'Autumn Nations Cup','won':False,'finish':'Third','rec':rec(im),'dates':plain(inf.get('date','')),
  'tables':[{'name':'Group A','rows':tab,'rule':'4'}],'matches':ms,'files':files(s,inf),'top_pts':plain(inf.get('top point scorer','')),'top_tries':plain(inf.get('top try scorer',''))})
print('ANC',len(tab),len(ms),rec(im),[(m['stage'],m['h'],m['a'],m['s']) for m in km])
json.dump({'comps':OUT,'names':NAMES},open('competitions.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(OUT),os.path.getsize('competitions.json'))
