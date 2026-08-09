from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V02 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.png"
V03_CLEAN = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v03-clean.png"
V05 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v05-cleanup-base.png"
V05_SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v05-cleanup-base.aseprite"
COMPARISON = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v02-v05-cleanup-base-comparison.png"


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            color = "#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833"
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill=color)


v02 = Image.open(V02).convert("RGBA")
v05 = Image.open(V03_CLEAN).convert("RGBA")
V05.parent.mkdir(parents=True, exist_ok=True)
V05_SOURCE.parent.mkdir(parents=True, exist_ok=True)
v05.save(V05)
result = subprocess.run([str(ASEPRITE), "--batch", str(V05), "--save-as", str(V05_SOURCE)], capture_output=True, text=True)
if result.returncode != 0:
    raise SystemExit(result.stderr.strip() or result.stdout.strip() or "Aseprite Bramblecrest V05 conversion failed")

scale = 4
scaled_size = (v02.width * scale, v02.height * scale)
canvas = Image.new("RGBA", (scaled_size[0] * 2 + 70, scaled_size[1] + 88), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "BRAMBLECREST: V02 DIRECT EXTRACTION vs V05 CLEANUP BASE", fill="#F8FAFC")
draw.text((16, 31), "V05 removes only external source-scene debris; all retained pixels remain byte-identical to V02.", fill="#94A3B8")
for label, image, x in (("V02 DIRECT", v02, 16), ("V05 CLEANUP BASE", v05, scaled_size[0] + 54)):
    checkerboard(canvas, x, 68, *scaled_size)
    canvas.alpha_composite(image.resize(scaled_size, Image.Resampling.NEAREST), (x, 68))
    draw.text((x, 52), label, fill="#E5E7EB")
canvas.save(COMPARISON)
print(f"Created {V05.relative_to(ROOT)}")
print(f"Created {V05_SOURCE.relative_to(ROOT)}")
print(f"Created {COMPARISON.relative_to(ROOT)}")
