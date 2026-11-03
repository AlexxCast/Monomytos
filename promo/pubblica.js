// Pubblica il video del giorno sulle piattaforme indicate, con le API ufficiali e gratuite.
// Uso: node promo/pubblica.js <id_copione> <piattaforme separate da virgola> [cartella_uscita]
// Le chiavi arrivano dalle variabili d'ambiente (in GitHub sono i "Secrets" del repository).
// Una piattaforma senza chiavi viene saltata, senza fermare le altre.
// PROVA=1 mostra cosa verrebbe pubblicato senza pubblicare nulla.
// Scrive esito.json (cosa è andato e cosa no) e, se un token è stato rinnovato,
// nuovi_segreti/<NOME>.txt perché il workflow lo salvi nei Secrets.
const fs = require('fs');
const path = require('path');

const [id, listaPiattaforme = '', outRootArg] = process.argv.slice(2);
const outRoot = outRootArg || path.join(__dirname, 'uscita');
const dir = path.join(outRoot, id);
const dati = JSON.parse(fs.readFileSync(path.join(__dirname, 'copioni.json'), 'utf8'));
const copione = dati.copioni.find(c => c.id === id);
if (!copione) { console.error('Copione non trovato: ' + id); process.exit(1); }
const E = process.env;
const lingua = E.LINGUA_TESTI || copione.lingua_testi || 'it';
const T = v => (v && typeof v === 'object') ? (v[lingua] || v.it || '') : (v || '');
const PROVA = E.PROVA === '1' || E.PROVA === 'true';
const fileVideo = path.join(dir, id + '.mp4');
const video = fs.readFileSync(fileVideo);
const LINK = E.LINK_GIOCO || dati.link;
const VIDEO_URL = E.VIDEO_URL || ''; // indirizzo pubblico del video (serve a Instagram)

const tag = [...new Set([...(dati.hashtag_base || []), ...(copione.hashtag || [])])].map(h => '#' + h);
const titolo = T(copione.titolo);
// Didascalia + dicitura sulle immagini AI (sempre presente, in fondo al testo)
const didascalia = T(copione.didascalia);
const notaAI = T(dati.nota_ai);
const testo = notaAI ? `${didascalia}\n\n${notaAI}` : didascalia;
const linkTxt = lingua === 'it' ? 'Gioca gratis' : 'Play free';

const attendi = ms => new Promise(r => setTimeout(r, ms));
async function json(res, cosa) {
  const t = await res.text();
  let j; try { j = JSON.parse(t); } catch (e) { j = { testo: t }; }
  if (!res.ok) throw new Error(`${cosa}: HTTP ${res.status} ${t.slice(0, 400)}`);
  return j;
}
function salvaSegreto(nome, valore) {
  const d = path.join(dir, 'nuovi_segreti');
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, nome + '.txt'), valore);
}
const serve = (...chiavi) => chiavi.filter(k => !E[k]);

// ---------------- YouTube Shorts (YouTube Data API v3) ----------------
// Un video verticale sotto i 3 minuti diventa automaticamente uno Short.
const youtube = {
  chiavi: ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'],
  async pubblica() {
    const tok = await json(await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: E.YT_CLIENT_ID, client_secret: E.YT_CLIENT_SECRET, refresh_token: E.YT_REFRESH_TOKEN, grant_type: 'refresh_token' })
    }), 'token YouTube');
    const meta = {
      snippet: {
        title: (titolo + ' #Shorts').slice(0, 100),
        description: `${testo}\n\n${linkTxt}: ${LINK}\n\n${tag.join(' ')}`.slice(0, 4900),
        tags: tag.map(t => t.slice(1)).slice(0, 15),
        categoryId: '20', // Gaming
        defaultLanguage: lingua
      },
      status: { privacyStatus: E.YT_PRIVACY || 'public', selfDeclaredMadeForKids: false }
    };
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(video.length) },
      body: JSON.stringify(meta)
    });
    if (!init.ok) throw new Error('avvio caricamento YouTube: HTTP ' + init.status + ' ' + (await init.text()).slice(0, 400));
    const su = await json(await fetch(init.headers.get('location'), { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: video }), 'caricamento YouTube');
    return { link: 'https://youtube.com/shorts/' + su.id, stato: su.status && su.status.privacyStatus };
  }
};

