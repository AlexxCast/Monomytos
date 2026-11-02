# Monomythos

Gioco di carte tattico cooperativo originale di Alessio Castronovo. È una web app (HTML/JS) che gira nel browser e, impacchettata, come app Android.

- `index.html`, `js/`, `css/`, `assets/`: il gioco.
- `js/engine.js`: il motore, allineato al regolamento ufficiale (V7.7, §8 per la modalità digitale).
- `js/cards_data.js`: tutte le carte, le minacce e gli eroi.
- `strumenti/`: generatore automatico degli sfondi delle carte (vedi `strumenti/LEGGIMI_immagini.md`) e simulatore di partite tra bot.
- `.github/workflows/genera-immagini-carte.yml`: genera ogni notte gli sfondi che mancano (servono i segreti `CF_ACCOUNT_ID` e `CF_API_TOKEN`).

Provalo in locale aprendo `index.html` con un piccolo server, per esempio `python -m http.server`.
