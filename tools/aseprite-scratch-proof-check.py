from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
SOURCE = ROOT / "assets/art/editable/_scratch/aseprite-scratch-32x32-v01.aseprite"
EXPORT = ROOT / "assets/art/editable/_scratch/aseprite-scratch-32x32-v01.png"


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for path in (ASEPRITE, SOURCE, EXPORT):
    if not path.is_file():
        fail(f"missing required file: {path.relative_to(ROOT) if path != ASEPRITE else path}")

def verify_image(path: Path) -> None:
    with Image.open(path) as image:
        if image.mode != "RGBA":
            fail(f"{path.name} must preserve RGBA, got {image.mode}")
        if image.size != (32, 32):
            fail(f"{path.name} must be 32x32, got {image.size}")
        alpha_values = list(image.getchannel("A").get_flattened_data())
        if max(alpha_values, default=0) != 255:
            fail(f"{path.name} must contain an opaque pixel-art mark")
        if min(alpha_values, default=255) != 0:
            fail(f"{path.name} must retain transparent background pixels")


verify_image(EXPORT)
with tempfile.TemporaryDirectory() as directory:
    round_trip = Path(directory) / "round-trip.png"
    completed = subprocess.run(
        [str(ASEPRITE), "--batch", str(SOURCE), "--save-as", str(round_trip)],
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        fail(f"Aseprite could not reopen the editable source: {completed.stderr.strip() or completed.stdout.strip()}")
    verify_image(round_trip)

print("PASS — editable Aseprite source round-trips to a 32x32 RGBA PNG with both opaque art and transparent background.")
