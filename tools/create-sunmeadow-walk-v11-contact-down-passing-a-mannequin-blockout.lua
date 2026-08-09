local sprite = Sprite(110, 97, ColorMode.RGB)
local blockout = sprite.layers[1]
blockout.name = "BLOCKOUT — Contact A / Down A / Passing A"
sprite:newCel(blockout, 1, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v11-contact-down-passing-a-mannequin-blockout/frame-01-contact-a.png' })
sprite:newFrame()
sprite:newCel(blockout, 2, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v11-contact-down-passing-a-mannequin-blockout/frame-02-down-a.png' })
sprite:newFrame()
sprite:newCel(blockout, 3, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v11-contact-down-passing-a-mannequin-blockout/frame-03-passing-a.png' })
local guide = sprite:newLayer()
guide.name = "GUIDE — owner-edited v03 remains external/locked"
guide.isVisible = false
guide.isEditable = false
app.command.SaveFile{ filename='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v11-contact-down-passing-a-mannequin-blockout.aseprite' }
app.exit()
