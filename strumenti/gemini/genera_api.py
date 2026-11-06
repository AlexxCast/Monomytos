#!/usr/bin/env python3
"""Genera in automatico le illustrazioni con l'API ufficiale di Gemini (Vertex AI).

Legge i prompt da prompt_storia.md, da_rifare.md e prompt_da_fare.md (in quest'ordine),
manda OGNI prompt come richiesta separata (come una chat nuova: niente memoria tra un'immagine
e l'altra, niente immagini di riferimento) e salva il risultato in strumenti/gemini/nuove/<id>.png.
Poi il workflow lancia inserisci.py, che mette le immagini nel gioco e toglie i prompt dalle liste.

Variabili d'ambiente:
  GCP_PROJECT     progetto Google Cloud (se manca lo prende dalla chiave del service account)
  GEMINI_MODELLO  modello immagini (predefinito gemini-3-pro-image-preview = Nano Banana Pro)
  GEMINI_LUOGO    regione Vertex (predefinita global)
  QUANTE          numero massimo di immagini in questo giro (predefinito 20)
  SOLO            elenco di id separati da virgola da fare (facoltativo)
"""
import json, os, re, sys, time

QUI = os.path.dirname(os.path.abspath(__file__))
NUOVE = os.path.join(QUI, 'nuove')
LISTE = ['prompt_storia.md', 'da_rifare.md', 'prompt_da_fare.md']


def leggi_prompt():
    """Restituisce [(id, prompt, file)] nell'ordine di priorità, senza doppioni."""
    out, visti = [], set()
    for nome in LISTE:
        p = os.path.join(QUI, nome)
        if not os.path.exists(p):
            continue
        testo = open(p, encoding='utf-8').read()
        for m in re.finditer(r'^## (\S+)\.png[^\n]*\n(.*?)(?=^#{1,2} |\Z)', testo, flags=re.S | re.M):
            cid, corpo = m.group(1).strip().lower(), m.group(2)
            # tolgo le righe "Problema: ..." (sono note per noi, non per Gemini)
            righe = [r for r in corpo.strip().splitlines() if r.strip() and not r.startswith('Problema:')]
            prompt = ' '.join(r.strip() for r in righe).strip()
            if cid in visti or not prompt:
                continue
            visti.add(cid)
            out.append((cid, prompt, nome))
    return out


def formato(prompt):
    for r in ('9:16', '3:4', '2:3', '16:9', '1:1'):
        if r in prompt[:200]:
            return r
    return '2:3'


def main():
    from google import genai
    from google.genai import types

    progetto = os.environ.get('GCP_PROJECT')
    cred = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if not progetto and cred and os.path.exists(cred):
        progetto = json.load(open(cred)).get('project_id')
    if not progetto:
        sys.exit('Manca il progetto Google Cloud (segreto GCP_SA_KEY non configurato?)')
    modello = os.environ.get('GEMINI_MODELLO') or 'gemini-3-pro-image-preview'
    luogo = os.environ.get('GEMINI_LUOGO') or 'global'
    quante = int(os.environ.get('QUANTE') or 20)
    solo = {s.strip().lower().removesuffix('.png') for s in (os.environ.get('SOLO') or '').split(',') if s.strip()}

    client = genai.Client(vertexai=True, project=progetto, location=luogo)
    os.makedirs(NUOVE, exist_ok=True)

    lista = [x for x in leggi_prompt() if not solo or x[0] in solo]
    lista = [x for x in lista if not os.path.exists(os.path.join(NUOVE, x[0] + '.png'))]
    print(f'Da fare: {len(lista)} immagini. In questo giro: max {quante}. Modello: {modello}')
    fatte, saltate = [], []
    for cid, prompt, origine in lista[:quante]:
        ok = False
        for tentativo in range(3):
            try:
                r = client.models.generate_content(
                    model=modello, contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=['IMAGE'],
                        image_config=types.ImageConfig(aspect_ratio=formato(prompt))))
                img = None
                for cand in (r.candidates or []):
                    for part in (cand.content.parts if cand.content else []) or []:
                        if part.inline_data and part.inline_data.data:
                            img = part.inline_data.data
                if img:
                    with open(os.path.join(NUOVE, cid + '.png'), 'wb') as fh:
                        fh.write(img)
                    ok = True
                    break
                motivo = r.candidates[0].finish_reason if r.candidates else getattr(r, 'prompt_feedback', '?')
                print(f'  {cid}: nessuna immagine ({motivo}), riprovo')
            except Exception as e:  # quota, filtro, rete
                msg = str(e)
                print(f'  {cid}: errore {msg[:300]}')
                if '429' in msg or 'RESOURCE_EXHAUSTED' in msg:
                    time.sleep(60 * (tentativo + 1))
                elif 'PERMISSION_DENIED' in msg or 'billing' in msg.lower() or '403' in msg:
                    print('Accesso negato o fatturazione non attiva: mi fermo.')
                    riepilogo(fatte, saltate + [cid]); sys.exit(1)
                else:
                    time.sleep(5)
        (fatte if ok else saltate).append(cid)
        print(f'{"OK" if ok else "SALTATA"} {cid} ({origine})')
    riepilogo(fatte, saltate)


def riepilogo(fatte, saltate):
    testo = f'Generate {len(fatte)}: {", ".join(fatte) or "-"}\nNon riuscite {len(saltate)}: {", ".join(saltate) or "-"}\n'
    print(testo)
    s = os.environ.get('GITHUB_STEP_SUMMARY')
    if s:
        open(s, 'a').write('### Immagini Gemini (API)\n\n' + testo.replace('\n', '\n\n'))


if __name__ == '__main__':
    main()
