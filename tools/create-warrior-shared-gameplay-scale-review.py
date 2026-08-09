from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "SUNMEADOW V08": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-v08-three-shade-materials.png",
    "BRAMBLECREST V13": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-v13-three-shade-materials.png",
}
OUT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-v08-bramblecrest-v13-shared-gameplay-scale.png"
TARGET_VISIBLE_HEIGHT = 72
GROUND_Y = 116


def crop_visible(image: Image.Image) -> Image.Image:
    bbox = image.getbbox()
    if bbox is None:
        raise ValueError("empty sprite")
    return image.crop(bbox)


def scale_to_height(image: Image.Image) -> Image.Image:
    source = crop_visible(image)
    width = round(source.width * TARGET_VISIBLE_HEIGHT / source.height)
    return source.resize((width, TARGET_VISIBLE_HEIGHT), Image.Resampling.NEAREST)


canvas = Image.new("RGBA", (440, 156), "#101B22")
d = ImageDraw.Draw(canvas)
# A neutral dark field: this is an art review only, not renderer integration.
d.rectangle((0, GROUND_Y, canvas.width, canvas.height), fill="#213225")
d.rectangle((0, GROUND_Y - 2, canvas.width, GROUND_Y), fill="#52703B")
d.text((14, 12), "SHARED GAMEPLAY-SCALE REVIEW — BASE WARRIORS", fill="#F8FAFC")
d.text((14, 29), f"Visible character height normalized to {TARGET_VISIBLE_HEIGHT}px • nearest-neighbour preview only • ground anchor y={GROUND_Y}", fill="#94A3B8")
placements = {"SUNMEADOW V08": 105, "BRAMBLECREST V13": 315}
for label, path in SOURCES.items():
    sprite = scale_to_height(Image.open(path).convert("RGBA"))
    x = placements[label] - sprite.width // 2
    y = GROUND_Y - sprite.height
    # restrained contact shadow for visual anchoring, not part of either asset
    d.ellipse((x + sprite.width // 4, GROUND_Y - 3, x + sprite.width * 3 // 4, GROUND_Y + 3), fill="#0A100B")
    canvas.alpha_composite(sprite, (x, y))
    d.text((placements[label] - len(label) * 3, 133), label, fill="#E5E7EB")
OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUT)
print(OUT)
