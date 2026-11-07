import json,re,os,sys
sys.path.insert(0,'.')
from lib import templates,fields,plain,strip,link
I=json.load(open('ids.json')); W=json.load(open('wd.json')); E,V,R=W['teams'],W['venues'],W['refs']
lab=lambda q:(E.get(q) or V.get(q) or R.get(q) or {}).get('labels',{}).get('en',{}).get('value')
def vals(e,p):
    cs=e.get('claims',{}).get(p,[])
    pref=[c for c in cs if c.get('rank')=='preferred'] or [c for c in cs if c.get('rank')!='deprecated']
    cur=[c for c in pref if 'P582' not in c.get('qualifiers',{})] or pref
    return [c['mainsnak'].get('datavalue',{}).get('value') for c in cur if c['mainsnak'].get('datavalue')]
def first(e,p):
    v=vals(e,p); return v[0] if v else None
def wt(title):
    f='wt/'+title.replace('/','_')+'.txt'
    return open(f).read() if title and os.path.exists(f) else ''
def infobox(s):
    ib=templates(s,'Infobox'); return fields(ib[0][2]) if ib else {}
def pl(v): return plain(re.sub(r'<br\s*/?>',', ',v or '')).strip(' ,')
def squad(s):
    out=[]; coach=None
    m=re.search(r"'''\s*Head [Cc]oach\s*'''\s*:?\s*(.*)",s)
    if m: coach=pl(m.group(1))
    # nations
    ns=re.search(r'\{\{\s*nat rs start[\s\S]*?(?:\{\{\s*nat rs end|\n==)',s,re.I)
    for a,b,body in templates(ns.group(0) if ns else '',r'nat rs player'):
        f=fields(body); nm=f.get('name','')
        sn=re.search(r'\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)',nm)
        name=(sn.group(1).strip()+' '+sn.group(2).strip()) if sn else pl(nm)
        name=re.sub(r'\s*\(c\)|\s*\(captain\)','',name).strip()
        club=pl(re.sub(r'\{\{\s*Rut?\s*\|([^|}]*)[^}]*\}\}',r'\1',f.get('club','')))
        caps=re.sub(r'\D','',plain(f.get('caps','')))
        out.append({'n':name,'pos':plain(f.get('pos','')),'caps':int(caps) if caps else None,'club':club,'c':bool(re.search(r'\(c\)|Captain',nm))})
    if out: return out,coach,'nat'
    # clubs: grouped by '''Position''' lines
    sec=re.search(r'==\s*(?:Current|Senior|First[- ]team)? ?[Ss]quad\s*==[\s\S]*?(?=\n==[^=]|\Z)',s) or re.search(r'==\s*Players\s*==[\s\S]*?(?=\n==[^=]|\Z)',s)
    body=sec.group(0) if sec else s
    blk=re.search(r'\{\{\s*Rugby union squad start[\s\S]*?\{\{\s*Rugby union squad end',s[sec.start() if sec else 0:],re.I)
    if blk: body=blk.group(0)
    grp=None
    for line in body.split('\n'):
        g=re.match(r"\s*'''([^']+)'''\s*$",line)
        if g: grp=g.group(1).strip(); continue
        if re.match(r'\s*==',line) and out: break
        for a,b,t in templates(line,r'RU squad player'):
            f=fields(t); parts=[p.strip() for p in strip(t).split('|')]
            pos=[p for p in parts[1:] if '=' not in p]
            if len(pos)<2: continue
            out.append({'n':pl(pos[1]),'nat':pos[0].upper(),'pos':grp,'cap':f.get('cap')=='y','c':f.get('captain')=='y'})
        b=re.match(r"\s*\*\s*\{\{\s*flagicon\s*\|\s*([A-Za-z]{3})[^}]*\}\}\s*(.+)",line)
        if b and grp: out.append({'n':pl(b.group(2)),'nat':b.group(1).upper(),'pos':grp,'cap':False,'c':False})
    return out,coach,'club'
OUT={}
for slug,v in I.items():
    e=E.get(v['qid'],{}); s=wt(v['page']); ib=infobox(s)
    sq,coach,kind=squad(s)
    ven=[x['id'] for x in vals(e,'P115') if isinstance(x,dict)]
    vq=ven[0] if ven else None; ve=V.get(vq,{}) if vq else {}
    vt=ve.get('sitelinks',{}).get('enwiki',{}).get('title'); vib=infobox(wt(vt)) if vt else {}
    cap=first(ve,'P1083'); coord=first(ve,'P625')
    ground=pl(ib.get('ground') or ib.get('grounds') or ib.get('stadium') or ib.get('home stadium') or '') or (lab(vq) if vq else None)
    loc=pl(ib.get('location','')) or ', '.join(x for x in [lab(first(e,'P159')['id']) if first(e,'P159') else None] if x)
    country=lab(first(e,'P17')['id']) if first(e,'P17') else None
    yt=first(e,'P2397')
    OUT[slug]={'name':lab(v['qid']),'page':v['page'],'qid':v['qid'],'kind':'nation' if 'national' in v['page'] else 'club',
      'nick':pl(ib.get('nickname','')),'founded':pl(ib.get('founded','') or ib.get('first match','')[:0]),'union':pl(ib.get('union','')),
      'league':pl(ib.get('league','') or ''),'coach':pl(ib.get('coach','') or ib.get('head coach','')) or coach,'captain':pl(ib.get('captain','')),
      'location':loc,'country':country,
      'ground':ground,'ground_page':vt,'capacity':pl(ib.get('capacity','')) or pl(vib.get('capacity','')) or (str(int(float(cap['amount']))) if cap else None),
      'record_att':pl(vib.get('record_attendance','') or vib.get('record attendance','')),'opened':pl(vib.get('opened','')),
      'lat':coord['latitude'] if coord else None,'lon':coord['longitude'] if coord else None,
      'most_caps':pl(ib.get('most caps','')),'top_scorer':pl(ib.get('top scorer','')),'top_try':pl(ib.get('most tries','') or ib.get('top try scorer','')),
      'web':first(e,'P856') or pl(ib.get('website','')),'x':first(e,'P2002'),'ig':first(e,'P2003'),'fb':first(e,'P2013'),'tt':first(e,'P7085'),'yt':yt,
      'squad':sq,'squad_kind':kind,'inception':(first(e,'P571') or {}).get('time','')[1:5] or None}
    o=OUT[slug]; print(slug,'|',o['ground'],o['capacity'],'|rec',o['record_att'][:40],'|',o['location'],'|',o['league'],'|coach',o['coach'],'|cap',o['captain'],'|sq',len(sq),'|',o['web'],o['x'],o['ig'],o['fb'],o['yt'] and 'yt')
json.dump(OUT,open('sides.json','w'),ensure_ascii=False,separators=(',',':'))
print(os.path.getsize('sides.json'))
