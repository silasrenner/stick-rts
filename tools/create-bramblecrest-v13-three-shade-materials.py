from pathlib import Path
import colorsys
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
OUT = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-v13-three-shade-materials.png"
EDITABLE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-v13-three-shade-materials.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v06-v13-three-shade-materials-comparison.png"

# V13 follows the new Sunmeadow material-design baseline: three deliberate
# values per readable material, while preserving V06's pixel geometry exactly.
RAMPS = {
    "outline": ((20, 27, 25),),
    "leaf": ((29, 48, 27), (71, 108, 48), (142, 178, 80)),
    "wood": ((48, 27, 15), (111, 65, 34), (186, 115, 62)),
    "steel": ((40, 56, 64), (119, 149, 158), (220, 235, 232)),
    "shield_red": ((72, 28, 18), (151, 61, 35), (221, 122, 72)),
    "brass": ((80, 60, 24), (168, 139, 57), (235, 204, 112)),
    "skin": ((92, 53, 35), (177, 107, 72), (233, 166, 111)),
}


def lum(rgb: tuple[int, int, int]) -> float:
    r, g, b = rgb
    return r * 0.2126 + g * 0.7152 + b * 0.0722


def shade(material: str, rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    ramp = RAMPS[material]
    if len(ramp) == 1:
        return ramp[0]
    value = lum(rgb)
    # The source shield red is substantially darker than its brass rim. Use a
    # local red threshold so all three planned shield values are represented.
    if material == "shield_red":
        return ramp[0] if value < 48 else ramp[1] if value < 88 else ramp[2]
    return ramp[0] if value < 74 else ramp[1] if value < 162 else ramp[2]


def classify(x: int, y: int, rgb: tuple[int, int, int]) -> str | None:
    r, g, b = rgb
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    # Existing deep source linework becomes one coherent, softened ink rather
    # than thousands of near-black anti-alias colors.
    if v < 0.16:
        return "outline"
    # Shield is deliberately localized so its warm pattern cannot recolor the
    # character's hair, face, leather or axe.
    if 92 <= x <= 140 and 43 <= y <= 112:
        if h <= 0.06 or h >= 0.96:
            return "shield_red"
        if 0.08 <= h <= 0.20 or (s < 0.26 and v > 0.32):
            return "brass"
    # The axe head and its mounting hardware receive a cold three-value steel.
    if 5 <= x <= 52 and 16 <= y <= 89 and (s < 0.30 or (0.48 <= h <= 0.66 and s < 0.58)):
        return "steel"
    # Warm face values are kept distinct from the beard/hair leather family.
    if 49 <= x <= 93 and 35 <= y <= 70 and 0.02 <= h <= 0.12 and s >= 0.20 and v >= 0.24:
        return "skin"
    # Heavy boots, axe shaft, beard/hair and leather straps share a material
    # family; no source brown micro-variants survive.
    if ((y >= 102 and 42 <= x <= 104) or (5 <= x <= 58 and 35 <= y <= 94) or (0.02 <= h <= 0.12 and s >= 0.22)):
        return "wood"
    # Leafy mantle/tunic: bright enough to read as cloth, but not neon.
    if 0.17 <= h <= 0.43 and s >= 0.18:
        return "leaf"
    # Warm shield/armor accents outside the red field.
    if 0.09 <= h <= 0.19 and s >= 0.15 and v >= 0.25:
        return "brass"
    return None


def apply(source: Image.Image) -> tuple[Image.Image, dict[str, int]]:
    result = source.copy()
    pixels = result.load()
    counts = {name: 0 for name in RAMPS}
    for y in range(result.height):
        for x in range(result.width):
            r, g, b, a = pixels[x, y]
            if not a:
                continue
            material = classify(x, y, (r, g, b))
            if material:
                pixels[x, y] = (*shade(material, (r, g, b)), a)
                counts[material] += 1
    return result, counts


def contact(before: Image.Image, after: Image.Image) -> None:
    scale = 4
    w, h = before.width * scale, before.height * scale
    sheet = Image.new("RGBA", (w * 2 + 70, h + 92), "#111820")
    d = ImageDraw.Draw(sheet)
    d.text((16, 14), "BRAMBLECREST — V06 SOURCE CLEANUP vs V13 THREE-SHADE MATERIAL DESIGN", fill="#F8FAFC")
    d.text((16, 31), "Geometry and alpha preserved. Leaf cloth, wood/leather, steel axe, shield red/brass, and skin use intentional value ramps.", fill="#94A3B8")
    for label, image, x in (("V06 — SOURCE CLEANUP", before, 16), ("V13 — MATERIAL DESIGN", after, w + 54)):
        y = 62
        for yy in range(0, h, 24):
            for xx in range(0, w, 24):
                d.rectangle((x + xx, y + yy, x + xx + 23, y + yy + 23), fill="#303743" if ((xx // 24) + (yy // 24)) % 2 == 0 else "#222833")
        sheet.alpha_composite(image.resize((w, h), Image.Resampling.NEAREST), (x, y))
        d.text((x, 46), label, fill="#E5E7EB")
    CONTACT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT)


source = Image.open(V06).convert("RGBA")
result, counts = apply(source)
OUT.parent.mkdir(parents=True, exist_ok=True)
EDITABLE.parent.mkdir(parents=True, exist_ok=True)
result.save(OUT)
run = subprocess.run([str(ASEPRITE), "--batch", str(OUT), "--save-as", str(EDITABLE)], capture_output=True, text=True)
if run.returncode != 0:
    raise SystemExit(run.stderr.strip() or run.stdout.strip() or "Aseprite export failed")
contact(source, result)
print(f"material_pixels={counts}")
print(f"output={OUT.relative_to(ROOT)}")
print(f"editable={EDITABLE.relative_to(ROOT)}")
print(f"contact={CONTACT.relative_to(ROOT)}")
