from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V02 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.png"
V05 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v05-cleanup-base.png"
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
V06_SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.aseprite"
COMPARISON = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v05-v06-foot-lines-comparison.png"
RESTORE_FOOT = (40, 106, 63, 121)
CLEAR_REGIONS = ((0, 24, 10, 38), (102, 40, 129, 48), (111, 104, 122, 113))


def copy_region(destination: Image.Image, source: Image.Image, region: tuple[int, int, int, int]) -> None:
    destination.paste(source.crop(region), region)


def clear_region(image: Image.Image, region: tuple[int, int, int, int]) -> None:
    pixels = image.load()
    for y in range(region[1], region[3]):
        for x in range(region[0], region[2]):
            pixels[x, y] = (0, 0, 0, 0)


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            color = "#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833"
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill=color)


v02 = Image.open(V02).convert("RGBA")
v05 = Image.open(V05).convert("RGBA")
v06 = v05.copy()
# Restore the left boot from the literal source crop. This region excludes the
# detached ground row that V05 correctly removed.
copy_region(v06, v02, RESTORE_FOOT)
for region in CLEAR_REGIONS:
    clear_region(v06, region)

V06.parent.mkdir(parents=True, exist_ok=True)
V06_SOURCE.parent.mkdir(parents=True, exist_ok=True)
v06.save(V06)
result = subprocess.run([str(ASEPRITE), "--batch", str(V06), "--save-as", str(V06_SOURCE)], capture_output=True, text=True)
if result.returncode != 0:
    raise SystemExit(result.stderr.strip() or result.stdout.strip() or "Aseprite Bramblecrest V06 conversion failed")

scale = 4
scaled_size = (v05.width * scale, v05.height * scale)
canvas = Image.new("RGBA", (scaled_size[0] * 2 + 70, scaled_size[1] + 88), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "BRAMBLECREST: V05 CLEANUP BASE vs V06 FOOT + LINE CLEANUP", fill="#F8FAFC")
draw.text((16, 31), "V06 restores the source foot and clears only identified axe/shield clutter regions; no recoloring or redraw.", fill="#94A3B8")
for label, image, x in (("V05 CLEANUP BASE", v05, 16), ("V06 FOOT + LINES", v06, scaled_size[0] + 54)):
    checkerboard(canvas, x, 68, *scaled_size)
    canvas.alpha_composite(image.resize(scaled_size, Image.Resampling.NEAREST), (x, 68))
    draw.text((x, 52), label, fill="#E5E7EB")
canvas.save(COMPARISON)
print(f"Created {V06.relative_to(ROOT)}")
print(f"Created {V06_SOURCE.relative_to(ROOT)}")
print(f"Created {COMPARISON.relative_to(ROOT)}")
