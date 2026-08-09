from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
V04 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v04-depth.png"
V05 = ROOT / "artifacts/warrior-pair-proof/sunmeadow-warrior-direct-extraction-v05-silas-edit-preview.png"
OUTPUT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-v04-v05-silas-edit-comparison.png"
SCALE = 4


def checkerboard(image: Image.Image, origin: tuple[int, int], size: tuple[int, int]) -> None:
    draw = ImageDraw.Draw(image)
    ox, oy = origin
    width, height = size
    cell = 16
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            draw.rectangle((ox + x, oy + y, ox + x + cell - 1, oy + y + cell - 1), fill="#303743" if ((x // cell) + (y // cell)) % 2 == 0 else "#222833")


v04 = Image.open(V04).convert("RGBA")
v05 = Image.open(V05).convert("RGBA")
if v04.size != v05.size:
    raise SystemExit(f"Size mismatch: V04={v04.size}, V05={v05.size}")

scaled_size = (v04.width * SCALE, v04.height * SCALE)
canvas = Image.new("RGBA", (scaled_size[0] * 2 + 70, scaled_size[1] + 88), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "SUNMEADOW: V04 DEPTH vs V05 SILAS EDIT", fill="#F8FAFC")
draw.text((16, 31), "Both shown at 4× with nearest-neighbour scaling; transparency unchanged by preview.", fill="#94A3B8")
positions = ((16, 68), (scaled_size[0] + 54, 68))
for label, source, position in (("V04 DEPTH", v04, positions[0]), ("V05 SILAS EDIT", v05, positions[1])):
    checkerboard(canvas, position, scaled_size)
    canvas.alpha_composite(source.resize(scaled_size, Image.Resampling.NEAREST), position)
    draw.text((position[0], 52), label, fill="#E5E7EB")

canvas.save(OUTPUT)
print(OUTPUT.relative_to(ROOT))
