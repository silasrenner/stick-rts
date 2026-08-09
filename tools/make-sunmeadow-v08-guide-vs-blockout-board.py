from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
GUIDES = ROOT / "artifacts/art"  # resolved below from current direct Aseprite export
GUIDE_EXPORT = ROOT / "artifacts/warrior-pair-proof/tmp-v03-current-guide"
BLOCKOUT = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v08-contact-down-a-mannequin-blockout"
OUT = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v08-stick-guide-vs-mannequin-blockout.png"

scale, w, h = 5, 550, 485
panel = Image.new("RGBA", (w * 2 + 52, h * 2 + 116), "#111820")
d = ImageDraw.Draw(panel)
d.text((16, 14), "SUNMEADOW WALK — OWNER GUIDE vs MANNEQUIN BLOCKOUT", fill="#F8FAFC")
d.text((16, 31), "Left: saved v03 construction guide. Right: v08 simplified blockout. Red = shared ground y=90.", fill="#CBD5E1")
entries = (("CONTACT A — GUIDE", GUIDE_EXPORT / "frame-01.png"), ("CONTACT A — BLOCKOUT", BLOCKOUT / "frame-01-contact-a.png"), ("DOWN A — GUIDE", GUIDE_EXPORT / "frame-02.png"), ("DOWN A — BLOCKOUT", BLOCKOUT / "frame-02-down-a.png"))
for i, (label, path) in enumerate(entries):
    image = Image.open(path).convert("RGBA")
    x, y = 16 + (i % 2) * (w + 20), 62 + (i // 2) * (h + 26)
    for yy in range(0, h, 20):
        for xx in range(0, w, 20):
            d.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill="#303743" if ((xx // 20) + (yy // 20)) % 2 == 0 else "#222833")
    panel.alpha_composite(image.resize((w, h), Image.Resampling.NEAREST), (x, y))
    d.line((x, y + 90 * scale, x + w, y + 90 * scale), fill="#EF4444", width=2)
    d.text((x, y - 17), label, fill="#F8FAFC")
OUT.parent.mkdir(parents=True, exist_ok=True)
panel.save(OUT)
print(OUT)
