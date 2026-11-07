# Genera assets/bg/libreria_tappetino.webp: in alto scaffali di una fumetteria stilizzata (cartoon, contorni neri),
# sotto il bordo di un tavolo di legno e un tappetino da gioco con cuciture e zone per le carte.
import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
random.seed(11)
W, H, K = 1080, 2340, 2
w, h = W * K, H * K
INK = (18, 12, 20)
img = Image.new('RGB', (w, h), (43, 28, 46)); d = ImageDraw.Draw(img)

def ombra_box(box, r=0, off=10):
    x0, y0, x1, y1 = box
    d.rounded_rectangle([x0 + off, y0 + off, x1 + off, y1 + off], r, fill=(20, 12, 22))

# ---------- parete con scaffali ----------
PARETE_FINE = 0          # niente scaffali: solo la zona di lavoro (Alessio 7/11)
# parete: gradiente scuro caldo con leggera luce dall'alto
for y in range(PARETE_FINE):
    t = y / PARETE_FINE
    c = tuple(int(a + (b - a) * t) for a, b in zip((72, 48, 70), (40, 26, 44)))
    d.line([(0, y), (w, y)], fill=c)
# carta da parati: righe verticali tenui
for x in range(0, w, 90):
    d.line([(x, 0), (x, PARETE_FINE)], fill=(58, 38, 58), width=6)
colori = [(230, 70, 80), (250, 190, 50), (60, 180, 220), (140, 100, 220), (70, 190, 120), (245, 130, 50), (235, 235, 220), (120, 60, 150), (40, 120, 170)]
mensole = []
for my in mensole:
    x = 40
    base = my * K
    while x < w - 60:
        r = random.random()
        if r < .1 and x < w - 360:          # fumetto girato di copertina
            cw, ch = random.randint(200, 240), random.randint(270, 300)
            col = random.choice(colori)
            box = [x, base - ch, x + cw, base]
            ombra_box(box, 8, 10)
            d.rounded_rectangle(box, 8, fill=col, outline=INK, width=8)
            # copertina stilizzata: esplosione + fascia del titolo senza scritte
            cx, cy = x + cw / 2, base - ch * .45
            pts = []
            for k in range(24):
                a = math.pi * k / 12; R = (cw * .36 if k % 2 == 0 else cw * .22)
                pts.append((cx + R * math.cos(a), cy + R * math.sin(a)))
            d.polygon(pts, fill=(255, 245, 215), outline=INK, width=6)
            d.rectangle([x + 18, base - ch + 18, x + cw - 18, base - ch + 62], fill=INK)
            d.rectangle([x + 30, base - ch + 30, x + cw * .6, base - ch + 50], fill=random.choice(colori))
            x += cw + 14
        elif r < .22:                        # pila orizzontale
            pw = random.randint(170, 230); y = base
            for _ in range(random.randint(3, 6)):
                th = random.randint(22, 34); col = random.choice(colori)
                sh = random.randint(-10, 10)
                d.rounded_rectangle([x + sh, y - th, x + pw + sh, y], 4, fill=col, outline=INK, width=6)
                d.line([(x + sh + 20, y - th / 2), (x + pw + sh - 20, y - th / 2)], fill=tuple(min(255, c + 60) for c in col), width=5)
                y -= th
            x += pw + 18
        else:                                # dorsi in piedi
            for _ in range(random.randint(4, 9)):
                sw, sh_ = random.randint(34, 64), random.randint(220, 300)
                if x + sw > w - 60: break
                col = random.choice(colori)
                tilt = 0
                d.rectangle([x, base - sh_, x + sw, base], fill=col, outline=INK, width=6)
                # fasce sul dorso
                for fy in (base - sh_ + 30, base - 40):
                    d.rectangle([x + 6, fy, x + sw - 6, fy + 16], fill=tuple(int(c * .55) for c in col))
                d.rectangle([x + 10, base - sh_ * .62, x + sw - 10, base - sh_ * .38], fill=(255, 245, 215), outline=INK, width=4)
                x += sw + 3
            x += random.randint(16, 40)
    # mensola di legno
    d.rectangle([0, base, w, base + 44], fill=(150, 92, 52), outline=INK, width=8)
    d.rectangle([0, base + 44, w, base + 64], fill=(96, 56, 32), outline=INK, width=6)
    for gx in range(0, w, 140):
        d.arc([gx, base + 8, gx + 120, base + 40], 200, 340, fill=(120, 72, 40), width=4)
    d.rectangle([0, base + 64, w, base + 100], fill=(30, 18, 32))   # ombra sotto la mensola

