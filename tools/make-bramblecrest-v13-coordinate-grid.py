from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-v13-three-shade-materials.png"
OUT = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v13-coordinate-grid-4x.png"
SCALE = 4
image = Image.open(SOURCE).convert("RGBA")
canvas = Image.new("RGBA", (image.width * SCALE, image.height * SCALE), "#151B26")
canvas.alpha_composite(image.resize((image.width * SCALE, image.height * SCALE), Image.Resampling.NEAREST))
d = ImageDraw.Draw(canvas)
for y in range(0, image.height, 8):
    d.line((0, y * SCALE, image.width * SCALE, y * SCALE), fill="#3B82F6")
    d.text((2, y * SCALE + 1), str(y), fill="#93C5FD")
for x in range(0, image.width, 8):
    d.line((x * SCALE, 0, x * SCALE, image.height * SCALE), fill="#3B82F6")
    d.text((x * SCALE + 1, 1), str(x), fill="#93C5FD")
OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUT)
print(OUT)
