local sprite = Sprite(110, 97, ColorMode.RGB)
local layer = sprite.layers[1]
layer.name = 'SILHOUETTE — Contact A + Down A attempts'
sprite:newCel(layer, 1, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v05-down-a-attempts/contact-a-reference.png' })
sprite:newFrame()
sprite:newCel(layer, 2, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v05-down-a-attempts/down-a-a.png' })
sprite:newFrame()
sprite:newCel(layer, 3, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v05-down-a-attempts/down-a-b.png' })
sprite:newFrame()
sprite:newCel(layer, 4, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v05-down-a-attempts/down-a-c.png' })
local guide = sprite:newLayer()
guide.name = 'GUIDE — v03 construction remains external/locked'
guide.isVisible = false
guide.isEditable = false
app.command.SaveFile{ filename='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v05-down-a-attempts.aseprite' }
app.exit()