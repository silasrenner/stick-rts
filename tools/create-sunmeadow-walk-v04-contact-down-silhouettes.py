from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CONTACT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v01-standing-silhouette-monochrome.png"
OUT_DIR = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v04-contact-down-silhouettes"
BOARD = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v04-contact-a-down-a-silhouette-gate.png"
DARK = (22, 30, 38, 255)
GROUND = 90

contact = Image.open(CONTACT).convert("RGBA")
contact_alpha = contact.getchannel("A").point(lambda v: 255 if v else 0)
# The approved Contact A is retained byte-for-byte.  Down A is a hand-bounded
# pose pass: upper character mass (including connected arms/equipment) drops
# two native pixels while the established contact-foot region is held to ground.
upper = Image.new("L", contact.size, 0)
upper.paste(contact_alpha.crop((0, 0, 110, 64)), (0, 0))
lower = Image.new("L", contact.size, 0)
lower.paste(contact_alpha.crop((0, 64, 110, 97)), (0, 64))
down_alpha = lower.copy()
down_alpha.paste(upper, (0, 2), upper)
# Re-shape only the two knee compression clusters from the owner-approved
# Down-A construction guide: feet retain y=90, while knees fold inward/down.
d = ImageDraw.Draw(down_alpha)
# These small opaque bridges prevent a translated upper mass leaving a seam at
# the pelvis; they follow the source's leg widths rather than creating new limbs.
d.polygon([(40, 61), (61, 61), (64, 69), (37, 69)], fill=255)
# Clean the original long straight knee strokes, retaining feet and hip mass.
d.rectangle((31, 68, 41, 83), fill=0)
d.rectangle((61, 68, 71, 83), fill=0)
# Compressed knee paths: each stays attached to its original planted foot.
d.line([(45, 65), (36, 79), (27, 89)], fill=255, width=8)
d.line([(58, 65), (67, 79), (72, 89)], fill=255, width=8)
# Restore the binary ground-contact clusters and guarantee no pixel can cross it.
d.rectangle((23, 87, 32, GROUND), fill=255)
d.rectangle((68, 87, 77, GROUND), fill=255)
down_alpha = down_alpha.crop((0, 0, 110, 97))
# Remove any accidental below-ground pixels; the user-edited guide makes y=90
# the fixed contact line for the first Down silhouette gate.
down_alpha.paste(0, (0, GROUND + 1, 110, 97))

def solid(alpha):
    image = Image.new("RGBA", alpha.size, DARK)
    image.putalpha(alpha)
    return image

OUT_DIR.mkdir(parents=True, exist_ok=True)
solid(contact_alpha).save(OUT_DIR / "frame-01-contact-a.png")
solid(down_alpha).save(OUT_DIR / "frame-02-down-a.png")
# Strict, enlarged owner-facing comparison.
scale, w, h = 5, 110 * 5, 97 * 5
board = Image.new("RGBA", (w * 2 + 52, h + 90), "#111820")
bd = ImageDraw.Draw(board)
bd.text((16, 14), "SUNMEADOW WALK v04 — CONTACT A / DOWN A SILHOUETTE GATE", fill="#F8FAFC")
bd.text((16, 31), "Full-source-character silhouettes only. Red line = fixed ground contact (y=90).", fill="#CBD5E1")
for index, (name, alpha) in enumerate((("1 CONTACT A", contact_alpha), ("2 DOWN A", down_alpha))):
    x, y = 16 + index * (w + 20), 62
    for yy in range(0, h, 20):
        for xx in range(0, w, 20):
            bd.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill="#303743" if ((xx // 20) + (yy // 20)) % 2 == 0 else "#222833")
    board.alpha_composite(solid(alpha).resize((w, h), Image.Resampling.NEAREST), (x, y))
    bd.line((x, y + GROUND * scale, x + w, y + GROUND * scale), fill="#EF4444", width=2)
    bd.text((x, y - 17), name, fill="#F8FAFC")
BOARD.parent.mkdir(parents=True, exist_ok=True)
board.save(BOARD)
print(f"contact_pixels={sum(bool(v) for v in contact_alpha.get_flattened_data())}")
print(f"down_pixels={sum(bool(v) for v in down_alpha.get_flattened_data())}")
print(f"down_below_ground={sum(bool(down_alpha.getpixel((x, y))) for y in range(GROUND + 1, 97) for x in range(110))}")
print(BOARD)
