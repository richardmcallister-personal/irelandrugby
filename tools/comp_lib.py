import re,json,os
MON={m:i+1 for i,m in enumerate('January February March April May June July August September October November December'.split())}
CODE={'IRE':'Ireland','ENG':'England','SCO':'Scotland','WAL':'Wales','FRA':'France','ITA':'Italy'}
def strip(t):
    t=re.sub(r'<!--[\s\S]*?-->','',t); t=re.sub(r'<ref[^>]*/>','',t); t=re.sub(r'<ref[\s\S]*?</ref>','',t)
    t=re.sub(r'\{\{(?:efn|refn|sfn|cn|citation needed)[^{}]*\}\}','',t,flags=re.I)
    return t
def link(t): return re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]',r'\1',t)
def plain(t):
    t=link(strip(t)); t=re.sub(r"'''?|<[^>]+>",'',t); t=re.sub(r'\{\{(?:flagicon|ru|ru-rt)\|[^}]*\}\}','',t,flags=re.I)
    t=re.sub(r'\{\{nowrap\|([^}]*)\}\}',r'\1',t); t=re.sub(r'\{\{[^{}]*\}\}','',t); t=t.replace('&ndash;','–').replace('&nbsp;',' ')
    return re.sub(r'\s+',' ',t).strip()
def templates(s,name):
    out=[]
    for m in re.finditer(r'\{\{\s*'+name,s,re.I):
        j=m.start()+2;d=1
        while j<len(s)-1 and d>0:
            if s[j:j+2]=='{{':d+=1;j+=2
            elif s[j:j+2]=='}}':d-=1;j+=2
            else:j+=1
        out.append((m.start(),j,s[m.end():j-2]))
    return out
def fields(b):
    b=strip(b);parts=[];cur='';d=0;i=0
    while i<len(b):
        two=b[i:i+2]
        if two in('{{','[['):d+=1;cur+=two;i+=2;continue
        if two in('}}',']]'):d-=1;cur+=two;i+=2;continue
        if b[i]=='|' and d==0:parts.append(cur);cur='';i+=1;continue
        cur+=b[i];i+=1
    parts.append(cur);f={}
    for p in parts:
        if '=' in p: k,v=p.split('=',1);f[k.strip().lower()]=v.strip()
    return f
def team(v):
    m=re.search(r'\{\{\s*ru(?:-rt)?\s*\|\s*([A-Za-z]{3})',v,re.I)
    if m: return m.group(1).upper()
    p=plain(v)
    for k,n in CODE.items():
        if n.lower() in p.lower(): return k
    return None
def date(v):
    v=plain(v)
    iso=re.search(r'(\d{4})-(\d{2})-(\d{2})',v)
    if iso: return iso.group(0)
    m=re.search(r'(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})',v)
    return f'{int(m.group(3)):04d}-{MON[m.group(2)]:02d}-{int(m.group(1)):02d}' if m and m.group(2) in MON else None
def names(v):
    """'[[X|Y]] (2) 12' c, 40'<br/>[[Z]]' -> [[full, shown, count, [mins]]]"""
    out=[]
    for line in re.split(r'<br\s*/?>|\n|,(?![^\[]*\]\])(?=\s*\[\[)',v):
        line=line.strip()
        if not line: continue
        m=re.match(r'\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\](.*)',line,re.S)
        if m: full=re.sub(r'\s*\(.*?\)$','',m.group(1)).strip(); show=(m.group(2) or m.group(1)).strip(); rest=m.group(3)
        else:
            m=re.match(r"([A-Za-z][^\d(]*)(.*)",plain(line))
            if not m: continue
            full=show=m.group(1).strip(' ,'); rest=m.group(2)
        if not show or show.lower() in('try','con','pen','drop'): continue
        mins=[int(x) for x in re.findall(r"(\d{1,3})(?:\+\d+)?\s*['′’]",rest)]
        c=re.search(r'\((\d+)(?:/\d+)?\)',rest); n=int(c.group(1)) if c else (len(mins) or 1)
        if re.search(r'penalty try',full,re.I): full=show='Penalty try'
        out.append([full,show,n,mins])
    return out
def labelled(v):
    """homescore = '''Try:''' A <br/> B '''Con:''' C ..."""
    side={'try':[],'con':[],'pen':[],'drop':[]}
    parts=re.split(r"'''\s*(Tr(?:y|ies)|Cons?(?:versions?)?|Pens?(?:alt(?:y|ies))?|Drops?(?: goals?)?|DG|GM|Goal from mark|Mark)\s*:?\s*'''\s*:?",v,flags=re.I)
    for k,body in zip(parts[1::2],parts[2::2]):
        k=k.lower(); key='try' if k.startswith('tr') else 'con' if k.startswith('con') else 'pen' if k.startswith('pen') else 'drop'
        side[key]+=names(body)
    return side
def lineups(after,codes):
    """Modern: two side-by-side tables (home first). Older: <small>'''Ireland:''' ...</small>."""
    res={}
    tabs=re.findall(r'\{\|[^\n]*cellspacing="?0"?[\s\S]*?\n\|\}',after[:12000])
    if len(tabs)>=2:
        for code,t in zip(codes,tabs[:2]):
            ps=[]
            for r in re.finditer(r"^\|\s*([A-Z0-9]{1,3})?\s*\|\|\s*'''(\d+)'''\s*\|\|\s*(.*)$",t,re.M):
                nm=re.search(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]',r.group(3))
                if nm: ps.append([int(r.group(2)),(nm.group(2) or nm.group(1)).strip(),r.group(1) or ''])
            if ps: res[code]=ps
    for code in codes:
        if code in res: continue
        m=re.search(r"'''"+CODE[code]+r":?'''\s*:?([\s\S]*?)(?:</small>|\n\n)",after[:9000])
        if m:
            txt=re.sub(r"'''?[^']*'''?",'',link(strip(m.group(1))))
            txt=re.sub(r'\([^()]*\)','',txt)
            ps=[[i+1,x.strip(' .'),''] for i,x in enumerate([y for y in re.split(r',|\n',txt) if y.strip(' .')])]
            ps=[p for p in ps if p[1] and len(p[1])<40]
            if ps: res[code]=ps
    return res
