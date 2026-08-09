from pathlib import Path
import math
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
V08 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-source-faithful-palette.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-source-faithful-palette.aseprite"


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for path in (V06, V08, SOURCE):
    if not path.is_file():
        fail(f"missing source-faithful V08 artifact: {path.relative_to(ROOT)}")
v06 = Image.open(V06).convert("RGBA")
v08 = Image.open(V08).convert("RGBA")
if v08.size != v06.size or v08.mode != "RGBA":
    fail("V08 must retain V06 native dimensions and RGBA mode")
if v08.getchannel("A").tobytes() != v06.getchannel("A").tobytes():
    fail("V08 must preserve V06's exact source silhouette")

visible_source = [pixel for pixel in v06.get_flattened_data() if pixel[3]]
visible_v08 = [pixel for pixel in v08.get_flattened_data() if pixel[3]]
palette = {pixel[:3] for pixel in visible_v08}
if not 20 <= len(palette) <= 30:
    fail(f"V08 needs 20–30 meaningful visible colors, got {len(palette)}")
error = sum(math.dist(a[:3], b[:3]) for a, b in zip(visible_source, visible_v08)) / len(visible_source)
if error > 28:
    fail(f"V08 palette reduction diverges too far from source colors (mean RGB distance {error:.1f})")

print(f"PASS — source-faithful V08 preserves V06 silhouette at {v08.size[0]}x{v08.size[1]}, reduces visible colors to {len(palette)}, and stays close to source (mean RGB distance {error:.1f}).")
