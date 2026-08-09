from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
V02 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.png"
V05 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v05-cleanup-base.png"
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
RESTORE_FOOT = (40, 106, 63, 121)
CLEAR_REGIONS = ((0, 24, 10, 38), (102, 40, 129, 48), (111, 104, 122, 113))


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


def in_region(x: int, y: int, region: tuple[int, int, int, int]) -> bool:
    return region[0] <= x < region[2] and region[1] <= y < region[3]


for path in (V02, V05, V06):
    if not path.is_file():
        fail(f"missing Bramblecrest V06 source/candidate: {path.relative_to(ROOT)}")
v02 = Image.open(V02).convert("RGBA")
v05 = Image.open(V05).convert("RGBA")
v06 = Image.open(V06).convert("RGBA")
if v06.size != v05.size or v06.mode != "RGBA":
    fail("V06 must retain V05's native RGBA dimensions")

restored = 0
for y in range(v06.height):
    for x in range(v06.width):
        before = v05.getpixel((x, y))
        after = v06.getpixel((x, y))
        source = v02.getpixel((x, y))
        allowed = in_region(x, y, RESTORE_FOOT) or any(in_region(x, y, region) for region in CLEAR_REGIONS)
        if not allowed and after != before:
            fail(f"V06 changed a pixel outside approved foot/line cleanup regions at {(x, y)}")
        if in_region(x, y, RESTORE_FOOT) and source[3] and after == source and before[3] == 0:
            restored += 1
for region in CLEAR_REGIONS:
    for y in range(region[1], region[3]):
        for x in range(region[0], region[2]):
            if v06.getpixel((x, y))[3]:
                fail(f"V06 retained clutter inside declared cleanup region {region}")
if restored < 40:
    fail(f"V06 did not restore enough source foot pixels ({restored})")

print(f"PASS — Bramblecrest V06 restores {restored} native foot pixels and clears targeted axe/shield clutter without broad redraw.")
