from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ANIMATIONS = {
    "sunmeadow": ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-march-v02-three-shade-materials",
    "bramblecrest": ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-walk-v01",
}
OUT_DIR = ROOT / "artifacts/warrior-pair-proof"
SCALE = 5


def sheet(faction: str, directory: Path) -> Path:
    frames = [Image.open(directory / f"frame-{index:02d}.png").convert("RGBA") for index in range(1, 5)]
    cell_w, cell_h = frames[0].width * SCALE, frames[0].height * SCALE
    canvas = Image.new("RGBA", (cell_w * 2 + 66, cell_h * 2 + 116), "#111820")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 14), f"{faction.upper()} — WALK ANIMATION — FOUR FRAMES", fill="#F8FAFC")
    draw.text((16, 31), "Frames shown in playback order: 1 → 2 → 3 → 4", fill="#CBD5E1")
    for index, frame in enumerate(frames):
        x, y = 16 + (index % 2) * (cell_w + 28), 58 + (index // 2) * (cell_h + 28)
        for yy in range(0, cell_h, 20):
            for xx in range(0, cell_w, 20):
                color = "#303743" if ((xx // 20) + (yy // 20)) % 2 == 0 else "#222833"
                draw.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill=color)
        canvas.alpha_composite(frame.resize((cell_w, cell_h), Image.Resampling.NEAREST), (x, y))
        draw.text((x, y - 16), f"FRAME {index + 1}", fill="#F8FAFC")
    out = OUT_DIR / f"{faction}-walk-animation-four-frames.png"
    canvas.save(out)
    return out

OUT_DIR.mkdir(parents=True, exist_ok=True)
for faction, directory in ANIMATIONS.items():
    print(sheet(faction, directory))
