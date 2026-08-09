from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
OUT_DIR = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-layout-v02"
EDITABLE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-layout-v02.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-layout-v02-four-poses.png"
SIZE, GROUND = (110, 97), 90
INK, BODY, LEG, SHIELD, WEAPON = "#16212A", "#6F9D4D", "#78502B", "#C9A94A", "#B7D2DB"

# Each pose is authored around a fixed ground line. Contacts plant both feet on
# the ground; passing poses have one short, visibly lifted foot. The final two
# poses reverse the first two rather than reusing the same gait direction.
POSES = (
    ("1 — CONTACT A", 0,
     [(42, 64), (50, 64), (44, 76), (34, 90), (25, 90), (36, 74)],
     [(56, 64), (63, 64), (68, 77), (76, 90), (66, 90), (56, 75)]),
    ("2 — PASSING A", 1,
     [(42, 65), (50, 65), (48, 78), (45, 90), (36, 90), (38, 76)],
     [(56, 65), (63, 65), (68, 73), (66, 82), (57, 85), (54, 77)]),
    ("3 — CONTACT B", 0,
     [(42, 64), (50, 64), (43, 77), (35, 90), (25, 90), (36, 75)],
     [(56, 64), (63, 64), (70, 76), (83, 90), (73, 90), (58, 75)]),
    ("4 — PASSING B", 1,
     [(42, 65), (50, 65), (43, 73), (44, 82), (53, 85), (54, 77)],
     [(56, 65), (63, 65), (61, 78), (58, 90), (49, 90), (53, 76)]),
)


def poly(draw, points, fill):
    draw.polygon(points, fill=fill)
    draw.line(points + [points[0]], fill=INK, width=2, joint="curve")


def make_frame(offset_y, front, rear):
    image = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(image)
    # Rear leg, torso, equipment, then front leg gives a readable depth order.
    poly(d, rear, LEG)
    def off(points): return [(x, y + offset_y) for x, y in points]
    poly(d, off([(35, 39), (59, 36), (70, 49), (66, 66), (37, 67), (31, 54)]), BODY)
    poly(d, off([(42, 21), (58, 21), (61, 31), (57, 40), (43, 40), (39, 31)]), BODY)
    poly(d, off([(25, 45), (35, 40), (45, 44), (49, 55), (44, 66), (32, 67), (24, 59)]), SHIELD)
    d.line([(64, 53 + offset_y), (78, 32 + offset_y)], fill=INK, width=4)
    d.line([(65, 52 + offset_y), (77, 33 + offset_y)], fill=WEAPON, width=2)
    poly(d, front, LEG)
    return image

frames = [make_frame(offset, front, rear) for _, offset, front, rear in POSES]
OUT_DIR.mkdir(parents=True, exist_ok=True)
for index, image in enumerate(frames, 1): image.save(OUT_DIR / f"frame-{index:02d}.png")
gif = OUT_DIR / "sunmeadow-warrior-walk-layout-v02.gif"
frames[0].save(gif, save_all=True, append_images=frames[1:], duration=125, loop=0, disposal=2, transparency=0)
EDITABLE.parent.mkdir(parents=True, exist_ok=True)
run = subprocess.run([str(ASEPRITE), "--batch", str(gif), "--save-as", str(EDITABLE)], capture_output=True, text=True)
if run.returncode: raise SystemExit(run.stderr.strip() or run.stdout.strip() or "Aseprite import failed")
scale, w, h = 5, SIZE[0] * 5, SIZE[1] * 5
sheet = Image.new("RGBA", (w * 2 + 66, h * 2 + 116), "#111820")
d = ImageDraw.Draw(sheet)
d.text((16, 14), "SUNMEADOW WALK LAYOUT v02 — REVISED FLAT FOUR-POSE GATE", fill="#F8FAFC")
d.text((16, 31), "Corrected alternating contact/passing poses and 1px primary torso weight shift. Still no shading or secondary motion.", fill="#CBD5E1")
for index, ((label, _, _, _), image) in enumerate(zip(POSES, frames)):
    x, y = 16 + (index % 2) * (w + 28), 58 + (index // 2) * (h + 28)
    for yy in range(0, h, 20):
        for xx in range(0, w, 20):
            d.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill="#303743" if ((xx // 20) + (yy // 20)) % 2 == 0 else "#222833")
    sheet.alpha_composite(image.resize((w, h), Image.Resampling.NEAREST), (x, y))
    d.text((x, y - 16), label, fill="#F8FAFC")
CONTACT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(CONTACT)
print(f"frames={OUT_DIR.relative_to(ROOT)}\neditable={EDITABLE.relative_to(ROOT)}\ncontact={CONTACT.relative_to(ROOT)}")