// ---------------- TikTok (Content Posting API) ----------------
// TIKTOK_MODO=bozza (predefinito): il video arriva nella posta di TikTok e lo pubblichi tu dall'app
//   con un tocco, scegliendo anche un suono di tendenza.
// TIKTOK_MODO=diretto: pubblica subito. Finché TikTok non approva l'app (audit), i post
//   restano visibili solo a te (TIKTOK_PRIVACY=SELF_ONLY).
const tiktok = {
  chiavi: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REFRESH_TOKEN'],
  async pubblica() {
    const tok = await json(await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: E.TIKTOK_CLIENT_KEY, client_secret: E.TIKTOK_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: E.TIKTOK_REFRESH_TOKEN })
    }), 'token TikTok');
    if (tok.refresh_token && tok.refresh_token !== E.TIKTOK_REFRESH_TOKEN) salvaSegreto('TIKTOK_REFRESH_TOKEN', tok.refresh_token);
    const h = { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json; charset=UTF-8' };
    const source_info = { source: 'FILE_UPLOAD', video_size: video.length, chunk_size: video.length, total_chunk_count: 1 };
    const diretto = (E.TIKTOK_MODO || 'bozza') === 'diretto';
    let init;
    if (diretto) {
      const info = await json(await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', { method: 'POST', headers: h }), 'profilo TikTok');
      const opzioni = (info.data && info.data.privacy_level_options) || [];
      const privacy = E.TIKTOK_PRIVACY || 'SELF_ONLY';
      if (opzioni.length && !opzioni.includes(privacy)) throw new Error(`privacy ${privacy} non permessa: ${opzioni.join(', ')}`);
      init = await json(await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST', headers: h,
        body: JSON.stringify({ post_info: { title: `${testo}\n\n${tag.join(' ')}`.slice(0, 2200), privacy_level: privacy, is_aigc: true, disable_comment: false, disable_duet: false, disable_stitch: false, video_cover_timestamp_ms: 1200 }, source_info })
      }), 'avvio post TikTok');
    } else {
      init = await json(await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', { method: 'POST', headers: h, body: JSON.stringify({ source_info }) }), 'avvio bozza TikTok');
    }
    const up = await fetch(init.data.upload_url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes 0-${video.length - 1}/${video.length}` }, body: video });
    if (!up.ok) throw new Error('caricamento TikTok: HTTP ' + up.status + ' ' + (await up.text()).slice(0, 300));
    // Controlla lo stato per un paio di minuti
    let stato = '';
    for (let i = 0; i < 12; i++) {
      await attesa(10000);
      const s = await json(await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', { method: 'POST', headers: h, body: JSON.stringify({ publish_id: init.data.publish_id }) }), 'stato TikTok');
      stato = s.data && s.data.status;
      if (stato === 'FAILED') throw new Error('TikTok ha rifiutato il video: ' + (s.data.fail_reason || ''));
      if (['PUBLISH_COMPLETE', 'SEND_TO_USER_INBOX'].includes(stato)) break;
    }
    return { stato: diretto ? stato : `${stato} (apri TikTok: il video è nella posta, pubblicalo da lì)` };
  }
};
function attesa(ms) { return attendi(ms); }

// ---------------- Instagram Reels (Instagram API con accesso Instagram) ----------------
// Serve un account Instagram professionale (Creator o Business, gratis) e un indirizzo
// pubblico del video: il workflow usa il file allegato alla release di GitHub.
const instagram = {
  chiavi: ['IG_USER_ID', 'IG_ACCESS_TOKEN'],
  async pubblica() {
    if (!VIDEO_URL) throw new Error('manca VIDEO_URL, l\'indirizzo pubblico del video');
    const V = E.IG_API_VERSION || 'v24.0';
    const base = `https://graph.instagram.com/${V}`;
    let token = E.IG_ACCESS_TOKEN;
    // Il token dura 60 giorni: lo rinnoviamo a ogni pubblicazione
    try {
      const r = await json(await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`), 'rinnovo token Instagram');
      if (r.access_token) { token = r.access_token; if (token !== E.IG_ACCESS_TOKEN) salvaSegreto('IG_ACCESS_TOKEN', token); }
    } catch (e) { console.warn('  ' + e.message); }
    const caption = `${testo}\n\n${lingua === 'it' ? 'Link in bio' : 'Link in bio'} 👆\n\n${tag.slice(0, 25).join(' ')}`.slice(0, 2200);
    const c = await json(await fetch(`${base}/${E.IG_USER_ID}/media`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ media_type: 'REELS', video_url: VIDEO_URL, caption, share_to_feed: 'true', access_token: token })
    }), 'contenitore Instagram');
    let stato = '';
    for (let i = 0; i < 40 && stato !== 'FINISHED'; i++) {
      await attesa(10000);
      const s = await json(await fetch(`${base}/${c.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`), 'stato Instagram');
      stato = s.status_code;
      if (stato === 'ERROR' || stato === 'EXPIRED') throw new Error('Instagram non ha accettato il video: ' + (s.status || stato));
    }
    if (stato !== 'FINISHED') throw new Error('Instagram non ha finito di elaborare il video in tempo');
    const p = await json(await fetch(`${base}/${E.IG_USER_ID}/media_publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: c.id, access_token: token })
    }), 'pubblicazione Instagram');
    return { id: p.id };
  }
};

