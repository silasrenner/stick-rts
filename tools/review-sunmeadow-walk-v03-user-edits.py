from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
FRAMES = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v03-user-edit-frame-export"
OUT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v03-user-edits-review.png"
GROUND_Y = 90
LABELS = ("CONTACT A", "DOWN A", "PASSING A", "CONTACT B", "DOWN B", "PASSING B")
COLORS = {"sword_arm": (192, 132, 252), "shield_arm": (52, 211, 153)}


def bbox_for_color(image, color):
    points = [(x, y) for y in range(image.height) for x in range(image.width) if image.getpixel((x, y))[:3] == color]
    if not points:
        return None
    xs, ys = zip(*points)
    return (min(xs), min(ys), max(xs), max(ys), len(points))

frames = [Image.open(FRAMES / f"frame-{i:02d}.png").convert("RGBA") for i in range(1, 7)]
scale, cell_w, cell_h = 5, 550, 485
panel = Image.new("RGBA", (1738, 1110), "#111820")
d = ImageDraw.Draw(panel)
d.text((16, 14), "SUNMEADOW WALK v03 — SAVED USER EDIT REVIEW", fill="#F8FAFC")
d.text((16, 32), "Red line = original guide ground (y=90). Magenta pixels below it are flagged, not altered.", fill="#CBD5E1")
for i, (label, frame) in enumerate(zip(LABELS, frames)):
    x, y = 16 + (i % 3) * 578, 62 + (i // 3) * 525
    for yy in range(0, cell_h, 20):
        for xx in range(0, cell_w, 20):
            d.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill="#303743" if ((xx // 20) + (yy // 20)) % 2 == 0 else "#222833")
    display = frame.resize((cell_w, cell_h), Image.Resampling.NEAREST)
    panel.alpha_composite(display, (x, y))
    d.line((x, y + GROUND_Y * scale, x + cell_w, y + GROUND_Y * scale), fill="#EF4444", width=2)
    for py in range(GROUND_Y + 1, frame.height):
        for px in range(frame.width):
            if frame.getpixel((px, py))[3]:
                d.rectangle((x + px * scale, y + py * scale, x + px * scale + 4, y + py * scale + 4), fill="#EC4899")
    d.text((x, y - 17), f"{i + 1} {label}", fill="#F8FAFC")

OUT.parent.mkdir(parents=True, exist_ok=True)
panel.save(OUT)
print(f"review={OUT.relative_to(ROOT)}")
for i, (label, frame) in enumerate(zip(LABELS, frames), 1):
    below = [(x, y) for y in range(GROUND_Y + 1, frame.height) for x in range(frame.width) if frame.getpixel((x, y))[3]]
    print(f"frame_{i}_{label.lower().replace(' ', '_')}: pixels_below_ground={len(below)}; sword_arm={bbox_for_color(frame, COLORS['sword_arm'])}; shield_arm={bbox_for_color(frame, COLORS['shield_arm'])}")
