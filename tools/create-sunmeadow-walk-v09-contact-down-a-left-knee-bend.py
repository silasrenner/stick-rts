from pathlib import Path
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
CONTACT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v06-contact-a-mannequin-blockout.png"
OUT_DIR = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v09-contact-down-a-mannequin-blockout"
ASE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v09-contact-down-a-mannequin-blockout.aseprite"
LUA = ROOT / "tools/create-sunmeadow-walk-v09-contact-down-a-mannequin-blockout.lua"
BOARD = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v09-contact-a-down-a-left-knee-bend.png"
DARK, GROUND = (22, 30, 38, 255), 90

contact = Image.open(CONTACT).convert("RGBA")
down = Image.new("RGBA", (110, 97), (0, 0, 0, 0)); d = ImageDraw.Draw(down)
# Leg center paths are copied directly from the owner-edited Down A guide:
# front: (47,60) → (36,79) → (27,90)
# rear:  (57,60) → (67,79) → (72,90)
# Thickened segments preserve the intermediate mannequin treatment without
# changing the guide's hip, knee, or planted-foot anchors.
def limb(points):
    d.line(points, fill=DARK, width=10, joint="curve")
    for x, y in points:
        d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=DARK)

limb([(57, 60), (67, 79), (72, 90)])
# A clearly articulated screen-left/front knee: the thigh drives forward to
# x=24 before the shin returns to the planted foot at x=27. This replaces the
# nearly straight 47→36→27 path that hid the knee in a filled silhouette.
limb([(47, 60), (24, 76), (27, 90)])
# Torso and head lower exactly two native pixels from Contact A.
d.polygon([(41, 39), (62, 39), (66, 51), (61, 66), (47, 66), (39, 51)], fill=DARK)
d.ellipse((45, 24, 60, 40), fill=DARK)
# Sword-side arm/hand follows the down beat by 2px; blade lags 1px, creating
# restrained equipment motion rather than a whole-rig translation.
d.polygon([(43, 41), (49, 46), (39, 55), (31, 62), (25, 58), (34, 48)], fill=DARK)
d.rectangle((23, 56, 31, 63), fill=DARK)
d.polygon([(23, 58), (10, 30), (15, 28), (29, 56)], fill=DARK)
d.rectangle((19, 56, 31, 59), fill=DARK)
# Shield arm drops 2px; shield mass lags by 1px to preserve its guarded weight.
d.polygon([(59, 41), (65, 45), (72, 53), (77, 59), (71, 64), (64, 56), (56, 49)], fill=DARK)
d.polygon([(76, 44), (89, 47), (94, 56), (91, 71), (82, 78), (73, 69), (72, 54)], fill=DARK)
# Flat planted feet and a strict no-below-ground trim.
d.rectangle((23, 87, 35, GROUND), fill=DARK); d.rectangle((66, 87, 78, GROUND), fill=DARK)
down.paste((0, 0, 0, 0), (0, GROUND + 1, 110, 97))
OUT_DIR.mkdir(parents=True, exist_ok=True)
contact.save(OUT_DIR / "frame-01-contact-a.png"); down.save(OUT_DIR / "frame-02-down-a.png")
# Two-frame editable source.
lua = f'''local sprite = Sprite(110, 97, ColorMode.RGB)
local blockout = sprite.layers[1]
blockout.name = "BLOCKOUT — Contact A / Down A"
sprite:newCel(blockout, 1, Image{{ fromFile={(OUT_DIR / 'frame-01-contact-a.png').as_posix()!r} }})
sprite:newFrame()
sprite:newCel(blockout, 2, Image{{ fromFile={(OUT_DIR / 'frame-02-down-a.png').as_posix()!r} }})
local guide = sprite:newLayer()
guide.name = "GUIDE — v03 construction remains external/locked"
guide.isVisible = false
guide.isEditable = false
app.command.SaveFile{{ filename={ASE.as_posix()!r} }}
app.exit()
'''
LUA.write_text(lua, encoding="utf-8")
result = subprocess.run([str(ASEPRITE), "--batch", "--script", str(LUA)], capture_output=True, text=True)
if result.returncode: raise SystemExit(result.stderr or result.stdout)
# Owner review board.
scale, w, h = 6, 660, 582
board = Image.new("RGBA", (w * 2 + 52, h + 90), "#111820"); bd = ImageDraw.Draw(board)
bd.text((16, 14), "SUNMEADOW WALK v09 — CONTACT A / DOWN A LEFT-KNEE BEND", fill="#F8FAFC")
bd.text((16, 31), "Down A: 2px torso drop, planted feet, compressed knees, restrained equipment lag. Red = ground y=90.", fill="#CBD5E1")
for i, (label, frame) in enumerate((("1 CONTACT A", contact), ("2 DOWN A", down))):
    x, y = 16 + i * (w + 20), 62
    for yy in range(0, h, 24):
        for xx in range(0, w, 24): bd.rectangle((x + xx, y + yy, x + xx + 23, y + yy + 23), fill="#303743" if ((xx // 24) + (yy // 24)) % 2 == 0 else "#222833")
    board.alpha_composite(frame.resize((w, h), Image.Resampling.NEAREST), (x, y)); bd.line((x, y + GROUND * scale, x + w, y + GROUND * scale), fill="#EF4444", width=2); bd.text((x, y - 17), label, fill="#F8FAFC")
BOARD.parent.mkdir(parents=True, exist_ok=True); board.save(BOARD)
print(f"down_below_ground={sum(bool(down.getpixel((x, y))[3]) for y in range(GROUND + 1, 97) for x in range(110))}")
print(ASE); print(BOARD)
