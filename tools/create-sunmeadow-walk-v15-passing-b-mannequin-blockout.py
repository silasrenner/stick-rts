from pathlib import Path
import subprocess
from PIL import Image, ImageDraw
R=Path(__file__).resolve().parents[1]; A=Path(r'C:\Program Files\Aseprite\aseprite.exe'); G=R/'artifacts/warrior-pair-proof/tmp-v03-current-guide'; V=R/'assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v14-contact-b-down-b-mannequin-blockout'; O=R/'assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v15-six-pose-mannequin-blockout'; S=R/'assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v15-six-pose-mannequin-blockout.aseprite'; L=R/'tools/create-sunmeadow-walk-v15-six-pose-mannequin-blockout.lua'; B=R/'artifacts/warrior-pair-proof/sunmeadow-walk-v15-six-pose-guide-vs-mannequin.png'; dark=(22,30,38,255); ground=90
names=['contact-a','down-a','passing-a','contact-b','down-b']; frames=[Image.open(V/f'frame-{i:02d}-{n}.png').convert('RGBA') for i,n in enumerate(names,1)]
p=Image.new('RGBA',(110,97),(0,0,0,0));d=ImageDraw.Draw(p)
def limb(q,w):
 r=w//2;d.line(q,fill=dark,width=w,joint='curve')
 for x,y in q:d.ellipse((x-r,y-r,x+r,y+r),fill=dark)
# Passing B guide: yellow-equivalent begins right and plants left; orange-equivalent begins left and raises to right.
limb([(56,60),(46,75),(43,90)],8)
limb([(47,60),(55,75),(70,84)],7);d.rectangle((66,81,75,86),fill=dark)
# rise body and stable equipment.
d.polygon([(41,37),(62,37),(66,49),(61,64),(47,64),(39,49)],fill=dark);d.ellipse((45,22,60,38),fill=dark)
d.polygon([(43,39),(49,44),(39,53),(30,60),(24,56),(34,46)],fill=dark);d.rectangle((22,54,30,61),fill=dark);d.polygon([(22,56),(10,32),(15,30),(28,54)],fill=dark);d.rectangle((18,54,30,57),fill=dark)
d.polygon([(59,39),(66,44),(72,53),(77,59),(71,64),(64,56),(56,47)],fill=dark);d.polygon([(76,47),(89,50),(94,59),(91,74),(82,80),(73,71),(72,56)],fill=dark);d.rectangle((37,87,49,ground),fill=dark);p.paste((0,0,0,0),(0,ground+1,110,97));frames.append(p);names.append('passing-b');O.mkdir(parents=True,exist_ok=True)
for i,(n,im) in enumerate(zip(names,frames),1):im.save(O/f'frame-{i:02d}-{n}.png')
lines=[]
for i,n in enumerate(names,1):
 if i>1:lines.append('sprite:newFrame()')
 path=(O/f'frame-{i:02d}-{n}.png').as_posix()
 lines.append(f"sprite:newCel(layer,{i},Image{{fromFile={path!r}}})")
save_path=S.as_posix()
L.write_text("local sprite=Sprite(110,97,ColorMode.RGB)\nlocal layer=sprite.layers[1];layer.name='BLOCKOUT — six-pose walk'\n"+'\n'.join(lines)+f"\napp.command.SaveFile{{filename={save_path!r}}};app.exit()",encoding='utf-8');r=subprocess.run([str(A),'--batch','--script',str(L)],capture_output=True,text=True);assert r.returncode==0,r.stderr
# six columns: guide above blockout.
sc,w,h=3,330,291;board=Image.new('RGBA',(w*3+56,(h*2+32)*2+84),'#111820');bd=ImageDraw.Draw(board);bd.text((16,14),'SUNMEADOW WALK v15 — COMPLETE SIX-POSE GUIDE vs MANNEQUIN',fill='white');bd.text((16,31),'Top guide / bottom blockout. Red = ground y=90.',fill='#CBD5E1')
for i,(n,im) in enumerate(zip(names,frames)):
 col=i%3;row=i//3;x=16+col*(w+18);y=62+row*(h*2+32)
 guide=Image.open(G/f'frame-{i+1:02d}.png').convert('RGBA')
 for j,(kind,cell) in enumerate((('GUIDE',guide),('BLOCKOUT',im))):
  yy=y+j*(h+20)
  for cy in range(0,h,15):
   for cx in range(0,w,15):bd.rectangle((x+cx,yy+cy,x+cx+14,yy+cy+14),fill='#303743' if ((cx//15)+(cy//15))%2==0 else '#222833')
  board.alpha_composite(cell.resize((w,h),Image.Resampling.NEAREST),(x,yy));bd.line((x,yy+ground*sc,x+w,yy+ground*sc),fill='#EF4444',width=2);bd.text((x,yy-14),f'{i+1} {n.upper()} — {kind}',fill='white')
B.parent.mkdir(parents=True,exist_ok=True);board.save(B);print('passing_b_below_ground='+str(sum(bool(p.getpixel((x,y))[3]) for y in range(91,97) for x in range(110))));print(S);print(B)