from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
V02 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.png"
V05 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v05-cleanup-base.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v05-cleanup-base.aseprite"


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for path in (V02, V05, SOURCE):
    if not path.is_file():
        fail(f"missing Bramblecrest V05 cleanup-base artifact: {path.relative_to(ROOT)}")

v02 = Image.open(V02).convert("RGBA")
v05 = Image.open(V05).convert("RGBA")
if v02.size != v05.size or v05.mode != "RGBA":
    fail(f"V05 must preserve V02 native RGBA dimensions, got {v05.mode} {v05.size}")

removed = 0
for original, clean in zip(v02.get_flattened_data(), v05.get_flattened_data()):
    if clean[3]:
        if clean != original:
            fail("V05 cleanup-base must retain every kept V02 source pixel byte-for-byte")
    elif original[3]:
        removed += 1
if removed < 100:
    fail(f"V05 should remove meaningful source-scene debris, only removed {removed} pixels")
if v05.getchannel("A").getbbox() is None:
    fail("V05 removed the complete Bramblecrest warrior")

print(f"PASS — Bramblecrest V05 retains source pixels exactly and removes {removed} external debris pixels for an editable human cleanup pass.")
