# Logo delle Carte Oscure: un'eclissi a tratto nero (stesso stile delle icone delle statistiche),
# senza cornice né bagliore viola: raggi neri, disco nero, falce di luce chiara. Salva assets/icons/oscura.webp
import math
from PIL import Image, ImageDraw
S = 1024; c = S / 2
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
INK = (17, 14, 20, 255)
# raggi: triangoli neri staccati dal disco
for k in range(16):
    a = math.pi * k / 8 - math.pi / 2
    R = 480 if k % 2 == 0 else 400
    w = 0.13 if k % 2 == 0 else 0.10
    r0 = 310
    p1 = (c + r0 * math.cos(a - w), c + r0 * math.sin(a - w))
    p2 = (c + r0 * math.cos(a + w), c + r0 * math.sin(a + w))
    p3 = (c + R * math.cos(a), c + R * math.sin(a))
    d.polygon([p1, p3, p2], fill=INK)
# disco nero
d.ellipse([c - 280, c - 280, c + 280, c + 280], fill=INK)
# falce di luce (anello di diamante) e puntino
d.arc([c - 225, c - 225, c + 225, c + 225], 195, 300, fill=(255, 255, 255, 255), width=38)
d.ellipse([c - 175 - 42, c - 120 - 42, c - 175 + 42, c - 120 + 42], fill=(255, 255, 255, 255))
img = img.resize((256, 256), Image.LANCZOS)
img.save('assets/icons/oscura.webp', quality=92)
print('ok')
