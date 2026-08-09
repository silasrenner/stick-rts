from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
REFERENCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-reference-backdrop.png"
CANDIDATE = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-grid-redraw.png"
SOURCE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v08-grid-redraw.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v06-v08-grid-redraw-comparison.png"

# Deliberate 20-color palette. The V08 art uses only these opaque colors.
P = {
    "outline": "#171413", "deep": "#2A211C",
    "hair_dark": "#3A241A", "hair": "#704126", "hair_light": "#B86B37",
    "skin_shadow": "#6B4030", "skin": "#A96C4E", "skin_light": "#D89A69",
    "green_dark": "#273A2E", "green": "#415E3C", "green_light": "#6D8652",
    "leather_dark": "#4C2E22", "leather": "#7B4B2D", "leather_light": "#A96B3D",
    "metal_dark": "#3B4749", "metal": "#758489", "metal_light": "#C8D3C8", "bright": "#EEF5E8",
    "red_dark": "#542027", "red": "#8D3034", "red_light": "#C65348",
}


def polygon(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], color: str) -> None:
    draw.polygon(points, fill=P[color])


def rectangle(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: str) -> None:
    draw.rectangle(box, fill=P[color])


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            color = "#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833"
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill=color)


# V06 is retained as a low-opacity, nearest-neighbour reference backdrop.
source = Image.open(V06).convert("RGBA")
source.thumbnail((112, 104), Image.Resampling.NEAREST)
backdrop = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
source.putalpha(source.getchannel("A").point(lambda value: value * 75 // 255))
backdrop.alpha_composite(source, ((128 - source.width) // 2, 112 - source.height))
REFERENCE.parent.mkdir(parents=True, exist_ok=True)
backdrop.save(REFERENCE)

image = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
d = ImageDraw.Draw(image)

# Axe sits behind the Warden: a dark outer contour, wood shaft, and three metal planes.
# The shaft visibly joins the head to the Warden's left hand; keep it a single
# uninterrupted dark/wood cluster rather than a detached prop.
polygon(d, [(25, 39), (32, 39), (47, 71), (40, 75)], "outline")
d.line((28, 40, 44, 72), fill=P["leather"], width=3)
rectangle(d, (40, 68, 47, 75), "skin_shadow")
rectangle(d, (42, 69, 46, 73), "skin")
polygon(d, [(11, 20), (26, 18), (37, 27), (34, 40), (25, 46), (12, 40), (6, 31)], "outline")
polygon(d, [(13, 23), (25, 22), (33, 28), (30, 37), (23, 41), (13, 37), (10, 31)], "metal_dark")
polygon(d, [(16, 24), (25, 24), (30, 29), (27, 34), (19, 35), (13, 31)], "metal")
polygon(d, [(17, 25), (24, 25), (27, 28), (20, 29)], "metal_light")
rectangle(d, (11, 31, 16, 35), "bright")

# Rear leafy mantle is broad and quiet: three clusters only, light from upper-left.
polygon(d, [(39, 56), (51, 48), (76, 50), (94, 68), (91, 96), (80, 106), (47, 106), (34, 91)], "outline")
polygon(d, [(41, 59), (53, 52), (74, 54), (89, 70), (86, 94), (78, 102), (48, 102), (38, 89)], "green_dark")
polygon(d, [(44, 61), (56, 54), (70, 57), (80, 69), (75, 86), (52, 88), (42, 79)], "green")
polygon(d, [(48, 61), (59, 55), (68, 58), (60, 65), (53, 72), (45, 72)], "green_light")
polygon(d, [(77, 73), (86, 74), (84, 88), (76, 94)], "green")

# Grounded legs/boots: compact dark blocks; y=112 is the common foot anchor.
polygon(d, [(45, 85), (59, 86), (60, 103), (55, 108), (43, 108)], "outline")
polygon(d, [(47, 88), (56, 89), (56, 102), (52, 104), (46, 103)], "green_dark")
polygon(d, [(65, 85), (79, 85), (83, 104), (78, 109), (66, 108)], "outline")
polygon(d, [(68, 88), (76, 88), (79, 103), (75, 105), (69, 103)], "green")
polygon(d, [(39, 103), (56, 103), (61, 109), (59, 113), (38, 113)], "outline")
polygon(d, [(42, 105), (55, 105), (57, 109), (55, 110), (41, 110)], "leather_dark")
polygon(d, [(65, 104), (81, 104), (86, 110), (84, 113), (64, 113)], "outline")
polygon(d, [(68, 106), (79, 106), (82, 110), (79, 110), (67, 110)], "leather")

# Torso: large cloth and leather planes, no painterly microtexture.
polygon(d, [(45, 56), (69, 54), (86, 67), (81, 92), (69, 99), (47, 91), (39, 73)], "outline")
polygon(d, [(47, 59), (67, 57), (81, 69), (77, 89), (68, 95), (49, 88), (43, 73)], "green")
polygon(d, [(49, 61), (61, 58), (67, 65), (59, 76), (46, 75)], "green_light")
polygon(d, [(58, 75), (77, 71), (76, 89), (67, 93), (56, 87)], "green_dark")
polygon(d, [(51, 81), (74, 79), (76, 87), (53, 88)], "leather_dark")
rectangle(d, (56, 81, 70, 85), "leather")
rectangle(d, (61, 80, 65, 86), "metal")

# Shield: dark outline -> silver rim -> deep-red field -> single dark geometry + rare highlights.
polygon(d, [(85, 55), (102, 52), (115, 61), (120, 78), (116, 96), (104, 106), (88, 102), (80, 89), (80, 68)], "outline")
polygon(d, [(87, 58), (101, 56), (112, 63), (116, 78), (112, 93), (102, 102), (90, 98), (84, 87), (84, 69)], "metal_dark")
polygon(d, [(88, 60), (100, 58), (109, 65), (113, 78), (109, 91), (101, 98), (91, 95), (87, 85), (87, 70)], "metal")
polygon(d, [(91, 63), (100, 61), (106, 67), (109, 78), (105, 89), (100, 94), (93, 91), (90, 83), (90, 70)], "red_dark")
polygon(d, [(94, 65), (100, 64), (104, 69), (104, 87), (99, 91), (94, 87)], "red")
polygon(d, [(92, 69), (96, 67), (98, 76), (95, 80)], "red_light")
polygon(d, [(101, 67), (106, 72), (106, 84), (102, 88)], "deep")
rectangle(d, (97, 74, 102, 81), "metal_dark")
rectangle(d, (98, 75, 100, 79), "metal_light")
rectangle(d, (88, 65, 90, 75), "metal_light")
rectangle(d, (91, 59, 98, 61), "bright")
rectangle(d, (110, 78, 112, 84), "metal_light")

# Helmet, face, hair, and beard: four readable hair clusters, three skin planes.
polygon(d, [(49, 29), (59, 21), (74, 24), (82, 35), (78, 55), (67, 62), (51, 55), (45, 42)], "outline")
polygon(d, [(52, 31), (60, 24), (72, 27), (78, 36), (74, 52), (66, 57), (53, 52), (49, 41)], "hair_dark")
polygon(d, [(55, 29), (61, 25), (68, 28), (63, 35), (55, 36)], "hair")
polygon(d, [(69, 28), (75, 34), (73, 40), (66, 35)], "hair")
polygon(d, [(51, 38), (59, 36), (57, 45), (51, 47)], "hair")
polygon(d, [(73, 42), (76, 45), (71, 53), (66, 51)], "hair_light")
polygon(d, [(57, 34), (70, 34), (73, 44), (68, 49), (58, 47), (54, 41)], "skin_shadow")
polygon(d, [(59, 35), (69, 36), (70, 43), (66, 47), (59, 44)], "skin")
polygon(d, [(60, 35), (66, 36), (65, 39), (60, 40)], "skin_light")
rectangle(d, (64, 39, 67, 41), "outline")
polygon(d, [(55, 44), (69, 46), (74, 54), (68, 61), (55, 56)], "hair_dark")
polygon(d, [(58, 47), (67, 49), (69, 55), (64, 58), (58, 54)], "hair")
polygon(d, [(60, 48), (65, 50), (64, 53), (59, 52)], "hair_light")

# Small shoulder metal highlight, deliberately rare.
rectangle(d, (45, 61, 49, 66), "metal")
rectangle(d, (45, 61, 47, 63), "metal_light")

CANDIDATE.parent.mkdir(parents=True, exist_ok=True)
SOURCE.parent.mkdir(parents=True, exist_ok=True)
image.save(CANDIDATE)
result = subprocess.run([str(ASEPRITE), "--batch", str(CANDIDATE), "--save-as", str(SOURCE)], capture_output=True, text=True)
if result.returncode != 0:
    raise SystemExit(result.stderr.strip() or result.stdout.strip() or "Aseprite V08 conversion failed")

# Paired review: retain the old source on the left for provenance, new grid art on the right.
canvas = Image.new("RGBA", (1160, 670), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "BRAMBLECREST: V06 SOURCE CLEANUP vs V08 128px PALETTE/CLUSTER REDRAW", fill="#F8FAFC")
draw.text((16, 31), "V08 uses the V06 extraction as a low-opacity reference backdrop, then rebuilds the warrior on a hard 128×128 grid.", fill="#94A3B8")
left = V06
left_image = Image.open(left).convert("RGBA")
left_image.thumbnail((510, 510), Image.Resampling.NEAREST)
for label, art, x in (("V06 SOURCE CLEANUP", left_image, 30), ("V08 GRID REDRAW — 20 COLORS", image.resize((512, 512), Image.Resampling.NEAREST), 620)):
    checkerboard(canvas, x, 80, 510, 510)
    canvas.alpha_composite(art, (x + (510 - art.width) // 2, 80 + (510 - art.height) // 2))
    draw.text((x, 58), label, fill="#E5E7EB")
draw.text((620, 610), "Light direction: upper-left ↘   •   hard pixel clusters only   •   no smoothing", fill="#94A3B8")
CONTACT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(CONTACT)
print(f"Created {REFERENCE.relative_to(ROOT)}")
print(f"Created {CANDIDATE.relative_to(ROOT)}")
print(f"Created {SOURCE.relative_to(ROOT)}")
print(f"Created {CONTACT.relative_to(ROOT)}")
