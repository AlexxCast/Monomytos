# Centro social

Pagina unica con tutti i social di Monomythos: https://alexxcast.github.io/Monomytos/hub/ (non indicizzata, si può salvare sulla Home del telefono).

- Statistiche: `.github/workflows/social-statistiche.yml` ogni 6 ore esegue `promo/statistiche.js` e salva i dati nel ramo `hub-dati`
  (`statistiche.json`, `storico.json`). Usa i Secrets YT_*, TIKTOK_*, IG_*, BSKY_HANDLE, TELEGRAM_*; una piattaforma senza Secrets viene saltata.
  Permessi: YouTube `youtube.readonly` (`node promo/token_youtube.js`), TikTok `user.info.stats` e `video.list` (`node promo/token_tiktok.js`),
  Instagram `instagram_business_manage_insights`. Bluesky non dà le visualizzazioni, Telegram solo gli iscritti.
- Analisi AI: ogni sera un'attività programmata di Claude riscrive la issue con etichetta `analisi-ai`; dalla pagina puoi scriverle.
- Invio dei video: funziona quando sono unite anche le modifiche dei video promozionali (workflow `promo-video.yml`).
- Accesso solo tuo: senza chiave la pagina non mostra niente. Chiave: token GitHub fine-grained solo su Monomytos con Actions, Contents e Issues in lettura e scrittura, incollato nelle Impostazioni. Resta nel browser.
