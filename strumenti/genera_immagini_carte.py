#!/usr/bin/env python3
"""Monomythos: generatore automatico degli sfondi delle carte.

Per ogni carta Azione crea uno sfondo in stile cartoon/fumetto che mostra l'azione
del titolo (mai un personaggio riconoscibile), lo salva in assets/cards/gen/<id>.webp
e aggiorna js/cards_data.js e js/cards_data.json perché il gioco lo usi subito.
Le cornici restano quelle attuali (assets/layouts): l'app le sovrappone allo sfondo.

Generatore: Cloudflare Workers AI, modello FLUX.1 [schnell] (licenza Apache 2.0, uso
commerciale consentito). Piano gratuito: 10.000 "neuroni" al giorno, circa 150-170
immagini. Il programma salta le carte già fatte, quindi si può rilanciare ogni giorno.

Variabili d'ambiente richieste:
  CF_ACCOUNT_ID   ID dell'account Cloudflare
  CF_API_TOKEN    token API con permesso "Workers AI"

Uso:
  python strumenti/genera_immagini_carte.py               # genera ciò che manca
  python strumenti/genera_immagini_carte.py --max 20      # al massimo 20 immagini
  python strumenti/genera_immagini_carte.py --solo ironaegis_1 --rifai
  python strumenti/genera_immagini_carte.py --prova       # mostra i prompt, nessuna chiamata
"""
import argparse, base64, hashlib, http.client, io, json, os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS = os.path.join(ROOT, 'js', 'cards_data.js')
DATA_JSON = os.path.join(ROOT, 'js', 'cards_data.json')
OUT_DIR = os.path.join(ROOT, 'assets', 'cards', 'gen')
REL_DIR = 'assets/cards/gen'
# FLUX.2 klein 4B: molto più pulito di flux-1-schnell (meno artefatti, niente scritte casuali),
# accetta immagini di riferimento per lo stile e costa circa lo stesso nella quota gratuita.
MODEL = os.environ.get('CF_MODEL', '@cf/black-forest-labs/flux-2-klein-4b')
GEN_W, GEN_H = 640, 960
# Riferimenti di stile: ritagli delle illustrazioni originali, uno per Categoria
REF_DIR = os.path.join(ROOT, 'strumenti', 'riferimenti_stile')
API_BASE = os.environ.get('CF_API_BASE', 'https://api.cloudflare.com/client/v4')

# Stile ricavato dalle illustrazioni già presenti (Impatto Devastante, Gancio Balistico,
# Kit di Riparazione, Assalto Fluido): fumetto/cartoon con inchiostro spesso, primi piani
# dinamici di mani, armi e gadget, esplosioni di energia, retini e linee cinetiche.
STYLE = (
    "Bold cartoon comic-book illustration, thick black ink outlines, cel shading, halftone dots, "
    "dynamic speed lines, dramatic close-up of the action, vivid glowing energy effects, sparks and debris, "
    "futuristic city with cosmic energy in the background, high contrast, saturated colors, "
    "vertical composition with the main action in the center of the image and simple background at top and bottom"
)
RULES = (
    "Show only the action or the situation: hands, gloves, armored fists, weapons, gadgets, anonymous silhouettes "
    "seen from behind or in shadow, objects and energy effects. No faces, no recognizable characters, "
    "no superheroes from movies or comics, no logos, no text, no letters, no numbers, no card frame, no border."
)
# Palette per Categoria (coerente con i colori delle cornici e delle icone)
PALETTE = {
    'potenza': 'dominant orange and gold palette, fiery impact',
    'agilita': 'dominant teal and cyan palette, motion blur and afterimages',
    'intelligenza': 'dominant electric blue palette, holographic interfaces and circuitry',
    'vigore': 'dominant emerald green palette, shields and protective barriers',
}
DARK = 'dark noir mood, dominant deep purple and black palette with violet void energy, ominous'

