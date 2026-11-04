# Istruzioni per Antigravity

Lavori nel repo Monomythos (https://github.com/AlexxCast/Monomytos, ramo main).

A ogni giro:
1. `git pull` per avere le liste aggiornate.
2. Prima rifai TUTTE le carte di `strumenti/gemini/da_rifare.md`, poi continua con le prime 20 di `strumenti/gemini/prompt_da_fare.md`.
3. Per ogni carta genera UNA immagine verticale 2:3 con il tuo strumento di generazione immagini, usando esattamente il prompt scritto sotto il titolo. Non allegare immagini di riferimento.
4. Salva l'immagine come `strumenti/gemini/nuove/<id>.png`, dove <id> è il nome nel titolo (es. `## t_torneoclandestino.png` → `strumenti/gemini/nuove/t_torneoclandestino.png`).
5. Prima di salvarla guardala: se ha scritte, vignette separate, mani o armi deformi, o lo stesso sfondo di un'altra carta, rigenerala (massimo 3 tentativi).
6. `git add strumenti/gemini/nuove && git commit -m "Immagini Gemini: <elenco id>" && git push`.

Un'azione automatica su GitHub mette le immagini nel gioco e toglie le carte dalle liste. Non modificare altri file del repo.
