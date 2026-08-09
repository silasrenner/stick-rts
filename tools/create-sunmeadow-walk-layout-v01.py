from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
OUT_DIR = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-layout-v01"
EDITABLE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-layout-v01.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-layout-v01-four-poses.png"
SIZE = (110, 97)
GROUND = 90

# Step 2 only: flat pose design. These are not production frames and deliberately
# contain no material shading, source texture, highlights, or secondary motion.
INK = "#16212A"
BODY = "#6F9D4D"
LEG = "#78502B"
SHIELD = "#C9A94A"
WEAPON = "#B7D2DB"

# Contact A, passing A, contact B, passing B. Each tuple is (front leg, rear leg),
# using a hip-to-boot polygon so the legs are redraws—not translated cutouts.
LEG_POSES = [
    ([(43, 64), (51, 64), (47, 76), (38, 90), (29, 90), (38, 75)], [(56, 64), (63, 64), (67, 78), (73, 90), (64, 90), (57, 76)]),
    ([(43, 64), (51, 64), (49, 77), (45, 86), (36, 86), (39, 75)], [(56, 64), (63, 64), (60, 78), (58, 90), (49, 90), (53, 76)]),
    ([(43, 64), (51, 64), (47, 78), (41, 90), (32, 90), (39, 76)], [(56, 64), (63, 64), (70, 76), (79, 90), (69, 90), (58, 76)]),
    ([(43, 64), (51, 64), (53, 78), (57, 90), (48, 90), (45, 76)], [(56, 64), (63, 64), (59, 77), (54, 86), (45, 86), (52, 75)]),
]


def outlined_polygon(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], fill: str) -> None:
    draw.polygon(points, fill=INK)
    # Inset is intentionally not generated: flat layout is a broad silhouette pass.
    draw.polygon(points, fill=fill)


def frame(front: list[tuple[int, int]], rear: list[tuple[int, int]]) -> Image.Image:
    image = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(image)
    # Rear leg first establishes occlusion.
    outlined_polygon(d, rear, LEG)
    # Shielded torso and coat block: no material detail in this gate.
    d.polygon([(35, 39), (59, 36), (70, 49), (66, 66), (37, 67), (31, 54)], fill=INK)
    d.polygon([(37, 41), (58, 39), (67, 50), (63, 64), (39, 65), (34, 54)], fill=BODY)
    # Helmet/head silhouette uses the same body flat to keep pose reading primary.
    d.rectangle((41, 21, 59, 39), fill=INK)
    d.rectangle((44, 23, 57, 37), fill=BODY)
    # Shield and weapon are flat readable masses.
    d.polygon([(25, 45), (35, 40), (45, 44), (49, 55), (44, 66), (32, 67), (24, 59)], fill=INK)
    d.polygon([(27, 47), (35, 43), (43, 46), (46, 55), (42, 63), (33, 64), (27, 58)], fill=SHIELD)
    d.line((64, 53, 78, 32), fill=INK, width=4)
    d.line((65, 52, 77, 33), fill=WEAPON, width=2)
    # Front leg is drawn last, deliberately crossing the body at the hip.
    outlined_polygon(d, front, LEG)
    return image


frames = [frame(front, rear) for front, rear in LEG_POSES]
OUT_DIR.mkdir(parents=True, exist_ok=True)
for index, image in enumerate(frames, 1):
    image.save(OUT_DIR / f"frame-{index:02d}.png")
gif = OUT_DIR / "sunmeadow-warrior-walk-layout-v01.gif"
frames[0].save(gif, save_all=True, append_images=frames[1:], duration=125, loop=0, disposal=2, transparency=0)
EDITABLE.parent.mkdir(parents=True, exist_ok=True)
run = subprocess.run([str(ASEPRITE), "--batch", str(gif), "--save-as", str(EDITABLE)], capture_output=True, text=True)
if run.returncode != 0:
    raise SystemExit(run.stderr.strip() or run.stdout.strip() or "Aseprite import failed")
scale = 5
w, h = SIZE[0] * scale, SIZE[1] * scale
sheet = Image.new("RGBA", (w * 2 + 66, h * 2 + 116), "#111820")
d = ImageDraw.Draw(sheet)
d.text((16, 14), "SUNMEADOW WALK LAYOUT v01 — STEP 2: FLAT FOUR-POSE GATE", fill="#F8FAFC")
d.text((16, 31), "No shading, texture, highlights, or secondary motion. Playback: contact A → passing A → contact B → passing B.", fill="#CBD5E1")
labels = ("1 — CONTACT A", "2 — PASSING A", "3 — CONTACT B", "4 — PASSING B")
for index, image in enumerate(frames):
    x, y = 16 + (index % 2) * (w + 28), 58 + (index // 2) * (h + 28)
    for yy in range(0, h, 20):
        for xx in range(0, w, 20):
            d.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill="#303743" if ((xx // 20) + (yy // 20)) % 2 == 0 else "#222833")
    sheet.alpha_composite(image.resize((w, h), Image.Resampling.NEAREST), (x, y))
    d.text((x, y - 16), labels[index], fill="#F8FAFC")
CONTACT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(CONTACT)
print(f"frames={OUT_DIR.relative_to(ROOT)}")
print(f"editable={EDITABLE.relative_to(ROOT)}")
print(f"contact={CONTACT.relative_to(ROOT)}")