TAG_HINT = {
    'attacco': 'a powerful strike landing on an enemy',
    'difesa': 'a protective barrier blocking an incoming attack',
    'tech': 'a high-tech gadget being activated',
    'gadget': 'a high-tech gadget being activated',
    'magia': 'a mystical spell being cast with glowing runes',
    'reazione': 'a split-second reaction to an incoming blow',
}


def norm(s):
    s = (s or '').lower()
    for a, b in (('à', 'a'), ('è', 'e'), ('é', 'e'), ('ì', 'i'), ('ò', 'o'), ('ù', 'u')):
        s = s.replace(a, b)
    return s


def category_key(cat):
    c = norm(cat)
    if c.startswith('pot'): return 'potenza'
    if c.startswith('agi'): return 'agilita'
    if c.startswith('int'): return 'intelligenza'
    return 'vigore'


SCENES_EN = {}
_scenes_path = os.path.join(ROOT, 'strumenti', 'scene_carte_en.json')
if os.path.exists(_scenes_path):
    SCENES_EN = json.load(open(_scenes_path, encoding='utf-8'))


def build_prompt(card):
    # Scena in inglese (il modello capisce meglio); se manca, usa la descrizione italiana dei dati
    scene = SCENES_EN.get(card.get('id')) or (card.get('illus') or '').strip().rstrip('.')
    tag = norm(card.get('tag'))
    hint = next((v for k, v in TAG_HINT.items() if k in tag), 'a dramatic action moment')
    is_dark = bool(card.get('osc'))
    palette = DARK if is_dark else PALETTE[category_key(card.get('cat'))]
    # Le descrizioni italiane nei dati nominano a volte l'eroe: il prompt chiede comunque nessun volto.
    # Il titolo NON va nel prompt: il modello tende a scriverlo nell'immagine come un fumetto.
    parts = [
        'Create a brand-new illustration drawn in exactly the same art style as image 0: '
        'same line work, ink thickness, cel shading, halftone texture and color treatment. '
        'Do not copy the subject or the composition of image 0',
        f'New scene: {scene}' if scene else f'New scene: {hint}',
        STYLE, palette, RULES,
        'The image must contain no writing of any kind: no title, no caption, no speech bubble, '
        'no sound effect words, no signature, no watermark, no frame',
    ]
    return '. '.join(p.rstrip('.') for p in parts) + '.'


# Versione del prompt: le immagini fatte con una versione precedente vengono rifatte
# (dopo quelle mancanti). v1 metteva il titolo nel prompt e il modello lo scriveva nell'immagine;
# v3 passa a FLUX.2 klein con il riferimento di stile.
PROMPT_VERSION = 3
VERSIONS_PATH = os.path.join(ROOT, 'strumenti', 'sfondi_versioni.json')


def load_versions():
    if os.path.exists(VERSIONS_PATH):
        return json.load(open(VERSIONS_PATH, encoding='utf-8'))
    return {}


def save_versions(v):
    with open(VERSIONS_PATH, 'w', encoding='utf-8') as f:
        json.dump(dict(sorted(v.items())), f, ensure_ascii=False, indent=1)
        f.write('\n')


def seed_for(card_id):
    return int(hashlib.sha256(card_id.encode()).hexdigest()[:7], 16)


def load_data():
    raw = open(DATA_JS, encoding='utf-8', newline='').read()
    start = raw.index('{')
    end = raw.rindex('}')
    return raw[:start], json.loads(raw[start:end + 1]), raw[end + 1:]


def _newline(path):
    try:
        return '\r\n' if b'\r\n' in open(path, 'rb').read(4096) else '\n'
    except OSError:
        return '\n'


def save_data(prefix, data, suffix):
    # Mantiene formattazione e fine riga originali, così le differenze nel repo restano minime
    body = json.dumps(data, ensure_ascii=False, indent=2)
    for path, text in ((DATA_JS, prefix + body + suffix), (DATA_JSON, body)):
        nl = _newline(path)
        text = text.replace('\r\n', '\n').replace('\n', nl)
        open(path, 'w', encoding='utf-8', newline='').write(text)


