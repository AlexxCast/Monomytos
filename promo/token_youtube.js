// Ottiene il "refresh token" di YouTube da mettere nei Secrets di GitHub (si fa una volta sola).
// Uso sul tuo PC: node promo/token_youtube.js <CLIENT_ID> <CLIENT_SECRET>
// Si apre un indirizzo da aprire nel browser: accedi con l'account del canale YouTube,
// accetta (se compare "app non verificata": Avanzate → Vai all'app) e torna qui.
const http = require('http');
const [clientId, clientSecret] = process.argv.slice(2);
if (!clientId || !clientSecret) { console.log('Uso: node promo/token_youtube.js <CLIENT_ID> <CLIENT_SECRET>'); process.exit(1); }
const PORTA = 8765;
const redirect = `http://127.0.0.1:${PORTA}`;
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: clientId, redirect_uri: redirect, response_type: 'code', access_type: 'offline', prompt: 'consent',
  // upload = pubblicare; force-ssl = leggere statistiche e commenti e rispondere (Centro social)
  scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl'
});
console.log('\nApri questo indirizzo nel browser:\n\n' + url + '\n');
http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code');
  if (!code) { res.end('Nessun codice'); return; }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: 'authorization_code' })
  });
  const j = await r.json();
  res.end(j.refresh_token ? 'Fatto! Torna al terminale.' : 'Errore: ' + JSON.stringify(j));
  if (j.refresh_token) console.log('Metti questo valore nel Secret YT_REFRESH_TOKEN:\n\n' + j.refresh_token + '\n');
  else console.log('Errore:', j);
  process.exit(0);
}).listen(PORTA, '127.0.0.1');
