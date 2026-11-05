# Statistiche dei social (per l'app Centro social)

Il workflow `.github/workflows/social-statistiche.yml` ogni 6 ore esegue `promo/statistiche.js` e salva i dati nel ramo `hub-dati`
(`statistiche.json`, `storico.json`). Li legge l'app privata *Centro social* di Alessio, che non fa parte del sito né del gioco.

- Usa i Secrets YT_*, TIKTOK_*, IG_*, BSKY_HANDLE, TELEGRAM_*; una piattaforma senza Secrets viene saltata.
- Permessi: YouTube `youtube.readonly` (`node promo/token_youtube.js`), TikTok `user.info.stats` e `video.list` (`node promo/token_tiktok.js`),
  Instagram `instagram_business_manage_insights`. Bluesky non dà le visualizzazioni, Telegram solo gli iscritti.
- L'analisi AI serale è la issue con etichetta `analisi-ai`.

## Risposte ai commenti

`.github/workflows/social-commenti.yml` ogni 2 ore esegue `promo/commenti.js`:
- legge i commenti nuovi degli ultimi 14 giorni su YouTube, Instagram e Bluesky (TikTok non lo permette alle app);
- fa scrivere all'AI una bozza di risposta (Cloudflare Workers AI, piano gratuito: Secrets `CF_ACCOUNT_ID`, `CF_API_TOKEN`);
- salva tutto in `hub-dati/risposte.json` e manda una notifica all'app;
- nell'app Alessio può modificare, approvare o annullare (`hub-dati/decisioni.json`, lo scrive solo l'app);
- le bozze non controllate partono da sole dopo 3 ore (variabile `RITARDO_RISPOSTE_ORE`).

Permessi in più: YouTube `youtube.force-ssl` (rifai `node promo/token_youtube.js`), Instagram `instagram_business_manage_comments`,
Bluesky `BSKY_APP_PASSWORD`.

## Notifiche

`promo/notifica.js` manda le notifiche all'app con Firebase Cloud Messaging (gratis, progetto Firebase del gioco).
Serve il Secret `FCM_SERVICE_ACCOUNT`: Firebase → Impostazioni progetto → Account di servizio → Genera nuova chiave privata,
e incolla tutto il contenuto del file JSON nel Secret.
