from pathlib import Path
import math
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
V05 = ROOT / "artifacts/warrior-pair-proof/sunmeadow-warrior-direct-extraction-v05-silas-edit-preview.png"
V06 = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v06-bright-contrast.png"


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


def luma(pixel: tuple[int, int, int, int]) -> float:
    return 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]


def visible_lumas(image: Image.Image) -> list[float]:
    return [luma(pixel) for pixel in image.get_flattened_data() if pixel[3]]


if not V05.is_file():
    fail(f"missing V05 review export: {V05.relative_to(ROOT)}")
if not V06.is_file():
    fail(f"missing V06 candidate: {V06.relative_to(ROOT)}")

v05 = Image.open(V05).convert("RGBA")
v06 = Image.open(V06).convert("RGBA")
if v06.size != v05.size or v06.mode != "RGBA":
    fail(f"V06 must retain V05's native RGBA dimensions, got {v06.mode} {v06.size}")
if v06.getchannel("A").tobytes() != v05.getchannel("A").tobytes():
    fail("V06 must retain V05's alpha silhouette exactly")

before = visible_lumas(v05)
after = visible_lumas(v06)
before_mean = sum(before) / len(before)
after_mean = sum(after) / len(after)
before_spread = math.sqrt(sum((value - before_mean) ** 2 for value in before) / len(before))
after_spread = math.sqrt(sum((value - after_mean) ** 2 for value in after) / len(after))
if after_mean <= before_mean * 1.025:
    fail(f"V06 did not brighten visible pixels enough ({before_mean:.2f} -> {after_mean:.2f})")
if after_spread <= before_spread * 1.02:
    fail(f"V06 did not add enough contrast ({before_spread:.2f} -> {after_spread:.2f})")

line_darkened = sum(1 for old, new in zip(v05.get_flattened_data(), v06.get_flattened_data()) if old[3] and luma(old) < 85 and luma(new) < luma(old) - 4)
if line_darkened < 80:
    fail(f"V06 did not selectively reinforce enough existing dark line pixels ({line_darkened})")

print(f"PASS — V06 preserves V05 alpha while brightening ({before_mean:.1f}->{after_mean:.1f}), increasing contrast ({before_spread:.1f}->{after_spread:.1f}), and reinforcing {line_darkened} existing line pixels.")
