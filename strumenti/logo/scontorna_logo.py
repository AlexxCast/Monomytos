# Scontorna il logo del titolo fornito su sfondo bianco (Gemini, 7/11/2026) e lo salva trasparente.
# - sfondo = bianco collegato in zone grandi (fuori e dentro le O)
# - lettere opache; frangia verso il bianco con "colore verso alfa" (niente alone chiaro)
# - l'estrusione grigia chiara attaccata al bianco viene scurita: sugli sfondi scuri non fa da alone
# Uso: python3 strumenti/logo/scontorna_logo.py strumenti/logo/logo_titolo_bianco.jpg assets/icons/logo_titolo.webp [larghezza]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
larg = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
a = np.array(Image.open(src).convert('RGB')).astype(np.float32)
d = (255 - a).max(-1)                      # distanza dal bianco (0 = bianco puro)
sat = a.max(-1) - a.min(-1); lum = a.mean(-1)

quasi_bianco = d <= 18
lab, n = ndimage.label(quasi_bianco)
dim = ndimage.sum(quasi_bianco, lab, range(1, n + 1))
grandi = np.zeros(n + 1, bool); grandi[1:] = dim > 400
sfondo = grandi[lab]

# lettera piena: chiaramente non bianco, piu' i riflessi chiari chiusi dentro
pieno = ((d >= 70) | ~ndimage.binary_dilation(sfondo, iterations=3)) & ~sfondo

# alfa: opaco dentro, "colore verso alfa" nella frangia
alfa = np.clip(d / 255.0 * 1.15, 0, 1)
dist = ndimage.distance_transform_edt(~pieno)
alfa = np.where(pieno, 1, np.maximum(alfa, np.clip(1 - dist / 1.5, 0, 1) * (d > 30)))
alfa[sfondo] = 0
col = (a - 255 * (1 - alfa[..., None])) / np.maximum(alfa, 1e-3)[..., None]
col = np.clip(col, 0, 255)

# estrusione/ombra grigia che tocca lo sfondo: diventa un'estrusione scura (blu notte), quasi opaca
grigio = (sat < 20) & (lum > 50) & ~sfondo
lg, ng = ndimage.label(grigio)
tocca = np.unique(lg[ndimage.binary_dilation(sfondo, iterations=2) & grigio])
estr = np.isin(lg, tocca[tocca > 0])
# anche le macchie grigie chiuse tra estrusione e lettera (es. sotto le gambe della M)
tocca2 = np.unique(lg[ndimage.binary_dilation(estr, iterations=3) & grigio])
estr = np.isin(lg, tocca2[tocca2 > 0])
estr = ndimage.binary_closing(estr, iterations=2) & ~sfondo & (sat < 26)
chiaro = (sat < 30) & (lum > 120) & ~sfondo
for _ in range(12):                                         # le macchie chiare attaccate all'estrusione
    estr = estr | (ndimage.binary_dilation(estr) & chiaro)
SCURO = np.array([26, 20, 40], np.float32)
sfum = np.clip((lum - 50) / 205, 0, 1)[..., None]          # conserva un po' di chiaroscuro
col = np.where(estr[..., None], SCURO + sfum * np.array([70, 62, 90], np.float32), col)
alfa = np.where(estr, np.maximum(alfa, np.clip(d / 255 * 3, 0, 0.92)), alfa)
ys, xs = np.where(alfa > 0.02)
m = 8
y0, y1 = max(ys.min() - m, 0), min(ys.max() + m, a.shape[0])
x0, x1 = max(xs.min() - m, 0), min(xs.max() + m, a.shape[1])
rgba = np.dstack([col, alfa * 255])[y0:y1, x0:x1]
# ridimensiona premoltiplicato, cosi' i bordi non prendono colori sbagliati
pm = rgba.copy(); pm[..., :3] *= pm[..., 3:] / 255
h = round(pm.shape[0] * larg / pm.shape[1])
ch = [np.array(Image.fromarray(pm[..., i]).resize((larg, h), Image.LANCZOS)) for i in range(4)]
r = np.dstack(ch)
r[..., 3] = np.clip(r[..., 3], 0, 255)
r[..., :3] = np.clip(r[..., :3] * 255 / np.maximum(r[..., 3:], 1), 0, 255)
fin = Image.fromarray(r.astype(np.uint8), 'RGBA')
if out.endswith('.webp'):
    fin.save(out, 'WEBP', quality=92, method=6)
else:
    fin.save(out)
print(out, fin.size)
