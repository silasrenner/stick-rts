local sprite = Sprite(110, 97, ColorMode.RGB)
local silhouette = sprite.layers[1]
silhouette.name = "SILHOUETTE — full source character"
sprite:newCel(silhouette, 1, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v04-contact-down-silhouettes/frame-01-contact-a.png' })
sprite:newFrame()
sprite:newCel(silhouette, 2, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v04-contact-down-silhouettes/frame-02-down-a.png' })
local reference = sprite:newLayer()
reference.name = "GUIDE — V08 static reference (locked, hidden)"
reference.isVisible = false
reference.isEditable = false
sprite:newCel(reference, 1, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-v08-three-shade-materials.png' })
sprite:newCel(reference, 2, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-v08-three-shade-materials.png' })
local note = sprite:newLayer()
note.name = "GUIDE — approved v03 construction is external/locked"
note.isVisible = false
note.isEditable = false
app.command.SaveFile{ filename='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v04-contact-down-silhouettes.aseprite' }
app.exit()
