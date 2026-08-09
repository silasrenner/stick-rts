local sprite=Sprite(110,97,ColorMode.RGB)
local source=sprite.layers[1]
source.name='GUIDE — V08 static source (locked, 40%)'
source.isEditable=false
source.opacity=102
sprite:newCel(source,1,Image{fromFile='assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-v08-three-shade-materials.png'})
local motion=sprite:newLayer()
motion.name='GUIDE — V15 Down A motion (locked, 40%)'
motion.isEditable=false
motion.opacity=102
sprite:newCel(motion,1,Image{fromFile='assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v15-six-pose-mannequin-blockout/frame-02-down-a.png'})
local pose=sprite:newLayer()
pose.name='POSE — Down A source silhouette (author above guides)'
app.command.SaveFile{filename='assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v16-down-a-source-silhouette.aseprite'}
app.exit()
