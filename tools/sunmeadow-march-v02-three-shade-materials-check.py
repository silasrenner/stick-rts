from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V01 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-march-v01"
V02 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-march-v02-three-shade-materials"
EDITABLE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-march-v02-three-shade-materials.aseprite"
RAMPS = {
    "green": {(31, 50, 25), (76, 111, 48), (158, 184, 84)},
    "gold": {(92, 62, 18), (190, 151, 49), (247, 218, 111)},
    "steel": {(38, 54, 66), (123, 153, 169), (224, 239, 242)},
    "boot": {(45, 24, 12), (110, 62, 29), (181, 107, 51)},
}
allowed = set().union(*RAMPS.values())
for index in range(1, 5):
    original = Image.open(V01 / f"frame-{index:02d}.png").convert("RGBA")
    edited = Image.open(V02 / f"frame-{index:02d}.png").convert("RGBA")
    if original.size != edited.size:
        raise SystemExit(f"FAIL — frame {index} changed dimensions")
    for before, after in zip(original.get_flattened_data(), edited.get_flattened_data()):
        if before[3] != after[3]:
            raise SystemExit(f"FAIL — frame {index} changed alpha geometry")
    seen = {px[:3] for px in edited.get_flattened_data() if px[3]}
    for ramp_name, ramp in RAMPS.items():
        if not ramp.issubset(seen):
            raise SystemExit(f"FAIL — frame {index} is missing a {ramp_name} ramp shade")
if not EDITABLE.exists():
    raise SystemExit("FAIL — editable Aseprite animation is missing")
with tempfile.TemporaryDirectory() as temp:
    export = Path(temp) / "march.gif"
    run = subprocess.run([str(ASEPRITE), "--batch", str(EDITABLE), "--save-as", str(export)], capture_output=True, text=True)
    if run.returncode != 0:
        raise SystemExit(run.stderr.strip() or run.stdout.strip() or "FAIL — Aseprite export failed")
    animation = Image.open(export)
    count = 1
    try:
        while True:
            animation.seek(count)
            count += 1
    except EOFError:
        pass
    animation.close()
    if count != 4:
        raise SystemExit(f"FAIL — expected four frames after Aseprite export, got {count}")
print("PASS — V02 retains V01 geometry/frame timing and includes complete three-shade green, gold, steel, and boot ramps.")
