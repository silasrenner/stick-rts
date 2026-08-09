from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
MASTER = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v07-perimeter.png"
OUT_DIR = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-march-v01"
EDITABLE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-march-v01.aseprite"
CONTACT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-v07-march-v01-contact-sheet.png"

# Hand-selected lower-body masks from V07. The shield, torso, face, plume, and sword
# stay untouched; only the two visible lower-leg/boot clusters take a 1–2 pixel march.
LEFT_LEG = [(28, 71), (52, 68), (57, 73), (53, 82), (49, 89), (27, 90), (24, 84)]
RIGHT_LEG = [(57, 76), (69, 73), (77, 78), (81, 89), (78, 91), (59, 91), (56, 85)]
FRAME_MOTION = [((-1, 0), (1, 0)), ((0, -1), (0, 0)), ((1, 0), (-1, 0)), ((0, 0), (0, -1))]


def extract_masked(source: Image.Image, points: list[tuple[int, int]]) -> tuple[Image.Image, Image.Image]:
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    piece = Image.new("RGBA", source.size, (0, 0, 0, 0))
    piece.paste(source, (0, 0), mask)
    return piece, mask


def shift(piece: Image.Image, dx: int, dy: int) -> Image.Image:
    moved = Image.new("RGBA", piece.size, (0, 0, 0, 0))
    moved.alpha_composite(piece, (dx, dy))
    return moved


def clear_mask(image: Image.Image, mask: Image.Image) -> Image.Image:
    result = image.copy()
    alpha = result.getchannel("A")
    alpha.paste(0, mask=mask)
    result.putalpha(alpha)
    return result


def make_contact_sheet(frames: list[Image.Image]) -> None:
    scale = 4
    cell_w, cell_h = frames[0].width * scale, frames[0].height * scale
    sheet = Image.new("RGBA", (cell_w * 4 + 80, cell_h + 92), "#111820")
    d = ImageDraw.Draw(sheet)
    d.text((16, 14), "SUNMEADOW WARRIOR — 4-FRAME MARCH ATTEMPT v01", fill="#F8FAFC")
    d.text((16, 31), "V07 master preserved above the legs; only lower-leg/boot clusters move 1–2 native pixels.", fill="#94A3B8")
    for index, frame in enumerate(frames):
        x, y = 16 + index * (cell_w + 16), 62
        for row in range(0, cell_h, 24):
            for col in range(0, cell_w, 24):
                color = "#303743" if (row // 24 + col // 24) % 2 == 0 else "#222833"
                d.rectangle((x + col, y + row, x + col + 23, y + row + 23), fill=color)
        sheet.alpha_composite(frame.resize((cell_w, cell_h), Image.Resampling.NEAREST), (x, y))
        d.text((x, 46), f"FRAME {index + 1}", fill="#E5E7EB")
    CONTACT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT)


master = Image.open(MASTER).convert("RGBA")
left, left_mask = extract_masked(master, LEFT_LEG)
right, right_mask = extract_masked(master, RIGHT_LEG)
body = clear_mask(clear_mask(master, left_mask), right_mask)
OUT_DIR.mkdir(parents=True, exist_ok=True)
frames = []
for index, (left_delta, right_delta) in enumerate(FRAME_MOTION):
    frame = body.copy()
    frame.alpha_composite(shift(left, *left_delta))
    frame.alpha_composite(shift(right, *right_delta))
    destination = OUT_DIR / f"frame-{index + 1:02d}.png"
    frame.save(destination)
    frames.append(frame)

animated_gif = OUT_DIR / "sunmeadow-warrior-march-v01.gif"
frames[0].save(animated_gif, save_all=True, append_images=frames[1:], duration=140, loop=0, disposal=2, transparency=0)
result = subprocess.run([str(ASEPRITE), "--batch", str(animated_gif), "--save-as", str(EDITABLE)], capture_output=True, text=True)
if result.returncode != 0:
    raise SystemExit(result.stderr.strip() or result.stdout.strip() or "Aseprite animation import failed")
make_contact_sheet(frames)
print(f"master={MASTER.relative_to(ROOT)}")
print(f"frames={OUT_DIR.relative_to(ROOT)}")
print(f"editable={EDITABLE.relative_to(ROOT)}")
print(f"contact={CONTACT.relative_to(ROOT)}")
