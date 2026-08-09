from pathlib import Path
import subprocess
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
MASTER = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-v13-three-shade-materials.png"
FRAMES = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-walk-v01"
EDITABLE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-walk-v01.aseprite"
master = Image.open(MASTER).convert("RGBA")
frames = [Image.open(FRAMES / f"frame-{i:02d}.png").convert("RGBA") for i in range(1, 5)]
if any(frame.size != master.size for frame in frames):
    raise SystemExit("FAIL — frame dimensions differ from V13")
for index, frame in enumerate(frames, 1):
    for y in range(88):
        for x in range(master.width):
            if frame.getpixel((x, y)) != master.getpixel((x, y)):
                raise SystemExit(f"FAIL — frame {index} changed fixed V13 material above the lower-body motion zone at {(x, y)}")
if len({frame.tobytes() for frame in frames}) != 4:
    raise SystemExit("FAIL — walk frames are not distinct")
with tempfile.TemporaryDirectory() as temporary:
    output = Path(temporary) / "walk.gif"
    run = subprocess.run([str(ASEPRITE), "--batch", str(EDITABLE), "--save-as", str(output)], capture_output=True, text=True)
    if run.returncode != 0:
        raise SystemExit(run.stderr.strip() or run.stdout.strip() or "FAIL — Aseprite export failed")
    animation = Image.open(output)
    count = 1
    try:
        while True:
            animation.seek(count)
            count += 1
    except EOFError:
        pass
    animation.close()
    if count != 4:
        raise SystemExit(f"FAIL — expected four frames, found {count}")
print("PASS — four distinct V13-based walk frames retain all fixed upper material/identity pixels and round-trip through Aseprite.")
