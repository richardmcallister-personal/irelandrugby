# Resizes Richard's asset folder into the small web images in public/img. Usage: build_images.py <assets folder>
import sys,os,glob,shutil
from PIL import Image
U=sys.argv[1]; O='public/img'
def out(src,dst,box):
    im=Image.open(src).convert('RGBA'); im.thumbnail(box,Image.LANCZOS); im.save(dst,'WEBP',quality=82,method=6)
for f in glob.glob(U+'/crests/*.png'):
    n=os.path.basename(f)[:-4]
    if n in('ireland-official','ireland-shield-version'): continue
    out(f,f'{O}/crest/{n}.webp',(320,320))
for t in 'ireland munster leinster ulster connacht'.split():
    out(f'{U}/crests/{t}.png',f'{O}/t/{t}.webp',(96,96))
for f in glob.glob(U+'/opposition/clubs/*.png'):
    out(f,f'{O}/t/{os.path.basename(f)[:-4]}.webp',(96,96))
for f in glob.glob(U+'/opposition/nations/*.png'):
    n=os.path.basename(f)[:-4]
    if n.endswith('-official'):
        b=n[:-9]
        if os.path.exists(f'{U}/opposition/nations/{b}.png'): continue
        n=b
    out(f,f'{O}/t/{n}.webp',(96,96))
for f in glob.glob(U+'/comps/*.png'):
    out(f,f'{O}/comp/{os.path.basename(f)[:-4]}.webp',(240,80))
K={'ireland':['2026-27-home','2026-27-away'],'munster':['2025-27-home','2026-27-away','2026-28-european'],'leinster':['2026-27-home','2026-27-away','2026-27-european'],'ulster':['2026-27-home','2026-27-away','2026-27-third'],'connacht':['2026-27-home','2026-27-away']}
for t,l in K.items():
    for k in l:
        im=Image.open(f'{U}/kits/{t}/{k}.png').convert('RGB'); im.thumbnail((480,540),Image.LANCZOS); im.save(f'{O}/kit/{t}-{k}.webp','WEBP',quality=78,method=6)
