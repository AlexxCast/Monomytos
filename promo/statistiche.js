// Raccoglie le statistiche di tutti i social di Monomythos con le API ufficiali e gratuite
// e le salva per il Centro social (hub/index.html).
// Uso: node promo/statistiche.js <cartella_dati>
// La cartella_dati è il ramo "hub-dati" del repository: qui vengono aggiornati
//   statistiche.json  → ultimo stato di ogni piattaforma (account + ultimi video)
//   storico.json      → una riga ogni giro (follower e visualizzazioni totali), per i grafici
// Le chiavi arrivano dai Secrets come per pubblica.js; una piattaforma senza chiavi viene saltata.
// Se TikTok o Instagram rinnovano il token, il nuovo valore va in <cartella_dati>/../nuovi_segreti.
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || path.join(__dirname, 'uscita', 'hub-dati');
fs.mkdirSync(out, { recursive: true });
const E = process.env;
const ora = new Date().toISOString();

async function json(res, cosa) {
  const t = await res.text();
  let j; try { j = JSON.parse(t); } catch (e) { j = { testo: t }; }
  if (!res.ok) throw new Error(`${cosa}: HTTP ${res.status} ${t.slice(0, 300)}`);
  return j;
}
const segreti = path.join(out, '..', 'nuovi_segreti');
function salvaSegreto(nome, valore) {
  fs.mkdirSync(segreti, { recursive: true });
  fs.writeFileSync(path.join(segreti, nome + '.txt'), valore);
}
const mancano = (...k) => k.filter(x => !E[x]);
const somma = (lista, campo) => lista.reduce((t, v) => t + (Number(v[campo]) || 0), 0);

// Ogni piattaforma restituisce { account: {follower, ...}, video: [{id, titolo, data, link, views, likes, commenti, condivisioni}] }
const PIATTAFORME = {
  youtube: {
    chiavi: ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'],
    async leggi() {
      const tok = await json(await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: E.YT_CLIENT_ID, client_secret: E.YT_CLIENT_SECRET, refresh_token: E.YT_REFRESH_TOKEN, grant_type: 'refresh_token' })
      }), 'token YouTube');
      const h = { Authorization: 'Bearer ' + tok.access_token };
      const ch = await json(await fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails,snippet&mine=true', { headers: h }), 'canale YouTube');
      const c = ch.items && ch.items[0];
      if (!c) throw new Error('nessun canale YouTube collegato a questo account');
      const lista = await json(await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=25&playlistId=${c.contentDetails.relatedPlaylists.uploads}`, { headers: h }), 'video YouTube');
      const ids = (lista.items || []).map(i => i.contentDetails.videoId).join(',');
      const v = ids ? await json(await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,status&id=${ids}`, { headers: h }), 'statistiche video YouTube') : { items: [] };
      return {
        account: { nome: c.snippet.title, follower: +c.statistics.subscriberCount || 0, views: +c.statistics.viewCount || 0, video: +c.statistics.videoCount || 0, link: `https://youtube.com/channel/${c.id}` },
        video: v.items.map(x => ({
          id: x.id, titolo: x.snippet.title, data: x.snippet.publishedAt, link: 'https://youtube.com/shorts/' + x.id, privato: x.status.privacyStatus !== 'public',
          views: +x.statistics.viewCount || 0, likes: +x.statistics.likeCount || 0, commenti: +x.statistics.commentCount || 0
        }))
      };
    }
  },
  tiktok: {
    // Servono i permessi user.info.stats e video.list (vedi promo/token_tiktok.js)
    chiavi: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REFRESH_TOKEN'],
    async leggi() {
      const tok = await json(await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_key: E.TIKTOK_CLIENT_KEY, client_secret: E.TIKTOK_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: E.TIKTOK_REFRESH_TOKEN })
      }), 'token TikTok');
      if (tok.refresh_token && tok.refresh_token !== E.TIKTOK_REFRESH_TOKEN) salvaSegreto('TIKTOK_REFRESH_TOKEN', tok.refresh_token);
      const h = { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json' };
      const u = await json(await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,profile_deep_link,follower_count,likes_count,video_count', { headers: h }), 'profilo TikTok');
      const l = await json(await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,view_count,like_count,comment_count,share_count', {
        method: 'POST', headers: h, body: JSON.stringify({ max_count: 20 })
      }), 'video TikTok');
      const us = (u.data && u.data.user) || {};
      const vids = (l.data && l.data.videos) || [];
      return {
        account: { nome: us.display_name, follower: us.follower_count || 0, likes: us.likes_count || 0, video: us.video_count || 0, link: us.profile_deep_link },
        video: vids.map(x => ({
          id: x.id, titolo: x.title || x.video_description || '', data: new Date(x.create_time * 1000).toISOString(), link: x.share_url,
          views: x.view_count || 0, likes: x.like_count || 0, commenti: x.comment_count || 0, condivisioni: x.share_count || 0
        }))
      };
    }
  },
  instagram: {
    // Serve il permesso instagram_business_manage_insights nel token
    chiavi: ['IG_USER_ID', 'IG_ACCESS_TOKEN'],
    async leggi() {
      const V = E.IG_API_VERSION || 'v24.0';
      const base = `https://graph.instagram.com/${V}`;
      const t = encodeURIComponent(E.IG_ACCESS_TOKEN);
      const me = await json(await fetch(`${base}/me?fields=username,followers_count,media_count&access_token=${t}`), 'profilo Instagram');
      const m = await json(await fetch(`${base}/me/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count&limit=25&access_token=${t}`), 'post Instagram');
      const video = [];
      for (const x of m.data || []) {
        const r = { id: x.id, titolo: (x.caption || '').split('\n')[0].slice(0, 90), data: x.timestamp, link: x.permalink, views: 0, likes: x.like_count || 0, commenti: x.comments_count || 0 };
        try {
          const ins = await json(await fetch(`${base}/${x.id}/insights?metric=views,shares,saved,reach&access_token=${t}`), 'insight');
          for (const d of ins.data || []) {
            const val = d.values && d.values[0] ? d.values[0].value : d.total_value && d.total_value.value;
            if (d.name === 'views') r.views = val || 0;
            if (d.name === 'shares') r.condivisioni = val || 0;
            if (d.name === 'saved') r.salvataggi = val || 0;
            if (d.name === 'reach') r.copertura = val || 0;
          }
        } catch (e) { r.nota = 'insight non disponibili: ' + e.message.slice(0, 120); }
        video.push(r);
      }
      return { account: { nome: me.username, follower: me.followers_count || 0, video: me.media_count || 0, link: `https://instagram.com/${me.username}` }, video };
    }
  },
  bluesky: {
    // API pubblica: basta il nome utente, nessuna password
    chiavi: ['BSKY_HANDLE'],
    async leggi() {
      const A = 'https://public.api.bsky.app/xrpc';
      const p = await json(await fetch(`${A}/app.bsky.actor.getProfile?actor=${encodeURIComponent(E.BSKY_HANDLE)}`), 'profilo Bluesky');
      const f = await json(await fetch(`${A}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(E.BSKY_HANDLE)}&limit=30&filter=posts_no_replies`), 'post Bluesky');
      const video = (f.feed || []).filter(x => x.post.author.did === p.did).map(x => ({
        id: x.post.uri, titolo: String((x.post.record && x.post.record.text) || '').split('\n')[0].slice(0, 90), data: x.post.indexedAt,
        link: `https://bsky.app/profile/${p.handle}/post/${x.post.uri.split('/').pop()}`,
        views: 0, likes: x.post.likeCount || 0, commenti: x.post.replyCount || 0, condivisioni: (x.post.repostCount || 0) + (x.post.quoteCount || 0)
      }));
      return { account: { nome: p.handle, follower: p.followersCount || 0, video: p.postsCount || 0, link: `https://bsky.app/profile/${p.handle}` }, video };
    }
  },
  telegram: {
    // Il bot vede solo quanti iscritti ha il canale, non le visualizzazioni dei post
    chiavi: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
    async leggi() {
      const r = await json(await fetch(`https://api.telegram.org/bot${E.TELEGRAM_BOT_TOKEN}/getChatMemberCount?chat_id=${encodeURIComponent(E.TELEGRAM_CHAT_ID)}`), 'canale Telegram');
      const nome = String(E.TELEGRAM_CHAT_ID).replace(/^@/, '');
      return { account: { nome, follower: r.result || 0, link: /^-?\d+$/.test(nome) ? '' : `https://t.me/${nome}` }, video: [] };
    }
  }
};