// ---------------- Bluesky (API aperta, nessuna approvazione) ----------------
const bluesky = {
  chiavi: ['BSKY_HANDLE', 'BSKY_APP_PASSWORD'],
  async pubblica() {
    const sess = await json(await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: E.BSKY_HANDLE, password: E.BSKY_APP_PASSWORD })
    }), 'accesso Bluesky');
    const pdsSvc = ((sess.didDoc && sess.didDoc.service) || []).find(s => s.id === '#atproto_pds');
    const pds = (pdsSvc && pdsSvc.serviceEndpoint) || 'https://bsky.social';
    const auth = { Authorization: 'Bearer ' + sess.accessJwt };
    const exp = Math.floor(Date.now() / 1000) + 1800;
    const sa = await json(await fetch(`${pds}/xrpc/com.atproto.server.getServiceAuth?aud=${encodeURIComponent('did:web:' + new URL(pds).host)}&lxm=com.atproto.repo.uploadBlob&exp=${exp}`, { headers: auth }), 'autorizzazione video Bluesky');
    const upRes = await fetch(`https://video.bsky.app/xrpc/app.bsky.video.uploadVideo?did=${encodeURIComponent(sess.did)}&name=${encodeURIComponent(id + '_' + Date.now() + '.mp4')}`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + sa.token, 'Content-Type': 'video/mp4' }, body: video
    });
    const up = await upRes.json().catch(() => ({}));
    let job = up.jobStatus || up;
    if (!job.jobId) throw new Error('caricamento video Bluesky: HTTP ' + upRes.status + ' ' + JSON.stringify(up).slice(0, 300));
    let blob = job.blob;
    for (let i = 0; i < 60 && !blob; i++) {
      await attesa(4000);
      const s = await json(await fetch(`https://video.bsky.app/xrpc/app.bsky.video.getJobStatus?jobId=${job.jobId}`), 'stato video Bluesky');
      job = s.jobStatus;
      if (job.state === 'JOB_STATE_FAILED') throw new Error('Bluesky non ha accettato il video: ' + (job.error || job.message || ''));
      blob = job.blob;
    }
    if (!blob) throw new Error('Bluesky non ha finito di elaborare il video in tempo');
    // Testo con link e hashtag cliccabili (le "facets" usano posizioni in byte UTF-8)
    // Bluesky ha 300 caratteri: dicitura AI in versione breve, sempre inclusa
    let corpo = didascalia;
    const coda = `\n\n${T(dati.nota_ai_breve) ? T(dati.nota_ai_breve) + '\n' : ''}${linkTxt}: ${LINK}\n${tag.slice(0, 4).join(' ')}`;
    if ([...(corpo + coda)].length > 300) corpo = [...corpo].slice(0, 300 - [...coda].length - 1).join('') + '…';
    const txt = corpo + coda;
    const enc = new TextEncoder();
    const facets = [];
    const cerca = (pezzo, feature) => {
      const i = txt.indexOf(pezzo);
      if (i < 0) return;
      const start = enc.encode(txt.slice(0, i)).length;
      facets.push({ index: { byteStart: start, byteEnd: start + enc.encode(pezzo).length }, features: [feature] });
    };
    cerca(LINK, { $type: 'app.bsky.richtext.facet#link', uri: LINK });
    tag.slice(0, 4).forEach(t => cerca(t, { $type: 'app.bsky.richtext.facet#tag', tag: t.slice(1) }));
    const rec = await json(await fetch(`${pds}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: sess.did, collection: 'app.bsky.feed.post', record: {
        $type: 'app.bsky.feed.post', text: txt, facets, langs: [lingua], createdAt: new Date().toISOString(),
        embed: { $type: 'app.bsky.embed.video', video: blob, aspectRatio: { width: 1080, height: 1920 } }
      } })
    }), 'post Bluesky');
    return { link: `https://bsky.app/profile/${sess.handle}/post/${rec.uri.split('/').pop()}` };
  }
};

