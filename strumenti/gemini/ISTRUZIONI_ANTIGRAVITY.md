# Istruzioni per Antigravity

Lavori nel repo Monomythos (https://github.com/AlexxCast/Monomytos, ramo main).

A ogni giro:
1. `git pull` per avere le liste aggiornate (se git non c'è, Alessio fa "Fetch/Pull origin" da GitHub Desktop prima di iniziare).
2. Prima rifai TUTTE le carte di `strumenti/gemini/da_rifare.md`, poi continua con le prime 20 di `strumenti/gemini/prompt_da_fare.md`.
3. Per ogni carta genera UNA immagine ORIZZONTALE 16:9 (larga e bassa, soggetto intero al centro) con il tuo strumento di generazione immagini, usando esattamente il prompt scritto sotto il titolo. Non allegare immagini di riferimento.
4. Salva l'immagine come `strumenti/gemini/nuove/<id>.png`, dove <id> è il nome nel titolo (es. `## t_torneoclandestino.png` → `strumenti/gemini/nuove/t_torneoclandestino.png`).
5. Controlla le misure: l'immagine deve essere PIÙ LARGA CHE ALTA (es. 1344×768). Le ultime 23 sono arrivate verticali (848×1264) e il soggetto resta tagliato nella carta. Se lo strumento ha un'opzione di formato/aspect ratio, impostala su 16:9; se esce verticale, rigenerala.
6. Prima di salvarla guardala: se ha scritte, vignette separate, mani o armi deformi, o lo stesso sfondo di un'altra carta, rigenerala (massimo 3 tentativi).
7. `git add strumenti/gemini/nuove && git commit -m "Immagini Gemini: <elenco id>" && git push`.
   Se git non è disponibile o il push non riesce, lascia le immagini nella cartella e avvisa: Alessio farà commit e "Push origin" da GitHub Desktop.

Un'azione automatica su GitHub mette le immagini nel gioco e toglie le carte dalle liste. Non modificare altri file del repo.

## Modalità continua
- Fai commit e push dopo OGNI immagine salvata, così non si perde nulla.
- Se ricevi `429 RESOURCE_EXHAUSTED`, leggi l'orario di ripristino nel messaggio, aspetta fino a quell'ora + 2 minuti (comando di attesa nel terminale) e riprendi dalla carta successiva.
- Prima di ogni nuovo gruppo fai `git pull`: Claude aggiorna le liste.
- Continua finché `da_rifare.md` e `prompt_da_fare.md` non hanno più carte.
