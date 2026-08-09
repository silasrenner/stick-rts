from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
FRAME_SIZE = 96
GROUND_Y = 84
REFERENCE_HEIGHT = 72
SOURCES = {
    "sunmeadow": {
        "source": ROOT / "artifacts/warrior-pair-proof/canonical-source-crops/sunmeadow-warrior-left-centered-v03.png",
        "directory": ROOT / "assets/art/editable/sunmeadow/warrior",
        "document": "sunmeadow-warrior-idle-v01.aseprite",
        "guide": "sunmeadow-warrior-reference-guide-v01.png",
    },
    "bramblecrest": {
        "source": ROOT / "artifacts/bramblecrest-intake-v01/preferred-role-sources-v02/warrior-shield-source.png",
        "directory": ROOT / "assets/art/editable/bramblecrest/warrior",
        "document": "bramblecrest-warrior-idle-v01.aseprite",
        "guide": "bramblecrest-warrior-reference-guide-v01.png",
    },
}

for faction, entry in SOURCES.items():
    source = entry["source"]
    if not source.is_file():
        raise SystemExit(f"Missing approved {faction} parent source: {source}")

    entry["directory"].mkdir(parents=True, exist_ok=True)
    reference = Image.open(source).convert("RGBA")
    scale = min((FRAME_SIZE - 8) / reference.width, REFERENCE_HEIGHT / reference.height)
    size = (max(1, round(reference.width * scale)), max(1, round(reference.height * scale)))
    reference = reference.resize(size, Image.Resampling.NEAREST)
    reference.putalpha(150)

    guide = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    offset = ((FRAME_SIZE - reference.width) // 2, GROUND_Y - reference.height)
    guide.alpha_composite(reference, offset)
    drawing = ImageDraw.Draw(guide)
    for x in range(0, FRAME_SIZE, 4):
        drawing.line((x, GROUND_Y, min(x + 1, FRAME_SIZE - 1), GROUND_Y), fill=(56, 189, 248, 255))
    drawing.line((48, 0, 48, 5), fill=(56, 189, 248, 180))
    drawing.line((48, 90, 48, 95), fill=(56, 189, 248, 180))

    guide_path = entry["directory"] / entry["guide"]
    document_path = entry["directory"] / entry["document"]
    guide.save(guide_path)
    result = subprocess.run(
        [str(ASEPRITE), "--batch", str(guide_path), "--save-as", str(document_path)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or f"Aseprite failed for {faction}")
    print(f"Created {document_path.relative_to(ROOT)} from {source.relative_to(ROOT)}")
