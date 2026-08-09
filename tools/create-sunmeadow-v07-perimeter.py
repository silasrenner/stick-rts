from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V06 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v06-bright-contrast.png"
V07 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v07-perimeter.png"
V07_SOURCE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v07-perimeter.aseprite"
COMPARISON = ROOT / "artifacts/warrior-pair-proof/sunmeadow-v06-v07-perimeter-comparison.png"
ROI = (34, 2, 76, 37)


def is_boundary(alpha: Image.Image, x: int, y: int) -> bool:
    width, height = alpha.size
    return any(not (0 <= nx < width and 0 <= ny < height) or alpha.getpixel((nx, ny)) == 0 for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            color = "#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833"
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill=color)


v06 = Image.open(V06).convert("RGBA")
alpha = v06.getchannel("A")
v07 = v06.copy()
pixels = v07.load()
changed = 0
for y in range(ROI[1], ROI[3]):
    for x in range(ROI[0], ROI[2]):
        red, green, blue, opacity = v06.getpixel((x, y))
        # This is deliberately limited to the visible blue plume's exterior
        # edge. It strengthens existing line pixels without growing/eroding
        # the artist-edited silhouette or touching the face/helmet interior.
        if opacity and is_boundary(alpha, x, y) and blue > red * 1.04 and blue > green * 1.02:
            pixels[x, y] = (round(red * 0.64), round(green * 0.64), round(blue * 0.64), opacity)
            changed += 1

V07.parent.mkdir(parents=True, exist_ok=True)
V07_SOURCE.parent.mkdir(parents=True, exist_ok=True)
v07.save(V07)
result = subprocess.run([str(ASEPRITE), "--batch", str(V07), "--save-as", str(V07_SOURCE)], capture_output=True, text=True)
if result.returncode != 0:
    raise SystemExit(result.stderr.strip() or result.stdout.strip() or "Aseprite V07 conversion failed")

scale = 5
scaled_size = (v06.width * scale, v06.height * scale)
canvas = Image.new("RGBA", (scaled_size[0] * 2 + 70, scaled_size[1] + 88), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "SUNMEADOW: V06 vs V07 — HELMET PLUME PERIMETER PASS", fill="#F8FAFC")
draw.text((16, 31), "V07 changes only existing blue plume edge pixels; alpha silhouette, pose, and internal detail are unchanged.", fill="#94A3B8")
for label, image, x in (("V06", v06, 16), ("V07 TIGHTENED PERIMETER", v07, scaled_size[0] + 54)):
    checkerboard(canvas, x, 68, *scaled_size)
    canvas.alpha_composite(image.resize(scaled_size, Image.Resampling.NEAREST), (x, 68))
    draw.text((x, 52), label, fill="#E5E7EB")
canvas.save(COMPARISON)
print(f"Changed {changed} blue plume perimeter pixels")
print(f"Created {V07.relative_to(ROOT)}")
print(f"Created {V07_SOURCE.relative_to(ROOT)}")
print(f"Created {COMPARISON.relative_to(ROOT)}")
