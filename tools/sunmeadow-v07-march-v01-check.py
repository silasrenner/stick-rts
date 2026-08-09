from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
MASTER = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v07-perimeter.png"
FRAMES = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-march-v01"
EDITABLE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-march-v01.aseprite"

master = Image.open(MASTER).convert("RGBA")
images = [Image.open(FRAMES / f"frame-{index:02d}.png").convert("RGBA") for index in range(1, 5)]
if any(image.size != master.size for image in images):
    raise SystemExit("FAIL — march frames must retain the V07 canvas dimensions")
# V07's upper character identity must remain pixel-identical. Only the selected
# lower-leg area (y >= 67) may differ between frames.
for index, image in enumerate(images, 1):
    for y in range(67):
        for x in range(master.width):
            if image.getpixel((x, y)) != master.getpixel((x, y)):
                raise SystemExit(f"FAIL — frame {index} changed V07 above the permitted leg-motion region at {(x, y)}")
if len({image.tobytes() for image in images}) != 4:
    raise SystemExit("FAIL — march frames are not distinct")
if not EDITABLE.exists():
    raise SystemExit("FAIL — editable Aseprite animation source is missing")
with tempfile.TemporaryDirectory() as temporary:
    exported = Path(temporary) / "animation.gif"
    run = subprocess.run([str(ASEPRITE), "--batch", str(EDITABLE), "--save-as", str(exported)], capture_output=True, text=True)
    if run.returncode != 0:
        raise SystemExit(run.stderr.strip() or run.stdout.strip() or "FAIL — Aseprite export failed")
    animation = Image.open(exported)
    count = 1
    try:
        while True:
            animation.seek(count)
            count += 1
    except EOFError:
        pass
    if count != 4:
        animation.close()
        raise SystemExit(f"FAIL — expected 4 Aseprite frames, found {count}")
    animation.close()
print("PASS — four distinct V07-based march frames retain the exact upper character; only lower-leg/boot motion was introduced and the Aseprite source exports as four frames.")