# ---------- bordo del tavolo ----------
TY = PARETE_FINE
for gy in range(TY + 20, TY + 110, 22):
    pts = [(x, gy + 6 * math.sin(x / 140 + gy)) for x in range(0, w + 40, 40)]
    d.line(pts, fill=(102, 60, 32), width=5)
d.rectangle([0, TY + 120, w, h], fill=(110, 66, 36))
for gy in range(TY + 140, h, 30):
    pts = [(x, gy + 8 * math.sin(x / 180 + gy * .3)) for x in range(0, w + 40, 40)]
    d.line(pts, fill=(96, 56, 30), width=6)

# ---------- tappetino da gioco ----------
M = 50
mat = [M, M, w - M, h - M]
ombra_box(mat, 60, 18)
x0, y0, x1, y1 = mat
tap = Image.new('RGB', (x1 - x0, y1 - y0)); td = ImageDraw.Draw(tap)
for y in range(y1 - y0):
    t = y / (y1 - y0)
    c = tuple(int(a + (b - a) * t) for a, b in zip((52, 30, 70), (30, 18, 46)))
    td.line([(0, y), (x1 - x0, y)], fill=c)
# alone centrale
gl = Image.new('L', tap.size, 0); ImageDraw.Draw(gl).ellipse([tap.width * .1, tap.height * .2, tap.width * .9, tap.height * .75], fill=70)
gl = gl.filter(ImageFilter.GaussianBlur(160))
tap = Image.composite(Image.new('RGB', tap.size, (90, 60, 120)), tap, gl)
td = ImageDraw.Draw(tap)
# zone per le carte: griglia 3 colonne di rettangoli tratteggiati
cw = (tap.width - 300) / 3; ch = cw * 1024 / 695
def tratteggio(box, col, wdt=6, seg=26):
    bx0, by0, bx1, by1 = box
    for (ax, ay, bx, by) in [(bx0, by0, bx1, by0), (bx1, by0, bx1, by1), (bx1, by1, bx0, by1), (bx0, by1, bx0, by0)]:
        L = math.hypot(bx - ax, by - ay); n = int(L // seg)
        for i in range(0, n, 2):
            t0, t1 = i / n, min(1, (i + 1) / n)
            td.line([(ax + (bx - ax) * t0, ay + (by - ay) * t0), (ax + (bx - ax) * t1, ay + (by - ay) * t1)], fill=col, width=wdt)
for y in (330, tap.height - 330 - ch):
    for i in range(3):
        bx = 90 + i * (cw + 60)
        tratteggio([bx, y, bx + cw, y + ch], (120, 90, 150))
# emblema al centro: cerchi e stella tenui
cx, cy = tap.width / 2, tap.height * .5
for r, wd in ((300, 8), (260, 4)):
    td.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(110, 80, 140), width=wd)
pts = []
for k in range(16):
    a = math.pi * k / 8 - math.pi / 2; R = 220 if k % 2 == 0 else 90
    pts.append((cx + R * math.cos(a), cy + R * math.sin(a)))
td.polygon(pts, outline=(110, 80, 140), width=6)
# cucitura sul bordo
mk = Image.new('L', tap.size, 0); ImageDraw.Draw(mk).rounded_rectangle([0, 0, tap.width - 1, tap.height - 1], 60, fill=255)
img.paste(tap, (x0, y0), mk)
d = ImageDraw.Draw(img)
d.rounded_rectangle(mat, 60, outline=INK, width=10)
inset = [x0 + 26, y0 + 26, x1 - 26, y1 - 26]
bx0, by0, bx1, by1 = inset
seg = 30
for (ax, ay, bx, by) in [(bx0 + 40, by0, bx1 - 40, by0), (bx1, by0 + 40, bx1, by1 - 40), (bx1 - 40, by1, bx0 + 40, by1), (bx0, by1 - 40, bx0, by0 + 40)]:
    L = math.hypot(bx - ax, by - ay); n = int(L // seg)
    for i in range(0, n, 2):
        t0, t1 = i / n, (i + 1) / n
        d.line([(ax + (bx - ax) * t0, ay + (by - ay) * t0), (ax + (bx - ax) * t1, ay + (by - ay) * t1)], fill=(214, 170, 90), width=7)

img = img.resize((W, H), Image.LANCZOS)
gr = Image.effect_noise((W, H), 14).convert('RGB')
img = ImageChops.blend(img, ImageChops.multiply(img, gr.point(lambda v: 205 + v // 4)), .3)
img.save('assets/bg/libreria_tappetino.webp', quality=84, method=6)
print('ok')
