from collections import deque
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
PAIRS = {
    "sunmeadow": {
        "base": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v02.png",
        "clean": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v03-clean.png",
        "depth": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v04-depth.png",
        "clean_source": ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v03-clean.aseprite",
        "depth_source": ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v04-depth.aseprite",
    },
    "bramblecrest": {
        "base": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.png",
        "clean": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v03-clean.png",
        "depth": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v04-depth.png",
        "clean_source": ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v03-clean.aseprite",
        "depth_source": ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v04-depth.aseprite",
    },
}


def clear_rectangle(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    pixels = image.load()
    for y in range(max(0, box[1]), min(image.height, box[3])):
        for x in range(max(0, box[0]), min(image.width, box[2])):
            pixels[x, y] = (0, 0, 0, 0)


def remove_detached_components(image: Image.Image) -> None:
    """Clear residual scenery fragments while retaining the connected warrior."""
    alpha = image.getchannel("A")
    width, height = image.size
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            if (x, y) in visited or not alpha.getpixel((x, y)):
                continue
            component: list[tuple[int, int]] = []
            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited.add((x, y))
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited and alpha.getpixel((nx, ny)):
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            components.append(component)
    if not components:
        return
    warrior = max(components, key=len)
    warrior_pixels = set(warrior)
    pixels = image.load()
    for component in components:
        if component is warrior:
            continue
        for x, y in component:
            pixels[x, y] = (0, 0, 0, 0)


def create_clean(faction: str, base: Image.Image) -> Image.Image:
    clean = base.copy()
    if faction == "sunmeadow":
        # Grass/dirt has no place in a walking unit sprite. These regions are
        # outside the boots and clear source scenery only.
        clear_rectangle(clean, (0, 48, 24, 83))  # detached source-scene sliver left of the sword
        clear_rectangle(clean, (0, 83, 33, clean.height))
        clear_rectangle(clean, (0, 90, clean.width, clean.height))
        # Remove the remaining low grass blades by their source-scene hue while
        # retaining the brown/gold boot pixels directly above them.
        pixels = clean.load()
        for y in range(84, clean.height):
            for x in range(clean.width):
                red, green, blue, alpha = pixels[x, y]
                if alpha and green > 48 and green > red * 1.12 and green > blue * 1.08:
                    pixels[x, y] = (0, 0, 0, 0)
        clear_rectangle(clean, (102, 81, clean.width, clean.height))
    else:
        # The upper-right object is detached from the shield and the low
        # scatter is source-scene dirt, not character anatomy.
        clear_rectangle(clean, (104, 16, 126, 41))
        clear_rectangle(clean, (0, 113, 63, clean.height))
        clear_rectangle(clean, (98, 121, 128, clean.height))
        clear_rectangle(clean, (152, 113, clean.width, clean.height))
        clear_rectangle(clean, (0, 121, clean.width, clean.height))
    remove_detached_components(clean)
    return clean


def create_depth(clean: Image.Image) -> Image.Image:
    # A selective grade, not a palette replacement: dark occlusion clusters
    # deepen and existing high-value metal/gold clusters lift slightly.
    result = clean.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if not alpha:
                continue
            luma = (red * 54 + green * 183 + blue * 19) // 256
            if luma < 92:
                red, green, blue = (round(red * 0.82), round(green * 0.82), round(blue * 0.82))
            elif luma > 166:
                red = min(255, round(red + (255 - red) * 0.15))
                green = min(255, round(green + (255 - green) * 0.15))
                blue = min(255, round(blue + (255 - blue) * 0.15))
            pixels[x, y] = (red, green, blue, alpha)
    return result


def export_editable(png: Path, aseprite: Path) -> None:
    aseprite.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run([str(ASEPRITE), "--batch", str(png), "--save-as", str(aseprite)], capture_output=True, text=True)
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or f"Aseprite export failed for {png.name}")


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 8):
        for xx in range(0, width, 8):
            color = "#303743" if ((xx // 8) + (yy // 8)) % 2 == 0 else "#222833"
            draw.rectangle((x + xx, y + yy, x + xx + 7, y + yy + 7), fill=color)


def preview(image: Image.Image) -> Image.Image:
    result = image.copy()
    result.thumbnail((190, 260), Image.Resampling.NEAREST)
    return result


def contact_sheet(images: dict[str, dict[str, Image.Image]]) -> None:
    sheet = Image.new("RGBA", (920, 690), "#111820")
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 13), "DIRECT EXTRACTION CLEANUP + DEPTH REVIEW", fill="#F8FAFC")
    draw.text((16, 31), "V02: literal extraction  |  V03: debris/prop cleanup  |  V04: restrained selective depth grade", fill="#94A3B8")
    labels = [("V02 DIRECT", "base"), ("V03 CLEAN", "clean"), ("V04 DEPTH", "depth")]
    for row, faction in enumerate(("sunmeadow", "bramblecrest")):
        y = 85 + row * 300
        draw.text((16, y), faction.upper(), fill="#E5E7EB")
        for index, (label, key) in enumerate(labels):
            x = 20 + index * 300
            image = preview(images[faction][key])
            checkerboard(sheet, x, y + 27, 250, 250)
            sheet.alpha_composite(image, (x + (250 - image.width) // 2, y + 27 + (250 - image.height) // 2))
            draw.text((x, y + 280), label, fill="#CBD5E1")
    output = ROOT / "artifacts/warrior-pair-proof/warrior-clean-depth-v03-v04-contact-sheet.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)
    print(f"Created {output.relative_to(ROOT)}")


images: dict[str, dict[str, Image.Image]] = {}
for faction, paths in PAIRS.items():
    base = Image.open(paths["base"]).convert("RGBA")
    clean = create_clean(faction, base)
    depth = create_depth(clean)
    paths["clean"].parent.mkdir(parents=True, exist_ok=True)
    clean.save(paths["clean"])
    depth.save(paths["depth"])
    export_editable(paths["clean"], paths["clean_source"])
    export_editable(paths["depth"], paths["depth_source"])
    images[faction] = {"base": base, "clean": clean, "depth": depth}
    print(f"Created V03/V04 candidates for {faction}")
contact_sheet(images)
