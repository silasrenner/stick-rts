local sprite = Sprite(110, 97, ColorMode.RGB)
sprite.layers[1].name = 'Placeholder'
sprite:deleteLayer(sprite.layers[1])
local layer = sprite:newLayer()
layer.name = 'Guide — V08 reference (locked, hidden)'
local image = Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01-layers/00-guide-v08-reference.png' }
sprite:newCel(layer, 1, image)
layer.isVisible = false
layer.isEditable = false
local layer = sprite:newLayer()
layer.name = 'Outline'
local image = Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01-layers/01-outline.png' }
sprite:newCel(layer, 1, image)
local layer = sprite:newLayer()
layer.name = 'Torso + head'
local image = Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01-layers/02-torso-head.png' }
sprite:newCel(layer, 1, image)
local layer = sprite:newLayer()
layer.name = 'Legs'
local image = Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01-layers/03-legs.png' }
sprite:newCel(layer, 1, image)
local layer = sprite:newLayer()
layer.name = 'Sword arm — left'
local image = Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01-layers/04-sword-arm-left.png' }
sprite:newCel(layer, 1, image)
local layer = sprite:newLayer()
layer.name = 'Shield arm — right'
local image = Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01-layers/05-shield-arm-right.png' }
sprite:newCel(layer, 1, image)
local layer = sprite:newLayer()
layer.name = 'Sword — left'
local image = Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01-layers/06-sword-left.png' }
sprite:newCel(layer, 1, image)
local layer = sprite:newLayer()
layer.name = 'Shield — right'
local image = Image{ fromFile='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01-layers/07-shield-right.png' }
sprite:newCel(layer, 1, image)
app.command.SaveFile{ filename='C:/Users/simcr/projects/stick-rts-visual-proof/assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v01.aseprite' }
app.exit()