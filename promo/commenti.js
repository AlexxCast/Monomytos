// Commenti dei social: legge quelli nuovi, fa scrivere all'AI una bozza di risposta e,
// dopo un tempo per controllarla (o subito se approvata dall'app), la pubblica.
// Uso: node promo/commenti.js <cartella_dati>        (la cartella è il ramo "hub-dati")
// File nel ramo:
//   risposte.json  → lo scrive solo questo script: commenti, bozze, stato (bozza, inviata, annullata, errore, da_scrivere)
//   decisioni.json → lo scrive solo l'app: { "<id>": { stato: "approvata" | "annullata", testo: "risposta modificata" } }
// Piattaforme: YouTube, Instagram, Bluesky. TikTok non permette alle app di leggere o rispondere ai commenti.
// AI: Cloudflare Workers AI (piano gratuito, stessi Secrets CF_ACCOUNT_ID e CF_API_TOKEN delle immagini).
// PROVA=1 legge e scrive le bozze ma non pubblica niente. RITARDO_RISPOSTE_ORE: dopo quante ore parte da sola (3).
const fs = require('fs');
const path = require('path');
const notifica = require('./notifica');

const out = process.argv[2] || path.join(__dirname, 'uscita', 'hub-dati');
const E = process.env;
const PROVA = E.PROVA === '1' || E.PROVA === 'true';
const RITARDO = (Number(E.RITARDO_RISPOSTE_ORE) || 3) * 3600e3;
const GIORNI = 14; // commenti più vecchi di così non si considerano
const ora = Date.now();
const leggiJson = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(out, f), 'utf8')); } catch (e) { return d; } };
const risposte = leggiJson('risposte.json', []);
const decisioni = leggiJson('decisioni.json', {});
const giaVisti = new Set(risposte.map(r => r.id));
const recente = d => d && ora - new Date(d) < GIORNI * 864e5;
const mancano = (...k) => k.filter(x => !E[x]);

async function json(res, cosa) {
  const t = await res.text();
  let j; try { j = JSON.parse(t); } catch (e) { j = { testo: t }; }
  if (!res.ok) throw new Error(`${cosa}: HTTP ${res.status} ${t.slice(0, 300)}`);
  return j;
}

// ---------- AI: bozza di risposta ----------
const ISTRUZIONI = `Sei Alessio, lo sviluppatore indie (da solo) di Monomythos, un card game cooperativo gratuito per browser e Android in cui si gioca in squadra contro le Minacce e chi accumula troppo Trauma diventa il Villain. Le illustrazioni per ora sono fatte con l'AI, più avanti saranno disegnate a mano.
Rispondi a un commento sotto un tuo video. Regole:
- stessa lingua del commento; tono amichevole, umano, breve (massimo 2 frasi, niente elenchi);
- ringrazia i complimenti, rispondi alle domande se la risposta è ovvia dal gioco, altrimenti invita a provarlo ("il link è nella bio");
- non promettere date, funzioni o premi; non inventare dettagli del gioco; niente hashtag; al massimo un'emoji;
- critiche: ringrazia e dì che ne terrai conto; domande sull'AI: spiega con calma che è solo per iniziare;
- se il commento è spam, offensivo o non serve rispondere, metti "salta": true.
Rispondi SOLO con JSON: {"risposta": "...", "salta": false, "motivo": "breve"}`;

