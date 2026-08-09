from pathlib import Path
from collections import deque
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CONTACT_A = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v01-standing-silhouette-monochrome.png"
EXPORT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v01-contact-b-v02-silhouette-monochrome.png"
BOARD = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v01-contact-a-contact-b-v02-comparison.png"
COLOR = (20, 29, 35, 255)
# This rectangle contains only the approved Contact A leg composition; its mirror
# creates Contact B with matching stance mass and footprint rather than new polygonal legs.
LEG_BOX = (27, 65, 69, 97)

contact_a = Image.open(CONTACT_A).convert("RGBA")
alpha_a = contact_a.getchannel("A")
alpha_b = alpha_a.copy()
draw = ImageDraw.Draw(alpha_b)
draw.rectangle((LEG_BOX[0], LEG_BOX[1], LEG_BOX[2] - 1, LEG_BOX[3] - 1), fill=0)
legs_a = alpha_a.crop(LEG_BOX)
legs_b = legs_a.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
alpha_b.paste(legs_b, LEG_BOX[:2])
alpha_b = alpha_b.point(lambda value: 255 if value else 0)
# Repair only isolated tiny enclosed pinholes; preserve all exterior and limb gaps.
pixels = alpha_b.load(); seen = set(); repaired = 0
for sy in range(alpha_b.height):
    for sx in range(alpha_b.width):
        if pixels[sx, sy] or (sx, sy) in seen:
            continue
        queue, component, edge = deque([(sx, sy)]), [], False
        seen.add((sx, sy))
        while queue:
            x, y = queue.popleft(); component.append((x, y))
            edge |= x in (0, alpha_b.width - 1) or y in (0, alpha_b.height - 1)
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < alpha_b.width and 0 <= ny < alpha_b.height and not pixels[nx, ny] and (nx, ny) not in seen:
                    seen.add((nx, ny)); queue.append((nx, ny))
        if not edge and len(component) <= 3:
            for x, y in component: pixels[x, y] = 255
            repaired += len(component)
contact_b = Image.new("RGBA", contact_a.size, COLOR); contact_b.putalpha(alpha_b); contact_b.save(EXPORT)

scale, margin = 6, 28
w, h = contact_a.width * scale, contact_a.height * scale
board = Image.new("RGBA", (w * 2 + margin * 3, h + 78), "#111820")
d = ImageDraw.Draw(board)
d.text((16, 14), "SUNMEADOW WALK v01 — CONTACT COMPOSITION CHECK", fill="#F8FAFC")
d.text((16, 31), "Contact B uses the exact mirrored Contact A lower-leg mass: same footprint, opposite ownership.", fill="#CBD5E1")
for index, (label, image) in enumerate((("CONTACT A — APPROVED LEG COMPOSITION", contact_a), ("CONTACT B v02 — MIRRORED LEG COMPOSITION", contact_b))):
    x, y = margin + index * (w + margin), 58
    for yy in range(0, h, 24):
        for xx in range(0, w, 24):
            d.rectangle((x + xx, y + yy, x + xx + 23, y + yy + 23), fill="#303743" if ((xx // 24) + (yy // 24)) % 2 == 0 else "#222833")
    board.alpha_composite(image.resize((w, h), Image.Resampling.NEAREST), (x, y))
    d.text((x, y - 16), label, fill="#F8FAFC")
BOARD.parent.mkdir(parents=True, exist_ok=True); board.save(BOARD)
print(f"repaired_isolated_pinholes={repaired}")
print(EXPORT)
print(BOARD)
