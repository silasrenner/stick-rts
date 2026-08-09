from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
V13 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-v13-three-shade-materials.png"
EDITABLE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-v13-three-shade-materials.aseprite"
REQUIRED = {
    "leaf": {(29, 48, 27), (71, 108, 48), (142, 178, 80)},
    "wood": {(48, 27, 15), (111, 65, 34), (186, 115, 62)},
    "steel": {(40, 56, 64), (119, 149, 158), (220, 235, 232)},
    "shield_red": {(72, 28, 18), (151, 61, 35), (221, 122, 72)},
    "brass": {(80, 60, 24), (168, 139, 57), (235, 204, 112)},
    "skin": {(92, 53, 35), (177, 107, 72), (233, 166, 111)},
}
before = Image.open(V06).convert("RGBA")
after = Image.open(V13).convert("RGBA")
if before.size != after.size:
    raise SystemExit("FAIL — V13 changed V06 dimensions")
for source, candidate in zip(before.get_flattened_data(), after.get_flattened_data()):
    if source[3] != candidate[3]:
        raise SystemExit("FAIL — V13 changed V06 alpha geometry")
colors = {pixel[:3] for pixel in after.get_flattened_data() if pixel[3]}
for material, ramp in REQUIRED.items():
    if not ramp.issubset(colors):
        raise SystemExit(f"FAIL — V13 is missing a {material} shade")
if not EDITABLE.exists():
    raise SystemExit("FAIL — V13 editable Aseprite source missing")
with tempfile.TemporaryDirectory() as temp:
    exported = Path(temp) / "v13.png"
    run = subprocess.run([str(ASEPRITE), "--batch", str(EDITABLE), "--save-as", str(exported)], capture_output=True, text=True)
    if run.returncode != 0:
        raise SystemExit(run.stderr.strip() or run.stdout.strip() or "FAIL — Aseprite export failed")
    recovered = Image.open(exported).convert("RGBA")
    if recovered.tobytes() != after.tobytes():
        raise SystemExit("FAIL — V13 editable Aseprite source does not round-trip")
print("PASS — V13 retains exact V06 alpha geometry and provides complete three-shade leafy cloth, wood/leather, steel, red shield, brass, and skin ramps.")
