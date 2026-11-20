#!/usr/bin/env python3
"""Scheda illustrazione di un personaggio per i social: aggiunge nome, ruolo e la dicitura AI discreta.
Uso: python strumenti/social/scheda_personaggio.py immagine.png "NOME" "Ruolo" uscita.png
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT = os.path.join(ROOT, 'promo', 'font')


def main(src, nome, ruolo, out):
    im = Image.open(src).convert('RGB')
    if im.width < 2400:
        im = im.resize((2400, round(im.height * 2400 / im.width)), Image.LANCZOS)
    # fascia in alto per il titolo: allungo la striscia più alta dello sfondo (solo cielo), sfocata
    W, H0 = im.size; fascia = int(H0 * .17)
    tela = Image.new('RGB', (W, H0 + fascia))
    tela.paste(im.crop((0, 0, W, int(H0 * .035))).resize((W, fascia)).filter(ImageFilter.GaussianBlur(10)), (0, 0))
    tela.paste(im, (0, fascia))
    # sfumo il passaggio tra la fascia e l'immagine (niente riga netta)
    sf = int(H0 * .04); top = im.crop((0, 0, W, sf))
    banda = tela.crop((0, fascia - sf, W, fascia)).resize((W, sf))
    mask = Image.linear_gradient('L').resize((W, sf))
    tela.paste(Image.composite(top, banda, mask), (0, fascia))
    im = tela
    W, H = im.size
    d = ImageDraw.Draw(im)
    titolo = ImageFont.truetype(os.path.join(FONT, 'Bangers-Regular.ttf'), int(H * .085))
    sotto = ImageFont.truetype(os.path.join(FONT, 'Bangers-Regular.ttf'), int(H * .038))
    nota = ImageFont.truetype(os.path.join(FONT, 'Bangers-Regular.ttf'), int(H * .022))
    x, y = int(W * .025), int(H * .025)
    d.text((x, y), nome.upper(), font=titolo, fill=(255, 245, 225), stroke_width=int(H * .006), stroke_fill=(0, 0, 0))
    y2 = y + titolo.getbbox(nome.upper())[3] + int(H * .008)
    d.text((x, y2), ruolo.upper(), font=sotto, fill=(110, 230, 225), stroke_width=int(H * .004), stroke_fill=(0, 0, 0))
    testo = 'MONOMYTHOS  ·  design di Alessio  ·  illustrazione generata con AI (fase iniziale)'
    tw = d.textlength(testo, font=nota)
    d.text((W - tw - int(W * .015), H - int(H * .045)), testo, font=nota, fill=(225, 225, 225),
           stroke_width=max(2, int(H * .002)), stroke_fill=(0, 0, 0))
    im.save(out, quality=92)


if __name__ == '__main__':
    main(*sys.argv[1:5])
