from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v01-standing-silhouette.png"
EXPORT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v01-standing-silhouette-monochrome.png"
CONTACT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v01-standing-silhouette-monochrome.png"
SILHOUETTE = (20, 29, 35, 255)

# The visible layered Aseprite source remains intact. This is a review-only
# flattening: binary alpha creates a single unaliased silhouette at native scale.
source = Image.open(SOURCE).convert("RGBA")
# Preserve the exact native pixel contour, then close only isolated 1–3 pixel
# transparency pinholes inside the filled character mass. This cannot bridge an
# arm/weapon gap or reshape an exterior edge: components touching the canvas edge
# or larger than three pixels are retained.
alpha = source.getchannel("A").point(lambda value: 255 if value else 0)
pixels = alpha.load()
visited, repaired = set(), 0
for start_y in range(alpha.height):
    for start_x in range(alpha.width):
        if pixels[start_x, start_y] or (start_x, start_y) in visited:
            continue
        stack, component, touches_edge = [(start_x, start_y)], [], False
        visited.add((start_x, start_y))
        while stack:
            x, y = stack.pop()
            component.append((x, y))
            touches_edge |= x in (0, alpha.width - 1) or y in (0, alpha.height - 1)
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < alpha.width and 0 <= ny < alpha.height and not pixels[nx, ny] and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    stack.append((nx, ny))
        if not touches_edge and len(component) <= 3:
            for x, y in component:
                pixels[x, y] = 255
            repaired += len(component)
mono = Image.new("RGBA", source.size, SILHOUETTE)
mono.putalpha(alpha)
mono.save(EXPORT)

scale = 6
board = Image.new("RGBA", (mono.width * scale + 40, mono.height * scale + 78), "#111820")
d = ImageDraw.Draw(board)
d.text((16, 14), "SUNMEADOW WALK v01 — MONOCHROME STANDING SILHOUETTE", fill="#F8FAFC")
d.text((16, 31), "One flat color; native pixels retained; component layers remain separate in the editable Aseprite source.", fill="#CBD5E1")
x, y = 20, 58
for yy in range(0, mono.height * scale, 24):
    for xx in range(0, mono.width * scale, 24):
        d.rectangle((x + xx, y + yy, x + xx + 23, y + yy + 23), fill="#303743" if ((xx // 24) + (yy // 24)) % 2 == 0 else "#222833")
board.alpha_composite(mono.resize((mono.width * scale, mono.height * scale), Image.Resampling.NEAREST), (x, y))
CONTACT.parent.mkdir(parents=True, exist_ok=True)
board.save(CONTACT)
print(f"repaired_isolated_pinholes={repaired}")
print(EXPORT)
print(CONTACT)