async function bozza(c) {
  if (mancano('CF_ACCOUNT_ID', 'CF_API_TOKEN').length) return { risposta: '', motivo: 'AI non configurata: scrivi tu la risposta' };
  const modello = E.CF_MODELLO_TESTO || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  const r = await json(await fetch(`https://api.cloudflare.com/client/v4/accounts/${E.CF_ACCOUNT_ID}/ai/run/${modello}`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + E.CF_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_tokens: 220, temperature: 0.6, messages: [
      { role: 'system', content: ISTRUZIONI },
      { role: 'user', content: `Piattaforma: ${c.piattaforma}\nVideo: ${c.post_titolo || ''}\nCommento di ${c.autore}: ${c.testo}` }
    ] })
  }), 'AI');
  const t = String((r.result && r.result.response) || '').trim();
  const m = t.match(/\{[\s\S]*\}/);
  try { const j = JSON.parse(m ? m[0] : t); return { risposta: String(j.risposta || '').trim(), salta: !!j.salta, motivo: j.motivo || '' }; }
  catch (e) { return { risposta: t.replace(/^["']|["']$/g, '').slice(0, 400), motivo: '' }; }
}

// ---------- Piattaforme ----------
const PIATTAFORME = {
  youtube: {
    // Serve lo scope youtube.force-ssl nel token (promo/token_youtube.js)
    chiavi: ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'],
    async accesso() {
      if (this.h) return this.h;
      const tok = await json(await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: E.YT_CLIENT_ID, client_secret: E.YT_CLIENT_SECRET, refresh_token: E.YT_REFRESH_TOKEN, grant_type: 'refresh_token' })
      }), 'token YouTube');
      return (this.h = { Authorization: 'Bearer ' + tok.access_token });
    },
    async leggi() {
      const h = await this.accesso();
      const ch = (await json(await fetch('https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true', { headers: h }), 'canale YouTube')).items[0];
      const lista = await json(await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=15&playlistId=${ch.contentDetails.relatedPlaylists.uploads}`, { headers: h }), 'video YouTube');
      const out = [];
      for (const it of lista.items || []) {
        const vid = it.contentDetails.videoId;
        let th;
        try { th = await json(await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&maxResults=50&order=time&videoId=${vid}`, { headers: h }), 'commenti YouTube'); }
        catch (e) { if (/commentsDisabled|403/.test(e.message)) continue; throw e; }
        for (const t of th.items || []) {
          const s = t.snippet.topLevelComment.snippet;
          const mio = x => x && x.authorChannelId && x.authorChannelId.value === ch.id;
          if (mio(s) || ((t.replies && t.replies.comments) || []).some(r => mio(r.snippet))) continue;
          out.push({ cid: t.snippet.topLevelComment.id, autore: s.authorDisplayName, testo: s.textOriginal, data: s.publishedAt,
            post_titolo: it.snippet.title, post_link: `https://youtube.com/shorts/${vid}`, rif: { parentId: t.snippet.topLevelComment.id } });
        }
      }
      return out;
    },
    async rispondi(c, testo) {
      const h = await this.accesso();
      const r = await json(await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet', {
        method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ snippet: { parentId: c.rif.parentId, textOriginal: testo } })
      }), 'risposta YouTube');
      return { link: c.post_link + '&lc=' + r.id };
    }
  },
  instagram: {
    // Serve il permesso instagram_business_manage_comments nel token
    chiavi: ['IG_USER_ID', 'IG_ACCESS_TOKEN'],
    base() { return `https://graph.instagram.com/${E.IG_API_VERSION || 'v24.0'}`; },
    async leggi() {
      const t = encodeURIComponent(E.IG_ACCESS_TOKEN), b = this.base();
      const me = await json(await fetch(`${b}/me?fields=username&access_token=${t}`), 'profilo Instagram');
      const media = await json(await fetch(`${b}/me/media?fields=id,caption,permalink&limit=15&access_token=${t}`), 'post Instagram');
      const out = [];
      for (const m of media.data || []) {
        const cm = await json(await fetch(`${b}/${m.id}/comments?fields=id,text,username,timestamp,replies{username}&limit=50&access_token=${t}`), 'commenti Instagram');
        for (const c of cm.data || []) {
          if (c.username === me.username || ((c.replies && c.replies.data) || []).some(r => r.username === me.username)) continue;
          out.push({ cid: c.id, autore: c.username, testo: c.text, data: c.timestamp, post_titolo: (m.caption || '').split('\n')[0].slice(0, 90), post_link: m.permalink, rif: { commentId: c.id } });
        }
      }
      return out;
    },
    async rispondi(c, testo) {
      const r = await json(await fetch(`${this.base()}/${c.rif.commentId}/replies`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ message: testo, access_token: E.IG_ACCESS_TOKEN })
      }), 'risposta Instagram');
      return { link: c.post_link, id: r.id };
    }
  },
  bluesky: {
    chiavi: ['BSKY_HANDLE', 'BSKY_APP_PASSWORD'],
    async accesso() {
      if (this.s) return this.s;
      const s = await json(await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: E.BSKY_HANDLE, password: E.BSKY_APP_PASSWORD })
      }), 'accesso Bluesky');
      const svc = ((s.didDoc && s.didDoc.service) || []).find(x => x.id === '#atproto_pds');
      s.pds = (svc && svc.serviceEndpoint) || 'https://bsky.social';
      return (this.s = s);
    },
    async leggi() {
      const s = await this.accesso(), A = 'https://public.api.bsky.app/xrpc';
      const f = await json(await fetch(`${A}/app.bsky.feed.getAuthorFeed?actor=${s.did}&limit=20&filter=posts_no_replies`), 'post Bluesky');
      const out = [];
      for (const x of f.feed || []) {
        if (x.post.author.did !== s.did || !x.post.replyCount) continue;
        const th = await json(await fetch(`${A}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(x.post.uri)}&depth=2`), 'risposte Bluesky');
        for (const r of (th.thread && th.thread.replies) || []) {
          if (!r.post || r.post.author.did === s.did || (r.replies || []).some(y => y.post && y.post.author.did === s.did)) continue;
          out.push({ cid: r.post.uri, autore: r.post.author.handle, testo: r.post.record.text, data: r.post.indexedAt,
            post_titolo: String(x.post.record.text || '').split('\n')[0].slice(0, 90), post_link: `https://bsky.app/profile/${s.handle}/post/${x.post.uri.split('/').pop()}`,
            rif: { root: { uri: x.post.uri, cid: x.post.cid }, parent: { uri: r.post.uri, cid: r.post.cid } } });
        }
      }
      return out;
    },
    async rispondi(c, testo) {
      const s = await this.accesso();
      const r = await json(await fetch(`${s.pds}/xrpc/com.atproto.repo.createRecord`, {
        method: 'POST', headers: { Authorization: 'Bearer ' + s.accessJwt, 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: s.did, collection: 'app.bsky.feed.post', record: { $type: 'app.bsky.feed.post', text: [...testo].slice(0, 300).join(''), reply: c.rif, createdAt: new Date().toISOString() } })
      }), 'risposta Bluesky');
      return { link: `https://bsky.app/profile/${s.handle}/post/${r.uri.split('/').pop()}` };
    }
  }
};

