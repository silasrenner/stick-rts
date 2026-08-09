from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
V09 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v09-db32-nine-color.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v09-db32-nine-color.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v06-v09-db32-nine-color-comparison.png"

# A nine-color material subset of the established DawnBringer-32 pixel-art palette.
PALETTE = [
    ("outline", "#222034"), ("leather", "#8f563b"), ("skin", "#d9a066"),
    ("green-dark", "#4b692f"), ("green", "#6abe30"), ("metal", "#9badb7"),
    ("bright", "#ffffff"), ("red-dark", "#ac3232"), ("red", "#d95763"),
]
COLORS = [(name, tuple(bytes.fromhex(hex_value[1:])), hex_value) for name, hex_value in PALETTE]


def nearest(color: tuple[int, int, int]) -> tuple[int, int, int]:
    return min(COLORS, key=lambda item: sum((left - right) ** 2 for left, right in zip(color, item[1])))[1]


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            color = "#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833"
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill=color)


source = Image.open(V06).convert("RGBA")
result = Image.new("RGBA", source.size, (0, 0, 0, 0))
source_pixels = source.load()
result_pixels = result.load()
for y in range(source.height):
    for x in range(source.width):
        red, green, blue, alpha = source_pixels[x, y]
        if alpha:
            mapped = nearest((red, green, blue))
            result_pixels[x, y] = (*mapped, alpha)

V09.parent.mkdir(parents=True, exist_ok=True)
SOURCE.parent.mkdir(parents=True, exist_ok=True)
result.save(V09)
conversion = subprocess.run([str(ASEPRITE), "--batch", str(V09), "--save-as", str(SOURCE)], capture_output=True, text=True)
if conversion.returncode != 0:
    raise SystemExit(conversion.stderr.strip() or conversion.stdout.strip() or "Aseprite V09 conversion failed")

scale = 4
scaled = (source.width * scale, source.height * scale)
canvas = Image.new("RGBA", (scaled[0] * 2 + 70, scaled[1] + 148), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "BRAMBLECREST: V06 SOURCE CLEANUP vs V09 DAWNBRINGER-32 NINE-COLOR STUDY", fill="#F8FAFC")
draw.text((16, 31), "V09 retains V06's exact silhouette and maps every visible pixel to one of nine standard DB32 colors: no smoothing or new geometry.", fill="#94A3B8")
for label, image, x in (("V06 — SOURCE CLEANUP", source, 16), ("V09 — DB32 / 9 COLORS", result, scaled[0] + 54)):
    checkerboard(canvas, x, 70, *scaled)
    canvas.alpha_composite(image.resize(scaled, Image.Resampling.NEAREST), (x, 70))
    draw.text((x, 52), label, fill="#E5E7EB")
for index, (name, _, hex_value) in enumerate(COLORS):
    x = 20 + index * 150
    draw.rectangle((x, scaled[1] + 97, x + 20, scaled[1] + 117), fill=hex_value)
    draw.text((x + 27, scaled[1] + 100), f"{name} {hex_value}", fill="#CBD5E1")
CONTACT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(CONTACT)
print(f"Created {V09.relative_to(ROOT)}")
print(f"Created {SOURCE.relative_to(ROOT)}")
print(f"Created {CONTACT.relative_to(ROOT)}")
