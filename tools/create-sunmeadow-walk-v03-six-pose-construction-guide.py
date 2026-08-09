from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
REFERENCE = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-v08-three-shade-materials.png"
GUIDE_DIR = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v03-guide-frames"
EDITABLE = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v03.aseprite"
LUA = ROOT / "tools/create-sunmeadow-walk-v03-guides.lua"
PANEL = ROOT / "artifacts/warrior-pair-proof/sunmeadow-walk-v03-six-pose-construction-guide.png"
SIZE, GROUND = (110, 97), 90
BODY, LEG_A, LEG_B, SWORD_ARM, SHIELD_ARM, WEAPON, GUIDE = "#93C5FD", "#F59E0B", "#FCD34D", "#C084FC", "#34D399", "#E2E8F0", "#64748B"

# (label, pelvis_y, leg_a knee/foot, leg_b knee/foot, sword elbow/hand, shield elbow/hand)
POSES = (
    ("1 CONTACT A", 58, ((38, 74), (27, 90)), ((63, 74), (72, 90)), ((37, 52), (27, 56)), ((67, 53), (76, 57))),
    # Down poses: both feet hold their contact positions while the pelvis drops
    # 2px and each knee folds toward its planted foot, making compression visible.
    ("2 DOWN A", 60, ((36, 79), (27, 90)), ((67, 79), (72, 90)), ((38, 55), (28, 58)), ((68, 56), (77, 59))),
    ("3 PASSING A", 57, ((49, 76), (52, 90)), ((44, 73), (39, 83)), ((37, 50), (27, 55)), ((68, 51), (77, 56))),
    ("4 CONTACT B", 58, ((57, 74), (72, 90)), ((47, 74), (27, 90)), ((37, 52), (27, 56)), ((67, 53), (76, 57))),
    ("5 DOWN B", 60, ((63, 79), (72, 90)), ((42, 79), (27, 90)), ((38, 55), (28, 58)), ((68, 56), (77, 59))),
    ("6 PASSING B", 57, ((61, 73), (66, 83)), ((53, 76), (52, 90)), ((37, 50), (27, 55)), ((68, 51), (77, 56))),
)


def line(draw, points, color, width=1):
    draw.line(points, fill=color, width=width)
    for x, y in points:
        draw.rectangle((x - 1, y - 1, x + 1, y + 1), fill=color)


def make_pose(pose):
    _, pelvis_y, (a_knee, a_foot), (b_knee, b_foot), (sword_elbow, sword_hand), (shield_elbow, shield_hand) = pose
    im = Image.new("RGBA", SIZE, (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    hip_a, hip_b = (47, pelvis_y), (57, pelvis_y)
    shoulder_a, shoulder_b = (45, pelvis_y - 15), (60, pelvis_y - 15)
    head, chest, pelvis = (53, pelvis_y - 30), (53, pelvis_y - 16), (52, pelvis_y)
    # Centerline, head, shoulder and pelvis provide the hidden gesture structure.
    line(d, [head, chest, pelvis], BODY, 2); d.ellipse((head[0] - 5, head[1] - 5, head[0] + 5, head[1] + 5), outline=BODY, width=2)
    line(d, [shoulder_a, shoulder_b], BODY, 2); line(d, [hip_a, hip_b], BODY, 2)
    # Leg colors identify ownership through the entire six-pose cycle.
    line(d, [hip_a, a_knee, a_foot], LEG_A, 2); line(d, [hip_b, b_knee, b_foot], LEG_B, 2)
    # Equipment always remains source-correct: sword arm/weapon left, shield arm/right shield.
    line(d, [shoulder_a, sword_elbow, sword_hand], SWORD_ARM, 2); line(d, [sword_hand, (15, 29)], WEAPON, 2)
    line(d, [shoulder_b, shield_elbow, shield_hand], SHIELD_ARM, 2); d.ellipse((74, 49, 88, 67), outline=SHIELD_ARM, width=2)
    # Ground and facing guide are intentionally faint, not pose art.
    d.line((10, GROUND, 100, GROUND), fill=GUIDE, width=1); d.line((52, 12, 32, 12), fill=GUIDE, width=1); d.polygon([(32, 12), (37, 9), (37, 15)], fill=GUIDE)
    return im

frames = [make_pose(pose) for pose in POSES]
GUIDE_DIR.mkdir(parents=True, exist_ok=True)
for i, frame in enumerate(frames, 1): frame.save(GUIDE_DIR / f"frame-{i:02d}.png")
reference_image = Image.open(REFERENCE).convert("RGBA")
reference_image.save(GUIDE_DIR / "v08-reference.png")
# Build an actual six-frame Aseprite guide document, with source reference locked/hidden.
lua = [
    "local sprite = Sprite(110, 97, ColorMode.RGB)",
    "local guide = sprite.layers[1]", "guide.name = 'GUIDE — six-pose construction (non-export)'",
]
for index in range(1, 7):
    if index > 1: lua.append("sprite:newFrame()")
    lua.append("sprite:newCel(guide, %d, Image{ fromFile=%r })" % (index, (GUIDE_DIR / f"frame-{index:02d}.png").as_posix()))
lua.extend(["local ref = sprite:newLayer()", "ref.name = 'GUIDE — V08 source reference (locked, hidden)'", "ref.isVisible = false", "ref.isEditable = false"])
for index in range(1, 7): lua.append("sprite:newCel(ref, %d, Image{ fromFile=%r })" % (index, (GUIDE_DIR / "v08-reference.png").as_posix()))
lua.extend(["local art = sprite:newLayer()", "art.name = 'POSE ART — empty pending guide approval'", "app.command.SaveFile{ filename=%r }" % EDITABLE.as_posix(), "app.exit()"])
LUA.write_text("\n".join(lua), encoding="utf-8")
run = subprocess.run([str(ASEPRITE), "--batch", "--script", str(LUA)], capture_output=True, text=True)
if run.returncode: raise SystemExit(run.stderr.strip() or run.stdout.strip() or "Aseprite guide creation failed")
# Phone-review panel — this is the only shared deliverable for Step 1.
scale, cell_w, cell_h = 5, SIZE[0] * 5, SIZE[1] * 5
panel = Image.new("RGBA", (cell_w * 3 + 88, cell_h * 2 + 118), "#111820"); d = ImageDraw.Draw(panel)
d.text((16, 14), "SUNMEADOW WALK v03 — STEP 1: SIX-POSE CONSTRUCTION GUIDE", fill="#F8FAFC")
d.text((16, 31), "Guide only: no silhouette, materials, or secondary motion. Purple=sword arm (left); green=shield arm (right).", fill="#CBD5E1")
for index, (pose, frame) in enumerate(zip(POSES, frames)):
    x, y = 16 + (index % 3) * (cell_w + 28), 58 + (index // 3) * (cell_h + 28)
    for yy in range(0, cell_h, 20):
        for xx in range(0, cell_w, 20): d.rectangle((x + xx, y + yy, x + xx + 19, y + yy + 19), fill="#303743" if ((xx // 20) + (yy // 20)) % 2 == 0 else "#222833")
    panel.alpha_composite(frame.resize((cell_w, cell_h), Image.Resampling.NEAREST), (x, y)); d.text((x, y - 16), pose[0], fill="#F8FAFC")
PANEL.parent.mkdir(parents=True, exist_ok=True); panel.save(PANEL)
print(f"editable={EDITABLE.relative_to(ROOT)}")
print(f"panel={PANEL.relative_to(ROOT)}")
