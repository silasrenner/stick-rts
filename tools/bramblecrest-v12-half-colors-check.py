from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V11 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v11-half-resolution.png"
V12 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v12-half-colors.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v12-half-colors.aseprite"


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for path in (V11, V12, SOURCE):
    if not path.is_file():
        fail(f"missing Bramblecrest V12 artifact: {path.relative_to(ROOT)}")
v11 = Image.open(V11).convert("RGBA")
v12 = Image.open(V12).convert("RGBA")
if v11.size != (85, 65) or v12.size != v11.size or v12.mode != "RGBA":
    fail("V12 must retain V11's 85x65 RGBA grid")
if v11.getchannel("A").tobytes() != v12.getchannel("A").tobytes():
    fail("V12 must retain V11's hard alpha silhouette")
source_count = len({pixel[:3] for pixel in v11.get_flattened_data() if pixel[3]})
candidate_count = len({pixel[:3] for pixel in v12.get_flattened_data() if pixel[3]})
target = (source_count + 1) // 2
if candidate_count > target or candidate_count < target - 8:
    fail(f"V12 must reduce V11 colors by approximately half ({source_count} → target {target}), got {candidate_count}")
with tempfile.TemporaryDirectory() as directory:
    exported = Path(directory) / "v12.png"
    result = subprocess.run([str(ASEPRITE), "--batch", str(SOURCE), "--save-as", str(exported)], capture_output=True, text=True)
    if result.returncode != 0:
        fail(result.stderr.strip() or result.stdout.strip() or "Aseprite V12 round-trip failed")
    if Image.open(exported).convert("RGBA").size != (85, 65):
        fail("V12 editable source did not round-trip at 85x65")

print(f"PASS — Bramblecrest V12 retains the V11 85x65 silhouette and halves visible colors: {source_count} → {candidate_count} (target {target}).")
