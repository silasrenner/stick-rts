from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
GUIDES=ROOT/'artifacts/warrior-pair-proof/tmp-v03-current-guide'
BLOCKS=ROOT/'assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-walk-v15-six-pose-mannequin-blockout'
OUT=ROOT/'artifacts/warrior-pair-proof/sunmeadow-walk-v15-guide-above-blockout-frames'
NAMES=['CONTACT A','DOWN A','PASSING A','CONTACT B','DOWN B','PASSING B']
scale,w,h,ground=4,440,388,90
OUT.mkdir(parents=True,exist_ok=True)
for i,name in enumerate(NAMES,1):
    guide=Image.open(GUIDES/f'frame-{i:02d}.png').convert('RGBA')
    block=Image.open(BLOCKS/f"frame-{i:02d}-{name.lower().replace(' ','-')}.png").convert('RGBA')
    canvas=Image.new('RGBA',(w+32,h*2+120),'#111820');d=ImageDraw.Draw(canvas)
    d.text((16,12),f'SUNMEADOW WALK — {i}/6 {name}',fill='#F8FAFC')
    for row,(label,cell) in enumerate((('STICK / CONSTRUCTION GUIDE',guide),('MANNEQUIN BLOCKOUT',block))):
        x,y=16,48+row*(h+28)
        d.text((x,y-15),label,fill='#F8FAFC')
        for yy in range(0,h,20):
            for xx in range(0,w,20):d.rectangle((x+xx,y+yy,x+xx+19,y+yy+19),fill='#303743' if ((xx//20)+(yy//20))%2==0 else '#222833')
        canvas.alpha_composite(cell.resize((w,h),Image.Resampling.NEAREST),(x,y));d.line((x,y+ground*scale,x+w,y+ground*scale),fill='#EF4444',width=2)
    canvas.convert('RGB').save(OUT/f'frame-{i:02d}.png')
print(OUT)
