from pathlib import Path
from collections import deque

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CONTACT_A = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v01-standing-silhouette-monochrome.png"
EXPORT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v01-contact-b-silhouette-monochrome.png"
BOARD = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v01-contact-b-silhouette-monochrome.png"
COLOR = (20, 29, 35, 255)

# Gate 2 only: retain the approved upper silhouette and equipment orientation,
# then swap the ownership of the planted legs for the opposite contact pose.
base = Image.open(CONTACT_A).convert("RGBA")
alpha = base.getchannel("A")
draw = ImageDraw.Draw(alpha)
# Remove only the lower-body space. The sword remains screen-left and shield remains
# screen-right because this contact-pose gate does not alter upper-body pixels.
draw.rectangle((27, 65, 68, 96), fill=0)
# Contact B: the left-hip leg crosses to the forward/right planted foot; the
# right-hip leg crosses to the rear/left planted foot. Both are grounded.
draw.polygon([(43, 64), (51, 64), (57, 75), (69, 90), (79, 90), (62, 74)], fill=255)
draw.polygon([(56, 64), (64, 64), (55, 76), (35, 90), (25, 90), (47, 74)], fill=255)
# Keep alpha binary and repair only isolated 1–3 pixel enclosed pinholes.
alpha = alpha.point(lambda value: 255 if value else 0)
pixels = alpha.load(); seen = set(); repaired = 0
for sy in range(alpha.height):
    for sx in range(alpha.width):
        if pixels[sx, sy] or (sx, sy) in seen:
            continue
        queue, component, edge = deque([(sx, sy)]), [], False
        seen.add((sx, sy))
        while queue:
            x, y = queue.popleft(); component.append((x, y))
            edge |= x in (0, alpha.width - 1) or y in (0, alpha.height - 1)
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < alpha.width and 0 <= ny < alpha.height and not pixels[nx, ny] and (nx, ny) not in seen:
                    seen.add((nx, ny)); queue.append((nx, ny))
        if not edge and len(component) <= 3:
            for x, y in component: pixels[x, y] = 255
            repaired += len(component)
result = Image.new("RGBA", base.size, COLOR); result.putalpha(alpha); result.save(EXPORT)

scale = 6
board = Image.new("RGBA", (result.width * scale + 40, result.height * scale + 78), "#111820")
d = ImageDraw.Draw(board)
d.text((16, 14), "SUNMEADOW WALK v01 — CONTACT B SILHOUETTE GATE", fill="#F8FAFC")
d.text((16, 31), "Opposite planted-leg ownership. Sword/arm remain left; shield/arm remain right. No passing pose or color work.", fill="#CBD5E1")
x, y = 20, 58
for yy in range(0, result.height * scale, 24):
    for xx in range(0, result.width * scale, 24):
        d.rectangle((x + xx, y + yy, x + xx + 23, y + yy + 23), fill="#303743" if ((xx // 24) + (yy // 24)) % 2 == 0 else "#222833")
board.alpha_composite(result.resize((result.width * scale, result.height * scale), Image.Resampling.NEAREST), (x, y))
BOARD.parent.mkdir(parents=True, exist_ok=True); board.save(BOARD)
print(f"repaired_isolated_pinholes={repaired}")
print(EXPORT)
print(BOARD)
