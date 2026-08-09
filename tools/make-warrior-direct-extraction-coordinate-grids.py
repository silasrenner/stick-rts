from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SCALE = 5
FILES = {
    "bramblecrest-v09": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v09-db32-nine-color.png",
}

for name, path in FILES.items():
    source = Image.open(path).convert("RGBA")
    width, height = source.size
    output = Image.new("RGBA", (width * SCALE, height * SCALE), "#151B26")
    draw = ImageDraw.Draw(output)
    for y in range(0, height, 8):
        draw.line((0, y * SCALE, width * SCALE, y * SCALE), fill="#3B82F6")
    for x in range(0, width, 8):
        draw.line((x * SCALE, 0, x * SCALE, height * SCALE), fill="#3B82F6")
    enlarged = source.resize((width * SCALE, height * SCALE), Image.Resampling.NEAREST)
    output.alpha_composite(enlarged)
    for y in range(0, height, 8):
        draw.text((2, y * SCALE + 1), str(y), fill="#93C5FD")
    for x in range(0, width, 8):
        draw.text((x * SCALE + 1, 1), str(x), fill="#93C5FD")
    destination = ROOT / "artifacts/warrior-pair-proof" / f"{name}-direct-extraction-v02-coordinate-grid.png"
    output.save(destination)
    print(destination.relative_to(ROOT))
