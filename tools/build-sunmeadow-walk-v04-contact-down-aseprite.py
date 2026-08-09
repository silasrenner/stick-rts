from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ASEPRITE = Path(r"C:\Program Files\Aseprite\aseprite.exe")
FRAMES = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v04-contact-down-silhouettes"
REFERENCE = ROOT / "assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-v08-three-shade-materials.png"
OUTPUT = ROOT / "assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v04-contact-down-silhouettes.aseprite"
LUA = ROOT / "tools/create-sunmeadow-walk-v04-contact-down-silhouettes.lua"


def lua_path(path):
    return repr(path.as_posix())

contact = lua_path(FRAMES / "frame-01-contact-a.png")
down = lua_path(FRAMES / "frame-02-down-a.png")
reference = lua_path(REFERENCE)
output = lua_path(OUTPUT)
lua = f'''local sprite = Sprite(110, 97, ColorMode.RGB)
local silhouette = sprite.layers[1]
silhouette.name = "SILHOUETTE — full source character"
sprite:newCel(silhouette, 1, Image{{ fromFile={contact} }})
sprite:newFrame()
sprite:newCel(silhouette, 2, Image{{ fromFile={down} }})
local reference = sprite:newLayer()
reference.name = "GUIDE — V08 static reference (locked, hidden)"
reference.isVisible = false
reference.isEditable = false
sprite:newCel(reference, 1, Image{{ fromFile={reference} }})
sprite:newCel(reference, 2, Image{{ fromFile={reference} }})
local note = sprite:newLayer()
note.name = "GUIDE — approved v03 construction is external/locked"
note.isVisible = false
note.isEditable = false
app.command.SaveFile{{ filename={output} }}
app.exit()
'''
LUA.write_text(lua, encoding="utf-8")
result = subprocess.run([str(ASEPRITE), "--batch", "--script", str(LUA)], capture_output=True, text=True)
if result.returncode:
    raise SystemExit(result.stderr or result.stdout)
print(OUTPUT)
