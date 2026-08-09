from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SUN = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-march-v02-three-shade-materials"
BRAMBLE = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-walk-v01"
OUT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-v08-bramblecrest-v13-paired-walk-proof.gif"
SHEET = ROOT / "artifacts/warrior-pair-proof/sunmeadow-v08-bramblecrest-v13-paired-walk-proof-contact.png"
HEIGHT, GROUND_Y = 72, 116


def normalized(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    bbox = image.getbbox()
    crop = image.crop(bbox)
    return crop.resize((round(crop.width * HEIGHT / crop.height), HEIGHT), Image.Resampling.NEAREST)


def stage(sun: Image.Image, bramble: Image.Image, frame: int) -> Image.Image:
    canvas = Image.new("RGBA", (440, 156), "#101B22")
    d = ImageDraw.Draw(canvas)
    d.rectangle((0, GROUND_Y, canvas.width, canvas.height), fill="#213225")
    d.rectangle((0, GROUND_Y - 2, canvas.width, GROUND_Y), fill="#52703B")
    d.text((14, 12), "PAIRED WARRIOR WALK PROOF — GAMEPLAY-SCALE PREVIEW", fill="#F8FAFC")
    d.text((14, 29), "Sunmeadow V08 / Bramblecrest V13 • 4-frame cycles • review artifact only", fill="#94A3B8")
    for label, sprite, center in (("SUNMEADOW", sun, 105), ("BRAMBLECREST", bramble, 315)):
        x, y = center - sprite.width // 2, GROUND_Y - sprite.height
        d.ellipse((x + sprite.width // 4, GROUND_Y - 3, x + sprite.width * 3 // 4, GROUND_Y + 3), fill="#0A100B")
        canvas.alpha_composite(sprite, (x, y))
        d.text((center - len(label) * 3, 133), label, fill="#E5E7EB")
    d.text((404, 134), str(frame + 1), fill="#94A3B8")
    return canvas

sun_frames = [normalized(SUN / f"frame-{i:02d}.png") for i in range(1, 5)]
bramble_frames = [normalized(BRAMBLE / f"frame-{i:02d}.png") for i in range(1, 5)]
frames = [stage(sun_frames[i], bramble_frames[i], i) for i in range(4)]
OUT.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=150, loop=0, disposal=2)
contact = Image.new("RGBA", (440 * 2, 156 * 2), "#111820")
for index, frame in enumerate(frames):
    contact.alpha_composite(frame, ((index % 2) * 440, (index // 2) * 156))
SHEET.parent.mkdir(parents=True, exist_ok=True)
contact.save(SHEET)
print(OUT)
print(SHEET)
