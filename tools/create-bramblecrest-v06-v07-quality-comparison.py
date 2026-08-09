from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
V06 = ROOT / "assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v06-foot-lines.png"
V07 = ROOT / "artifacts/warrior-pair-proof/bramblecrest-warrior-direct-extraction-v07-silas-edit.png"
OUT = ROOT / "artifacts/warrior-pair-proof/bramblecrest-v06-v07-silas-edit-quality-comparison.png"


def checkerboard(canvas: Image.Image, x: int, y: int, width: int, height: int) -> None:
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, height, 16):
        for xx in range(0, width, 16):
            draw.rectangle((x + xx, y + yy, x + xx + 15, y + yy + 15), fill="#303743" if ((xx // 16) + (yy // 16)) % 2 == 0 else "#222833")


v06 = Image.open(V06).convert("RGBA")
v07 = Image.open(V07).convert("RGBA")
if v06.size != v07.size:
    raise SystemExit(f"dimension mismatch: V06={v06.size} V07={v07.size}")
scale = 4
size = (v06.width * scale, v06.height * scale)
canvas = Image.new("RGBA", (size[0] * 2 + 70, size[1] + 90), "#111820")
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "BRAMBLECREST: V06 CLEANUP BASE vs V07 SILAS EDIT — QUALITY REVIEW", fill="#F8FAFC")
draw.text((16, 31), "Both shown at native pixels enlarged 4× with nearest-neighbour scaling. V07 is exported directly from the owner Aseprite document.", fill="#94A3B8")
for label, art, x in (("V06 — CLEANUP BASE", v06, 16), ("V07 — SILAS EDIT", v07, size[0] + 54)):
    checkerboard(canvas, x, 70, *size)
    canvas.alpha_composite(art.resize(size, Image.Resampling.NEAREST), (x, 70))
    draw.text((x, 52), label, fill="#E5E7EB")
OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUT)

added = removed = recolored = unchanged = 0
for left, right in zip(v06.get_flattened_data(), v07.get_flattened_data()):
    if left[3] == 0 and right[3]:
        added += 1
    elif left[3] and right[3] == 0:
        removed += 1
    elif left[3] and right[3]:
        if left[:3] == right[:3]:
            unchanged += 1
        else:
            recolored += 1
print(f"alpha_added={added} alpha_removed={removed} retained_recolored={recolored} retained_unchanged={unchanged}")
print(OUT)
