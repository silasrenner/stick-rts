from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
V06 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v06-bright-contrast.png"
V07 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v07-perimeter.png"
PLUME_ROI = (34, 2, 76, 37)


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


def is_boundary(alpha: Image.Image, x: int, y: int) -> bool:
    width, height = alpha.size
    return any(not (0 <= nx < width and 0 <= ny < height) or alpha.getpixel((nx, ny)) == 0 for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))


if not V06.is_file() or not V07.is_file():
    fail("missing V06 source or V07 perimeter candidate")
v06 = Image.open(V06).convert("RGBA")
v07 = Image.open(V07).convert("RGBA")
if v06.size != v07.size or v07.mode != "RGBA":
    fail("V07 must retain V06's native RGBA dimensions")
if v06.getchannel("A").tobytes() != v07.getchannel("A").tobytes():
    fail("V07 must not change V06's alpha silhouette")

alpha = v06.getchannel("A")
changes = []
for y in range(v06.height):
    for x in range(v06.width):
        before = v06.getpixel((x, y))
        after = v07.getpixel((x, y))
        if before != after:
            changes.append((x, y, before, after))
            if not (PLUME_ROI[0] <= x < PLUME_ROI[2] and PLUME_ROI[1] <= y < PLUME_ROI[3]):
                fail(f"V07 changed a pixel outside the reviewed helmet/plume perimeter at {(x, y)}")
            if not is_boundary(alpha, x, y):
                fail(f"V07 changed an interior plume pixel at {(x, y)}")
            if not (before[2] > before[0] * 1.04 and before[2] > before[1] * 1.02):
                fail(f"V07 changed a non-blue plume perimeter pixel at {(x, y)}")
            if sum(after[:3]) >= sum(before[:3]):
                fail(f"V07 did not tighten the plume edge at {(x, y)}")
if not 8 <= len(changes) <= 80:
    fail(f"V07 must be a restrained perimeter pass, got {len(changes)} changed pixels")

print(f"PASS — V07 keeps V06's silhouette and selectively tightens {len(changes)} reviewed blue plume perimeter pixels.")
