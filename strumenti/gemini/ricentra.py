#!/usr/bin/env python3
"""Sposta e ingrandisce l'illustrazione di una carta perché il soggetto cada nella finestra libera
(tra il fumetto del titolo in alto e il riquadro dell'effetto in basso, circa dal 20% al 60% dell'altezza).

La tabella strumenti/gemini/centratura.json dice per ogni carta quale parte dell'originale usare:
  "t_xxx": [inizio, altezza]   frazioni dell'altezza dell'originale (es. [0.4, 0.6] = dal 40% al 100%).
Se il ritaglio va oltre il fondo, il fondo viene completato a specchio (resta sotto il riquadro dell'effetto).
Uso: python strumenti/gemini/ricentra.py [id ...]   (vuoto = tutte quelle in tabella)
Controllo: node strumenti/gemini/impagina.js anteprima.png id ...
"""
import json, os, sys
from PIL import Image, ImageOps

QUI = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(QUI))
ORIG = os.path.join(ROOT, 'strumenti', 'originali_gemini')
GEN = os.path.join(ROOT, 'assets', 'cards', 'gen')
TABELLA = os.path.join(QUI, 'centratura.json')


def tabella():
    return json.load(open(TABELLA, encoding='utf-8')) if os.path.exists(TABELLA) else {}


def dimentica(cid):
    t = tabella()
    if t.pop(cid, None) is not None:
        open(TABELLA, 'w', encoding='utf-8').write(json.dumps(t, indent=1) + '\n')


def ritaglia(im, inizio, altezza):
    w, h = im.size
    bh = int(h * altezza); bw = min(w, int(bh * 2 / 3))
    y0 = int(h * inizio); x0 = (w - bw) // 2
    sotto = max(0, y0 + bh - h)
    if sotto:  # completa il fondo a specchio (senza l'ultima striscia, a volte Gemini ci mette un bordo)
        im = im.crop((0, 0, w, h - int(h * .03))); h = im.height; sotto = max(0, y0 + bh - h)
        tela = Image.new('RGB', (w, h + sotto))
        tela.paste(im, (0, 0))
        tela.paste(ImageOps.flip(im.crop((0, h - sotto, w, h))), (0, h))
        im = tela
    return im.crop((x0, y0, x0 + bw, y0 + bh)).resize((540, 810), Image.LANCZOS)


def main():
    t = tabella()
    ids = [a.lower() for a in sys.argv[1:]] or list(t)
    for cid in ids:
        if cid not in t:
            print(f'{cid}: non è in centratura.json'); continue
        im = Image.open(os.path.join(ORIG, cid + '.webp')).convert('RGB')
        ritaglia(im, *t[cid]).save(os.path.join(GEN, cid + '.webp'), 'WEBP', quality=80, method=6)
        print(f'{cid}: ricentrata {t[cid]}')


if __name__ == '__main__':
    main()
