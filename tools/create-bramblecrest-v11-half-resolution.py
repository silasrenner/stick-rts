from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
V11 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v11-half-resolution.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v11-half-resolution.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v06-v11-half-resolution-comparison.png"


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill="#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833")


source = Image.open(V06).convert("RGBA")
reduced = source.resize((85, 65), Image.Resampling.NEAREST)
V11.parent.mkdir(parents=True, exist_ok=True)
SOURCE.parent.mkdir(parents=True, exist_ok=True)
reduced.save(V11)
conversion = subprocess.run([str(ASEPRITE), "--batch", str(V11), "--save-as", str(SOURCE)], capture_output=True, text=True)
if conversion.returncode != 0:
    raise SystemExit(conversion.stderr.strip() or conversion.stdout.strip() or "Aseprite V11 conversion failed")

# Both panels occupy identical physical review size: V06 at 4× and V11 at 8×.
canvas = Image.new("RGBA", (1430, 670), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "BRAMBLECREST: V06 SOURCE CLEANUP vs V11 TRUE HALF-RESOLUTION STUDY", fill="#F8FAFC")
draw.text((16, 31), "V11 has 75% fewer pixel locations (170×130 → 85×65), sampled with strict nearest-neighbour: no smoothing or redraw.", fill="#94A3B8")
left = source.resize((680, 520), Image.Resampling.NEAREST)
right = reduced.resize((680, 520), Image.Resampling.NEAREST)
for label, art, x in (("V06 — 170×130", left, 20), ("V11 — 85×65", right, 730)):
    checkerboard(canvas, x, 72, 680, 520)
    canvas.alpha_composite(art, (x, 72))
    draw.text((x, 53), label, fill="#E5E7EB")
CONTACT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(CONTACT)
print(f"Created {V11.relative_to(ROOT)}")
print(f"Created {SOURCE.relative_to(ROOT)}")
print(f"Created {CONTACT.relative_to(ROOT)}")
