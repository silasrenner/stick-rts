from pathlib import Path
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
PNG = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v06-contact-a-mannequin-blockout.png"
ASE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v06-contact-a-mannequin-blockout.aseprite"
LUA = ROOT / "tools/create-sunmeadow-walk-v06-contact-a-mannequin-blockout.lua"
BOARD = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v06-contact-a-mannequin-blockout.png"
DARK, GROUND = (22, 30, 38, 255), 90

im = Image.new("RGBA", (110, 97), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
# Mid-fidelity blockout: intentional large body/limb masses, not source contours
# and not skeleton lines. Screen-left remains sword/arm; screen-right shield/arm.
# Rear leg (right), then front leg (left): contact stance with both feet grounded.
d.polygon([(53, 61), (62, 64), (68, 77), (76, 87), (76, 90), (66, 90), (61, 82), (56, 73), (50, 66)], fill=DARK)
d.polygon([(48, 61), (56, 65), (47, 75), (36, 87), (34, 90), (23, 90), (29, 83), (38, 70), (42, 64)], fill=DARK)
# Tapered torso and simple head establish mass/weight without sprite details.
d.polygon([(41, 37), (62, 37), (66, 49), (61, 64), (47, 64), (39, 49)], fill=DARK)
d.ellipse((45, 22, 60, 38), fill=DARK)
# Sword arm, visible hand/guard, and a simplified blade on screen-left.
d.polygon([(43, 39), (49, 44), (39, 53), (31, 60), (25, 56), (34, 46)], fill=DARK)
d.rectangle((23, 54, 31, 61), fill=DARK)
d.polygon([(23, 57), (10, 29), (15, 27), (29, 55)], fill=DARK)
d.rectangle((19, 54, 31, 57), fill=DARK)
# Shield arm and shield mass on screen-right.
d.polygon([(59, 39), (65, 43), (72, 51), (77, 57), (71, 62), (64, 54), (56, 47)], fill=DARK)
d.polygon([(76, 43), (89, 46), (94, 55), (91, 70), (82, 77), (73, 68), (72, 53)], fill=DARK)
# Feet are intentionally flat on the same declared contact line.
d.rectangle((23, 87, 35, GROUND), fill=DARK); d.rectangle((66, 87, 78, GROUND), fill=DARK)
PNG.parent.mkdir(parents=True, exist_ok=True); im.save(PNG)
# The Aseprite source preserves the blockout as an editable single-frame pose.
lua = f'''local sprite = Sprite(110, 97, ColorMode.RGB)
local blockout = sprite.layers[1]
blockout.name = "BLOCKOUT — Contact A (mid-fidelity)"
sprite:newCel(blockout, 1, Image{{ fromFile={PNG.as_posix()!r} }})
local note = sprite:newLayer()
note.name = "GUIDE — v03 construction remains external/locked"
note.isVisible = false
note.isEditable = false
app.command.SaveFile{{ filename={ASE.as_posix()!r} }}
app.exit()
'''
LUA.write_text(lua, encoding="utf-8")
result = subprocess.run([str(ASEPRITE), "--batch", "--script", str(LUA)], capture_output=True, text=True)
if result.returncode: raise SystemExit(result.stderr or result.stdout)
# Enlarged review only.
scale, w, h = 6, 660, 582
board = Image.new("RGBA", (w + 32, h + 90), "#111820"); bd = ImageDraw.Draw(board)
bd.text((16, 14), "SUNMEADOW WALK v06 — CONTACT A MID-FIDELITY BLOCKOUT", fill="#F8FAFC")
bd.text((16, 31), "Full body masses, but deliberately no sprite contours, materials, or detail. Red = ground y=90.", fill="#CBD5E1")
for yy in range(0, h, 24):
    for xx in range(0, w, 24): bd.rectangle((16 + xx, 62 + yy, 16 + xx + 23, 62 + yy + 23), fill="#303743" if ((xx // 24) + (yy // 24)) % 2 == 0 else "#222833")
board.alpha_composite(im.resize((w, h), Image.Resampling.NEAREST), (16, 62))
bd.line((16, 62 + GROUND * scale, 16 + w, 62 + GROUND * scale), fill="#EF4444", width=2)
BOARD.parent.mkdir(parents=True, exist_ok=True); board.save(BOARD)
print(f"below_ground={sum(bool(im.getpixel((x, y))[3]) for y in range(GROUND + 1, 97) for x in range(110))}")
print(PNG); print(ASE); print(BOARD)
