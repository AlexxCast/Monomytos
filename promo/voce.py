#!/usr/bin/env python3
"""Voce narrante dei video (gratis, edge-tts): una frase per inquadratura.
Uso: python3 promo/voce.py <copione> <cartella uscita>
Legge copione["voce"] = {"nome": "it-IT-DiegoNeural", "stile": "epica"} e crea voce_<i>.mp3 nella cartella del video.
Il testo è q["voce"] (se c'è) oppure il testo a schermo dell'inquadratura."""
import json, os, re, subprocess, sys

cid, out = sys.argv[1], sys.argv[2]
qui = os.path.dirname(os.path.abspath(__file__))
copioni = json.load(open(os.path.join(qui, 'copioni.json'), encoding='utf-8'))['copioni']
c = next(x for x in copioni if x['id'] == cid)
cfg = c.get('voce')
if not cfg:
    print('Nessuna voce per questo copione.'); sys.exit(0)
lingua = os.environ.get('LINGUA_TESTI', 'it')
cartella = os.path.join(out, cid)
os.makedirs(cartella, exist_ok=True)
durate = {}
FILTRI = {
    'epica': 'asetrate=24000*0.92,aresample=24000,atempo=1.08,bass=g=6:f=110,aecho=0.8:0.6:60|120:0.25|0.15',
    'profonda': 'anull',
}
for i, q in enumerate(c['inquadrature']):
    t = q.get('voce', q.get('testo'))
    if isinstance(t, dict): t = t.get(lingua) or t.get('it')
    if not t: continue
    t = re.sub(r'[*{}]', '', t).replace('\\N', ' ')
    t = t[0].upper() + t[1:].lower() if t.isupper() else t  # le scritte in maiuscolo si leggono normali
    grezzo = os.path.join(cartella, f'voce_{i}_grezza.mp3')
    subprocess.run(['edge-tts', '--voice', cfg.get('nome', 'it-IT-DiegoNeural'), f"--rate={cfg.get('velocita', '+12%')}", f"--pitch={cfg.get('tono', '-14Hz')}",
                    '--text', t, '--write-media', grezzo], check=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', grezzo, '-af', FILTRI.get(cfg.get('stile', 'epica'), 'anull') + ',loudnorm=I=-15',
                    '-ar', '44100', '-ac', '2', os.path.join(cartella, f'voce_{i}.mp3')], check=True)
    os.remove(grezzo)
    durate[i] = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(cartella, f'voce_{i}.mp3')], capture_output=True, text=True).stdout.strip() or 0)
    print(f'voce {i}: {t}')
json.dump(durate, open(os.path.join(cartella, 'voce.json'), 'w'))
