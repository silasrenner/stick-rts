from collections import deque
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
PAIRS = {
    "sunmeadow": {
        "source": ROOT / "artifacts/warrior-pair-proof/canonical-source-crops/sunmeadow-warrior-left-centered-v03.png",
        "crop": (0, 48, 110, 145),
        "candidate": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v02.png",
        "editable": ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v02.aseprite",
    },
    "bramblecrest": {
        "source": ROOT / "artifacts/bramblecrest-intake-v01/preferred-role-sources-v02/warrior-shield-source.png",
        "candidate": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.png",
        "editable": ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.aseprite",
    },
}


def luma(pixel: tuple[int, int, int]) -> int:
    return (pixel[0] * 54 + pixel[1] * 183 + pixel[2] * 19) // 256


def is_dark_background(pixel: tuple[int, int, int]) -> bool:
    # Deliberately conservative: remove only the near-black matte surrounding
    # the supplied crop. Visible candidate RGB values remain byte-identical to
    # the source; this produces a review mask, not a repaint or regeneration.
    return luma(pixel) < 38 and max(pixel) - min(pixel) < 26


def isolate_source(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    width, height = rgb.size
    pixels = list(rgb.get_flattened_data())
    background = [is_dark_background(pixel) for pixel in pixels]
    seen = [False] * (width * height)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if not (0 <= x < width and 0 <= y < height):
            continue
        index = y * width + x
        if seen[index] or not background[index]:
            continue
        seen[index] = True
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

    foreground = [not edge_background for edge_background in seen]
    # Restore a one-pixel source-faithful rim around retained pixels. This
    # avoids cutting through the deliberately dark outer linework.
    expanded = foreground[:]
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if not foreground[index]:
                continue
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < width and 0 <= ny < height:
                    expanded[ny * width + nx] = True

    output = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    output.putdata([(*pixel, 255 if keep else 0) for pixel, keep in zip(pixels, expanded)])
    return output


def save_pair(name: str, entry: dict[str, Path]) -> Image.Image:
    source = Image.open(entry["source"])
    if entry.get("crop"):
        source = source.crop(entry["crop"])
    candidate = isolate_source(source)
    entry["candidate"].parent.mkdir(parents=True, exist_ok=True)
    entry["editable"].parent.mkdir(parents=True, exist_ok=True)
    candidate.save(entry["candidate"])
    result = subprocess.run(
        [str(ASEPRITE), "--batch", str(entry["candidate"]), "--save-as", str(entry["editable"])],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or f"Aseprite conversion failed for {name}")
    print(f"Created {entry['candidate'].relative_to(ROOT)} and {entry['editable'].relative_to(ROOT)}")
    return candidate


def checkerboard(canvas: Image.Image, x: int, y: int, size: int) -> None:
    d = ImageDraw.Draw(canvas)
    for row in range(0, size, 8):
        for col in range(0, size, 8):
            color = "#303743" if ((row // 8) + (col // 8)) % 2 == 0 else "#222833"
            d.rectangle((x + col, y + row, x + col + 7, y + row + 7), fill=color)


def preview(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    result = image.copy()
    result.thumbnail(max_size, Image.Resampling.NEAREST)
    return result


def build_contact_sheet(candidates: dict[str, Image.Image]) -> None:
    sheet = Image.new("RGBA", (720, 390), "#111820")
    d = ImageDraw.Draw(sheet)
    d.text((16, 14), "SOURCE-PIXEL DIRECT EXTRACTION v02 — REVIEW ONLY", fill="#F8FAFC")
    d.text((16, 31), "Left: approved source crop  |  Right: same source pixels after conservative matte removal", fill="#94A3B8")
    columns = {"sunmeadow": 20, "bramblecrest": 375}
    for name, x in columns.items():
        entry = PAIRS[name]
        original = Image.open(entry["source"]).convert("RGBA")
        if entry.get("crop"):
            original = original.crop(entry["crop"])
        original = preview(original, (155, 240))
        extracted = preview(candidates[name], (155, 240))
        d.text((x, 62), name.upper(), fill="#E5E7EB")
        d.text((x, 82), "APPROVED SOURCE", fill="#94A3B8")
        d.text((x + 180, 82), "DIRECT EXTRACTION", fill="#94A3B8")
        sheet.alpha_composite(original, (x, 105))
        checkerboard(sheet, x + 180, 105, 155)
        sheet.alpha_composite(extracted, (x + 180 + (155 - extracted.width) // 2, 105))
        d.text((x, 360), "No redraw • no palette substitution • no resampling", fill="#94A3B8")
    output = ROOT / "artifacts/warrior-pair-proof/warrior-direct-extraction-v02-contact-sheet.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)
    print(f"Created {output.relative_to(ROOT)}")


candidates = {name: save_pair(name, entry) for name, entry in PAIRS.items()}
build_contact_sheet(candidates)
