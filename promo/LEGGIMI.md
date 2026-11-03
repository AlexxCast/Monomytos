# Video promozionali automatici

Ogni giorno alle 17:00 (ora italiana) il workflow **Video promozionali**
(`.github/workflows/promo-video.yml`):

1. legge `promo/scaletta.json` e trova il copione di oggi;
2. apre il gioco in un browser automatico e **registra il gameplay** (partite vere giocate
   dall'IA, apertura bustine, Storia, mazzo, eroi), in verticale 1080x1920;
3. **monta il video** con ffmpeg: testi a fumetto dal copione, musica del gioco, cartello
   finale con il logo;
4. lo **pubblica** sulle piattaforme configurate (YouTube Shorts, TikTok, Instagram Reels,
   Bluesky, canale Telegram, Discord);
5. salva il video nella release **promo-video** e apre una **issue** con il video, l'esito per
   ogni piattaforma e le didascalie pronte da copiare per chi pubblica a mano.

Costa 0 €: GitHub Actions è gratis per i repository pubblici e le API usate sono gratuite.
Senza nessuna chiave configurata il sistema funziona già: ogni giorno ti arriva la issue con il
video pronto da caricare a mano dal telefono.

## File

| File | A cosa serve |
|---|---|
| `scaletta.json` | Calendario: data → copione, piattaforme, lingua. Modificalo per spostare o saltare un giorno. |
| `copioni.json` | I 14 copioni: scene, testi a schermo (italiano e inglese), didascalie, hashtag. |
| `registra.js` | Registra le scene dal gioco con Playwright. |
| `monta.js` | Monta il video finale con ffmpeg. |
| `pubblica.js` | Pubblica con le API ufficiali. Salta le piattaforme senza chiavi. |
| `oggi.js` | Sceglie il copione di oggi dalla scaletta. |
| `token_youtube.js`, `token_tiktok.js` | Da usare una volta sul PC per ottenere le chiavi. |
| `callback.html` | Pagina del sito che mostra il codice di accesso di TikTok. |
| `font/` | Font Bangers (licenza libera OFL) per i testi. |

## Provare a mano

GitHub → **Actions** → **Video promozionali** → **Run workflow**. Puoi scegliere il copione
(per esempio `bustina_leggendaria`). Con **Prova** spuntato il video viene creato ma non pubblicato.

Sul PC (serve Node 20+, ffmpeg e `npm i playwright`):

```
python3 -m http.server 8799 &
node promo/registra.js coop_non_contro http://localhost:8799
node promo/monta.js coop_non_contro
# il video è in promo/uscita/coop_non_contro/coop_non_contro.mp4
```

Per i testi in inglese: `LINGUA=en node promo/registra.js ...` e `LINGUA_TESTI=en node promo/monta.js ...`,
oppure `"lingua_testi": "en"` nella scaletta.

## Collegare le piattaforme

Le chiavi vanno in GitHub → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**. Ogni piattaforma è indipendente: configura solo quelle che vuoi.

### Bluesky (5 minuti, nessuna approvazione)

1. Crea l'account e verifica l'email (serve per i video).
2. Impostazioni → Privacy e sicurezza → **Password per le app** → crea.
3. Secrets: `BSKY_HANDLE` (es. `monomythos.bsky.social`) e `BSKY_APP_PASSWORD`.

### Canale Telegram (5 minuti, nessuna approvazione)

1. Su Telegram scrivi a **@BotFather** → `/newbot` → copia il token.
2. Crea un canale pubblico, aggiungi il bot come amministratore.
3. Secrets: `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` (es. `@monomythos`).

### Discord (2 minuti)

Impostazioni del canale annunci → Integrazioni → **Webhook** → Copia URL.
Secret: `DISCORD_WEBHOOK_URL`.

### YouTube Shorts (20 minuti)

1. [console.cloud.google.com](https://console.cloud.google.com): nuovo progetto → abilita **YouTube Data API v3**.
2. **Schermata di consenso OAuth**: tipo Esterno, poi **Pubblica app** (stato "In produzione").
   Se resta "In test", la chiave scade dopo 7 giorni. Non serve la verifica di Google per uso
   personale: al primo accesso vedrai "app non verificata" → Avanzate → Vai all'app.
3. Credenziali → Crea **ID client OAuth** → tipo **App desktop** → copia ID e segreto.
4. Sul PC: `node promo/token_youtube.js <ID> <SEGRETO>` e segui le istruzioni.
5. Secrets: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.

**Limite onesto:** i progetti Google non verificati possono caricare solo video **privati**.
Per pubblicarli in automatico come pubblici bisogna superare l'audit gratuito di YouTube
(modulo "YouTube API Services – Audit and Quota Extension"), che richiede qualche settimana e
non è garantito. Nel frattempo i video arrivano privati sul canale e li rendi pubblici da
YouTube Studio con un tocco. Il limite giornaliero gratuito basta per circa 6 video al giorno.

### Instagram Reels (30 minuti)

1. Nell'app Instagram: Impostazioni → Tipo di account → passa a **Account professionale**
   (Creator, gratis).
2. [developers.facebook.com](https://developers.facebook.com) → Crea app (tipo Business) →
   aggiungi il prodotto **Instagram** → "API con accesso Instagram".
3. Ruoli dell'app → aggiungi il tuo account Instagram come **Tester** e accetta l'invito
   dall'app Instagram (Impostazioni → App e siti web).
4. Nella pagina di configurazione dell'API premi **Genera token** accanto al tuo account:
   ottieni il token (60 giorni) e l'ID utente Instagram.
5. Secrets: `IG_ACCESS_TOKEN`, `IG_USER_ID`.

**Limiti onesti:** l'app resta in modalità sviluppo, che basta per pubblicare sul tuo account
(non serve la revisione di Meta). Instagram scarica il video da un indirizzo pubblico: il
workflow usa il file della release, quindi il repository deve restare pubblico. Il token dura
60 giorni: il workflow lo rinnova da solo se configuri anche `PAT_SEGRETI` (vedi sotto),
altrimenti rigeneralo ogni 50 giorni circa.

### TikTok (il più lento da approvare)

1. [developers.tiktok.com](https://developers.tiktok.com) → crea un'app → aggiungi
   **Login Kit** e **Content Posting API**.
2. Redirect URI: `https://alexxcast.github.io/Monomytos/promo/callback.html`
   (funziona dopo che questo codice è sul ramo principale del sito).
3. Come sito, privacy e termini puoi usare le pagine di GitHub Pages del gioco.
4. Invia l'app in revisione (gratis). Prima dell'approvazione puoi provare in modalità **Sandbox**.
5. Sul PC: `node promo/token_tiktok.js <CLIENT_KEY> <CLIENT_SECRET>`.
6. Secrets: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN`.

**Limiti onesti:** finché TikTok non fa l'audit della Content Posting API, i video pubblicati
in automatico sono visibili **solo a te**. Per questo la modalità predefinita è **bozza**: il
video arriva nella posta di TikTok (notifica sul telefono) e lo pubblichi tu con un tocco,
aggiungendo un suono di tendenza (che via API non si può mettere e che su TikTok aiuta molto).
Dopo l'audit imposta la variabile `TIKTOK_MODO=diretto` e `TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE`
(Settings → Secrets and variables → Actions → **Variables**).

### Rinnovo automatico dei token (facoltativo)

Instagram e TikTok rinnovano i token a ogni uso. Per salvarli in automatico crea un token
GitHub: Settings (del tuo profilo) → Developer settings → **Fine-grained tokens** → solo il
repository Monomytos → permesso **Secrets: Read and write**. Mettilo nel Secret `PAT_SEGRETI`.

### Piattaforme senza automazione

- **Reddit**: niente pubblicazione automatica. Le regole dei subreddit vietano i post promozionali
  automatici e le nuove app API devono essere approvate da Reddit. La scaletta ti ricorda il
  giorno e il piano ha i testi pronti.
- **X, Threads, Facebook**: le didascalie della issue vanno bene anche lì; si possono
  automatizzare più avanti se servono.

## Cose da sapere

- GitHub sospende i workflow programmati dopo 60 giorni senza commit nel repository: basta
  aggiornare la scaletta ogni tanto.
- L'orario programmato di GitHub può slittare di qualche minuto.
- Ogni video è diverso anche con lo stesso copione, perché la partita è giocata dal vivo.
- I nuovi testi dei copioni vanno scritti sia in `it` sia in `en`.
