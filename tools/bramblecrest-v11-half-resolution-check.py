from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
V11 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v11-half-resolution.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v11-half-resolution.aseprite"


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for path in (V06, V11, SOURCE):
    if not path.is_file():
        fail(f"missing Bramblecrest V11 artifact: {path.relative_to(ROOT)}")
v06 = Image.open(V06).convert("RGBA")
v11 = Image.open(V11).convert("RGBA")
if v06.size != (170, 130) or v11.size != (85, 65) or v11.mode != "RGBA":
    fail(f"V11 must be the exact half-resolution 85x65 RGBA version of V06, got {v06.size} → {v11.mode} {v11.size}")
expected = v06.resize((85, 65), Image.Resampling.NEAREST)
if expected.tobytes() != v11.tobytes():
    fail("V11 must be a direct nearest-neighbour reduction of V06, with no paintover or smoothing")
if any(value not in (0, 255) for value in v11.getchannel("A").get_flattened_data()):
    fail("V11 must keep hard alpha edges")
with tempfile.TemporaryDirectory() as directory:
    exported = Path(directory) / "v11.png"
    result = subprocess.run([str(ASEPRITE), "--batch", str(SOURCE), "--save-as", str(exported)], capture_output=True, text=True)
    if result.returncode != 0:
        fail(result.stderr.strip() or result.stdout.strip() or "Aseprite V11 round-trip failed")
    if Image.open(exported).convert("RGBA").size != (85, 65):
        fail("V11 editable source did not round-trip at 85x65")

print("PASS — V11 is a hard-edged, exact 2× nearest-neighbour reduction of V06: 170×130 → 85×65.")
