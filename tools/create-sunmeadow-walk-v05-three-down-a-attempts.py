from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CONTACT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v01-standing-silhouette-monochrome.png"
OUT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v05-down-a-attempts"
BOARD = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v05-three-down-a-attempts.png"
DARK, GROUND = (22, 30, 38, 255), 90

contact_alpha = Image.open(CONTACT).convert("RGBA").getchannel("A").point(lambda v: 255 if v else 0)


def split_base():
    upper = Image.new("L", (110, 97), 0); upper.paste(contact_alpha.crop((0, 0, 110, 64)), (0, 0))
    lower = Image.new("L", (110, 97), 0); lower.paste(contact_alpha.crop((0, 64, 110, 97)), (0, 64))
    return upper, lower


def base_down(upper_dx=0, upper_dy=2):
    upper, lower = split_base()
    result = lower.copy()
    result.paste(upper, (upper_dx, upper_dy), upper)
    return result


def lock_ground(alpha):
    alpha.paste(0, (0, GROUND + 1, 110, 97))
    return alpha


def attempt_a():
    """Most source-preserving: compact two-pixel drop, broad source-like knees."""
    a = base_down(); d = ImageDraw.Draw(a)
    d.polygon([(40, 61), (61, 61), (64, 69), (37, 69)], fill=255)
    d.rectangle((31, 68, 41, 83), fill=0); d.rectangle((61, 68, 71, 83), fill=0)
    d.line([(45, 65), (36, 79), (27, 89)], fill=255, width=8)
    d.line([(58, 65), (67, 79), (72, 89)], fill=255, width=8)
    d.rectangle((23, 87, 32, GROUND), fill=255); d.rectangle((68, 87, 77, GROUND), fill=255)
    return lock_ground(a)


def attempt_b():
    """Clearest compression: deliberately stepped knees with an unchanged footprint."""
    a = base_down(); d = ImageDraw.Draw(a)
    d.polygon([(40, 61), (61, 61), (63, 68), (38, 68)], fill=255)
    d.rectangle((30, 67, 43, 84), fill=0); d.rectangle((60, 67, 73, 84), fill=0)
    # Hand-authored stepped knee wedges: hip -> knee -> planted foot, no crossing.
    d.polygon([(43, 64), (50, 66), (42, 75), (38, 80), (31, 88), (23, 90), (31, 90), (40, 84), (47, 77), (52, 68)], fill=255)
    d.polygon([(55, 64), (62, 66), (70, 75), (74, 80), (81, 88), (81, 90), (72, 90), (66, 84), (59, 77), (52, 68)], fill=255)
    d.rectangle((23, 87, 32, GROUND), fill=255); d.rectangle((68, 87, 77, GROUND), fill=255)
    return lock_ground(a)


def attempt_c():
    """Guarded counterweight: torso drops 2px; sword/shield extremities lag 1px."""
    upper, lower = split_base()
    a = lower.copy()
    # Core torso/head falls two pixels; the outer weapon/shield masses lag one,
    # creating restrained arm movement instead of translating the whole guard.
    core = Image.new("L", (110, 97), 0); core.paste(upper.crop((25, 0, 69, 64)), (25, 0))
    left = Image.new("L", (110, 97), 0); left.paste(upper.crop((0, 0, 44, 64)), (0, 0))
    right = Image.new("L", (110, 97), 0); right.paste(upper.crop((69, 0, 110, 64)), (69, 0))
    a.paste(core, (0, 2), core); a.paste(left, (0, 1), left); a.paste(right, (0, 1), right)
    d = ImageDraw.Draw(a)
    d.polygon([(40, 61), (61, 61), (63, 68), (38, 68)], fill=255)
    d.rectangle((31, 68, 41, 83), fill=0); d.rectangle((61, 68, 71, 83), fill=0)
    # Slightly narrower, asymmetric knee bends retain the original guarded stance.
    d.line([(46, 65), (39, 77), (27, 89)], fill=255, width=7)
    d.line([(57, 65), (65, 78), (72, 89)], fill=255, width=7)
    d.rectangle((23, 87, 32, GROUND), fill=255); d.rectangle((68, 87, 77, GROUND), fill=255)
    return lock_ground(a)


def solid(alpha):
    image = Image.new("RGBA", (110, 97), DARK); image.putalpha(alpha); return image

attempts = (("A — SOURCE-PRESERVING", attempt_a()), ("B — CLEAR COMPRESSION", attempt_b()), ("C — GUARDED COUNTERWEIGHT", attempt_c()))
OUT.mkdir(parents=True, exist_ok=True)
solid(contact_alpha).save(OUT / "contact-a-reference.png")
for key, alpha in attempts:
    solid(alpha).save(OUT / f"down-a-{key[0].lower()}.png")

scale, w, h = 5, 550, 485
board = Image.new("RGBA", (w * 2 + 52, h * 2 + 104), "#111820"); d = ImageDraw.Draw(board)
d.text((16, 14), "SUNMEADOW WALK v05 — THREE DOWN A SILHOUETTE ATTEMPTS", fill="#F8FAFC")
d.text((16, 31), "All variants preserve source equipment sides and fixed ground contacts. Red = ground y=90.", fill="#CBD5E1")
entries = (("CONTACT A — APPROVED REFERENCE", contact_alpha),) + attempts
for i, (label, alpha) in enumerate(entries):
    x, y = 16 + (i % 2) * (w + 20), 62 + (i // 2) * (h + 24)
    for yy in range(0, h, 20):
        for xx in range(0, w, 20): d.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill="#303743" if ((xx // 20) + (yy // 20)) % 2 == 0 else "#222833")
    board.alpha_composite(solid(alpha).resize((w, h), Image.Resampling.NEAREST), (x, y))
    d.line((x, y + GROUND * scale, x + w, y + GROUND * scale), fill="#EF4444", width=2)
    d.text((x, y - 17), label, fill="#F8FAFC")
BOARD.parent.mkdir(parents=True, exist_ok=True); board.save(BOARD)
for name, alpha in attempts:
    below = sum(bool(alpha.getpixel((x, y))) for y in range(GROUND + 1, 97) for x in range(110))
    print(f"{name}: opaque={sum(bool(v) for v in alpha.get_flattened_data())}; below_ground={below}")
print(BOARD)
