local sprite = Sprite(110, 97, ColorMode.RGB)
local guide = sprite.layers[1]
guide.name = 'GUIDE — six-pose construction (non-export)'
sprite:newCel(guide, 1, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/frame-01.png' })
sprite:newFrame()
sprite:newCel(guide, 2, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/frame-02.png' })
sprite:newFrame()
sprite:newCel(guide, 3, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/frame-03.png' })
sprite:newFrame()
sprite:newCel(guide, 4, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/frame-04.png' })
sprite:newFrame()
sprite:newCel(guide, 5, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/frame-05.png' })
sprite:newFrame()
sprite:newCel(guide, 6, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/frame-06.png' })
local ref = sprite:newLayer()
ref.name = 'GUIDE — V08 source reference (locked, hidden)'
ref.isVisible = false
ref.isEditable = false
sprite:newCel(ref, 1, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/v08-reference.png' })
sprite:newCel(ref, 2, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/v08-reference.png' })
sprite:newCel(ref, 3, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/v08-reference.png' })
sprite:newCel(ref, 4, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/v08-reference.png' })
sprite:newCel(ref, 5, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/v08-reference.png' })
sprite:newCel(ref, 6, Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02-guide-frames/v08-reference.png' })
local art = sprite:newLayer()
art.name = 'POSE ART — empty pending guide approval'
app.command.SaveFile{ filename='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v02.aseprite' }
app.exit()