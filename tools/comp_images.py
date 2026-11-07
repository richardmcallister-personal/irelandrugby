import json,urllib.request,urllib.parse,re,time,os
UA={'User-Agent':'irelandrugby-builder/1.0 (personal fan site)'}
def api(p):
    time.sleep(3)
    u='https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode({**p,'format':'json','formatversion':2})
    return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30))
G=['Eden Park','Twickenham Stadium','Ellis Park Stadium','Millennium Stadium','Stadium Australia','Stade de France','International Stadium Yokohama','Webb Ellis Cup','Lansdowne Road','Croke Park','Aviva Stadium']
r=api({'action':'query','titles':'|'.join(G),'prop':'pageimages','piprop':'name','redirects':1})
lead={p['title']:'File:'+p['pageimage'] for p in r['query']['pages'] if p.get('pageimage')}
print(lead)
d=json.load(open('competitions.json'))['comps']
kits=set()
for c in d:
    fl=list(c['files'])+(c.get('final') or {}).get('files',[])
    for f in fl:
        f=f.replace('File:','').strip()
        if re.search(r' vs .* \d{4}-\d\d-\d\d\.svg$',f) and ('Ireland' in f or (c.get('final') and f in c['final'].get('files',[]))): kits.add('File:'+f)
allf=list(lead.values())+sorted(kits)
info={}
for i in range(0,len(allf),45):
    m=api({'action':'query','titles':'|'.join(allf[i:i+45]),'prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':1200})
    for p in m['query']['pages']:
        if 'imageinfo' not in p: continue
        ii=p['imageinfo'][0]; md=ii.get('extmetadata',{})
        info[p['title']]={'lic':md.get('LicenseShortName',{}).get('value',''),'nonfree':md.get('NonFree',{}).get('value',''),'by':re.sub(r'<[^>]+>','',md.get('Artist',{}).get('value','')).strip()[:80],'thumb':ii.get('thumburl'),'url':ii['descriptionurl'],'w':ii['width'],'h':ii['height']}
json.dump({'lead':lead,'info':info},open('imgs.json','w'),indent=0)
print(len(kits),'kits',len(info),'info')
for k,v in info.items():
    if 'svg' not in k: print(k[:70],v['lic'],v['nonfree'],v['by'][:30])
print(set(v['lic'] for v in info.values()))