// ---------------- Canale Telegram (bot gratuito) ----------------
const telegram = {
  chiavi: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  async pubblica() {
    const fd = new FormData();
    fd.append('chat_id', E.TELEGRAM_CHAT_ID);
    fd.append('caption', `${titolo}\n\n${testo}\n\n${linkTxt}: ${LINK}`.slice(0, 1024));
    fd.append('supports_streaming', 'true');
    fd.append('width', '1080'); fd.append('height', '1920');
    fd.append('video', new Blob([video], { type: 'video/mp4' }), id + '.mp4');
    const r = await json(await fetch(`https://api.telegram.org/bot${E.TELEGRAM_BOT_TOKEN}/sendVideo`, { method: 'POST', body: fd }), 'Telegram');
    return { id: r.result && r.result.message_id };
  }
};

// ---------------- Server Discord (webhook) ----------------
const discord = {
  chiavi: ['DISCORD_WEBHOOK_URL'],
  async pubblica() {
    const fd = new FormData();
    const piccolo = video.length < 9.5 * 1024 * 1024; // senza Nitro il limite dei file è 10 MB
    const content = `**${titolo}**\n${testo}\n${linkTxt}: ${LINK}${!piccolo && VIDEO_URL ? '\n🎬 ' + VIDEO_URL : ''}`.slice(0, 2000);
    fd.append('payload_json', JSON.stringify({ content }));
    if (piccolo) fd.append('files[0]', new Blob([video], { type: 'video/mp4' }), id + '.mp4');
    const r = await fetch(E.DISCORD_WEBHOOK_URL + (E.DISCORD_WEBHOOK_URL.includes('?') ? '&' : '?') + 'wait=true', { method: 'POST', body: fd });
    await json(r, 'Discord');
    return { allegato: piccolo };
  }
};

const PIATTAFORME = { youtube, tiktok, instagram, bluesky, telegram, discord };

(async () => {
  const esito = { id, lingua, data: new Date().toISOString(), prova: PROVA, piattaforme: {} };
  const scelte = listaPiattaforme.split(',').map(s => s.trim()).filter(Boolean);
  for (const nome of scelte) {
    const pf = PIATTAFORME[nome];
    if (!pf) { esito.piattaforme[nome] = { esito: 'manuale', nota: 'nessuna API automatica: da pubblicare a mano' }; continue; }
    const mancano = serve(...pf.chiavi);
    if (mancano.length) { esito.piattaforme[nome] = { esito: 'saltata', nota: 'mancano i Secrets: ' + mancano.join(', ') }; console.log(`${nome}: saltata (mancano ${mancano.join(', ')})`); continue; }
    if (PROVA) { esito.piattaforme[nome] = { esito: 'prova', nota: 'chiavi presenti, nessuna pubblicazione (modalità prova)' }; console.log(`${nome}: prova, non pubblico`); continue; }
    try {
      const r = await pf.pubblica();
      esito.piattaforme[nome] = { esito: 'ok', ...r };
      console.log(`${nome}: pubblicato`, JSON.stringify(r));
    } catch (e) {
      esito.piattaforme[nome] = { esito: 'errore', nota: e.message };
      console.error(`${nome}: ERRORE ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(dir, 'esito.json'), JSON.stringify(esito, null, 1));
  // Testi pronti da copiare per chi pubblica a mano (Reddit, o se un'API non è configurata)
  fs.writeFileSync(path.join(dir, 'didascalie.txt'), [
    `TITOLO: ${titolo}`, '',
    `TIKTOK / INSTAGRAM:\n${testo}\n\nLink in bio\n\n${tag.join(' ')}`, '',
    `YOUTUBE SHORTS:\nTitolo: ${titolo} #Shorts\nDescrizione: ${testo}\n\n${linkTxt}: ${LINK}\n\n${tag.join(' ')}`, '',
    `BLUESKY / X / THREADS:\n${testo}\n\n${linkTxt}: ${LINK}\n${tag.slice(0, 4).join(' ')}`
  ].join('\n'));
})();
