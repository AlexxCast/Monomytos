# Trova posizione e scala di un'immagine trasparente (logo, emblema) dentro un retro di carta
import sys, numpy as np
from PIL import Image
def find(card_path, tpl_path, box, scales):
    card = np.array(Image.open(card_path).convert('L')).astype(float)
    tpl0 = Image.open(tpl_path).convert('RGBA')
    best = None
    for s in scales:
        w = int(round(s)); h = int(round(tpl0.height * w / tpl0.width))
        t = tpl0.resize((w, h), Image.LANCZOS)
        a = np.array(t)[..., 3].astype(float) / 255
        g = np.array(t.convert('L')).astype(float)
        x0, y0, x1, y1 = box
        for y in range(y0, y1 - h, 2):
            for x in range(x0, x1 - w, 2):
                patch = card[y:y+h, x:x+w]
                if patch.shape != g.shape: continue
                d = ((patch - g) ** 2 * a).sum() / a.sum()
                if best is None or d < best[0]: best = (d, x, y, w, h)
    # rifinitura a passo 1
    d0, bx, by, w, h = best
    t = tpl0.resize((w, h), Image.LANCZOS); a = np.array(t)[..., 3].astype(float) / 255; g = np.array(t.convert('L')).astype(float)
    for y in range(by - 2, by + 3):
        for x in range(bx - 2, bx + 3):
            patch = card[y:y+h, x:x+w]
            if patch.shape != g.shape: continue
            d = ((patch - g) ** 2 * a).sum() / a.sum()
            if d < best[0]: best = (d, x, y, w, h)
    return best
if __name__ == '__main__':
    print(find(sys.argv[1], sys.argv[2], tuple(map(int, sys.argv[3].split(','))), [float(v) for v in sys.argv[4].split(',')]))
