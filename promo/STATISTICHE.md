# Statistiche dei social (per l'app Centro social)

Il workflow `.github/workflows/social-statistiche.yml` ogni 6 ore esegue `promo/statistiche.js` e salva i dati nel ramo `hub-dati`
(`statistiche.json`, `storico.json`). Li legge l'app privata *Centro social* di Alessio, che non fa parte del sito né del gioco.

- Usa i Secrets YT_*, TIKTOK_*, IG_*, BSKY_HANDLE, TELEGRAM_*; una piattaforma senza Secrets viene saltata.
- Permessi: YouTube `youtube.readonly` (`node promo/token_youtube.js`), TikTok `user.info.stats` e `video.list` (`node promo/token_tiktok.js`),
  Instagram `instagram_business_manage_insights`. Bluesky non dà le visualizzazioni, Telegram solo gli iscritti.
- L'analisi AI serale è la issue con etichetta `analisi-ai`.
