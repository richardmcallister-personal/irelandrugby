# Builds fixtures.json from tools/fixtures_src.txt. Times in the source are Irish time. Run from the repo root.
import json,datetime as dt
from zoneinfo import ZoneInfo
R=[]
for l in open('tools/fixtures_src.txt',encoding='utf8'):
    if l.startswith('#') or not l.strip(): continue
    d,t,comp,h,a,v=l.rstrip('\n').split('|')
    u=dt.datetime.fromisoformat(f'{d}T{t}').replace(tzinfo=ZoneInfo('Europe/Dublin')).astimezone(dt.timezone.utc)
    R.append({'date':u.strftime('%Y-%m-%dT%H:%M:00.000Z'),'comp':comp,'h':h,'a':a,'venue':v or None})
json.dump(R,open('fixtures.json','w'),indent=0)
print(len(R),'fixtures')