def style_ref_for(card):
    key = 'oscura' if card.get('osc') else category_key(card.get('cat'))
    path = os.path.join(REF_DIR, f'{key}.png')
    return path if os.path.exists(path) else None


def encode_multipart(fields, files):
    boundary = 'monomythos' + hashlib.sha1(os.urandom(16)).hexdigest()
    out = io.BytesIO()
    for name, value in fields.items():
        out.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        out.write(str(value).encode('utf-8') + b'\r\n')
    for name, (filename, data, ctype) in files.items():
        out.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                  f'Content-Type: {ctype}\r\n\r\n'.encode())
        out.write(data + b'\r\n')
    out.write(f'--{boundary}--\r\n'.encode())
    return out.getvalue(), f'multipart/form-data; boundary={boundary}'


def build_request(prompt, seed, ref_path):
    if 'flux-1-schnell' in MODEL:
        # Il vecchio modello accetta solo 'prompt' e 'steps' (max 8): 'seed' viene rifiutato con HTTP 400
        return json.dumps({'prompt': prompt[:2000], 'steps': 8}).encode(), 'application/json'
    # FLUX.2: sempre multipart, anche senza immagini; steps fisso a 4
    fields = {'prompt': prompt[:2000], 'width': GEN_W, 'height': GEN_H, 'seed': seed}
    files = {}
    if ref_path:
        files['input_image_0'] = (os.path.basename(ref_path), open(ref_path, 'rb').read(), 'image/png')
    return encode_multipart(fields, files)


def call_cloudflare(prompt, seed, ref_path=None):
    account = os.environ.get('CF_ACCOUNT_ID')
    token = os.environ.get('CF_API_TOKEN')
    if not account or not token:
        sys.exit('Mancano CF_ACCOUNT_ID e/o CF_API_TOKEN (vedi istruzioni in testa al file).')
    url = f'{API_BASE}/accounts/{account}/ai/run/{MODEL}'
    body, ctype = build_request(prompt, seed, ref_path)
    req = urllib.request.Request(url, data=body, method='POST', headers={
        'Authorization': f'Bearer {token}', 'Content-Type': ctype})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                raw = r.read()
                rtype = r.headers.get('Content-Type', '')
            if rtype.startswith('image/'):
                return raw
            payload = json.loads(raw)
            result = payload.get('result') or {}
            img = result.get('image') if isinstance(result, dict) else None
            if not img:
                raise RuntimeError(f'Risposta senza immagine: {str(payload)[:300]}')
            return base64.b64decode(img)
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')[:300]
            if e.code == 429 or 'neuron' in msg.lower() or 'daily free allocation' in msg.lower():
                raise QuotaExceeded(msg)
            if 400 <= e.code < 500:
                # Errore nella richiesta o nelle credenziali: riprovare non serve
                raise RuntimeError(f'HTTP {e.code}: {msg}')
            if attempt == 3:
                raise RuntimeError(f'HTTP {e.code}: {msg}')
        except (urllib.error.URLError, TimeoutError, OSError, http.client.HTTPException) as e:
            if attempt == 3:
                raise RuntimeError(str(e))
        time.sleep(2 ** (attempt + 1))


class QuotaExceeded(Exception):
    pass


def to_card_webp(jpeg_bytes, path):
    from PIL import Image
    im = Image.open(io.BytesIO(jpeg_bytes)).convert('RGB')
    # Ritaglio verticale 2:3 centrato: la scena centrale cade nella finestra della cornice
    w, h = im.size
    tw = min(w, int(h * 2 / 3))
    left = (w - tw) // 2
    im = im.crop((left, 0, left + tw, h)).resize((540, 810), Image.LANCZOS)
    im.save(path, 'WEBP', quality=80, method=6)


