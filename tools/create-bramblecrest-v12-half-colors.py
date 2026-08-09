from collections import Counter
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V11 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v11-half-resolution.png"
V12 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v12-half-colors.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v12-half-colors.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v11-v12-half-colors-comparison.png"


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill="#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833")


source = Image.open(V11).convert("RGBA")
source_colors = len({pixel[:3] for pixel in source.get_flattened_data() if pixel[3]})
target = (source_colors + 1) // 2
# Preserve V11's exact lower-resolution silhouette. Keep the 996 most-used
# source colors, then map only the rarer shades to their closest kept neighbor.
# This has no Pillow 256-color limit and does not introduce a generated palette.
visible = [pixel[:3] for pixel in source.get_flattened_data() if pixel[3]]
frequency = Counter(visible)
palette = [color for color, _ in frequency.most_common(target)]
lookup: dict[tuple[int, int, int], tuple[int, int, int]] = {}
for color in frequency:
    lookup[color] = min(palette, key=lambda candidate: sum((a - b) ** 2 for a, b in zip(color, candidate)))
reduced = Image.new("RGBA", source.size, (0, 0, 0, 0))
source_pixels = source.load()
reduced_pixels = reduced.load()
for y in range(source.height):
    for x in range(source.width):
        red, green, blue, alpha = source_pixels[x, y]
        if alpha:
            reduced_pixels[x, y] = (*lookup[(red, green, blue)], alpha)

V12.parent.mkdir(parents=True, exist_ok=True)
SOURCE.parent.mkdir(parents=True, exist_ok=True)
reduced.save(V12)
conversion = subprocess.run([str(ASEPRITE), "--batch", str(V12), "--save-as", str(SOURCE)], capture_output=True, text=True)
if conversion.returncode != 0:
    raise SystemExit(conversion.stderr.strip() or conversion.stdout.strip() or "Aseprite V12 conversion failed")

candidate_colors = len({pixel[:3] for pixel in reduced.get_flattened_data() if pixel[3]})
scale = 8
scaled = (source.width * scale, source.height * scale)
canvas = Image.new("RGBA", (scaled[0] * 2 + 70, scaled[1] + 90), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "BRAMBLECREST: V11 HALF-RESOLUTION vs V12 HALF-RESOLUTION + HALF COLORS", fill="#F8FAFC")
draw.text((16, 31), f"Both are 85×65. V12 uses no dithering and preserves the V11 silhouette while reducing visible colors {source_colors} → {candidate_colors}.", fill="#94A3B8")
for label, art, x in ((f"V11 — {source_colors} COLORS", source, 16), (f"V12 — {candidate_colors} COLORS", reduced, scaled[0] + 54)):
    checkerboard(canvas, x, 70, *scaled)
    canvas.alpha_composite(art.resize(scaled, Image.Resampling.NEAREST), (x, 70))
    draw.text((x, 52), label, fill="#E5E7EB")
CONTACT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(CONTACT)
print(f"Created {V12.relative_to(ROOT)}")
print(f"Created {SOURCE.relative_to(ROOT)}")
print(f"Created {CONTACT.relative_to(ROOT)}")
