// Monta il video finale di un copione in stile pubblicità: inquadrature brevi prese dalle
// riprese, transizioni (taglio, flash, zoom, scorrimento), testi animati parola per parola,
// effetti sonori sulle transizioni, musica e cartello finale animato con il logo.
// Uso: node promo/monta.js <id_copione> [cartella_uscita]
// Prima va eseguito promo/registra.js con lo stesso id. Serve ffmpeg con libass (c'è su Ubuntu).
// Risultato: <uscita>/<id>/<id>.mp4 (1080x1920, 30 fps, H.264 + AAC) e copertina.jpg
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const id = process.argv[2];
const outRoot = process.argv[3] || path.join(__dirname, 'uscita');
const RADICE = path.join(__dirname, '..');
const copione = JSON.parse(fs.readFileSync(path.join(__dirname, 'copioni.json'), 'utf8')).copioni.find(c => c.id === id);
if (!copione) { console.error('Copione non trovato: ' + id); process.exit(1); }
const dir = path.join(outRoot, id);
const reg = JSON.parse(fs.readFileSync(path.join(dir, 'riprese.json'), 'utf8'));
const lingua = process.env.LINGUA_TESTI || copione.lingua_testi || 'it';
const T = v => (v && typeof v === 'object') ? (v[lingua] || v.it || '') : (v || '');

// Transizioni: nome nel copione → effetto ffmpeg (xfade), durata, suono
const TRANS = {
  taglio: null,
  flash: { xf: 'fadewhite', d: 0.16, suono: 'impatto' },
  zoom: { xf: 'zoomin', d: 0.28, suono: 'whoosh' },
  scorri: { xf: 'smoothup', d: 0.26, suono: 'whoosh' },
  scorri_sx: { xf: 'smoothleft', d: 0.26, suono: 'whoosh' },
  dissolvenza: { xf: 'fade', d: 0.35, suono: null }
};

