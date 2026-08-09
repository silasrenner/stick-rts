from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v15-six-pose-mannequin-blockout"
OUT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v15-six-pose-mannequin-preview.gif"
NAMES = ["CONTACT A", "DOWN A", "PASSING A", "CONTACT B", "DOWN B", "PASSING B"]
scale, w, h, ground = 5, 550, 485, 90
frames = []
for i, name in enumerate(NAMES, 1):
    sprite = Image.open(SRC / f"frame-{i:02d}-{name.lower().replace(' ', '-')}.png").convert("RGBA")
    canvas = Image.new("RGBA", (w + 32, h + 76), "#111820")
    d = ImageDraw.Draw(canvas)
    d.text((16, 12), f"SUNMEADOW MANNEQUIN WALK — {i}/6 {name}", fill="#F8FAFC")
    x, y = 16, 52
    for yy in range(0, h, 20):
        for xx in range(0, w, 20):
            d.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill="#303743" if ((xx//20)+(yy//20))%2==0 else "#222833")
    canvas.alpha_composite(sprite.resize((w, h), Image.Resampling.NEAREST), (x, y))
    d.line((x, y + ground*scale, x + w, y + ground*scale), fill="#EF4444", width=2)
    frames.append(canvas.convert("P", palette=Image.Palette.ADAPTIVE))
OUT.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=[150, 110, 150, 150, 110, 150], loop=0, disposal=2)
print(OUT)
