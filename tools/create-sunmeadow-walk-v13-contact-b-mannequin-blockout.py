from pathlib import Path
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
GUIDES = ROOT / "artifacts/warrior-pair-proof/tmp-v03-current-guide"
V12 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v12-contact-down-passing-a-mannequin-blockout"
OUT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v13-contact-b-mannequin-blockout"
ASE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v13-contact-b-mannequin-blockout.aseprite"
LUA = ROOT / "tools/create-sunmeadow-walk-v13-contact-b-mannequin-blockout.lua"
BOARD = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v13-contact-a-b-guide-vs-mannequin.png"
DARK, GROUND = (22, 30, 38, 255), 90

contact_a = Image.open(V12 / "frame-01-contact-a.png").convert("RGBA")
down_a = Image.open(V12 / "frame-02-down-a.png").convert("RGBA")
passing_a = Image.open(V12 / "frame-03-passing-a.png").convert("RGBA")
contact_b = Image.new("RGBA", (110, 97), (0, 0, 0, 0)); d = ImageDraw.Draw(contact_b)

def limb(points, width):
    r = width // 2
    d.line(points, fill=DARK, width=width, joint="curve")
    for x, y in points:
        d.ellipse((x-r, y-r, x+r, y+r), fill=DARK)

# Contact B copies the guide's swapped leg ownership rather than mirroring a
# previous silhouette: orange begins left and reaches screen-right foot;
# yellow begins right and reaches screen-left foot. Both feet contact ground.
limb([(56, 60), (48, 75), (39, 90)], 8)  # rear/yellow-equivalent leg to left foot
limb([(47, 60), (55, 75), (65, 90)], 8)  # front/orange-equivalent leg to right foot
# Contact-level upper mass: stable relative to Contact A, not a new design.
d.polygon([(41, 37), (62, 37), (66, 49), (61, 64), (47, 64), (39, 49)], fill=DARK)
d.ellipse((45, 22, 60, 38), fill=DARK)
# Sword remains left, shield remains right; arms stay compositionally stable.
d.polygon([(43, 39), (49, 44), (39, 53), (30, 60), (24, 56), (34, 46)], fill=DARK)
d.rectangle((22, 54, 30, 61), fill=DARK)
d.polygon([(22, 56), (10, 32), (15, 30), (28, 54)], fill=DARK)
d.rectangle((18, 54, 30, 57), fill=DARK)
d.polygon([(59, 39), (66, 44), (72, 53), (77, 59), (71, 64), (64, 56), (56, 47)], fill=DARK)
d.polygon([(76, 47), (89, 50), (94, 59), (91, 74), (82, 80), (73, 71), (72, 56)], fill=DARK)
d.rectangle((33, 87, 45, GROUND), fill=DARK); d.rectangle((59, 87, 71, GROUND), fill=DARK)
contact_b.paste((0, 0, 0, 0), (0, GROUND+1, 110, 97))
OUT.mkdir(parents=True, exist_ok=True)
frames = ((1, "contact-a", contact_a), (2, "down-a", down_a), (3, "passing-a", passing_a), (4, "contact-b", contact_b))
for i, name, image in frames: image.save(OUT / f"frame-{i:02d}-{name}.png")
lua = f'''local sprite = Sprite(110, 97, ColorMode.RGB)
local blockout = sprite.layers[1]
blockout.name = "BLOCKOUT — Contact A / Down A / Passing A / Contact B"
sprite:newCel(blockout, 1, Image{{ fromFile={(OUT / 'frame-01-contact-a.png').as_posix()!r} }})
sprite:newFrame()
sprite:newCel(blockout, 2, Image{{ fromFile={(OUT / 'frame-02-down-a.png').as_posix()!r} }})
sprite:newFrame()
sprite:newCel(blockout, 3, Image{{ fromFile={(OUT / 'frame-03-passing-a.png').as_posix()!r} }})
sprite:newFrame()
sprite:newCel(blockout, 4, Image{{ fromFile={(OUT / 'frame-04-contact-b.png').as_posix()!r} }})
local guide=sprite:newLayer(); guide.name="GUIDE — owner-edited v03 remains external/locked"; guide.isVisible=false; guide.isEditable=false
app.command.SaveFile{{ filename={ASE.as_posix()!r} }}
app.exit()'''
LUA.write_text(lua, encoding="utf-8")
r = subprocess.run([str(ASEPRITE), "--batch", "--script", str(LUA)], capture_output=True, text=True)
if r.returncode: raise SystemExit(r.stderr or r.stdout)
# Contact A/B paired board: top guide, bottom blockout.
scale,w,h=5,550,485
board=Image.new("RGBA",(w*2+52,h*2+116),"#111820"); bd=ImageDraw.Draw(board)
bd.text((16,14),"SUNMEADOW WALK v13 — CONTACT A / CONTACT B GUIDE vs BLOCKOUT",fill="#F8FAFC")
bd.text((16,31),"Top: current owner guide. Bottom: mannequin blockout. Red = ground y=90.",fill="#CBD5E1")
for col,(label,guide_no,blockout) in enumerate((("CONTACT A",1,contact_a),("CONTACT B",4,contact_b))):
    x=16+col*(w+20); guide=Image.open(GUIDES/f"frame-{guide_no:02d}.png").convert("RGBA")
    for row,(kind,im) in enumerate((("GUIDE",guide),("BLOCKOUT",blockout))):
        y=62+row*(h+28)
        for yy in range(0,h,20):
            for xx in range(0,w,20): bd.rectangle((x+xx,y+yy,x+xx+19,y+yy+19),fill="#303743" if ((xx//20)+(yy//20))%2==0 else "#222833")
        board.alpha_composite(im.resize((w,h),Image.Resampling.NEAREST),(x,y)); bd.line((x,y+GROUND*scale,x+w,y+GROUND*scale),fill="#EF4444",width=2); bd.text((x,y-17),f"{label} — {kind}",fill="#F8FAFC")
BOARD.parent.mkdir(parents=True,exist_ok=True); board.save(BOARD)
print(f"contact_b_below_ground={sum(bool(contact_b.getpixel((x,y))[3]) for y in range(GROUND+1,97) for x in range(110))}")
print(ASE); print(BOARD)
