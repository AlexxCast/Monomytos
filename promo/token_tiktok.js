// Ottiene il "refresh token" di TikTok da mettere nei Secrets di GitHub (si rifà circa una volta l'anno).
// Uso sul tuo PC: node promo/token_tiktok.js <CLIENT_KEY> <CLIENT_SECRET>
// Nell'app TikTok for Developers imposta come Redirect URI:
//   https://alexxcast.github.io/Monomytos/promo/callback.html
// Apri l'indirizzo che compare, accedi con il tuo account TikTok, copia il codice dalla pagina
// e incollalo qui.
const readline = require('readline');
const [key, secret] = process.argv.slice(2);
if (!key || !secret) { console.log('Uso: node promo/token_tiktok.js <CLIENT_KEY> <CLIENT_SECRET>'); process.exit(1); }
const redirect = process.env.REDIRECT_URI || 'https://alexxcast.github.io/Monomytos/promo/callback.html';
const url = 'https://www.tiktok.com/v2/auth/authorize/?' + new URLSearchParams({
  client_key: key, response_type: 'code', redirect_uri: redirect, state: String(Date.now()),
  scope: process.env.SCOPE || 'user.info.basic,user.info.stats,video.list,video.upload,video.publish'
});
console.log('\nApri questo indirizzo nel browser:\n\n' + url + '\n');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Incolla qui il codice: ', async code => {
  rl.close();
  const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: key, client_secret: secret, code: decodeURIComponent(code.trim()), grant_type: 'authorization_code', redirect_uri: redirect })
  });
  const j = await r.json();
  if (j.refresh_token) console.log(`\nMetti questo valore nel Secret TIKTOK_REFRESH_TOKEN (vale ${Math.round((j.refresh_expires_in || 0) / 86400)} giorni):\n\n${j.refresh_token}\n\nPermessi concessi: ${j.scope}`);
  else console.log('Errore:', j);
});
