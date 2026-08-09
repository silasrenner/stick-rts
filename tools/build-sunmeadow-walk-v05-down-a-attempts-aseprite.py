from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
FRAMES = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v05-down-a-attempts"
OUTPUT = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v05-down-a-attempts.aseprite"
LUA = ROOT / "tools/build-sunmeadow-walk-v05-down-a-attempts.lua"


def lua_path(path):
    return repr(path.as_posix())

files = ("contact-a-reference.png", "down-a-a.png", "down-a-b.png", "down-a-c.png")
lua = ["local sprite = Sprite(110, 97, ColorMode.RGB)", "local layer = sprite.layers[1]", "layer.name = 'SILHOUETTE — Contact A + Down A attempts'"]
for index, filename in enumerate(files, 1):
    if index > 1:
        lua.append("sprite:newFrame()")
    lua.append(f"sprite:newCel(layer, {index}, Image{{ fromFile={lua_path(FRAMES / filename)} }})")
lua.extend(["local guide = sprite:newLayer()", "guide.name = 'GUIDE — v03 construction remains external/locked'", "guide.isVisible = false", "guide.isEditable = false", f"app.command.SaveFile{{ filename={lua_path(OUTPUT)} }}", "app.exit()"])
LUA.write_text("\n".join(lua), encoding="utf-8")
result = subprocess.run([str(ASEPRITE), "--batch", "--script", str(LUA)], capture_output=True, text=True)
if result.returncode:
    raise SystemExit(result.stderr or result.stdout)
print(OUTPUT)
