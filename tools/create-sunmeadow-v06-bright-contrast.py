from pathlib import Path
import colorsys
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V05 = ROOT / "artifacts/warrior-pair-proof/sunmeadow-warrior-direct-extraction-v05-silas-edit-preview.png"
V06 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v06-bright-contrast.png"
V06_SOURCE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v06-bright-contrast.aseprite"
COMPARISON = ROOT / "artifacts/warrior-pair-proof/sunmeadow-v05-v06-bright-contrast-comparison.png"


def clamp(value: float) -> int:
    return max(0, min(255, round(value)))


def luma(red: int, green: int, blue: int) -> float:
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def grade(pixel: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    red, green, blue, alpha = pixel
    if not alpha:
        return pixel
    value = luma(red, green, blue)
    if value < 85:
        # Reinforce existing line/occlusion pixels only. No new outline pixels
        # are drawn, so the artist's silhouette remains unchanged.
        return (clamp(red * 0.76), clamp(green * 0.76), clamp(blue * 0.76), alpha)

    hue, lightness, saturation = colorsys.rgb_to_hls(red / 255, green / 255, blue / 255)
    saturation = min(1.0, saturation * 1.08)
    # Move the working range slightly brighter while spreading the mid/high
    # tones. This raises material clarity without a blurred sharpening filter.
    lightness = max(0.0, min(1.0, (lightness - 0.45) * 1.15 + 0.53))
    nr, ng, nb = colorsys.hls_to_rgb(hue, lightness, saturation)
    return (clamp(nr * 255), clamp(ng * 255), clamp(nb * 255), alpha)


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            color = "#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833"
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill=color)


source = Image.open(V05).convert("RGBA")
v06 = Image.new("RGBA", source.size)
v06.putdata([grade(pixel) for pixel in source.get_flattened_data()])
V06.parent.mkdir(parents=True, exist_ok=True)
V06_SOURCE.parent.mkdir(parents=True, exist_ok=True)
v06.save(V06)
result = subprocess.run([str(ASEPRITE), "--batch", str(V06), "--save-as", str(V06_SOURCE)], capture_output=True, text=True)
if result.returncode != 0:
    raise SystemExit(result.stderr.strip() or result.stdout.strip() or "Aseprite V06 conversion failed")

scale = 4
scaled_size = (source.width * scale, source.height * scale)
canvas = Image.new("RGBA", (scaled_size[0] * 2 + 70, scaled_size[1] + 88), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "SUNMEADOW: V05 SILAS EDIT vs V06 BRIGHT / CONTRAST / LINE PASS", fill="#F8FAFC")
draw.text((16, 31), "V06 keeps V05's exact alpha silhouette; it brightens color ramps and reinforces existing dark line pixels only.", fill="#94A3B8")
for label, image, x in (("V05 SILAS EDIT", source, 16), ("V06 SELECTIVE GRADE", v06, scaled_size[0] + 54)):
    checkerboard(canvas, x, 68, *scaled_size)
    canvas.alpha_composite(image.resize(scaled_size, Image.Resampling.NEAREST), (x, 68))
    draw.text((x, 52), label, fill="#E5E7EB")
canvas.save(COMPARISON)
print(f"Created {V06.relative_to(ROOT)}")
print(f"Created {V06_SOURCE.relative_to(ROOT)}")
print(f"Created {COMPARISON.relative_to(ROOT)}")
