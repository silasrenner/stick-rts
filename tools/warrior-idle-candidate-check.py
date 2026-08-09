from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
CANDIDATES = {
    "sunmeadow": {
        "png": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-idle-v01.png",
        "source": ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-idle-candidate-v01.aseprite",
    },
    "bramblecrest": {
        "png": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-idle-v01.png",
        "source": ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-idle-candidate-v01.aseprite",
    },
}


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for faction, candidate in CANDIDATES.items():
    for kind, path in candidate.items():
        if not path.is_file():
            fail(f"missing {faction} {kind}: {path.relative_to(ROOT)}")

    with Image.open(candidate["png"]) as image:
        if image.mode != "RGBA" or image.size != (96, 96):
            fail(f"{faction} runtime candidate must be 96x96 RGBA, got {image.mode} {image.size}")
        alpha = image.getchannel("A")
        if alpha.getbbox() is None:
            fail(f"{faction} runtime candidate has no visible sprite pixels")
        if not any(alpha.getpixel((x, 84)) > 0 for x in range(96)):
            fail(f"{faction} runtime candidate must touch the shared y=84 ground anchor")

    with tempfile.TemporaryDirectory() as directory:
        round_trip = Path(directory) / f"{faction}.png"
        result = subprocess.run(
            [str(ASEPRITE), "--batch", str(candidate["source"]), "--save-as", str(round_trip)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            fail(f"Aseprite could not reopen {faction} editable candidate: {result.stderr.strip() or result.stdout.strip()}")
        with Image.open(round_trip) as image:
            if image.mode != "RGBA" or image.size != (96, 96):
                fail(f"{faction} editable candidate did not round-trip as 96x96 RGBA")

print("PASS — paired warrior candidates are editable 96x96 RGBA sprites grounded at y=84.")
