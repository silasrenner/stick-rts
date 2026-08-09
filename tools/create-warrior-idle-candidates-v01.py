from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
SIZE = 96
GROUND_Y = 84


def pixel_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def sunmeadow() -> Image.Image:
    image, d = pixel_canvas()
    outline = "#111820"
    cloth_shadow = "#25291C"
    cloak_dark = "#3B4B1E"
    cloak = "#4B5B2E"
    gold_shadow = "#65542F"
    gold = "#81754A"
    highlight = "#BCA976"
    skin = "#A27B50"

    # Grounded boots and legs — the feet intentionally touch y=84.
    d.rectangle((34, 79, 42, 84), fill=outline)
    d.rectangle((52, 79, 60, 84), fill=outline)
    d.rectangle((36, 75, 41, 80), fill=gold_shadow)
    d.rectangle((53, 74, 58, 80), fill=gold_shadow)
    d.rectangle((36, 62, 42, 75), fill=cloak_dark)
    d.rectangle((52, 62, 58, 74), fill=cloak)

    # Cloak, torso and gold-rimmed shield: source-derived green/gold identity.
    d.polygon([(32, 46), (45, 42), (57, 45), (62, 65), (58, 75), (33, 75), (29, 65)], fill=outline)
    d.polygon([(34, 48), (45, 45), (55, 48), (59, 65), (56, 72), (34, 72), (32, 64)], fill=cloak)
    d.rectangle((36, 50, 54, 69), fill=cloak_dark)
    d.rectangle((40, 47, 51, 70), fill=cloak)
    d.rectangle((39, 55, 53, 70), fill=gold_shadow)
    d.rectangle((41, 56, 53, 68), fill=gold)
    d.rectangle((43, 58, 51, 67), fill=highlight)
    d.rectangle((46, 57, 48, 69), fill=gold_shadow)
    d.rectangle((41, 62, 53, 64), fill=gold_shadow)

    # Helmeted head and visible face.
    d.rectangle((37, 31, 53, 45), fill=outline)
    d.rectangle((39, 33, 51, 44), fill=skin)
    d.rectangle((39, 30, 51, 34), fill=gold_shadow)
    d.rectangle((41, 29, 50, 31), fill=gold)
    d.rectangle((42, 36, 50, 38), fill=outline)
    d.rectangle((47, 39, 50, 42), fill=highlight)

    # Sword reads at small scale without exceeding the silhouette too much.
    d.line((57, 53, 67, 38), fill=outline, width=3)
    d.line((59, 52, 67, 39), fill=highlight, width=1)
    d.rectangle((55, 53, 62, 55), fill=gold)
    d.rectangle((61, 36, 68, 39), fill=outline)
    d.rectangle((64, 34, 67, 37), fill=highlight)
    return image


def bramblecrest() -> Image.Image:
    image, d = pixel_canvas()
    outline = "#151C24"
    deep_brown = "#201612"
    wood = "#4C3022"
    leaf_dark = "#574937"
    leaf = "#736851"
    iron = "#9D8368"
    metal = "#B0A286"
    warm = "#BE8D65"

    # Wider grounded stance for the Warden silhouette.
    d.rectangle((29, 80, 39, 84), fill=outline)
    d.rectangle((53, 80, 63, 84), fill=outline)
    d.rectangle((31, 72, 39, 80), fill=deep_brown)
    d.rectangle((54, 72, 62, 80), fill=wood)
    d.rectangle((31, 64, 40, 73), fill=leaf_dark)
    d.rectangle((53, 63, 62, 73), fill=leaf)

    # Heavy leafy mantle and torso.
    d.polygon([(27, 47), (42, 43), (58, 45), (68, 55), (65, 72), (58, 77), (28, 76), (23, 65)], fill=outline)
    d.polygon([(29, 49), (42, 46), (56, 48), (65, 56), (62, 71), (56, 74), (30, 73), (26, 64)], fill=leaf_dark)
    d.rectangle((36, 48, 57, 72), fill=leaf)
    d.rectangle((39, 51, 55, 72), fill=wood)
    d.rectangle((42, 53, 54, 70), fill=iron)
    d.rectangle((44, 54, 53, 68), fill=metal)

    # Round shield made from stepped pixels, retaining Warden read.
    d.polygon([(22, 52), (29, 47), (37, 47), (43, 53), (43, 65), (37, 72), (28, 72), (21, 66)], fill=outline)
    d.polygon([(24, 54), (30, 50), (36, 50), (40, 55), (40, 64), (35, 69), (29, 69), (24, 65)], fill=wood)
    d.rectangle((28, 57, 39, 63), fill=iron)
    d.rectangle((31, 54, 35, 68), fill=iron)
    d.rectangle((32, 58, 35, 62), fill=metal)

    # Beard/helmet face block.
    d.rectangle((37, 30, 54, 46), fill=outline)
    d.rectangle((39, 33, 52, 43), fill=warm)
    d.rectangle((38, 29, 52, 34), fill=iron)
    d.rectangle((41, 28, 50, 31), fill=metal)
    d.rectangle((39, 39, 53, 45), fill=deep_brown)
    d.rectangle((43, 36, 51, 38), fill=outline)

    # Axe and wood handle, deliberately tall and readable.
    d.line((61, 70, 71, 39), fill=outline, width=4)
    d.line((62, 69, 70, 40), fill=wood, width=2)
    d.polygon([(67, 37), (77, 36), (80, 43), (72, 47), (67, 45)], fill=outline)
    d.polygon([(69, 39), (76, 38), (77, 42), (71, 44)], fill=metal)
    return image


