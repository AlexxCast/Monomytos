// Monta il video finale di un copione: scene registrate + testi a fumetto + musica + cartello finale.
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
const reg = JSON.parse(fs.readFileSync(path.join(dir, 'scene.json'), 'utf8'));
const lingua = process.env.LINGUA_TESTI || copione.lingua_testi || 'it';
const T = v => (v && typeof v === 'object') ? (v[lingua] || v.it || '') : (v || '');

const FINE = copione.fine === false ? 0 : 3; // secondi del cartello finale con logo e invito
const durate = copione.scene.map(s => s.durata);
const totale = durate.reduce((a, b) => a + b, 0) + FINE;

// ---------- Sottotitoli ASS (testi grandi in stile fumetto, nella zona sicura dei social) ----------
const tempo = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = (s % 60).toFixed(2).padStart(5, '0'); return `${h}:${String(m).padStart(2, '0')}:${x}`; };
const pulisci = t => String(t).replace(/[{}]/g, '').replace(/\n/g, '\\N');
let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Gancio,Bangers,128,&H0033E0FF,&H000000FF,&H00000000,&H96000000,0,0,0,0,100,100,2,0,1,9,6,8,90,90,300,1
Style: Testo,Bangers,92,&H00111111,&H000000FF,&H0033E0FF,&H00000000,0,0,0,0,100,100,2,0,3,16,0,8,110,110,340,1
Style: Sotto,Bangers,66,&H00FFFFFF,&H000000FF,&H28000000,&H00000000,0,0,0,0,100,100,1,0,3,14,0,2,120,120,560,1
Style: Fine,Bangers,108,&H00FFFFFF,&H000000FF,&H00000000,&H96000000,0,0,0,0,100,100,2,0,1,7,5,5,90,90,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
const riga = (da, a, stile, testo, extra = '') => { if (testo) ass += `Dialogue: 0,${tempo(da)},${tempo(a)},${stile},,0,0,0,,{\\fad(150,150)${extra}}${pulisci(testo)}\n`; };
// Il gancio resta nei primi secondi: è ciò che decide se la gente scorre via
const gancio = T(copione.gancio);
const durGancio = Math.min(copione.durata_gancio || 2.6, durate[0]);
riga(0, durGancio, 'Gancio', gancio, '\\t(0,180,\\fscx112\\fscy112)\\t(180,360,\\fscx100\\fscy100)');
let t = 0;
copione.scene.forEach((s, i) => {
  const da = i === 0 && gancio ? durGancio : t;
  riga(da, t + s.durata, 'Testo', T(s.testo));
  riga(da, t + s.durata, 'Sotto', T(s.sotto));
  t += s.durata;
});
if (FINE) {
  riga(t + 0.2, totale, 'Fine', T(copione.chiusura) || T({ it: 'GIOCA GRATIS\\Nlink in bio', en: 'PLAY FREE\\Nlink in bio' }), '\\pos(540,1240)');
}
const fileAss = path.join(dir, 'testi.ass');
fs.writeFileSync(fileAss, ass);

// ---------- Filtri ffmpeg ----------
const args = ['-y', '-v', 'error'];
const filtri = [];
reg.scene.forEach((sc, i) => {
  args.push('-f', 'concat', '-safe', '0', '-i', path.join(dir, sc.cartella, 'fotogrammi.txt'));
  const salta = sc.salta || 0;
  filtri.push(`[${i}:v]fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=start=${salta}:duration=${durate[i]},setpts=PTS-STARTPTS[v${i}]`);
});
let n = reg.scene.length;
const segmenti = reg.scene.map((_, i) => `[v${i}]`);
if (FINE) {
  args.push('-loop', '1', '-t', String(FINE), '-i', path.join(RADICE, 'assets/bg/cosmic_bg.jpg'));
  args.push('-i', path.join(RADICE, 'assets/icons/logo_titolo.webp'));
  filtri.push(`[${n}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,format=yuv420p[sfondo]`);
  filtri.push(`[${n + 1}:v]scale=880:-1[logo]`);
  filtri.push(`[sfondo][logo]overlay=(W-w)/2:640,trim=duration=${FINE},setpts=PTS-STARTPTS[vfine]`);
  segmenti.push('[vfine]');
  n += 2;
}
const fontsdir = path.join(__dirname, 'font');
filtri.push(`${segmenti.join('')}concat=n=${segmenti.length}:v=1:a=0[vc]`);
filtri.push(`[vc]ass='${fileAss.replace(/'/g, "\\'")}':fontsdir='${fontsdir}',format=yuv420p[vout]`);

const musica = copione.musica === false ? null : path.join(RADICE, 'assets/audio', copione.musica || 'm2_combat.mp3');
if (musica) {
  args.push('-ss', String(copione.musica_da || 0), '-i', musica);
  filtri.push(`[${n}:a]atrim=duration=${totale},asetpts=PTS-STARTPTS,volume=0.85,afade=t=in:d=0.3,afade=t=out:st=${Math.max(0, totale - 1.5)}:d=1.5[aout]`);
}
const video = path.join(dir, id + '.mp4');
args.push('-filter_complex', filtri.join(';'), '-map', '[vout]');
if (musica) args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '160k');
args.push('-c:v', 'libx264', '-preset', process.env.PRESET || 'medium', '-crf', '20', '-profile:v', 'high', '-r', '30',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', String(totale), video);
execFileSync('ffmpeg', args, { stdio: 'inherit' });

// Copertina: un fotogramma con il gancio ben visibile
execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.min(1.2, totale / 2)), '-i', video, '-frames:v', '1', '-q:v', '3', path.join(dir, 'copertina.jpg')]);
console.log(`Video pronto: ${video} (${totale} s)`);
