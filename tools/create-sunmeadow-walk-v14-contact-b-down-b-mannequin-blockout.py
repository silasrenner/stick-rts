from pathlib import Path
import subprocess
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
ASEPRITE=Path(r"C:\Program Files\Aseprite\aseprite.exe")
GUIDES=ROOT/"artifacts/warrior-pair-proof/tmp-v03-current-guide"
V13=ROOT/"assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v13-contact-b-mannequin-blockout"
OUT=ROOT/"assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v14-contact-b-down-b-mannequin-blockout"
ASE=ROOT/"assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v14-contact-b-down-b-mannequin-blockout.aseprite"
LUA=ROOT/"tools/create-sunmeadow-walk-v14-contact-b-down-b-mannequin-blockout.lua"
BOARD=ROOT/"artifacts/warrior-pair-proof/sunmeadow-walk-v14-contact-b-down-b-guide-vs-mannequin.png"
DARK=(22,30,38,255); GROUND=90
frames=[Image.open(V13/f"frame-{i:02d}-{n}.png").convert("RGBA") for i,n in ((1,'contact-a'),(2,'down-a'),(3,'passing-a'),(4,'contact-b'))]
down=Image.new('RGBA',(110,97),(0,0,0,0)); d=ImageDraw.Draw(down)
def limb(points,width):
 r=width//2; d.line(points,fill=DARK,width=width,joint='curve')
 for x,y in points:d.ellipse((x-r,y-r,x+r,y+r),fill=DARK)
# Down B follows guide 05 ownership: orange starts left and folds to right
# planted foot; yellow starts right and folds to left planted foot.
limb([(56,62),(44,76),(38,90)],8) # rear/yellow-equivalent, left planted foot
limb([(47,62),(54,76),(65,90)],8) # front/orange-equivalent, right planted foot
# Down beat: head/torso 2px lower than Contact B.
d.polygon([(41,39),(62,39),(66,51),(61,66),(47,66),(39,51)],fill=DARK); d.ellipse((45,24,60,40),fill=DARK)
# equipment sides retained; arms settle with weight.
d.polygon([(43,41),(49,46),(39,55),(30,62),(24,58),(34,48)],fill=DARK); d.rectangle((22,56,30,63),fill=DARK); d.polygon([(22,58),(10,34),(15,32),(28,56)],fill=DARK); d.rectangle((18,56,30,59),fill=DARK)
d.polygon([(59,41),(66,46),(72,55),(77,61),(71,66),(64,58),(56,49)],fill=DARK); d.polygon([(76,49),(89,52),(94,61),(91,76),(82,82),(73,73),(72,58)],fill=DARK)
d.rectangle((32,87,44,GROUND),fill=DARK); d.rectangle((59,87,71,GROUND),fill=DARK); down.paste((0,0,0,0),(0,GROUND+1,110,97))
frames.append(down); names=['contact-a','down-a','passing-a','contact-b','down-b']; OUT.mkdir(parents=True,exist_ok=True)
for i,(n,im) in enumerate(zip(names,frames),1):im.save(OUT/f'frame-{i:02d}-{n}.png')
cel='\n'.join(("sprite:newCel(blockout, 1, Image{ fromFile="+repr((OUT/'frame-01-contact-a.png').as_posix())+" })",)+tuple("sprite:newFrame()\nsprite:newCel(blockout, %d, Image{ fromFile=%r })"%(i,(OUT/f'frame-{i:02d}-{n}.png').as_posix()) for i,n in enumerate(names[1:],2)))
lua=f'''local sprite=Sprite(110,97,ColorMode.RGB)\nlocal blockout=sprite.layers[1]; blockout.name="BLOCKOUT — Contact A through Down B"\n{cel}\nlocal guide=sprite:newLayer();guide.name="GUIDE — owner-edited v03 external/locked";guide.isVisible=false;guide.isEditable=false\napp.command.SaveFile{{filename={ASE.as_posix()!r}}};app.exit()'''; LUA.write_text(lua,encoding='utf-8')
r=subprocess.run([str(ASEPRITE),'--batch','--script',str(LUA)],capture_output=True,text=True)
if r.returncode:raise SystemExit(r.stderr or r.stdout)
scale,w,h=5,550,485; board=Image.new('RGBA',(w*2+52,h*2+116),'#111820'); bd=ImageDraw.Draw(board); bd.text((16,14),'SUNMEADOW WALK v14 — CONTACT B / DOWN B GUIDE vs BLOCKOUT',fill='#F8FAFC'); bd.text((16,31),'Top: current owner guide. Bottom: mannequin blockout. Red = ground y=90.',fill='#CBD5E1')
for col,(label,gn,im) in enumerate((('CONTACT B',4,frames[3]),('DOWN B',5,down))):
 x=16+col*(w+20); guide=Image.open(GUIDES/f'frame-{gn:02d}.png').convert('RGBA')
 for row,(kind,cell) in enumerate((('GUIDE',guide),('BLOCKOUT',im))):
  y=62+row*(h+28)
  for yy in range(0,h,20):
   for xx in range(0,w,20):bd.rectangle((x+xx,y+yy,x+xx+19,y+yy+19),fill='#303743' if ((xx//20)+(yy//20))%2==0 else '#222833')
  board.alpha_composite(cell.resize((w,h),Image.Resampling.NEAREST),(x,y));bd.line((x,y+GROUND*scale,x+w,y+GROUND*scale),fill='#EF4444',width=2);bd.text((x,y-17),f'{label} — {kind}',fill='#F8FAFC')
BOARD.parent.mkdir(parents=True,exist_ok=True);board.save(BOARD)
print('down_b_below_ground='+str(sum(bool(down.getpixel((x,y))[3]) for y in range(GROUND+1,97) for x in range(110))));print(ASE);print(BOARD)
