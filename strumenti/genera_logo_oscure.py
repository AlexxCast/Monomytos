# Logo delle Carte Oscure: un'eclissi (disco nero, corona viola a raggi, falce di luce). Salva assets/icons/oscura.webp
import math
from PIL import Image, ImageDraw, ImageFilter
S = 1024; c = S / 2
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
# bagliore viola
gl = Image.new('RGBA', (S, S), (0, 0, 0, 0)); g = ImageDraw.Draw(gl)
g.ellipse([c - 400, c - 400, c + 400, c + 400], fill=(150, 70, 230, 170))
img.alpha_composite(gl.filter(ImageFilter.GaussianBlur(70)))
d = ImageDraw.Draw(img)
# raggi della corona, lunghi e corti alternati, con contorno nero
pts = []
for k in range(32):
    a = math.pi * k / 16 - math.pi / 2
    R = 470 if k % 4 == 0 else (390 if k % 2 == 0 else 300)
    pts.append((c + R * math.cos(a), c + R * math.sin(a)))
d.polygon(pts, fill=(176, 110, 255, 255), outline=(10, 4, 16, 255), width=26)
# anello
d.ellipse([c - 300, c - 300, c + 300, c + 300], fill=(120, 50, 200, 255), outline=(10, 4, 16, 255), width=26)
# disco nero
d.ellipse([c - 235, c - 235, c + 235, c + 235], fill=(16, 6, 26, 255), outline=(10, 4, 16, 255), width=10)
# falce di luce sul bordo (anello di diamante)
d.arc([c - 262, c - 262, c + 262, c + 262], 200, 290, fill=(245, 230, 255, 255), width=30)
d.ellipse([c - 200 - 40, c - 160 - 40, c - 200 + 40, c - 160 + 40], fill=(255, 250, 255, 255))
img = img.resize((256, 256), Image.LANCZOS)
img.save('assets/icons/oscura.webp', quality=92)
img.save('/tmp/claude-0/-home-claude-monomytos/fc96ba10-e8d4-5980-a186-669051bfc752/scratchpad/oscura_prev.png')
print('ok')