(async () => {
  // 1) Commenti nuovi → bozze
  const nuove = [];
  for (const [nome, pf] of Object.entries(PIATTAFORME)) {
    if (mancano(...pf.chiavi).length) { console.log(`${nome}: non collegata`); continue; }
    try {
      const lista = (await pf.leggi()).filter(c => recente(c.data) && !giaVisti.has(nome + ':' + c.cid));
      for (const c of lista) {
        const r = { id: nome + ':' + c.cid, piattaforma: nome, ...c, creato: new Date(ora).toISOString() };
        try {
          const b = await bozza(r);
          r.bozza = b.risposta; r.motivo = b.motivo;
          r.stato = b.salta ? 'saltata' : (b.risposta ? 'bozza' : 'da_scrivere');
        } catch (e) { r.bozza = ''; r.stato = 'da_scrivere'; r.nota = 'AI non disponibile: ' + e.message.slice(0, 120); }
        r.invio_alle = new Date(ora + RITARDO).toISOString();
        risposte.unshift(r); nuove.push(r); giaVisti.add(r.id);
      }
      console.log(`${nome}: ${lista.length} commenti nuovi`);
    } catch (e) { console.warn(`${nome}: errore ${e.message}`); }
  }

  // 2) Invio: approvate subito, le altre bozze quando scade il tempo per controllarle
  const inviate = [];
  for (const r of risposte) {
    if (!['bozza', 'da_scrivere', 'saltata'].includes(r.stato)) continue;
    const d = decisioni[r.id] || {};
    if (d.stato === 'annullata') { r.stato = 'annullata'; continue; }
    const testo = String(d.testo || r.bozza || '').trim();
    const approvata = d.stato === 'approvata';
    if (!approvata && (r.stato !== 'bozza' || new Date(r.invio_alle) > ora)) continue;
    if (!testo) continue;
    if (PROVA) { console.log(`prova: risponderei a ${r.id}: ${testo}`); continue; }
    try {
      const esito = await PIATTAFORME[r.piattaforma].rispondi(r, testo);
      Object.assign(r, { stato: 'inviata', testo_inviato: testo, inviata_il: new Date().toISOString(), link_risposta: esito.link, automatica: !approvata });
      inviate.push(r);
    } catch (e) { r.stato = 'errore'; r.nota = e.message.slice(0, 300); console.warn(`${r.id}: ${r.nota}`); }
  }

  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'risposte.json'), JSON.stringify(risposte.slice(0, 500), null, 1));
  const daVedere = nuove.filter(r => r.stato === 'bozza' || r.stato === 'da_scrivere');
  if (daVedere.length) await notifica(`💬 ${daVedere.length} ${daVedere.length === 1 ? 'commento nuovo' : 'commenti nuovi'}`,
    `${daVedere[0].autore}: “${daVedere[0].testo.slice(0, 80)}”. Le risposte partono da sole tra ${Math.round(RITARDO / 3600e3)} ore, controllale.`, { sezione: 'risposte' });
  if (inviate.length) await notifica(`✅ Ho risposto a ${inviate.length} ${inviate.length === 1 ? 'commento' : 'commenti'}`, inviate.map(r => r.piattaforma).join(', '), { sezione: 'risposte' });
  console.log(`bozze nuove: ${nuove.length}, risposte inviate: ${inviate.length}`);
})().catch(e => { console.error(e); process.exit(1); });
