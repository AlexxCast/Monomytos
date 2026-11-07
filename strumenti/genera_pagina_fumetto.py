# Genera assets/bg/pagina_fumetto.webp: pagina di fumetto vecchia a vignette con onomatopee sbiadite.
import math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
random.seed(7)
W, H, K = 1080, 1920, 2           # disegno a 2x e poi riduco (bordi puliti)
w, h = W * K, H * K
FONT = 'promo/font/Bangers-Regular.ttf'
FONT2 = 'promo/font/LuckiestGuy-Regular.ttf'

# 1) carta: chiara al centro, ingiallita verso i bordi
yy, xx = [i / (h - 1) for i in range(h)], None
carta = Image.new('RGB', (W, H))
px = carta.load()
for y in range(H):
    for x in range(W):
        dx, dy = (x / W - .5) / .5, (y / H - .5) / .5
        d = min(1, math.sqrt(dx * dx * .9 + dy * dy * .75))
        t = max(0, d - .35) / .65; t = t ** 1.6
        c0, c1 = (247, 241, 222), (214, 184, 112)
        px[x, y] = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
carta = carta.resize((w, h))
# macchie leggere
macchie = Image.new('L', (w, h), 0); dm = ImageDraw.Draw(macchie)
for _ in range(26):
    cx, cy, r = random.randint(0, w), random.randint(0, h), random.randint(60, 260)
    dm.ellipse([cx - r, cy - r, cx + r, cy + r], fill=random.randint(10, 26))
macchie = macchie.filter(ImageFilter.GaussianBlur(60))
carta = Image.composite(Image.new('RGB', (w, h), (190, 150, 80)), carta, macchie)

# 2) vignette: righe di pannelli con gutter, interni con retino e linee
img = carta.copy(); d = ImageDraw.Draw(img)
G, B = 34, 9                      # gutter e spessore bordo
righe = [(0.0, .19), (.19, .40), (.40, .58), (.58, .80), (.80, 1.0)]
tinte = [(255, 214, 120), (140, 205, 235), (240, 150, 150), (185, 160, 235), (150, 220, 170), (255, 190, 130)]
pannelli = []
for (a, b) in righe:
    n = random.choice([1, 2, 2, 3])
    tagli = [random.uniform(.36, .64)] if n == 2 else ([.33 + random.uniform(-.04, .04), .66 + random.uniform(-.04, .04)] if n == 3 else [])
    xs = [0] + tagli + [1]
    sk = random.uniform(-.04, .04)         # tagli leggermente inclinati
    for i in range(n):
        x0 = G + (w - 2 * G) * xs[i] + (G / 2 if i else 0)
        x1 = G + (w - 2 * G) * xs[i + 1] - (G / 2 if i < n - 1 else 0)
        y0 = G + (h - 2 * G) * a + (G / 2 if a else 0)
        y1 = G + (h - 2 * G) * b - (G / 2 if b < 1 else 0)
        off = sk * (x1 - x0) * .3
        pannelli.append([(x0 + (off if i else 0), y0), (x1 + (off if i < n - 1 else 0), y0), (x1 - (off if i < n - 1 else 0), y1), (x0 - (off if i else 0), y1)])
