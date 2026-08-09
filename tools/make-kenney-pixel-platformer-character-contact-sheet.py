from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/art/sources/kenney-pixel-platformer-v1/extracted/Tilemap/tilemap-characters.png"
OUT = ROOT / "artifacts/kenney-intake/kenney-pixel-platformer-character-tiles-12x.png"

sheet = Image.open(SOURCE).convert("RGBA")
tile, spacing, scale = 24, 1, 12
canvas = Image.new("RGBA", (9 * (tile * scale + 18) + 24, 3 * (tile * scale + 48) + 72), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((12, 12), "KENNEY PIXEL PLATFORMER — CC0 CHARACTER TILES (12× NEAREST-NEIGHBOUR)", fill="#F8FAFC")
for row in range(3):
    for col in range(9):
        left, top = col * (tile + spacing), row * (tile + spacing)
        frame = sheet.crop((left, top, left + tile, top + tile)).resize((tile * scale, tile * scale), Image.Resampling.NEAREST)
        x, y = 12 + col * (tile * scale + 18), 54 + row * (tile * scale + 48)
        draw.rectangle((x - 2, y - 2, x + tile * scale + 1, y + tile * scale + 1), fill="#303743")
        canvas.alpha_composite(frame, (x, y))
        draw.text((x, y + tile * scale + 8), f"r{row} c{col}", fill="#CBD5E1")
OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUT)
print(OUT)