// "da" può essere un numero (secondi della ripresa) o un evento del gioco:
// "game_over-1.2" = 1,2 s prima della vittoria; "card_played#2+0.3" = 0,3 s dopo la seconda carta giocata
function risolviDa(q, i) {
  if (typeof (q.da || 0) === 'number') return q.da || 0;
  const m = String(q.da).match(/^([a-z_]+)(?:#(\d+))?([+-][\d.]+)?$/);
  const r = reg.riprese[q.ripresa];
  const ev = m && (r.eventi || []).filter(e => e.nome === m[1])[(+m[2] || 1) - 1];
  if (!ev) {
    const riserva = q.riserva != null ? q.riserva : 0;
    console.warn(`  inquadratura ${i}: evento "${q.da}" non avvenuto nella ripresa, uso ${riserva} s`);
    return riserva;
  }
  const vel = q.velocita || 1;
  return Math.max(0, Math.min(r.durata - q.durata * vel, ev.t + (m[3] ? parseFloat(m[3]) : 0)));
}
const Q = copione.inquadrature.map((q, i) => ({ ...q, da: risolviDa(q, i) }));
const FINE = copione.fine === false ? 0 : (copione.durata_fine || 2.8);
// Tempi d'inizio di ogni inquadratura nel video finale (le transizioni si sovrappongono)
const inizi = [];
let t = 0;
Q.forEach((q, i) => {
  const tr = i > 0 ? TRANS[q.transizione || 'taglio'] : null;
  if (tr) t -= tr.d;
  inizi.push(t);
  t += q.durata;
});
const trFine = TRANS[copione.transizione_fine || 'flash'];
const inizioFine = t - (FINE && trFine ? trFine.d : 0);
const totale = FINE ? inizioFine + FINE : t;

// ---------- Testi animati (ASS) ----------
const tempo = s => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = (s % 60).toFixed(2).padStart(5, '0'); return `${h}:${String(m).padStart(2, '0')}:${x}`; };
const GIALLO = '&H0033E0FF&', BIANCO = '&H00FFFFFF&', NERO = '&H00111111&';
const POS = { alto: [8, 540, 300], centro: [5, 540, 930], basso: [2, 540, 1460] };
let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Fascia,Arial,20,&H00000000,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: Pop,Bangers,112,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,2,0,1,9,4,8,80,80,300,1
Style: Grande,Bangers,200,&H0033E0FF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,3,0,1,13,6,5,60,60,0,1
Style: Box,Bangers,88,&H00111111,&H000000FF,&H0033E0FF,&H00000000,0,0,0,0,100,100,2,0,3,16,0,8,110,110,300,1
Style: Sotto,Bangers,64,&H00FFFFFF,&H000000FF,&H28000000,&H00000000,0,0,0,0,100,100,1,0,3,14,0,2,120,120,560,1
Style: Cta,Bangers,118,&H00111111,&H000000FF,&H0033E0FF,&H00000000,0,0,0,0,100,100,3,0,3,22,0,5,80,80,0,1
Style: CtaSotto,Bangers,78,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,2,0,1,6,3,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
const evento = (da, a, stile, testo) => { ass += `Dialogue: 1,${tempo(da)},${tempo(a)},${stile},,0,0,0,,${testo}\n`; };
const ms = s => Math.round(s * 1000);
// Fascia scura sfumata dietro i testi, così restano leggibili sopra qualsiasi schermata del gioco
const FASCE = { alto: [200, 640], centro: [720, 1140], basso: [1250, 1580] };
function fascia(da, a, pos, forte) {
  const [y0, y1] = FASCE[pos] || FASCE.alto;
  ass += `Dialogue: 0,${tempo(da)},${tempo(a)},Fascia,,0,0,0,,{\\an7\\pos(0,${y0})\\bord0\\shad0\\blur45\\1c&H000000&\\1a&H${forte ? '50' : '78'}&\\fad(120,120)\\p1}m -60 0 l 1140 0 1140 ${y1 - y0} -60 ${y1 - y0}{\\p0}\n`;
}

// Parole che compaiono una dopo l'altra; *parola* = evidenziata in giallo
function parole(testo, base, evid, ritardo, passo) {
  const righe = String(testo).replace(/[{}]/g, '').split(/\\N|\n/);
  let k = 0;
  return righe.map(riga => riga.split(/\s+/).filter(Boolean).map(w => {
    const forte = /^\*.*\*[.,!?…]*$/.test(w);
    const pulita = w.replace(/\*/g, '');
    const t0 = ms(ritardo + passo * k++);
    // passo 0 = tutte le parole visibili subito (il gancio deve leggersi dal primo fotogramma)
    if (!passo) return `{\\c${forte ? evid : base}}${pulita}`;
    return `{\\alpha&HFF&\\c${forte ? evid : base}\\t(${t0},${t0 + 70},\\alpha&H00&)}${pulita}`;
  }).join(' ')).join('\\N');
}

function testoInquadratura(q, da, a, primo) {
  const testo = T(q.testo);
  const durata = a - da;
  if (testo) {
    const stile = q.stile || 'pop';
    const [an, x, y] = POS[q.pos || (stile === 'grande' ? 'centro' : 'alto')];
    const n = testo.split(/\s+/).length;
    if (stile !== 'box') fascia(da, a, q.pos || (stile === 'grande' ? 'centro' : 'alto'), stile === 'grande');
    const passo = primo ? 0 : Math.min(0.09, 0.45 / Math.max(1, n));
    if (stile === 'grande' && primo) {
      // Gancio: già leggibile nel primo fotogramma, poi si assesta e spinge in avanti
      evento(da, a, 'Grande', `{\\an${an}\\pos(${x},${y})\\fscx116\\fscy116\\t(0,200,\\fscx100\\fscy100)\\t(200,${ms(durata)},\\fscx108\\fscy108)\\fad(0,90)}` + String(testo).replace(/\*/g, '').replace(/[{}]/g, ''));
    } else if (stile === 'grande') {
      // Parola o numero che "sbatte" sullo schermo
      evento(da, a, 'Grande', `{\\an${an}\\pos(${x},${y})\\fscx230\\fscy230\\alpha&HFF&\\t(0,130,\\fscx96\\fscy96\\alpha&H00&)\\t(130,230,\\fscx104\\fscy104)\\t(230,${ms(durata)},\\fscx112\\fscy112)\\fad(0,90)}` + String(testo).replace(/\*/g, '').replace(/[{}]/g, ''));
    } else if (stile === 'box') {
      evento(da, a, 'Box', `{\\an${an}\\pos(${x},${y})\\fscx80\\fscy80\\t(0,120,\\fscx106\\fscy106)\\t(120,220,\\fscx100\\fscy100)\\fad(60,90)}` + String(testo).replace(/\*/g, '').replace(/[{}]/g, ''));
    } else {
      // Riga che entra con un piccolo rimbalzo, parole in sequenza, lenta spinta in avanti
      evento(da, a, 'Pop', `{\\an${an}\\pos(${x},${y})\\fscx${primo ? 100 : 78}\\fscy${primo ? 100 : 78}\\t(0,130,\\fscx106\\fscy106)\\t(130,230,\\fscx100\\fscy100)\\t(230,${ms(durata)},\\fscx104\\fscy104)\\fad(0,90)}` + parole(testo, BIANCO, GIALLO, primo ? 0 : 0.04, passo));
    }
  }
  const sotto = T(q.sotto);
  if (sotto) evento(da + 0.25, a, 'Sotto', `{\\fad(120,90)}${sotto.replace(/[{}*]/g, '')}`);
}

// Un testo può durare più inquadrature: "tieni": n lo prolunga sulle n successive
Q.forEach((q, i) => {
  if (!T(q.testo) && !T(q.sotto)) return;
  const j = Math.min(Q.length - 1, i + (q.tieni || 0));
  const fine = inizi[j] + Q[j].durata - (j + 1 < Q.length && TRANS[Q[j + 1].transizione || 'taglio'] ? TRANS[Q[j + 1].transizione].d / 2 : 0);
  testoInquadratura(q, inizi[i] + (i > 0 && TRANS[q.transizione || 'taglio'] ? TRANS[q.transizione].d / 2 : 0), Math.min(fine, FINE ? inizioFine + 0.05 : totale), i === 0);
});
// Cartello finale: invito grande in un riquadro giallo e riga sotto
if (FINE) {
  const c = copione.chiusura || {};
  const cta = T(c.invito) || (lingua === 'it' ? 'GIOCA GRATIS' : 'PLAY FREE');
  const sottoCta = T(c.sotto) || (lingua === 'it' ? 'Android · Browser' : 'Android · Browser');
  const a = inizioFine + 0.35;
  evento(a, totale, 'Cta', `{\\an5\\pos(540,1290)\\fscx40\\fscy40\\alpha&HFF&\\t(0,160,\\fscx110\\fscy110\\alpha&H00&)\\t(160,260,\\fscx100\\fscy100)\\t(900,1100,\\fscx106\\fscy106)\\t(1100,1300,\\fscx100\\fscy100)}${cta.replace(/[{}*]/g, '')}`);
  evento(a + 0.35, totale, 'CtaSotto', `{\\an5\\pos(540,1450)\\fad(200,0)}${sottoCta.replace(/[{}*]/g, '')}`);
  if (T(c.sopra)) evento(inizioFine + 0.1, totale, 'CtaSotto', `{\\an5\\pos(540,500)\\fad(200,0)}${T(c.sopra).replace(/[{}*]/g, '')}`);
}
const fileAss = path.join(dir, 'testi.ass');
fs.writeFileSync(fileAss, ass);

// ---------- Effetti sonori generati (nessun file esterno, nessuna licenza) ----------
const SUONI = {
  whoosh: ['-f', 'lavfi', '-i', 'anoisesrc=d=0.5:c=pink:a=0.7:r=44100,highpass=f=350,lowpass=f=4500,afade=t=in:d=0.28:curve=exp,afade=t=out:st=0.28:d=0.22,volume=0.55,aformat=channel_layouts=stereo'],
  impatto: ['-f', 'lavfi', '-i', "aevalsrc='0.9*sin(2*PI*(95-60*t)*t)*exp(-5*t)+0.25*(random(0)-0.5)*exp(-40*t)':d=0.8:s=44100,aformat=channel_layouts=stereo"]
};
const suoni = [];
Q.forEach((q, i) => { const tr = i > 0 && TRANS[q.transizione || 'taglio']; if (tr && tr.suono) suoni.push({ s: tr.suono, t: Math.max(0, inizi[i] - (tr.suono === 'whoosh' ? 0.2 : 0)) }); if (q.stile === 'grande') suoni.push({ s: 'impatto', t: inizi[i] }); });
if (FINE && trFine && trFine.suono) suoni.push({ s: trFine.suono, t: inizioFine });

// ---------- Filtri video ----------
const args = ['-y', '-v', 'error'];
const filtri = [];
let n = 0;
const etichette = [];
Q.forEach((q, i) => {
  const r = reg.riprese[q.ripresa];
  if (!r) { console.error(`Inquadratura ${i}: ripresa "${q.ripresa}" non registrata`); process.exit(1); }
  args.push('-f', 'concat', '-safe', '0', '-i', path.join(dir, r.cartella, 'fotogrammi.txt'));
  const vel = q.velocita || 1;
  // Scossa: piccolo tremolio di macchina all'inizio dell'inquadratura (per gli impatti)
  const scossa = q.scossa ? `,scale=1140:2027,crop=1080:1920:x='30+26*sin(t*55)*exp(-t*6)':y='53+20*cos(t*47)*exp(-t*6)'` : '';
  filtri.push(`[${n}:v]fps=30,trim=start=${q.da || 0}:duration=${(q.durata * vel).toFixed(3)},setpts=(PTS-STARTPTS)/${vel},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920${scossa},setsar=1,format=yuv420p,fps=30,settb=AVTB[q${i}]`);
  etichette.push(`[q${i}]`);
  n++;
});
if (FINE) {
  // Nebulosa che scorre lenta + logo che entra dall'alto con dissolvenza
  args.push('-loop', '1', '-framerate', '30', '-t', String(FINE), '-i', path.join(RADICE, 'assets/bg/cosmic_bg.jpg'));
  args.push('-loop', '1', '-framerate', '30', '-t', String(FINE), '-i', path.join(RADICE, 'assets/icons/logo_titolo.webp'));
  filtri.push(`[${n}:v]scale=1240:2204:force_original_aspect_ratio=increase,crop=1080:1920:x='80-40*t/${FINE}':y='142-60*t/${FINE}',setsar=1,format=yuv420p[sfondo]`);
  filtri.push(`[${n + 1}:v]scale=900:-1,format=rgba,fade=t=in:st=0.05:d=0.35:alpha=1[logo]`);
  filtri.push(`[sfondo][logo]overlay=x=(W-w)/2:y='600-70*exp(-t*9)':format=auto,trim=duration=${FINE},setpts=PTS-STARTPTS,format=yuv420p,fps=30,settb=AVTB[qfine]`);
  etichette.push('[qfine]');
  n += 2;
}
// Catena di transizioni: taglio = concat, altrimenti xfade sovrapposto
let corrente = etichette[0];
let lunghezza = Q[0].durata;
const elenco = Q.map(q => ({ dur: q.durata, tr: q.transizione || 'taglio' }));
if (FINE) elenco.push({ dur: FINE, tr: copione.transizione_fine || 'flash' });
for (let i = 1; i < elenco.length; i++) {
  const tr = TRANS[elenco[i].tr];
  const out = `[c${i}]`;
  if (!tr) {
    filtri.push(`${corrente}${etichette[i]}concat=n=2:v=1:a=0${out}`);
    lunghezza += elenco[i].dur;
  } else {
    filtri.push(`${corrente}${etichette[i]}xfade=transition=${tr.xf}:duration=${tr.d}:offset=${(lunghezza - tr.d).toFixed(3)}${out}`);
    lunghezza += elenco[i].dur - tr.d;
  }
  corrente = out;
}
const fontsdir = path.join(__dirname, 'font');
filtri.push(`${corrente}ass='${fileAss.replace(/'/g, "\\'")}':fontsdir='${fontsdir}',format=yuv420p[vout]`);

// ---------- Audio: musica + effetti ----------
const musica = copione.musica === false ? null : path.join(RADICE, 'assets/audio', copione.musica || 'm2_combat.mp3');
const audio = [];
if (musica) {
  args.push('-ss', String(copione.musica_da != null ? copione.musica_da : 60), '-i', musica);
  filtri.push(`[${n}:a]atrim=duration=${totale.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,volume=${copione.volume_musica || 0.8},afade=t=in:d=0.15,afade=t=out:st=${Math.max(0, totale - 1.2).toFixed(3)}:d=1.2[mus]`);
  audio.push('[mus]');
  n++;
}
suoni.forEach((s, k) => {
  args.push(...SUONI[s.s]);
  const ritardo = Math.round(s.t * 1000);
  filtri.push(`[${n}:a]adelay=${ritardo}|${ritardo},volume=${s.s === 'impatto' ? 0.7 : 0.45}[sfx${k}]`);
  audio.push(`[sfx${k}]`);
  n++;
});
if (audio.length) filtri.push(`${audio.join('')}amix=inputs=${audio.length}:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95,atrim=duration=${totale.toFixed(3)}[aout]`);

const video = path.join(dir, id + '.mp4');
args.push('-filter_complex', filtri.join(';'), '-map', '[vout]');
if (audio.length) args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '160k');
args.push('-c:v', 'libx264', '-preset', process.env.PRESET || 'medium', '-crf', '19', '-profile:v', 'high', '-r', '30',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', totale.toFixed(3), video);
execFileSync('ffmpeg', args, { stdio: 'inherit' });

// Copertina: un fotogramma con il gancio ben visibile
execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.min(copione.copertina_a || 0.8, totale / 2)), '-i', video, '-frames:v', '1', '-q:v', '3', path.join(dir, 'copertina.jpg')]);
console.log(`Video pronto: ${video} (${totale.toFixed(1)} s, ${Q.length} inquadrature)`);