for poly in pannelli:
    xs_, ys_ = [p[0] for p in poly], [p[1] for p in poly]
    bx0, by0, bx1, by1 = int(min(xs_)), int(min(ys_)), int(max(xs_)), int(max(ys_))
    pw, ph = bx1 - bx0, by1 - by0
    tinta = random.choice(tinte)
    pan = Image.new('RGB', (pw, ph), tuple(int(c * .22 + 248 * .78) for c in tinta))
    pd = ImageDraw.Draw(pan)
    tipo = random.choice(['retino', 'raggi', 'linee', 'retino'])
    if tipo == 'retino':
        passo = 22
        for yy_ in range(0, ph, passo):
            for xx_ in range(0, pw, passo):
                r = 3 + 5 * (xx_ / max(1, pw))
                o = (passo / 2) if (yy_ // passo) % 2 else 0
                pd.ellipse([xx_ + o - r, yy_ - r, xx_ + o + r, yy_ + r], fill=tuple(int(c * .45 + 248 * .55) for c in tinta))
    elif tipo == 'raggi':
        cx, cy = random.uniform(.3, .7) * pw, random.uniform(.3, .7) * ph
        for k in range(0, 360, 6):
            a1, a2 = math.radians(k), math.radians(k + 2.6)
            R = max(pw, ph) * 1.2
            pd.polygon([(cx, cy), (cx + R * math.cos(a1), cy + R * math.sin(a1)), (cx + R * math.cos(a2), cy + R * math.sin(a2))], fill=tuple(int(c * .4 + 248 * .6) for c in tinta))
    else:
        for k in range(-ph, pw, 30):
            pd.line([(k, ph), (k + ph * .6, 0)], fill=tuple(int(c * .45 + 248 * .55) for c in tinta), width=6)
    mask = Image.new('L', (pw, ph), 0)
    ImageDraw.Draw(mask).polygon([(x - bx0, y - by0) for x, y in poly], fill=255)
    img.paste(pan, (bx0, by0), mask)
    d.polygon(poly, outline=(20, 16, 12), width=B)

# 3) onomatopee dentro esplosioni a stella
parole = ['BAM!', 'POW!', 'ZAP!', 'KRAK!', 'WHAM!', 'BOOM!', 'SWOOSH!', 'ZOK!', 'BZZT!', 'KABOOM!']
colori = [(232, 60, 70), (250, 196, 40), (60, 190, 230), (150, 100, 230), (70, 200, 120), (255, 140, 40)]
random.shuffle(parole)
for i, poly in enumerate(pannelli):
    if i >= len(parole): break
    xs_, ys_ = [p[0] for p in poly], [p[1] for p in poly]
    cx, cy = (min(xs_) + max(xs_)) / 2 + random.uniform(-.15, .15) * (max(xs_) - min(xs_)), (min(ys_) + max(ys_)) / 2
    size = int(min(max(xs_) - min(xs_), max(ys_) - min(ys_)) * random.uniform(.34, .42))
    lay = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    col = random.choice(colori)
    # stella
    punte = random.randint(11, 15); R1, R2 = size * .95, size * .62
    pts = []
    for k in range(punte * 2):
        ang = math.pi * k / punte + random.uniform(-.08, .08)
        R = (R1 if k % 2 == 0 else R2) * random.uniform(.9, 1.08)
        pts.append((cx + R * math.cos(ang) * 1.25, cy + R * math.sin(ang)))
    ld.polygon(pts, fill=(255, 250, 225, 255), outline=(20, 16, 12, 255), width=8)
    f = ImageFont.truetype(random.choice([FONT, FONT2]), int(size * .62))
    txt = parole[i]
    tw = ld.textlength(txt, font=f)
    while tw > R1 * 2.1:
        f = ImageFont.truetype(f.path, int(f.size * .9)); tw = ld.textlength(txt, font=f)
    tl = Image.new('RGBA', (int(tw + 80), int(f.size * 1.6)), (0, 0, 0, 0)); td = ImageDraw.Draw(tl)
    td.text((44, 14), txt, font=f, fill=(20, 16, 12, 255))                       # ombra
    td.text((36, 6), txt, font=f, fill=col + (255,), stroke_width=7, stroke_fill=(20, 16, 12, 255))
    tl = tl.rotate(random.uniform(-14, 14), expand=True, resample=Image.BICUBIC)
    lay.alpha_composite(tl, (int(cx - tl.width / 2), int(cy - tl.height / 2)))
    pm = Image.new('L', (w, h), 0); ImageDraw.Draw(pm).polygon(poly, fill=255)    # resta dentro la sua vignetta
    a = ImageChops.multiply(lay.getchannel('A'), pm).point(lambda v: int(v * .55))  # sbiadite, restano sullo sfondo
    lay.putalpha(a)
    img = Image.alpha_composite(img.convert('RGBA'), lay).convert('RGB')

# 4) grana e leggero ingiallimento generale
img = img.resize((W, H), Image.LANCZOS)
gr = Image.effect_noise((W, H), 18).convert('RGB')
img = ImageChops.blend(img, ImageChops.multiply(img, gr.point(lambda v: 200 + v // 4)), .35)
img.save('assets/bg/pagina_fumetto.webp', quality=82, method=6)
print('ok', img.size)
