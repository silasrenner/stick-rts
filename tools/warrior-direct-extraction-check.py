from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PAIRS = {
    "sunmeadow": (
        ROOT / "artifacts/warrior-pair-proof/canonical-source-crops/sunmeadow-warrior-left-centered-v03.png",
        (0, 48, 110, 145),  # remove unrelated sheet rows; preserve the warrior pixels verbatim
        ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v02.png",
    ),
    "bramblecrest": (
        ROOT / "artifacts/bramblecrest-intake-v01/preferred-role-sources-v02/warrior-shield-source.png",
        None,
        ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.png",
    ),
}


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for faction, (source_path, crop_box, candidate_path) in PAIRS.items():
    if not candidate_path.is_file():
        fail(f"missing {faction} direct extraction: {candidate_path.relative_to(ROOT)}")
    source = Image.open(source_path).convert("RGB")
    if crop_box is not None:
        source = source.crop(crop_box)
    candidate = Image.open(candidate_path).convert("RGBA")
    if candidate.size != source.size:
        fail(f"{faction} candidate must retain native selected-source dimensions {source.size}, got {candidate.size}")

    alpha = candidate.getchannel("A")
    if alpha.getbbox() is None:
        fail(f"{faction} candidate has no preserved source pixels")
    if alpha.getbbox() == (0, 0, *candidate.size):
        fail(f"{faction} candidate is still an opaque rectangular source crop")

    for source_pixel, candidate_pixel, alpha_value in zip(source.get_flattened_data(), candidate.get_flattened_data(), alpha.get_flattened_data()):
        if alpha_value and candidate_pixel[:3] != source_pixel:
            fail(f"{faction} candidate changed a visible source pixel instead of extracting it")

print("PASS — both direct-extraction candidates preserve visible source pixels at native resolution while removing surrounding background.")
