from pathlib import Path
import colorsys
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
SOURCE_DIR = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-march-v01"
OUT_DIR = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-march-v02-three-shade-materials"
EDITABLE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-march-v02-three-shade-materials.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-march-v01-v02-three-shade-materials-comparison.png"

# Purpose-built 3-value material ramps. These are a color-design pass only:
# V01's exact geometry, alpha, and animation timing remain unchanged.
RAMPS = {
    "green": ((31, 50, 25), (76, 111, 48), (158, 184, 84)),
    "gold": ((92, 62, 18), (190, 151, 49), (247, 218, 111)),
    "steel": ((38, 54, 66), (123, 153, 169), (224, 239, 242)),
    "boot": ((45, 24, 12), (110, 62, 29), (181, 107, 51)),
}


def luminance(rgb: tuple[int, int, int]) -> float:
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def pick(ramp: tuple[tuple[int, int, int], ...], rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    value = luminance(rgb)
    return ramp[0] if value < 76 else ramp[1] if value < 160 else ramp[2]


def material_at(x: int, y: int, rgb: tuple[int, int, int]) -> str | None:
    r, g, b = rgb
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    # Boots: lower-body brown leather only. The constrained region avoids face,
    # hair, sword hilt, and the gold/green body material.
    if y >= 73 and 14 <= x <= 82 and r > g * 1.12 and g > b * 1.15 and v < 0.82:
        return "boot"
    # Steel: only the hand-held blade/guard region, so white helmet/plume pixels
    # stay part of the original character identity.
    if 5 <= x <= 43 and 6 <= y <= 62 and (s < 0.33 or (h > 0.48 and h < 0.68 and s < 0.55)) and v > 0.20:
        return "steel"
    # Gold: warm helmet / shield / trim tones. Green has a distinct higher hue.
    if 0.09 <= h <= 0.17 and s >= 0.22 and v >= 0.18:
        return "gold"
    # Cloth: woodland-to-olive greens, excluding near-black outlines.
    if 0.17 <= h <= 0.42 and s >= 0.20 and v >= 0.12:
        return "green"
    return None


def recolor(source: Image.Image) -> tuple[Image.Image, dict[str, int]]:
    result = source.copy()
    pixels = result.load()
    counts = {name: 0 for name in RAMPS}
    for y in range(result.height):
        for x in range(result.width):
            r, g, b, a = pixels[x, y]
            if not a:
                continue
            material = material_at(x, y, (r, g, b))
            if material:
                pixels[x, y] = (*pick(RAMPS[material], (r, g, b)), a)
                counts[material] += 1
    return result, counts


def make_contact_sheet(v01: list[Image.Image], v02: list[Image.Image]) -> None:
    scale = 3
    width, height = v01[0].width * scale, v01[0].height * scale
    canvas = Image.new("RGBA", (width * 4 + 80, height * 2 + 142), "#111820")
    d = ImageDraw.Draw(canvas)
    d.text((16, 14), "SUNMEADOW MARCH — V01 vs V02 THREE-SHADE MATERIAL DESIGN", fill="#F8FAFC")
    d.text((16, 31), "Green cloth, gold helmet/shield, steel blade, and leather boots use fixed dark/base/light ramps. Geometry is unchanged.", fill="#94A3B8")
    for row, (label, frames) in enumerate((("V01 — SOURCE COLORS", v01), ("V02 — THREE-SHADE MATERIAL RAMPS", v02))):
        y = 64 + row * (height + 44)
        d.text((16, y - 18), label, fill="#E5E7EB")
        for index, frame in enumerate(frames):
            x = 16 + index * (width + 16)
            for yy in range(0, height, 18):
                for xx in range(0, width, 18):
                    d.rectangle((x + xx, y + yy, x + xx + 17, y + yy + 17), fill="#303743" if ((xx // 18) + (yy // 18)) % 2 == 0 else "#222833")
            canvas.alpha_composite(frame.resize((width, height), Image.Resampling.NEAREST), (x, y))
            d.text((x, y + height + 4), f"{index + 1}", fill="#CBD5E1")
    CONTACT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(CONTACT)


v01_frames = [Image.open(SOURCE_DIR / f"frame-{index:02d}.png").convert("RGBA") for index in range(1, 5)]
OUT_DIR.mkdir(parents=True, exist_ok=True)
v02_frames = []
totals = {name: 0 for name in RAMPS}
for index, source in enumerate(v01_frames, 1):
    frame, counts = recolor(source)
    frame.save(OUT_DIR / f"frame-{index:02d}.png")
    v02_frames.append(frame)
    for material, count in counts.items():
        totals[material] += count
animated_gif = OUT_DIR / "sunmeadow-warrior-march-v02-three-shade-materials.gif"
v02_frames[0].save(animated_gif, save_all=True, append_images=v02_frames[1:], duration=140, loop=0, disposal=2, transparency=0)
run = subprocess.run([str(ASEPRITE), "--batch", str(animated_gif), "--save-as", str(EDITABLE)], capture_output=True, text=True)
if run.returncode != 0:
    raise SystemExit(run.stderr.strip() or run.stdout.strip() or "Aseprite import failed")
make_contact_sheet(v01_frames, v02_frames)
print(f"material_pixel_changes={totals}")
print(f"editable={EDITABLE.relative_to(ROOT)}")
print(f"contact={CONTACT.relative_to(ROOT)}")