def update_card_refs(data, card, rel):
    card['img'] = rel
    m = data.get('card_img_map', {})
    for key in (card.get('nome'), re.sub(r'[^a-z0-9]', '', norm(card.get('nome')))):
        if key and key in m:
            # La mappa per nome è condivisa tra carte omonime: si aggiorna solo se non ancora personalizzata
            if not str(m[key]).startswith(REL_DIR):
                m[key] = rel


def write_preview(data):
    rows = []
    for hero, cards in data['action_cards'].items():
        for c in cards:
            if str(c.get('img', '')).startswith(REL_DIR):
                rows.append(f'<figure><img src="../{c["img"]}" loading="lazy"><figcaption>{hero}<br><b>{c["nome"]}</b></figcaption></figure>')
    html = ('<!doctype html><meta charset="utf-8"><title>Anteprima sfondi carte</title>'
            '<style>body{background:#111;color:#eee;font:13px sans-serif;display:flex;flex-wrap:wrap;gap:12px;padding:16px}'
            'figure{margin:0;width:180px}img{width:180px;border-radius:8px}</style>' + ''.join(rows))
    open(os.path.join(ROOT, 'strumenti', 'anteprima_sfondi.html'), 'w', encoding='utf-8').write(html)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--max', type=int, default=150, help='immagini massime per esecuzione (quota gratuita ~150/giorno)')
    ap.add_argument('--solo', nargs='*', help='id delle carte da generare (es. ironaegis_1)')
    ap.add_argument('--rifai', action='store_true', help='rigenera anche le carte già fatte')
    ap.add_argument('--prova', action='store_true', help='mostra i prompt senza chiamare il generatore')
    args = ap.parse_args()

    prefix, data, suffix = load_data()
    os.makedirs(OUT_DIR, exist_ok=True)
    versions = load_versions()
    todo, outdated = [], []
    for hero, cards in data['action_cards'].items():
        for c in cards:
            if args.solo and c['id'] not in args.solo:
                continue
            path = os.path.join(OUT_DIR, f"{c['id']}.webp")
            if os.path.exists(path) and not args.rifai:
                rel = f"{REL_DIR}/{c['id']}.webp"
                if c.get('img') != rel:
                    update_card_refs(data, c, rel)
                if versions.get(c['id'], 1) < PROMPT_VERSION:
                    outdated.append(c)
                continue
            todo.append(c)
    print(f'Mancanti: {len(todo)}, da rifare con il prompt nuovo: {len(outdated)}')
    todo += outdated

    print(f'Carte da generare: {len(todo)} (limite di questa esecuzione: {args.max})')
    done = 0
    errors_in_a_row = 0
    for c in todo[:args.max]:
        prompt = build_prompt(c)
        if args.prova:
            print(f"\n[{c['id']}] {c['nome']}\n{prompt}")
            continue
        try:
            img = call_cloudflare(prompt, seed_for(c['id']), style_ref_for(c))
        except QuotaExceeded as e:
            print(f'Quota gratuita di oggi esaurita, riprendo domani. ({e})')
            break
        except RuntimeError as e:
            print(f"Errore su {c['id']}: {e}")
            errors_in_a_row += 1
            if errors_in_a_row >= 3:
                print('Tre errori di fila: mi fermo. Controlla il messaggio qui sopra.')
                break
            continue
        errors_in_a_row = 0
        path = os.path.join(OUT_DIR, f"{c['id']}.webp")
        to_card_webp(img, path)
        update_card_refs(data, c, f"{REL_DIR}/{c['id']}.webp")
        versions[c['id']] = PROMPT_VERSION
        done += 1
        print(f"OK {done}: {c['id']} {c['nome']}")
        if done % 10 == 0:
            save_data(prefix, data, suffix)
            save_versions(versions)

    if not args.prova:
        save_data(prefix, data, suffix)
        save_versions(versions)
        write_preview(data)
    print(f'Fatto: {done} immagini nuove.')
    if errors_in_a_row >= 3:
        sys.exit(1)


if __name__ == '__main__':
    main()
