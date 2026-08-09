from pathlib import Path
import math
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PAIRS = {
    "sunmeadow": {
        "base": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v02.png",
        "clean": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v03-clean.png",
        "depth": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v04-depth.png",
    },
    "bramblecrest": {
        "base": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.png",
        "clean": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v03-clean.png",
        "depth": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v04-depth.png",
    },
}


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


def luminance_spread(image: Image.Image) -> float:
    values = [0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b, a in image.get_flattened_data() if a]
    mean = sum(values) / len(values)
    return math.sqrt(sum((value - mean) ** 2 for value in values) / len(values))


for faction, paths in PAIRS.items():
    for label, path in paths.items():
        if not path.is_file():
            fail(f"missing {faction} {label} candidate: {path.relative_to(ROOT)}")
    base = Image.open(paths["base"]).convert("RGBA")
    clean = Image.open(paths["clean"]).convert("RGBA")
    depth = Image.open(paths["depth"]).convert("RGBA")
    if clean.size != base.size or depth.size != base.size:
        fail(f"{faction} cleanup/depth candidates must retain V02 dimensions")

    for base_pixel, clean_pixel in zip(base.get_flattened_data(), clean.get_flattened_data()):
        if clean_pixel[3] and clean_pixel != base_pixel:
            fail(f"{faction} V03 must only clear source pixels, never repaint retained pixels")
    if clean.getchannel("A").getbbox() is None:
        fail(f"{faction} V03 removed the complete sprite")
    if depth.getchannel("A").tobytes() != clean.getchannel("A").tobytes():
        fail(f"{faction} V04 must retain the V03 alpha silhouette exactly")
    if luminance_spread(depth) <= luminance_spread(clean) * 1.025:
        fail(f"{faction} V04 did not add a measurable, restrained contrast increase")

bramble = Image.open(PAIRS["bramblecrest"]["clean"]).convert("RGBA")
for y in range(16, 41):
    for x in range(104, 126):
        if bramble.getpixel((x, y))[3]:
            fail("Bramblecrest V03 still contains the detached hovering shield-side object")

sun = Image.open(PAIRS["sunmeadow"]["clean"]).convert("RGBA")
if any(sun.getpixel((x, y))[3] for y in range(90, sun.height) for x in range(sun.width)):
    fail("Sunmeadow V03 still contains the bottom dirt strip")

print("PASS — V03 only clears unwanted source debris; V04 preserves the V03 silhouette and adds restrained contrast.")
