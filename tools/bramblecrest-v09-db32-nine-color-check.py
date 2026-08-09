from pathlib import Path
import sys
import tempfile
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
V09 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v09-db32-nine-color.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v09-db32-nine-color.aseprite"
DB32_SUBSET = {
    "#222034", "#8f563b", "#d9a066", "#4b692f", "#6abe30",
    "#9badb7", "#ffffff", "#ac3232", "#d95763",
}
ALLOWED = {tuple(bytes.fromhex(color[1:])) for color in DB32_SUBSET}


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for path in (V06, V09, SOURCE):
    if not path.is_file():
        fail(f"missing Bramblecrest V09 artifact: {path.relative_to(ROOT)}")
v06 = Image.open(V06).convert("RGBA")
v09 = Image.open(V09).convert("RGBA")
if v06.size != v09.size or v09.mode != "RGBA":
    fail("V09 must retain V06 native RGBA dimensions")
if v06.getchannel("A").tobytes() != v09.getchannel("A").tobytes():
    fail("V09 must retain V06's exact source silhouette")
visible = {pixel[:3] for pixel in v09.get_flattened_data() if pixel[3]}
if not 5 <= len(visible) <= 9:
    fail(f"V09 requires 5–9 visible colors, got {len(visible)}")
if not visible.issubset(ALLOWED):
    fail("V09 contains a non-DB32 palette color")
with tempfile.TemporaryDirectory() as directory:
    exported = Path(directory) / "v09.png"
    result = subprocess.run([str(ASEPRITE), "--batch", str(SOURCE), "--save-as", str(exported)], capture_output=True, text=True)
    if result.returncode != 0:
        fail(result.stderr.strip() or result.stdout.strip() or "Aseprite V09 round-trip failed")
    if Image.open(exported).convert("RGBA").size != v06.size:
        fail("V09 Aseprite source round-trip changed dimensions")

print(f"PASS — Bramblecrest V09 preserves V06 silhouette at {v09.size[0]}x{v09.size[1]} using {len(visible)} colors from the DawnBringer-32 standard palette.")
