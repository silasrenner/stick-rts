local sprite = Sprite(110, 97, ColorMode.RGB)
local blockout = sprite.layers[1]
blockout.name = "BLOCKOUT — Contact A / Down A"
sprite:newCel(blockout, 1, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v09-contact-down-a-mannequin-blockout/frame-01-contact-a.png' })
sprite:newFrame()
sprite:newCel(blockout, 2, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v09-contact-down-a-mannequin-blockout/frame-02-down-a.png' })
local guide = sprite:newLayer()
guide.name = "GUIDE — v03 construction remains external/locked"
guide.isVisible = false
guide.isEditable = false
app.command.SaveFile{ filename='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v09-contact-down-a-mannequin-blockout.aseprite' }
app.exit()
