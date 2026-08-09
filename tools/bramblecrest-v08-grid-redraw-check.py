from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
REFERENCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-reference-backdrop.png"
CANDIDATE = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-grid-redraw.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-grid-redraw.aseprite"


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for path in (REFERENCE, CANDIDATE, SOURCE):
    if not path.is_file():
        fail(f"missing Bramblecrest V08 artifact: {path.relative_to(ROOT)}")

reference = Image.open(REFERENCE).convert("RGBA")
candidate = Image.open(CANDIDATE).convert("RGBA")
if reference.size != (128, 128) or candidate.size != (128, 128) or candidate.mode != "RGBA":
    fail(f"V08 must use a native 128x128 RGBA grid, got reference={reference.size}, candidate={candidate.mode} {candidate.size}")
alpha = candidate.getchannel("A")
if alpha.getbbox() is None or not any(alpha.getpixel((x, 112)) for x in range(128)):
    fail("V08 must contain a visible warrior grounded on y=112")
if any(value not in (0, 255) for value in alpha.get_flattened_data()):
    fail("V08 must use hard pixel alpha, not soft/blurred edges")
visible_colors = {pixel[:3] for pixel in candidate.get_flattened_data() if pixel[3]}
if not 12 <= len(visible_colors) <= 30:
    fail(f"V08 must use a deliberate 12–30 color palette, got {len(visible_colors)} colors")

with tempfile.TemporaryDirectory() as directory:
    exported = Path(directory) / "v08.png"
    result = subprocess.run([str(ASEPRITE), "--batch", str(SOURCE), "--save-as", str(exported)], capture_output=True, text=True)
    if result.returncode != 0:
        fail(f"Aseprite could not reopen V08: {result.stderr.strip() or result.stdout.strip()}")
    with Image.open(exported) as image:
        if image.convert("RGBA").size != (128, 128):
            fail("V08 editable source did not round-trip at 128x128")

print(f"PASS — Bramblecrest V08 is a hard-edged 128x128 grid redraw at y=112 using {len(visible_colors)} deliberate colors.")
