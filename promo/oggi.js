// Trova nella scaletta il video di oggi (ora italiana) e lo passa al workflow.
// Uso: node promo/oggi.js            → usa la data di oggi
//      DATA=2026-11-12 node promo/oggi.js
//      COPIONE=villain node promo/oggi.js   → forza un copione (lancio a mano)
// Stampa le variabili e, dentro GitHub Actions, le scrive in GITHUB_OUTPUT.
const fs = require('fs');
const path = require('path');
const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'scaletta.json'), 'utf8'));
const copioni = JSON.parse(fs.readFileSync(path.join(__dirname, 'copioni.json'), 'utf8')).copioni.map(c => c.id);
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
}
// Controllo della scaletta: segnala i giorni con copioni inesistenti
s.giorni.forEach(g => { if (!copioni.includes(g.copione)) console.warn(`Attenzione: ${g.data} usa il copione inesistente "${g.copione}"`); });
console.log(riga ? `Oggi (${oggi}): ${out.copione} → ${out.piattaforme}` : `Oggi (${oggi}) nella scaletta non c'è nessun video.`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(out).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
