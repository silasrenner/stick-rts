from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
DOCUMENTS = {
    "sunmeadow": ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-idle-v01.aseprite",
    "bramblecrest": ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-idle-v01.aseprite",
}


def fail(message: str) -> None:
    print(f"FAIL — {message}")
    raise SystemExit(1)


for faction, document in DOCUMENTS.items():
    if not document.is_file():
        fail(f"missing {faction} editable warrior reference document: {document.relative_to(ROOT)}")

    with tempfile.TemporaryDirectory() as directory:
        export = Path(directory) / f"{faction}-reference.png"
        result = subprocess.run(
            [str(ASEPRITE), "--batch", str(document), "--save-as", str(export)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            fail(f"Aseprite could not reopen {document.name}: {result.stderr.strip() or result.stdout.strip()}")
        with Image.open(export) as image:
            if image.mode != "RGBA":
                fail(f"{faction} document export must be RGBA, got {image.mode}")
            if image.size != (96, 96):
                fail(f"{faction} document must be 96x96, got {image.size}")

print("PASS — paired 96x96 editable warrior reference documents reopen and export through Aseprite.")
