# Generatore automatico degli sfondi delle carte

Il sistema crea uno sfondo cartoon per ogni carta Azione (152), lo salva in `assets/cards/gen/` e aggiorna da solo i dati del gioco. Le cornici restano quelle attuali.

- **Stile:** ricavato dalle illustrazioni che hai già (fumetto con inchiostro spesso, primi piani d'azione, esplosioni di energia).
- **Colore:** dipende dalla Categoria: Potenza arancio e oro, Agilità verde acqua, Intelligenza blu, Vigore verde smeraldo, Carte Oscure viola noir.
- **Contenuto:** l'azione del titolo (le scene sono in `scene_carte_en.json`), mai personaggi riconoscibili né volti, mai testo.
- **Costo:** 0 €. Usa Cloudflare Workers AI con il modello FLUX.1 schnell, che ha licenza Apache 2.0 e permette l'uso commerciale. Il piano gratuito dà 10.000 "neuroni" al giorno, circa 150 immagini: in uno o due giorni le fa tutte.

## Configurazione (una volta sola, circa 10 minuti)

1. Crea un account gratuito su [dash.cloudflare.com](https://dash.cloudflare.com).
2. Copia il tuo **Account ID**: si trova nella pagina principale, nella colonna a destra.
3. Vai su "Il mio profilo", poi "Token API", poi "Crea token". Scegli il modello **Workers AI** e crea il token. Copialo subito, perché si vede una volta sola.
4. Nel repo GitHub del gioco vai su Settings, poi Secrets and variables, poi Actions, e aggiungi due segreti:
   - `CF_ACCOUNT_ID` con l'Account ID;
   - `CF_API_TOKEN` con il token.
5. Vai su **Actions**, scegli "Genera immagini carte" e premi **Run workflow**.

Da quel momento:
- ogni notte il sistema genera le carte che mancano e salva tutto nel repo;
- se il sito Netlify è collegato al repo, si aggiorna da solo;
- l'anteprima di tutte le immagini è in `strumenti/anteprima_sfondi.html`.

## Rifare una carta che non ti piace

Da Actions puoi rilanciare a mano. Dal computer invece usa:

```
python strumenti/genera_immagini_carte.py --solo ironaegis_1 --rifai
```

Ogni volta che rifai una carta esce un'immagine diversa: puoi rilanciare finché non ti piace. Se vuoi cambiare cosa rappresenta, modifica prima la sua scena in `scene_carte_en.json`.

## Uso dal computer (senza GitHub)

Serve Python 3 con Pillow (`pip install pillow`). Poi:

```
set CF_ACCOUNT_ID=...
set CF_API_TOKEN=...
python strumenti/genera_immagini_carte.py
```

Su Mac o Linux usa `export` al posto di `set`. Il comando `--prova` mostra i prompt senza generare niente.

**Non scrivere mai il token in chat o dentro i file del repo.**
