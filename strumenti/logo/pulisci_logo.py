# Pulisce il logo del titolo: toglie l alone bianco rimasto dallo scontorno, rende i bordi lisci
# (quasi vettoriali) con un contorno scuro sottile e salva a doppia risoluzione.
# Uso: python3 strumenti/logo/pulisci_logo.py strumenti/logo/logo_titolo_originale.webp assets/icons/logo_titolo.webp
import sys
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
src=Image.open(sys.argv[1]).convert('RGBA'); out=sys.argv[2]
W,H=src.size; K=4
a=np.array(src).astype(np.float32)
mask=a[...,3]>127
rgb=a[...,:3].copy()
idx=ndimage.distance_transform_edt(~mask,return_distances=False,return_indices=True)
rgb=rgb[idx[0],idx[1]]
dist_in=ndimage.distance_transform_edt(mask)
lum=rgb.mean(-1); sat=rgb.max(-1)-rgb.min(-1)
# alone chiaro rimasto dallo sfondo bianco: pixel chiari e grigi sul bordo esterno
halo=mask&(dist_in<=2.5)&(lum>120)&(sat<90)
print('alone chiaro (px):',int(halo.sum()))
buono=mask&~halo
idx2=ndimage.distance_transform_edt(~buono,return_distances=False,return_indices=True)
rgb[halo]=rgb[idx2[0],idx2[1]][halo]
fuori=~mask
rgb[fuori]=rgb[idx2[0],idx2[1]][fuori]
R=np.array(Image.fromarray(rgb.clip(0,255).astype(np.uint8)).resize((W*K,H*K),Image.LANCZOS)).astype(np.float32)
A=Image.fromarray((mask*255).astype(np.uint8)).resize((W*K,H*K),Image.BICUBIC).filter(ImageFilter.GaussianBlur(K*0.9))
A=np.array(A).astype(np.float32)/255
# forma liscia: soglia sulla maschera sfocata, poi bordo antialias da distanza firmata
dentro=A>0.62
d_out=ndimage.distance_transform_edt(~dentro); d_in=ndimage.distance_transform_edt(dentro)
sd=np.where(dentro,-d_in,d_out)
A=np.clip(0.5-sd/1.4,0,1)
# contorno scuro netto di ~1 px (a grandezza originale) tutto intorno
S=4.0
alf=np.clip(0.5-(sd-S)/1.4,0,1)
dark=np.array([24,14,30],np.float32)
colp=(R*A[...,None]+dark*(alf-A)[...,None])/np.maximum(alf,1e-4)[...,None]
big=Image.fromarray(np.dstack([colp.clip(0,255),alf*255]).astype(np.uint8),'RGBA')
fin=big.resize((W*2,H*2),Image.LANCZOS)
fin.save(out,'WEBP',quality=92,method=6)
print(fin.size)
