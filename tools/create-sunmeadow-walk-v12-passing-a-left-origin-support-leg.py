from pathlib import Path
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
GUIDES = ROOT / "artifacts/warrior-pair-proof/tmp-v03-current-guide"
V10 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v10-contact-down-a-mannequin-blockout"
OUT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v12-contact-down-passing-a-mannequin-blockout"
ASE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v12-contact-down-passing-a-mannequin-blockout.aseprite"
LUA = ROOT / "tools/create-sunmeadow-walk-v12-contact-down-passing-a-mannequin-blockout.lua"
BOARD = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v12-guide-vs-mannequin-contact-down-passing-a.png"
DARK, GROUND = (22, 30, 38, 255), 90

contact = Image.open(V10 / "frame-01-contact-a.png").convert("RGBA")
down = Image.open(V10 / "frame-02-down-a.png").convert("RGBA")
passing = Image.new("RGBA", (110, 97), (0, 0, 0, 0)); d = ImageDraw.Draw(passing)

def limb(points, width):
    r = width // 2
    d.line(points, fill=DARK, width=width, joint="curve")
    for x, y in points:
        d.ellipse((x-r, y-r, x+r, y+r), fill=DARK)

# Passing A follows saved guide frame 03: the orange leg begins at the
# screen-left pelvis and supports at y=90; the yellow leg lifts behind it.
# Rear/raised yellow leg begins on the screen-right pelvis in the guide, then
# folds across behind the orange support leg to its lifted screen-left foot.
# This preserves the two opposite hip origins rather than swapping them.
limb([(56, 60), (43, 73), (39, 83)], 7)
d.rectangle((34, 80, 43, 85), fill=DARK)       # raised foot; remains 5px above ground
# Orange support leg is frontmost. Drawing it last preserves its visible
# screen-left pelvis origin before it tracks inward/right to the planted foot.
limb([(47, 60), (50, 75), (52, 90)], 9)
# Body rises from the Down beat, between Contact and Down levels.
d.polygon([(41, 37), (62, 37), (66, 49), (61, 64), (47, 64), (39, 49)], fill=DARK)
d.ellipse((45, 22, 60, 38), fill=DARK)
# Sword side (screen-left): arm rises with the passing beat; blade remains left.
d.polygon([(43, 39), (49, 44), (39, 53), (30, 60), (24, 56), (34, 46)], fill=DARK)
d.rectangle((22, 54, 30, 61), fill=DARK)
d.polygon([(22, 56), (10, 32), (15, 30), (28, 54)], fill=DARK)
d.rectangle((18, 54, 30, 57), fill=DARK)
# Shield side (screen-right): arm extends down/out in the guide's counterbalance.
d.polygon([(59, 39), (66, 44), (72, 53), (77, 59), (71, 64), (64, 56), (56, 47)], fill=DARK)
d.polygon([(76, 47), (89, 50), (94, 59), (91, 74), (82, 80), (73, 71), (72, 56)], fill=DARK)
# Strictly preserve ground rule; only the support foot touches it.
d.rectangle((46, 87, 58, GROUND), fill=DARK)
passing.paste((0, 0, 0, 0), (0, GROUND + 1, 110, 97))
OUT.mkdir(parents=True, exist_ok=True)
for index, image, name in ((1, contact, "contact-a"), (2, down, "down-a"), (3, passing, "passing-a")):
    image.save(OUT / f"frame-{index:02d}-{name}.png")
# Three-frame, editable action source.
lua = f'''local sprite = Sprite(110, 97, ColorMode.RGB)
local blockout = sprite.layers[1]
blockout.name = "BLOCKOUT — Contact A / Down A / Passing A"
sprite:newCel(blockout, 1, Image{{ fromFile={(OUT / 'frame-01-contact-a.png').as_posix()!r} }})
sprite:newFrame()
sprite:newCel(blockout, 2, Image{{ fromFile={(OUT / 'frame-02-down-a.png').as_posix()!r} }})
sprite:newFrame()
sprite:newCel(blockout, 3, Image{{ fromFile={(OUT / 'frame-03-passing-a.png').as_posix()!r} }})
local guide = sprite:newLayer()
guide.name = "GUIDE — owner-edited v03 remains external/locked"
guide.isVisible = false
guide.isEditable = false
app.command.SaveFile{{ filename={ASE.as_posix()!r} }}
app.exit()
'''
LUA.write_text(lua, encoding="utf-8")
r = subprocess.run([str(ASEPRITE), "--batch", "--script", str(LUA)], capture_output=True, text=True)
if r.returncode: raise SystemExit(r.stderr or r.stdout)
# Fixed paired guide/blockout board for continuity and proportionality review.
scale, w, h = 4, 440, 388
board = Image.new("RGBA", (w * 3 + 76, h * 2 + 118), "#111820"); bd = ImageDraw.Draw(board)
bd.text((16, 14), "SUNMEADOW WALK v12 — GUIDE vs MANNEQUIN BLOCKOUT", fill="#F8FAFC")
bd.text((16, 31), "Top: current owner-edited v03 guide. Bottom: blockout. Red = ground y=90.", fill="#CBD5E1")
for col, (label, guide_no, blockout) in enumerate((("CONTACT A", 1, contact), ("DOWN A", 2, down), ("PASSING A", 3, passing))):
    x = 16 + col * (w + 20)
    guide = Image.open(GUIDES / f"frame-{guide_no:02d}.png").convert("RGBA")
    for row, (kind, im) in enumerate((("GUIDE", guide), ("BLOCKOUT", blockout))):
        y = 62 + row * (h + 28)
        for yy in range(0, h, 20):
            for xx in range(0, w, 20):
                bd.rectangle((x+xx, y+yy, x+xx+19, y+yy+19), fill="#303743" if ((xx//20)+(yy//20))%2==0 else "#222833")
        board.alpha_composite(im.resize((w, h), Image.Resampling.NEAREST), (x, y))
        bd.line((x, y + GROUND*scale, x+w, y + GROUND*scale), fill="#EF4444", width=2)
        bd.text((x, y-17), f"{label} — {kind}", fill="#F8FAFC")
BOARD.parent.mkdir(parents=True, exist_ok=True); board.save(BOARD)
print(f"passing_below_ground={sum(bool(passing.getpixel((x,y))[3]) for y in range(GROUND+1,97) for x in range(110))}")
print(f"passing_raised_foot_alpha_at_y90={sum(bool(passing.getpixel((x,GROUND))[3]) for x in range(0,46))}")
print(ASE); print(BOARD)
