// Manda una notifica all'app Centro social (Firebase Cloud Messaging, gratis).
// Uso da script:  require('./notifica')(titolo, testo, { sezione: 'risposte' })
// Uso da shell:   node promo/notifica.js "Titolo" "Testo" [sezione]
// Serve il Secret FCM_SERVICE_ACCOUNT (il file JSON dell'account di servizio Firebase).
// L'app si iscrive all'argomento "centro" (FCM_ARGOMENTO per cambiarlo). Senza Secret non fa niente.
const crypto = require('crypto');

async function notifica(titolo, testo, dati = {}) {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) { console.log('notifica saltata (manca FCM_SERVICE_ACCOUNT): ' + titolo); return false; }
  try {
    const sa = JSON.parse(raw);
    const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
    const ora = Math.floor(Date.now() / 1000);
    const testa = b64({ alg: 'RS256', typ: 'JWT' });
    const corpo = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: ora, exp: ora + 3600 });
    const firma = crypto.createSign('RSA-SHA256').update(testa + '.' + corpo).sign(sa.private_key).toString('base64url');
    const tok = await (await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${testa}.${corpo}.${firma}` })
    })).json();
    if (!tok.access_token) throw new Error('token Firebase: ' + JSON.stringify(tok).slice(0, 200));
    const data = Object.fromEntries(Object.entries(dati).map(([k, v]) => [k, String(v)]));
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { topic: process.env.FCM_ARGOMENTO || 'centro', notification: { title: titolo, body: testo }, data, android: { priority: 'high' } } })
    });
    if (!r.ok) throw new Error('invio notifica: HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
    console.log('notifica inviata: ' + titolo);
    return true;
  } catch (e) { console.warn('notifica non inviata: ' + e.message); return false; }
}

module.exports = notifica;
if (require.main === module) {
  const [titolo, testo, sezione] = process.argv.slice(2);
  notifica(titolo || 'Centro social', testo || '', sezione ? { sezione } : {});
}
