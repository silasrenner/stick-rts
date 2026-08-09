local sprite = Sprite(110, 97, ColorMode.RGB)
local blockout = sprite.layers[1]
blockout.name = "BLOCKOUT — Contact A (mid-fidelity)"
sprite:newCel(blockout, 1, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v06-contact-a-mannequin-blockout.png' })
local note = sprite:newLayer()
note.name = "GUIDE — v03 construction remains external/locked"
note.isVisible = false
note.isEditable = false
app.command.SaveFile{ filename='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v06-contact-a-mannequin-blockout.aseprite' }
app.exit()
