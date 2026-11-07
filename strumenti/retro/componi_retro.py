# Rifà lo spazio dentro i retro delle carte con le nebulose di Alessio,
# lasciando identici cornice, emblema e scritta. Il logo del titolo vecchio (dentro gli originali)
# viene coperto dalla nebulosa e sopra si appoggia il logo attuale assets/icons/logo_titolo.webp.
#   python3 strumenti/retro/componi_retro.py
import numpy as np
from PIL import Image, ImageFilter
D = 'strumenti/retro/'

def hsv(img):
    return np.array(img.convert('HSV')).astype(float)

def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out

def fill_holes(m):
    # riempie i buchi chiusi: flood fill dal bordo sul complemento
    h, w = m.shape
    outside = np.zeros_like(m)
    outside[0, :] = ~m[0, :]; outside[-1, :] = ~m[-1, :]; outside[:, 0] = ~m[:, 0]; outside[:, -1] = ~m[:, -1]
    free = ~m
    while True:
        grown = outside | (dilate(outside, 1) & free)
        if (grown == outside).all(): break
        outside = grown
    return ~outside

def tpl_mask(shape, tpl, x, y, w, h, grow=2):
    t = Image.open(tpl).convert('RGBA').resize((w, h), Image.LANCZOS)
    a = np.array(t)[..., 3] > 40
    m = np.zeros(shape, bool)
    m[y:y+h, x:x+w] = a
    return dilate(m, grow)

def nebula(path, size, darken):
    neb = Image.open(path).convert('RGB')
    W, H = size
    # ritaglio verticale al centro della nebulosa
    s = H / neb.height
    nw = int(neb.width * s) + 1
    neb = neb.resize((nw, H), Image.LANCZOS)
    cx = int(nw * 0.52)
    neb = neb.crop((cx - W // 2, 0, cx - W // 2 + W, H))
    arr = np.array(neb).astype(float) * darken
    return arr

def metti_logo(img, box):
    # appoggia il logo del titolo attuale centrato nel riquadro del logo vecchio
    x, y, w, h = box
    logo = Image.open('assets/icons/logo_titolo.webp').convert('RGBA')
    nh = round(logo.height * w / logo.width)
    logo = logo.resize((w, nh), Image.LANCZOS)
    base = img.convert('RGBA')
    base.alpha_composite(logo, (x, y + (h - nh) // 2))
    return base.convert('RGB')

def componi(card, neb_path, inner, frame_like, fg_mask, out, darken=0.85, logo=None):
    img = Image.open(D + card).convert('RGB')
    a = np.array(img).astype(float)
    h, w = a.shape[:2]
    x0, y0, x1, y1 = inner
    interior = np.zeros((h, w), bool); interior[y0:y1, x0:x1] = True
    hv = hsv(img)
    # ornamenti della cornice che entrano nell'area interna (angoli): solo vicino ai bordi
    yy, xx = np.mgrid[0:h, 0:w]
    near_edge = (xx < x0 + 70) | (xx > x1 - 70) | (yy < y0 + 70) | (yy > y1 - 70)
    keep_frame = interior & near_edge & frame_like(hv, a)
    keep_frame = dilate(keep_frame, 1)
    replace = interior & ~keep_frame & ~fg_mask(a, hv)
    # bordo morbido
    m = Image.fromarray((replace * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
    m = np.array(m).astype(float)[..., None] / 255
    neb = np.zeros_like(a); nb = nebula(neb_path, (x1 - x0, y1 - y0), darken)
    neb[y0:y1, x0:x1] = nb
    res = Image.fromarray(np.clip(a * (1 - m) + neb * m, 0, 255).astype(np.uint8))
    if logo:
        res = metti_logo(res, logo)
    res.save(out, quality=90, method=6)
    return res

# --- Retro del mazzo (eroi): cornice oro ---
def frame_gold(hv, a):
    H, S, V = hv[..., 0] * 360 / 255, hv[..., 1] / 255, hv[..., 2] / 255
    return (H > 15) & (H < 55) & (S > 0.25) & (V > 0.25)

def fg_hero(a, hv):
    shape = a.shape[:2]
    m = tpl_mask(shape, 'assets/icons/logo_monograma.webp', 208, 364, 125, 193, 3)
    return m

# --- Retro Minaccia: cornice argento, teschio e scritta ---
def frame_silver(hv, a):
    S, V = hv[..., 1] / 255, hv[..., 2] / 255
    return (S < 0.22) & (V > 0.28)

SKULL_POLY = [(270, 362), (281, 398), (302, 400), (324, 438), (334, 480), (324, 517), (301, 537), (283, 555),
              (257, 555), (239, 537), (216, 517), (206, 480), (216, 438), (238, 400), (259, 398)]

def poly_mask(shape, poly, feather=0):
    from PIL import ImageDraw
    im = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon(poly, fill=255)
    return np.array(im) > 0

def fg_threat(a, hv, logo=(56, 212, 430, 100), text_box=(170, 612, 375, 660)):
    shape = a.shape[:2]
    m = poly_mask(shape, SKULL_POLY)
    if text_box:
        H, S, V = hv[..., 0] * 360 / 255, hv[..., 1] / 255, hv[..., 2] / 255
        x0, y0, x1, y1 = text_box
        reg = np.zeros(shape, bool); reg[y0:y1, x0:x1] = True
        gold = (H > 8) & (H < 60) & (S > 0.3) & (V > 0.3)
        m |= fill_holes(dilate(reg & gold, 3)) & dilate(reg, 3)
    return m

if __name__ == '__main__':
    componi('originale_retrocartamazzo.webp', D + 'nebulosa_eroi.jpg', (22, 37, 520, 769), frame_gold, fg_hero, 'assets/cards/retrocartamazzo.webp', logo=(61, 212, 420, 98))
    componi('originale_cartaminacciaretro.webp', D + 'nebulosa_villain.jpg', (24, 38, 517, 763), frame_silver, fg_threat, 'assets/cards/cartaminacciaretro.webp', logo=(56, 212, 430, 100))
    componi('originale_cartathreatretro.webp', D + 'nebulosa_villain.jpg', (24, 38, 517, 764), frame_silver, fg_threat, 'assets/cards/cartathreatretro.webp', logo=(56, 212, 430, 100))
    print('ok')
