from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
MASTER = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-v13-three-shade-materials.png"
OUT_DIR = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-walk-v01"
EDITABLE = ROOT / "assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-walk-v01.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v13-walk-v01-contact-sheet.png"

# The shield is intentionally excluded. These hand-selected masks begin under
# the mantle, moving only the two visible lower-leg/boot clusters.
LEFT_LEG = [(46, 92), (77, 89), (84, 99), (79, 110), (77, 121), (44, 121), (42, 108)]
RIGHT_LEG = [(72, 100), (92, 98), (97, 108), (95, 121), (74, 121), (70, 111)]
MOTION = [((-2, 0), (2, 0)), ((0, -2), (0, 0)), ((2, 0), (-2, 0)), ((0, 0), (0, -2))]


def cut(source: Image.Image, polygon: list[tuple[int, int]]) -> tuple[Image.Image, Image.Image]:
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    piece = Image.new("RGBA", source.size, (0, 0, 0, 0))
    piece.paste(source, (0, 0), mask)
    return piece, mask


def erase(source: Image.Image, mask: Image.Image) -> Image.Image:
    result = source.copy()
    alpha = result.getchannel("A")
    alpha.paste(0, mask=mask)
    result.putalpha(alpha)
    return result


def moved(piece: Image.Image, dx: int, dy: int) -> Image.Image:
    result = Image.new("RGBA", piece.size, (0, 0, 0, 0))
    result.alpha_composite(piece, (dx, dy))
    return result


def contact(frames: list[Image.Image]) -> None:
    scale = 3
    w, h = frames[0].width * scale, frames[0].height * scale
    sheet = Image.new("RGBA", (w * 4 + 80, h + 94), "#111820")
    d = ImageDraw.Draw(sheet)
    d.text((16, 14), "BRAMBLECREST V13 — 4-FRAME WALK ATTEMPT v01", fill="#F8FAFC")
    d.text((16, 31), "Axe, shield, torso, face, beard and mantle remain fixed; only lower-leg/boot groups take a 2px alternating step.", fill="#94A3B8")
    for index, frame in enumerate(frames):
        x, y = 16 + index * (w + 16), 62
        for yy in range(0, h, 18):
            for xx in range(0, w, 18):
                d.rectangle((x + xx, y + yy, x + xx + 17, y + yy + 17), fill="#303743" if ((xx // 18) + (yy // 18)) % 2 == 0 else "#222833")
        sheet.alpha_composite(frame.resize((w, h), Image.Resampling.NEAREST), (x, y))
        d.text((x, 47), f"FRAME {index + 1}", fill="#E5E7EB")
    CONTACT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT)


master = Image.open(MASTER).convert("RGBA")
left, left_mask = cut(master, LEFT_LEG)
right, right_mask = cut(master, RIGHT_LEG)
body = erase(erase(master, left_mask), right_mask)
OUT_DIR.mkdir(parents=True, exist_ok=True)
frames = []
for index, (left_delta, right_delta) in enumerate(MOTION, 1):
    frame = body.copy()
    frame.alpha_composite(moved(left, *left_delta))
    frame.alpha_composite(moved(right, *right_delta))
    frame.save(OUT_DIR / f"frame-{index:02d}.png")
    frames.append(frame)
gif = OUT_DIR / "bramblecrest-warrior-walk-v01.gif"
frames[0].save(gif, save_all=True, append_images=frames[1:], duration=150, loop=0, disposal=2, transparency=0)
run = subprocess.run([str(ASEPRITE), "--batch", str(gif), "--save-as", str(EDITABLE)], capture_output=True, text=True)
if run.returncode != 0:
    raise SystemExit(run.stderr.strip() or run.stdout.strip() or "Aseprite animation import failed")
contact(frames)
print(f"frames={OUT_DIR.relative_to(ROOT)}")
print(f"editable={EDITABLE.relative_to(ROOT)}")
print(f"contact={CONTACT.relative_to(ROOT)}")