def save_editable(faction: str, image: Image.Image) -> tuple[Path, Path]:
    directory = ROOT / "assets/art/runtime-candidates" / faction / "warrior"
    editable = ROOT / "assets/art/editable" / faction / "warrior"
    directory.mkdir(parents=True, exist_ok=True)
    editable.mkdir(parents=True, exist_ok=True)
    png = directory / f"{faction}-warrior-idle-v01.png"
    source = editable / f"{faction}-warrior-idle-candidate-v01.aseprite"
    image.save(png)
    result = subprocess.run(
        [str(ASEPRITE), "--batch", str(png), "--save-as", str(source)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or f"Aseprite failed for {faction}")
    return png, source


def checkerboard(canvas: Image.Image, x: int, y: int, scale: int = 2) -> None:
    d = ImageDraw.Draw(canvas)
    cell = 8 * scale
    for row in range(12):
        for col in range(12):
            color = "#2B303B" if (row + col) % 2 == 0 else "#222731"
            d.rectangle((x + col * cell, y + row * cell, x + (col + 1) * cell - 1, y + (row + 1) * cell - 1), fill=color)


def create_contact_sheet(images: dict[str, Image.Image]) -> None:
    scale = 2
    sheet = Image.new("RGBA", (448, 252), "#111820")
    d = ImageDraw.Draw(sheet)
    d.text((16, 12), "WARRIOR IDLE KEY-POSE CANDIDATES v01", fill="#E5E7EB")
    d.text((16, 28), "96x96 • shared ground anchor y=84 • source-derived draft only", fill="#94A3B8")
    slots = {"sunmeadow": (20, 64), "bramblecrest": (236, 64)}
    labels = {"sunmeadow": ("SUNMEADOW", "green / gold shield warrior"), "bramblecrest": ("BRAMBLECREST", "woodland axe / shield Warden")}
    for faction, (x, y) in slots.items():
        checkerboard(sheet, x, y, scale)
        enlarged = images[faction].resize((192, 192), Image.Resampling.NEAREST)
        sheet.alpha_composite(enlarged, (x, y))
        guide_y = y + GROUND_Y * scale
        d.line((x, guide_y, x + 191, guide_y), fill="#38BDF8", width=1)
        d.text((x, 46), labels[faction][0], fill="#F8FAFC")
        d.text((x, 238), labels[faction][1], fill="#94A3B8")
    path = ROOT / "artifacts/warrior-pair-proof/warrior-idle-scale-anchor-v01.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)
    print(f"Created {path.relative_to(ROOT)}")


images = {"sunmeadow": sunmeadow(), "bramblecrest": bramblecrest()}
for faction, image in images.items():
    png, source = save_editable(faction, image)
    print(f"Created {png.relative_to(ROOT)} and {source.relative_to(ROOT)}")
create_contact_sheet(images)
