from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
V08 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-source-faithful-palette.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-source-faithful-palette.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v06-v08-source-faithful-palette-comparison.png"


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            color = "#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833"
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill=color)


source = Image.open(V06).convert("RGBA")
# No scaling, smoothing, alpha edits, or dithering: map V06 colors to a compact
# palette while retaining every original shape and pixel position.
rgb = source.convert("RGB")
reduced_rgb = rgb.quantize(colors=28, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
reduced = Image.merge("RGBA", (*reduced_rgb.split(), source.getchannel("A")))

V08.parent.mkdir(parents=True, exist_ok=True)
SOURCE.parent.mkdir(parents=True, exist_ok=True)
reduced.save(V08)
result = subprocess.run([str(ASEPRITE), "--batch", str(V08), "--save-as", str(SOURCE)], capture_output=True, text=True)
if result.returncode != 0:
    raise SystemExit(result.stderr.strip() or result.stdout.strip() or "Aseprite source-faithful V08 conversion failed")

scale = 4
scaled = (source.width * scale, source.height * scale)
canvas = Image.new("RGBA", (scaled[0] * 2 + 70, scaled[1] + 90), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "BRAMBLECREST: V06 SOURCE CLEANUP vs V08 SOURCE-FAITHFUL PALETTE REDUCTION", fill="#F8FAFC")
draw.text((16, 31), "V08 retains V06's exact canvas, alpha silhouette, pose, and pixels-in-place. Only color mapping changed: no redraw, no scale, no smoothing.", fill="#94A3B8")
for label, image, x in (("V06 — SOURCE CLEANUP", source, 16), ("V08 — 28-COLOR SOURCE-FAITHFUL", reduced, scaled[0] + 54)):
    checkerboard(canvas, x, 70, *scaled)
    canvas.alpha_composite(image.resize(scaled, Image.Resampling.NEAREST), (x, 70))
    draw.text((x, 52), label, fill="#E5E7EB")
CONTACT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(CONTACT)
print(f"Created {V08.relative_to(ROOT)}")
print(f"Created {SOURCE.relative_to(ROOT)}")
print(f"Created {CONTACT.relative_to(ROOT)}")
