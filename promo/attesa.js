// Prima di pubblicare il video del giorno: lo segna "in uscita" nel Centro social, manda la notifica
// e aspetta RITARDO_VIDEO_MIN minuti (60). Dall'app Alessio può annullarlo o farlo uscire subito
// (decisioni.json nel ramo hub-dati, chiave "video:<id>"). Scrive "annullato=1" in GITHUB_OUTPUT se annullato.
// Uso: node promo/attesa.js <id_uscita> <titolo> <piattaforme> <url_video> [cartella_dati]
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const notifica = require('./notifica');

const [id, titolo, piattaforme, video, dirArg] = process.argv.slice(2);
const dir = dirArg || path.join(__dirname, '..', '..', 'hub-dati');
const E = process.env;
const minuti = E.RITARDO_VIDEO_MIN === '' || E.RITARDO_VIDEO_MIN == null ? 60 : Number(E.RITARDO_VIDEO_MIN);
const chiave = 'video:' + id;
const esce = new Date(Date.now() + minuti * 60e3);
const oraIt = d => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
const attendi = ms => new Promise(r => setTimeout(r, ms));
const salvaHub = msg => { try { execSync(`bash ${path.join(__dirname, 'hub_dati.sh')} salva "${msg}"`, { stdio: 'inherit' }); } catch (e) { console.warn('salvataggio hub-dati non riuscito'); } };

function aggiorna(campi) {
  const f = path.join(dir, 'in_uscita.json');
  let l = []; try { l = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
  const i = l.findIndex(x => x.id === chiave);
  const voce = { ...(i >= 0 ? l[i] : { id: chiave, titolo, piattaforme: piattaforme.split(','), video, creato: new Date().toISOString() }), ...campi };
  if (i >= 0) l[i] = voce; else l.unshift(voce);
  fs.writeFileSync(f, JSON.stringify(l.slice(0, 60), null, 1));
}
async function decisione() {
  try {
    const r = await fetch(`https://api.github.com/repos/${E.GITHUB_REPOSITORY}/contents/decisioni.json?ref=hub-dati&t=${Date.now()}`, {
      headers: { Authorization: 'Bearer ' + E.GH_TOKEN, Accept: 'application/vnd.github.raw+json' }
    });
    return r.ok ? ((await r.json())[chiave] || {}).stato : undefined;
  } catch (e) { return undefined; }
}
const esci = (annullato) => { if (E.GITHUB_OUTPUT) fs.appendFileSync(E.GITHUB_OUTPUT, `annullato=${annullato ? 1 : 0}\n`); };

(async () => {
  if (!minuti) { aggiorna({ stato: 'in_pubblicazione', esce_alle: new Date().toISOString() }); salvaHub('Video in uscita'); return esci(false); }
  aggiorna({ stato: 'in_attesa', esce_alle: esce.toISOString() });
  salvaHub('Video in uscita alle ' + oraIt(esce));
  await notifica('🎬 Video pronto: esce alle ' + oraIt(esce), `"${titolo}" su ${piattaforme.replace(/,/g, ', ')}. Aprilo per guardarlo, annullarlo o farlo uscire subito.`, { sezione: 'uscita' });
  while (Date.now() < esce) {
    await attendi(60e3);
    const d = await decisione();
    if (d === 'annullata') {
      aggiorna({ stato: 'annullato', annullato_il: new Date().toISOString() }); salvaHub('Video annullato');
      await notifica('🚫 Video annullato', `"${titolo}" non è stato pubblicato.`, { sezione: 'uscita' });
      return esci(true);
    }
    if (d === 'approvata') break;
  }
  aggiorna({ stato: 'in_pubblicazione' }); salvaHub('Video in pubblicazione');
  esci(false);
})();