(async () => {
  const stat = { aggiornato: ora, piattaforme: {} };
  for (const [nome, pf] of Object.entries(PIATTAFORME)) {
    const m = mancano(...pf.chiavi);
    if (m.length) { stat.piattaforme[nome] = { stato: 'non collegata', nota: 'mancano i Secrets: ' + m.join(', ') }; console.log(`${nome}: non collegata`); continue; }
    try {
      const r = await pf.leggi();
      r.video.sort((a, b) => String(b.data).localeCompare(String(a.data)));
      r.totali = { views: somma(r.video, 'views'), likes: somma(r.video, 'likes'), commenti: somma(r.video, 'commenti'), condivisioni: somma(r.video, 'condivisioni') };
      stat.piattaforme[nome] = { stato: 'ok', ...r };
      console.log(`${nome}: ${r.account.follower} follower, ${r.video.length} post, ${r.totali.views} visualizzazioni`);
    } catch (e) {
      stat.piattaforme[nome] = { stato: 'errore', nota: e.message };
      console.warn(`${nome}: errore ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(out, 'statistiche.json'), JSON.stringify(stat, null, 1));
  // Storico per i grafici: una riga per giro, massimo 120 giorni a 4 giri al giorno
  const fileStorico = path.join(out, 'storico.json');
  let storico = [];
  try { storico = JSON.parse(fs.readFileSync(fileStorico, 'utf8')); } catch (e) {}
  const riga = { t: ora };
  for (const [nome, p] of Object.entries(stat.piattaforme)) {
    if (p.stato === 'ok') riga[nome] = { follower: p.account.follower, views: p.totali.views, likes: p.totali.likes, commenti: p.totali.commenti };
  }
  storico.push(riga);
  storico = storico.slice(-480);
  fs.writeFileSync(fileStorico, JSON.stringify(storico));
  console.log(`Salvato in ${out}`);
})().catch(e => { console.error(e); process.exit(1); });
