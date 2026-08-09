from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
SOURCE = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-v08-three-shade-materials.png"
LAYER_DIR = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01-layers"
EDITABLE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01.aseprite"
EXPORT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v01-standing-silhouette.png"
CONTACT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v01-standing-silhouette.png"
LUA = ROOT / "tools/create-sunmeadow-walk-v01-layered.lua"

# This is a single orientation/relationship gate, not a material pass. The actual
# V08 alpha silhouette anchors the result; flat areas make weapon-side and arm
# connections inspectable before any walking poses exist.
INK = (22, 33, 42, 255)
BODY = (102, 147, 70, 255)
ARM = (75, 112, 53, 255)
LEG = (112, 75, 38, 255)
SHIELD = (201, 169, 74, 255)
SWORD = (183, 210, 219, 255)

source = Image.open(SOURCE).convert("RGBA")
alpha = source.getchannel("A")
width, height = source.size
LAYER_DIR.mkdir(parents=True, exist_ok=True)


def polygon_mask(points):
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return Image.composite(alpha, Image.new("L", source.size, 0), mask)


def intersection(*masks):
    result = masks[0]
    for mask in masks[1:]:
        result = Image.composite(result, Image.new("L", source.size, 0), mask)
    return result


def solid(mask, color, name):
    image = Image.new("RGBA", source.size, color)
    image.putalpha(mask)
    image.save(LAYER_DIR / name)

# Source orientation has been visually audited: sword + arm are screen-left;
# shield + arm are screen-right. The masks stay inside the existing V08 alpha.
# Narrow, source-oriented component masks: the screen-left blade is deliberately
# slender so the sword arm remains visible from shoulder through hand. Likewise,
# the shield-side arm remains visible at its inner edge before entering the shield.
sword = polygon_mask([(34, 57), (42, 53), (31, 38), (19, 19), (10, 20), (21, 40), (27, 55)])
sword_arm = polygon_mask([(49, 44), (40, 44), (31, 51), (33, 60), (43, 64), (54, 57)])
shield = polygon_mask([(69, 43), (100, 43), (100, 82), (69, 82)])
shield_arm = polygon_mask([(53, 44), (64, 46), (73, 56), (68, 66), (57, 62), (51, 54)])
legs = polygon_mask([(29, 64), (80, 64), (80, 97), (29, 97)])

# Use the source alpha as the broad body read. Component layers are then overlaid
# in deliberate screen-space order; the outer contour is a separate ink layer.
outline_alpha = alpha.filter(ImageFilter.MaxFilter(3))
solid(outline_alpha, INK, "01-outline.png")
solid(alpha, BODY, "02-torso-head.png")
solid(legs, LEG, "03-legs.png")
solid(sword_arm, ARM, "04-sword-arm-left.png")
solid(shield_arm, ARM, "05-shield-arm-right.png")
solid(sword, SWORD, "06-sword-left.png")
solid(shield, SHIELD, "07-shield-right.png")
source.save(LAYER_DIR / "00-guide-v08-reference.png")

# Build a one-frame layered Aseprite source. The V08 reference is included but
# hidden/locked; all exported visible art is in independently named pose layers.
paths = [
    ("Guide — V08 reference (locked, hidden)", "00-guide-v08-reference.png", True),
    ("Outline", "01-outline.png", False),
    ("Torso + head", "02-torso-head.png", False),
    ("Legs", "03-legs.png", False),
    ("Sword arm — left", "04-sword-arm-left.png", False),
    ("Shield arm — right", "05-shield-arm-right.png", False),
    ("Sword — left", "06-sword-left.png", False),
    ("Shield — right", "07-shield-right.png", False),
]
# Lua strings use forward slashes to avoid escaping Windows separators.
lua_lines = [
    "local sprite = Sprite(%d, %d, ColorMode.RGB)" % (width, height),
    "sprite.layers[1].name = 'Placeholder'",
    "sprite:deleteLayer(sprite.layers[1])",
]
for name, filename, hidden in paths:
    full = (LAYER_DIR / filename).as_posix()
    lua_lines.extend([
        "local layer = sprite:newLayer()",
        "layer.name = %r" % name,
        "local image = Image{ fromFile=%r }" % full,
        "sprite:newCel(layer, 1, image)",
    ])
    if hidden:
        lua_lines.extend(["layer.isVisible = false", "layer.isEditable = false"])
lua_lines.extend([
    "app.command.SaveFile{ filename=%r }" % EDITABLE.as_posix(),
    "app.exit()",
])
LUA.write_text("\n".join(lua_lines), encoding="utf-8")
run = subprocess.run([str(ASEPRITE), "--batch", "--script", str(LUA)], capture_output=True, text=True)
if run.returncode != 0:
    raise SystemExit(run.stderr.strip() or run.stdout.strip() or "Aseprite layered-source creation failed")
run = subprocess.run([str(ASEPRITE), "--batch", str(EDITABLE), "--save-as", str(EXPORT)], capture_output=True, text=True)
if run.returncode != 0:
    raise SystemExit(run.stderr.strip() or run.stdout.strip() or "Aseprite export failed")

# Enlarged transparent-checker review board, one pose only.
image = Image.open(EXPORT).convert("RGBA")
scale = 5
board = Image.new("RGBA", (image.width * scale + 40, image.height * scale + 78), "#111820")
d = ImageDraw.Draw(board)
d.text((16, 14), "SUNMEADOW WALK v01 — STANDING / CONTACT SILHOUETTE GATE", fill="#F8FAFC")
d.text((16, 31), "Correct orientation: sword + visible sword arm left; shield + shield arm right. No walk motion or material shading.", fill="#CBD5E1")
x, y = 20, 58
for yy in range(0, image.height * scale, 20):
    for xx in range(0, image.width * scale, 20):
        d.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill="#303743" if ((xx // 20) + (yy // 20)) % 2 == 0 else "#222833")
board.alpha_composite(image.resize((image.width * scale, image.height * scale), Image.Resampling.NEAREST), (x, y))
CONTACT.parent.mkdir(parents=True, exist_ok=True)
board.save(CONTACT)
print(f"editable={EDITABLE.relative_to(ROOT)}")
print(f"export={EXPORT.relative_to(ROOT)}")
print(f"contact={CONTACT.relative_to(ROOT)}")
