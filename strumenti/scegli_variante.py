#!/usr/bin/env python3
"""Sceglie la versione migliore di ogni carta tra quelle in assets/cards/gen/varianti/.

  python strumenti/scegli_variante.py --anteprima foglio.jpg     # foglio di confronto delle versioni in attesa
  python strumenti/scegli_variante.py t_blackoutostile=2 c_presidio=0
        id=N  mette in gioco la versione N;  id=0  le scarta tutte (la carta verrà rifatta)
  python strumenti/scegli_variante.py --approva t_cultistidelvelo ...   # approva l'immagine già in gioco
"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import genera_immagini_carte as g


def anteprima(out):
    from PIL import Image, ImageDraw
    fs = sorted(f for f in os.listdir(g.VAR_DIR) if f.endswith('.webp'))
    ids = sorted({f.split('_v')[0] for f in fs})
    W, H = 240, 360
    sheet = Image.new('RGB', (4 * (W + 6) + 6, max(1, len(ids)) * (H + 24) + 6), (35, 35, 42))
    d = ImageDraw.Draw(sheet)
    for i, cid in enumerate(ids):
        y = 6 + i * (H + 24)
        att = os.path.join(g.OUT_DIR, f'{cid}.webp')
        cols = [('in gioco ora', att)] + [(f'v{v}', os.path.join(g.VAR_DIR, f'{cid}_v{v}.webp')) for v in range(1, 4)]
        for j, (lab, p) in enumerate(cols):
            x = 6 + j * (W + 6)
            if os.path.exists(p):
                sheet.paste(Image.open(p).convert('RGB').resize((W, H)), (x, y))
            d.text((x, y + H + 5), f'{cid}  {lab}' if j == 0 else lab, fill='white')
    sheet.save(out, quality=85)
    print(f'{len(ids)} carte in attesa -> {out}')


def main():
    args = sys.argv[1:]
    if args[:1] == ['--anteprima']:
        return anteprima(args[1] if len(args) > 1 else 'varianti.jpg')
    approvate = set(g.load_json(g.APPROVATE_PATH, []))
    if args[:1] == ['--approva']:
        approvate.update(args[1:])
    else:
        prefix, data, suffix = g.load_data()
        carte = {c['id']: c for c in g.tutte_le_carte(data)}
        versions = g.load_versions()
        for a in args:
            cid, v = a.split('=')
            v = int(v)
            if v:
                shutil.copyfile(os.path.join(g.VAR_DIR, f'{cid}_v{v}.webp'), os.path.join(g.OUT_DIR, f'{cid}.webp'))
                c = carte[cid]
                rel = f'{g.REL_DIR}/{cid}.webp'
                (g.update_extra_refs if 'kind' in c else g.update_card_refs)(data, c, rel)
                versions[cid] = g.PROMPT_VERSION
                approvate.add(cid)
            for n in range(1, 10):
                p = os.path.join(g.VAR_DIR, f'{cid}_v{n}.webp')
                if os.path.exists(p):
                    os.remove(p)
            print(cid, f'versione {v} in gioco' if v else 'scartate tutte: verrà rifatta')
        g.save_data(prefix, data, suffix)
        g.save_versions(versions)
    with open(g.APPROVATE_PATH, 'w', encoding='utf-8') as f:
        json.dump(sorted(approvate), f, ensure_ascii=False, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main()
