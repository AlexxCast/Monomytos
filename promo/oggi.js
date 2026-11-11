// Trova nella scaletta il video di oggi (ora italiana) e lo passa al workflow.
// Uso: node promo/oggi.js            → usa la data di oggi
//      DATA=2026-11-12 node promo/oggi.js
//      COPIONE=villain node promo/oggi.js   → forza un copione (lancio a mano)
// Stampa le variabili e, dentro GitHub Actions, le scrive in GITHUB_OUTPUT.
const fs = require('fs');
const path = require('path');
const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'scaletta.json'), 'utf8'));
const copioni = JSON.parse(fs.readFileSync(path.join(__dirname, 'copioni.json'), 'utf8')).copioni.map(c => c.id);
// "caricato" = video caricato a mano dal Centro social (hub/), non va registrato
copioni.push('caricato');
const oggi = process.env.DATA || new Intl.DateTimeFormat('sv-SE', { timeZone: s.fuso_orario || 'Europe/Rome' }).format(new Date());
let riga = s.giorni.find(g => g.data === oggi);
if (process.env.COPIONE) riga = { ...(riga || {}), data: oggi, copione: process.env.COPIONE };
const out = { data: oggi, copione: '', piattaforme: '', lingua: s.lingua_testi || 'it', manuale: '' };
if (riga) {
  if (!copioni.includes(riga.copione)) { console.error(`Copione "${riga.copione}" del ${oggi} non esiste in copioni.json`); process.exit(1); }
  out.copione = riga.copione;
  out.piattaforme = (process.env.PIATTAFORME || (riga.piattaforme || s.piattaforme).join(',')).replace(/\s/g, '');
  out.lingua = riga.lingua_testi || out.lingua;
  out.manuale = riga.manuale || '';
  // Contenuti diversi per piattaforma (dal 12/11): PARTE = youtube | tiktok | instagram
  const parte = process.env.PARTE;
  if (parte && parte !== 'tutte' && !process.env.COPIONE && !process.env.PIATTAFORME) {
    const pp = riga.per_piattaforma;
    if (pp && pp[parte]) {
      if (!copioni.includes(pp[parte])) { console.error(`Copione "${pp[parte]}" (${parte}) non esiste in copioni.json`); process.exit(1); }
      out.copione = pp[parte];
      const gruppo = (s.gruppi || {})[parte] || [parte];
      // YouTube si porta dietro le piattaforme senza gruppo proprio (Bluesky, Telegram…)
      out.piattaforme = gruppo.join(',');
    } else if (parte !== 'youtube') { out.copione = ''; riga = null; }
  }
}
// Uscita automatica (senza copione scelto a mano): niente doppioni e niente uscite a notte fonda.
// GitHub a volte fa partire il cron con ore di ritardo, oppure il video è già stato lanciato a mano.
async function giaUscito() {
  if (process.env.COPIONE || !out.copione || !process.env.GITHUB_REPOSITORY) return false;
  const ora = +new Intl.DateTimeFormat('en-GB', { timeZone: s.fuso_orario || 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(new Date());
  if (ora >= 22) { console.log(`Sono le ${ora}: troppo tardi per l'uscita di oggi, salto.`); return true; }
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/hub-dati/pubblicazioni.json`);
    if (!r.ok) return false;
    const lista = await r.json();
    const giorno = d => new Intl.DateTimeFormat('sv-SE', { timeZone: s.fuso_orario || 'Europe/Rome' }).format(new Date(d));
    const mie = out.piattaforme.split(',');
    const fatto = (Array.isArray(lista) ? lista : []).find(v => !v.prova && v.data && giorno(v.data) === oggi && Object.keys(v.piattaforme || {}).some(k => mie.includes(k)));
    if (fatto) { console.log(`Oggi è già uscito "${fatto.id}": salto.`); return true; }
  } catch (e) { console.warn('Controllo pubblicazioni non riuscito:', e.message); }
  return false;
}
// Controllo della scaletta: segnala i giorni con copioni inesistenti
s.giorni.forEach(g => { if (!copioni.includes(g.copione)) console.warn(`Attenzione: ${g.data} usa il copione inesistente "${g.copione}"`); });
(async () => {
if (await giaUscito()) { out.copione = ''; riga = null; }
console.log(riga ? `Oggi (${oggi}): ${out.copione} → ${out.piattaforme}` : `Oggi (${oggi}) nella scaletta non c'è nessun video.`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(out).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
})();
