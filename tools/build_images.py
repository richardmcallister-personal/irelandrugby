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

# App icons and favicon from the IRFU crest. White crest on Ireland green for the app; green shamrock on white at tab size.
GREEN=(10,107,61,255)
def icon(src,size,bg,pad,dst,radius=0):
    from PIL import ImageDraw
    c=Image.new('RGBA',(size,size),bg if not radius else (0,0,0,0))
    if radius:
        ImageDraw.Draw(c).rounded_rectangle((0,0,size-1,size-1),radius,fill=bg)
    im=Image.open(src).convert('RGBA'); box=int(size*(1-2*pad)); im.thumbnail((box,box),Image.LANCZOS)
    c.alpha_composite(im,((size-im.width)//2,(size-im.height)//2)); c.save(dst)
W=U+'/crests/ireland-white.png'; C=U+'/crests/ireland.png'
icon(W,180,GREEN,.12,'public/apple-touch-icon.png')
icon(W,192,GREEN,.12,'public/icon-192.png')
icon(W,512,GREEN,.12,'public/icon-512.png')
icon(W,512,GREEN,.2,'public/icon-512-maskable.png')
icon(C,32,(255,255,255,255),.06,'public/favicon-32.png',radius=6)
icon(C,48,(255,255,255,255),.06,'public/favicon-48.png',radius=9)
