# Ridimensiona il logo del titolo già trasparente (fornito da Alessio) senza aloni ai bordi.
# Uso: python3 strumenti/logo/ridimensiona_logo.py strumenti/logo/logo_titolo_trasparente.png assets/icons/logo_titolo.webp [larghezza]
import sys
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
larg = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
im = Image.open(src).convert('RGBA')
bb = im.getchannel('A').point(lambda v: 255 if v > 4 else 0).getbbox()
im = im.crop(bb)
a = np.array(im).astype(np.float32)
a[..., :3] *= a[..., 3:] / 255                       # premoltiplica: i bordi non prendono il bianco
h = round(a.shape[0] * larg / a.shape[1])
r = np.dstack([np.array(Image.fromarray(a[..., i]).resize((larg, h), Image.LANCZOS)) for i in range(4)])
r[..., 3] = np.clip(r[..., 3], 0, 255)
r[..., :3] = np.clip(r[..., :3] * 255 / np.maximum(r[..., 3:], 1), 0, 255)
fin = Image.fromarray(r.astype(np.uint8), 'RGBA')
fin.save(out, 'WEBP', quality=92, method=6) if out.endswith('.webp') else fin.save(out)
print(out, fin.size)
