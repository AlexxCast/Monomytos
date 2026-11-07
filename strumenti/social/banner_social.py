# Rifà i banner dei social con il logo del titolo attuale (assets/icons/logo_titolo.webp).
# Uso: python3 strumenti/social/banner_social.py <cartella_uscita>
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'strumenti/social/uscita'
os.makedirs(OUT, exist_ok=True)
NEB = Image.open('strumenti/retro/nebulosa_eroi.jpg').convert('RGB')
LOGO = Image.open('assets/icons/logo_titolo.webp').convert('RGBA')
FONT = 'promo/font/LuckiestGuy-Regular.ttf'
MOTTO = 'FAI SQUADRA. NON DIVENTARE IL VILLAIN.'
SOTTO = 'Card game gratis · Browser e Android'

def copri(img, w, h):
    s = max(w / img.width, h / img.height)
    im = img.resize((round(img.width * s) + 1, round(img.height * s) + 1), Image.LANCZOS)
    x = (im.width - w) // 2; y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))

def testo(base, cx, y, s, size, colore, bordo):
    f = ImageFont.truetype(FONT, size)
    d = ImageDraw.Draw(base)
    w = d.textlength(s, font=f)
    sw = max(2, size // 9)
    # ombra dura stile fumetto
    d.text((cx - w / 2 + sw, y + sw), s, font=f, fill=(0, 0, 0, 255), stroke_width=sw, stroke_fill=(0, 0, 0, 255))
    d.text((cx - w / 2, y), s, font=f, fill=colore, stroke_width=sw, stroke_fill=bordo)
    return y + size * 1.15

def banner(nome, w, h, larg_logo, y_logo, motto_px, sotto_px):
    base = copri(NEB, w, h).convert('RGBA')
    # velo scuro al centro per far leggere logo e testi
    velo = Image.new('L', (w, h), 0)
    ImageDraw.Draw(velo).ellipse((w * 0.12, y_logo - h * 0.10, w * 0.88, y_logo + h * 0.42), fill=110)
    velo = velo.filter(ImageFilter.GaussianBlur(min(w, h) * 0.08))
    base = Image.composite(Image.new('RGBA', (w, h), (6, 8, 18, 255)), base, velo)
    lw = round(larg_logo); lh = round(LOGO.height * lw / LOGO.width)
    logo = LOGO.resize((lw, lh), Image.LANCZOS)
    # ombra morbida sotto il logo
    ombra = Image.new('RGBA', logo.size, (0, 0, 0, 0)); ombra.putalpha(logo.getchannel('A').point(lambda v: v * 0.8))
    ombra = ombra.filter(ImageFilter.GaussianBlur(lw * 0.012))
    x = (w - lw) // 2; y = round(y_logo - lh / 2)
    base.alpha_composite(ombra, (x + round(lw * 0.008), y + round(lw * 0.012)))
    base.alpha_composite(logo, (x, y))
    ty = y + lh + motto_px * 0.25
    ty = testo(base, w / 2, ty, MOTTO, motto_px, (255, 214, 10, 255), (0, 0, 0, 255))
    testo(base, w / 2, ty + sotto_px * 0.15, SOTTO, sotto_px, (255, 255, 255, 255), (0, 0, 0, 255))
    p = os.path.join(OUT, nome)
    base.convert('RGB').save(p)
    print(p, base.size)

banner('banner_discord_960x540.png', 960, 540, 540, 228, 34, 20)
banner('banner_bluesky_x_1500x500.png', 1500, 500, 640, 190, 40, 24)
# YouTube: tutto dentro la zona sicura centrale 1546x423
banner('banner_youtube_2560x1440.png', 2560, 1440, 1100, 640, 66, 38)
banner('sfondo_verticale_1080x1920.png', 1080, 1920, 880, 760, 44, 28)
