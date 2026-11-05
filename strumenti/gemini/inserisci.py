#!/usr/bin/env python3
"""Mette in gioco le immagini fatte con Gemini caricate in strumenti/gemini/nuove/<id>.png.

Per ogni file: salva l'originale in strumenti/originali_gemini/, taglia un piccolo margine
(eventuale logo), lo converte nel formato delle carte, aggiorna i dati del gioco e toglie la carta
da prompt_da_fare.md e da da_rifare.md. Lo lancia il workflow "Inserisci immagini Gemini".
"""
import glob, io, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import genera_immagini_carte as g
from PIL import Image

QUI = os.path.dirname(os.path.abspath(__file__))
ORIG = os.path.join(g.ROOT, 'strumenti', 'originali_gemini')
STORIA = os.path.join(g.ROOT, 'assets', 'storia')


def togli_sezione(path, cid):
    if not os.path.exists(path):
        return
    s = open(path, encoding='utf-8').read()
    s2 = re.sub(r'## ' + re.escape(cid) + r'\.png .*?(?=\n## |\Z)', '', s, flags=re.S)
    if s2 != s:
        open(path, 'w', encoding='utf-8').write(s2.rstrip() + '\n')


def main():
    files = sorted(glob.glob(os.path.join(QUI, 'nuove', '*.png')) + glob.glob(os.path.join(QUI, 'nuove', '*.jpg'))
                   + glob.glob(os.path.join(QUI, 'nuove', '*.webp')))
    if not files:
        print('Nessuna immagine nuova.'); return
    prefix, data, suffix = g.load_data()
    carte = {c['id']: c for c in g.tutte_le_carte(data)}
    vers = g.load_versions()
    appr = set(g.load_json(g.APPROVATE_PATH, []))
    os.makedirs(ORIG, exist_ok=True)
    fatte, ignote = [], []
    for f in files:
        cid = os.path.splitext(os.path.basename(f))[0].strip().lower()
        # Vignette della Storia (s_<nome>): vanno in assets/storia/, larghe 1080, senza cornice della carta
        if cid.startswith('s_'):
            im = Image.open(f).convert('RGB')
            im.save(os.path.join(ORIG, f'{cid}.webp'), 'WEBP', quality=90)
            w, h = im.size
            im = im.crop((int(w * .015), int(h * .015), int(w * .985), int(h * .985)))
            if im.width > 1080: im = im.resize((1080, round(im.height * 1080 / im.width)), Image.LANCZOS)
            os.makedirs(STORIA, exist_ok=True)
            im.save(os.path.join(STORIA, f'{cid}.webp'), 'WEBP', quality=80, method=6)
            togli_sezione(os.path.join(QUI, 'prompt_storia.md'), cid)
            os.remove(f); fatte.append(cid); continue
        if cid not in carte:
            ignote.append(os.path.basename(f)); continue
        im = Image.open(f).convert('RGB')
        im.save(os.path.join(ORIG, f'{cid}.webp'), 'WEBP', quality=90)
        w, h = im.size
        im = im.crop((int(w * .02), int(h * .02), int(w * .98), int(h * .95)))
        if im.width > im.height:
            # orizzontale: va così com'è (nella carta viene ritagliata al centro)
            im.thumbnail((1024, 1024), Image.LANCZOS)
            im.save(os.path.join(g.OUT_DIR, f'{cid}.webp'), 'WEBP', quality=82, method=6)
        else:
            b = io.BytesIO(); im.save(b, 'PNG')
            g.to_card_webp(b.getvalue(), os.path.join(g.OUT_DIR, f'{cid}.webp'))
        c = carte[cid]; rel = f'{g.REL_DIR}/{cid}.webp'
        (g.update_extra_refs if 'kind' in c else g.update_card_refs)(data, c, rel)
        vers[cid] = g.PROMPT_VERSION; appr.add(cid)
        for n in range(1, 4):
            q = os.path.join(g.VAR_DIR, f'{cid}_v{n}.webp')
            if os.path.exists(q): os.remove(q)
        togli_sezione(os.path.join(QUI, 'prompt_da_fare.md'), cid)
        togli_sezione(os.path.join(QUI, 'da_rifare.md'), cid)
        os.remove(f)
        fatte.append(cid)
    g.save_data(prefix, data, suffix); g.save_versions(vers)
    with open(g.APPROVATE_PATH, 'w', encoding='utf-8') as fh:
        json.dump(sorted(appr), fh, ensure_ascii=False, indent=1); fh.write('\n')
    print(f'Inserite {len(fatte)}: {", ".join(fatte)}')
    if ignote:
        print(f'Nome non riconosciuto (lasciate nella cartella): {", ".join(ignote)}')


if __name__ == '__main__':
    main()
