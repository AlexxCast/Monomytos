// Registra le riprese di gameplay di un copione con Playwright (browser senza schermo).
// Uso: node promo/registra.js <id_copione> [url_sito] [cartella_uscita]
// Esempio: node promo/registra.js colpo_finale http://localhost:8799 promo/uscita
//
// Un copione ha delle "riprese" (registrazioni continue del gioco) e delle "inquadrature"
// (pezzi di 1-3 secondi presi dalle riprese, montati da promo/monta.js). Durante una ripresa:
//  - "camera": movimenti di macchina (zoom su un elemento del gioco) a tempi precisi;
//  - "segui": "sempre" = zoom automatico sul tavolo a ogni carta giocata (spento di base: distrae);
//  - "momento" e "azioni": situazioni preparate (colpo finale, Villain, leggendaria) che usano
//    le vere regole e animazioni del gioco.
// Ogni ripresa diventa una cartella di fotogrammi 1080x1920 con l'elenco dei tempi.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const id = process.argv[2];
const base = (process.argv[3] || 'http://localhost:8799').replace(/\/$/, '');
const outRoot = process.argv[4] || path.join(__dirname, 'uscita');
const copioni = JSON.parse(fs.readFileSync(path.join(__dirname, 'copioni.json'), 'utf8')).copioni;
const copione = copioni.find(c => c.id === id);
if (!copione) { console.error('Copione non trovato: ' + id); process.exit(1); }
const lingua = process.env.LINGUA || copione.lingua_gioco || 'it';
const outDir = path.join(outRoot, id);
fs.mkdirSync(outDir, { recursive: true });

// Formato verticale 9:16. La pagina è larga come un telefono (432x768) e ogni pixel
// vale 2,5 pixel reali, così i fotogrammi sono nitidi in Full HD (1080x1920).
const VIEW = { width: 432, height: 768 };
const DPR = 2.5;
const attesa = (p, ms) => p.waitForTimeout(ms);

// Nomi brevi degli elementi del gioco da inquadrare
const BERSAGLI = {
  minaccia: '.threat-central-card-wrap',
  centro: '#battlefieldCenterStage',
  barre: '.threat-tactical-data',
  nemici: '#mooksContainer',
  tavolo: '#tableZone',
  alleati: '#battlefieldAlliesRow',
  eroe: '.player-dock-top',
  mano: '#playerHandCarousel',
  difesa: '#modalDefense .modal-content, .modal-overlay.active .modal-content',
  bustina: '#packRevealStage',
  leggendaria: '#packRevealStage .pack-card-reveal:last-child',
  carta: '.full-card-inspect-wrap',
  eroi: '#heroCarousel',
  squadra: '.squad-pills-row',
  trauma: '#playerDockTrauma',
  mazzi: '.table-decks-flank',
  storia: '#storiaScena'
};

async function preparaPagina(ctx) {
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept().catch(() => {}));
  p.on('pageerror', e => console.warn('  errore pagina:', e.message));
  if (process.env.DEBUG) {
    p.on('console', m => console.log('  [pagina]', m.text()));
    await p.addInitScript(() => { window.__DEBUG_ON = true; });
  }
  // Niente account: il gioco parte in modalità locale come negli strumenti di diagnosi
  await p.route('**/js/firebase-config.js', r => r.fulfill({ body: 'window.MONOMYTHOS_FIREBASE=null;', contentType: 'application/javascript' }));
  await p.addInitScript(l => { try { localStorage.setItem('monomythos_lingua', l); } catch (e) {} }, lingua);
  // Niente tutorial del primo accesso: le riprese partono dalla Home con un account già avviato
  await p.addInitScript(() => {
    let t;
    Object.defineProperty(window, 'Tutorial', { configurable: true, get: () => t, set: v => { t = v; if (v) { v.serve = () => false; v.mostra = () => {}; } } });
  });
  await p.goto(base + '/index.html');
  await attesa(p, 1500);
  await p.evaluate(() => { const s = document.getElementById('appLaunchSplashOverlay'); if (s) s.style.display = 'none'; });
  if (await p.$('.starter-card')) {
    await p.evaluate(() => Collezione.scegliStarter(Collezione.STARTER[0].eroe));
    await attesa(p, 500);
  }
  // Account dimostrativo: crediti, tutte le carte e tutti gli eroi, così le schermate sono piene
  await p.evaluate(() => {
    const d = Progression.data;
    d.credits = 99999;
    const dati = window.MONOMYTHOS_DATA;
    if (dati && dati.action_cards) Object.values(dati.action_cards).flat().forEach(c => { if (c && c.id) d.unlockedCards[c.id] = Math.max(2, d.unlockedCards[c.id] || 0); });
    if (Array.isArray(d.unlockedHeroes) && dati && dati.action_cards) Object.keys(dati.action_cards).forEach(h => { if (!d.unlockedHeroes.includes(h)) d.unlockedHeroes.push(h); });
    Progression.save && Progression.save();
    UI.hideModals && UI.hideModals();
  });
  // Macchina da presa: zoom morbido su un elemento spostando tutta la pagina (resta nitida)
  await p.evaluate(B => {
    const root = document.documentElement;
    root.style.transformOrigin = '0 0';
    root.style.willChange = 'transform';
    window.__camera = (chi, zoom = 1, durata = 0.6) => {
      // Solo leggere spinte in avanti: zoom massimo 1,06, sempre centrato in orizzontale
      // (con zoom più forti o spostati di lato si tagliano nomi e pulsanti ai bordi), almeno 1 s
      zoom = Math.min(zoom, 1.06); if (durata > 0) durata = Math.max(durata, 1);
      const W = innerWidth, H = innerHeight;
      let tx = 0, ty = 0;
      const sel = B[chi] || chi;
      const el = sel && [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0);
      if (el && zoom > 1) {
        // Le coordinate vanno lette senza la trasformazione attuale
        const prima = root.style.transform;
        root.style.transition = 'none'; root.style.transform = 'none';
        const r = el.getBoundingClientRect();
        root.style.transform = prima; void root.offsetWidth;
        const cy = r.top + r.height / 2;
        tx = (W - W * zoom) / 2;
        ty = Math.min(0, Math.max(H - H * zoom, H / 2 - cy * zoom));
      } else if (zoom > 1) {
        tx = (W - W * zoom) / 2; ty = (H - H * zoom) / 2;
      }
      root.style.transition = durata > 0 ? `transform ${durata}s cubic-bezier(.45,0,.25,1)` : 'none';
      root.style.transform = zoom === 1 && !el ? 'none' : `translate(${tx}px, ${ty}px) scale(${zoom})`;
    };
  }, BERSAGLI);
  return p;
}

// Scorrimento lento di un elemento (o della pagina) per mostrare una schermata piena
async function scorri(p, selettore, durata) {
  const passi = Math.max(1, Math.round(durata / 50));
  for (let i = 0; i < passi; i++) {
    await p.evaluate(([s, i, n]) => {
      const el = (s && document.querySelector(s)) || document.querySelector('.screen.active') || document.scrollingElement;
      el.scrollTop = (el.scrollHeight - el.clientHeight) * (i / n);
    }, [selettore, i, passi]);
    await attesa(p, 50);
  }
}

// Situazioni preparate nella partita, applicate con le regole vere del gioco (codice eseguito nella pagina)
const MOMENTI_JS = `window.__MOMENTI = {
  // La Minaccia è a un passo dalla sconfitta: il prossimo progresso chiude l'atto
  atto_quasi_vinto() {
    const th = GameEngine.state.currentThreat;
    th.primarioProgress = Math.max(0, th.primarioMax - 1);
    th.brutoProgress = Math.max(0, th.brutoMax - 1);
  },
  // Atto finale quasi vinto: il prossimo progresso dà la VITTORIA
  vittoria_vicina() {
    GameEngine.state.actIndex = 2;
    GameEngine.setupCurrentThreat();
    this.atto_quasi_vinto();
  },
  // Il tuo eroe (quello inquadrato) è al limite del Trauma
  trauma_alto_io() {
    const soglia = (window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5;
    const st = GameEngine.state, me = st.players[0];
    me.trm = soglia - 2;
    // La ripresa parte dal tuo turno, così si vede il tuo eroe giocare e poi attaccare da Villain
    window.__turnoMio = true;
  },
  // Un compagno è al limite del Trauma
  trauma_alto() {
    const soglia = (window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5;
    const p = GameEngine.state.players[1];
    if (p) p.trm = soglia - 1;
  }
};`;
const AZIONI_TEMPO = {
  // Un compagno raggiunge il Punto di Rottura e diventa Villain (banner del gioco)
  villain: () => {
    const soglia = (window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5;
    const p = GameEngine.state.players.find((x, i) => i > 0 && x.state === 'hero' && !x.isDead);
    if (p) { p.stateFrozen = false; p.trm = soglia; GameEngine.checkBreakingPoint(p); }
  },
  // Il tuo eroe raggiunge il Punto di Rottura: da qui il bot che lo guida attacca i compagni
  villain_io: () => {
    const soglia = (window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5;
    const p = GameEngine.state.players[0];
    if (p && p.state === 'hero' && !p.isDead) { p.stateFrozen = false; p.trm = soglia; GameEngine.checkBreakingPoint(p); window.__pausaBot = Date.now() + 2300; }
  },
  // Se l'atto non si è ancora chiuso da solo, lo chiude con un ultimo progresso
  chiudi_atto: () => {
    const st = GameEngine.state;
    if (st.phase === 'gameover' || st.actIndex !== window.__attoIniziale) return;
    st.currentThreat.primarioProgress = st.currentThreat.primarioMax;
    GameEngine.checkThreatDefeated();
  },
  // Se la partita non è ancora vinta, la vince (serve con il momento "vittoria_vicina")
  vinci: () => {
    const st = GameEngine.state;
    if (st.phase === 'gameover') return;
    if (st.actIndex < 2) { st.actIndex = 2; GameEngine.setupCurrentThreat(); }
    st.currentThreat.primarioProgress = st.currentThreat.primarioMax;
    GameEngine.checkThreatDefeated();
  },
  apri_bustina: () => { window.__evento('bustina'); UI.buyBoosterPack('standard', 150); },
  avanti_storia: () => { const sc = document.getElementById('storiaScena'); if (sc) sc.click(); },
  scorri_eroi: () => { const c = document.getElementById('heroCarousel'); if (c) c.scrollBy({ left: c.clientWidth * 0.8, behavior: 'smooth' }); }
};

// Prepara la schermata della ripresa; restituisce l'attività di fondo da svolgere mentre si registra
const RIPRESE = {
  async home(p, r) {
    await p.evaluate(() => UI.showScreen('scr-lobby'));
    return async durata => { if (r.scorri) await scorri(p, null, durata); else await attesa(p, durata); };
  },
  async partita(p, r) {
    await p.evaluate(([n, eroe, intro]) => {
      UI.squadSize = n;
      // I banner "ROUND n" coprono la scena: nei video restano solo quelli importanti (ATTO, VILLAIN)
      const banner = UI.fxBanner.bind(UI);
      UI.fxBanner = (titolo, ...resto) => (/^ROUND/i.test(titolo) ? null : banner(titolo, ...resto));
      // Anche la carta Minaccia che si gira a ogni atto copre la scena: nei video resta il banner ATTO
      UI.triggerThreatDrawAnimation = () => {};
      const nome = eroe || Progression.data.unlockedHeroes[0] || 'Iron Aegis';
      if (intro) { UI.startSoloGame(nome); return; }
      // Senza animazione d'apertura: si entra subito nel vivo della partita
      const orig = UI.playMatchIntroLoading;
      UI.playMatchIntroLoading = (t, fine) => { UI.playMatchIntroLoading = orig; fine(); };
      UI.startSoloGame(nome);
      const ov = document.getElementById('threatEntryAnimOverlay'); if (ov) ov.classList.remove('active');
    }, [r.eroi || 3, r.eroe || null, r.intro !== false]);
    // Bot al comando, situazione preparata e zoom automatico sulle giocate
    const avvia = () => p.evaluate(([mom, segui, primoPiano, difesaNascosta, ritmo]) => {
      // ritmo: passo = ms tra una giocata e l'altra del bot, max = giocate per turno, lento = moltiplicatore delle pause
      const PASSO = ritmo.passo || 2800, MAXG = ritmo.max || 2, LENTO = ritmo.lento || 2;
      window.__DEBUG = !!window.__DEBUG_ON;
      const st = GameEngine.state;
      // Primo piano della carta giocata: la carta appare grande per un attimo e poi vola sul tavolo,
      // così nel video si capisce cosa è stato giocato senza togliere spazio alla Minaccia
      let occupato = 0;
      window.__primoPiano = (card, player, targetId) => {
        if (Date.now() < occupato) return;
        occupato = Date.now() + 2300;
        const box = document.createElement('div');
        box.className = 'promo-primo-piano';
        const nome = player && (player.name || player.nome || player);
        const contro = st.players.find(x => x.id === targetId && x !== player);
        const villain = player && player.state === 'villain';
        const etichetta = typeof nome === 'string' ? (contro ? `${nome} ⚔ ${contro.name}` : nome).replace(/ \(Bot\)/g, '') : '';
        box.innerHTML = `<div class="ppp-carta">${UI.getCardDOM(card, false)}</div>${etichetta ? `<div class="ppp-chi${villain ? ' villain' : ''}">${etichetta}</div>` : ''}`;
        document.body.appendChild(box);
        (window.__setTimeoutVero || setTimeout)(() => box.classList.add('via'), 1800);
        (window.__setTimeoutVero || setTimeout)(() => box.remove(), 2250);
      };
      if (!document.getElementById('promoPrimoPianoCss')) {
        const css = document.createElement('style');
        css.id = 'promoPrimoPianoCss';
        css.textContent = `
          .promo-primo-piano { position: fixed; left: 50%; top: 52%; z-index: 99999; pointer-events: none;
            transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 8px;
            animation: pppEntra .38s cubic-bezier(.2,.9,.3,1.15) both; }
          .promo-primo-piano .ppp-carta { width: 150px; filter: drop-shadow(0 10px 18px rgba(0,0,0,.6)); }
          .promo-primo-piano .ppp-carta > * { width: 100% !important; max-width: none !important; margin: 0 !important; }
          .promo-primo-piano .ppp-chi { font-family: Bangers, var(--font-display, sans-serif); font-size: 20px; letter-spacing: .04em;
            color: #fff; background: #111; border: 2px solid #fff; border-radius: 4px; padding: 1px 10px; }
          .promo-primo-piano .ppp-chi.villain { background: #6d1fd1; }
          .promo-primo-piano.via { animation: pppEsce .42s cubic-bezier(.5,0,.75,0) both; }
          @keyframes pppEntra { from { opacity: 0; transform: translate(-50%, -30%) scale(.55); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
          @keyframes pppEsce { to { opacity: 0; transform: translate(-50%, 10%) scale(.42); } }`;
        document.head.appendChild(css);
      }
      st.players.forEach(pl => { pl.isBot = true; });
      if (mom && window.__MOMENTI[mom]) { window.__MOMENTI[mom](); UI.renderGameView(st); }
      if (window.__attoIniziale == null) window.__attoIniziale = st.actIndex;
      // Ritmo da video: i bot giocano una carta alla volta (una ogni 2,8 s, max 2 per turno) invece di tutte insieme,
      // e le pause del gioco (attacchi dei nemici, cambio turno) durano il doppio
      if (!window.__ritmo) {
        window.__ritmo = true;
        const st0 = window.__setTimeoutVero = window.setTimeout;
        window.setTimeout = (fn, ms, ...a) => st0(fn, (ms || 0) >= 300 ? ms * LENTO : ms, ...a);
        const GE = GameEngine, run = GE.runBotTurn.bind(GE), gioca = GE.playCardEffect.bind(GE);
        let turno = null, giocate = 0;
        GE.runBotTurn = bot => {
          // Pausa chiesta da un'azione (per esempio dopo che il tuo eroe diventa Villain)
          if (window.__pausaBot && Date.now() < window.__pausaBot) { st0(() => GE.runBotTurn(bot), window.__pausaBot - Date.now()); return; }
          const chiave = bot.id + '#' + GE.state.round + '#' + GE.state.turnIndex;
          if (turno !== chiave) { turno = chiave; giocate = 0; }
          let fatta = false;
          const ALT = {};
          GE.playCardEffect = (...x) => {
            if (giocate >= MAXG) return;
            if (fatta) throw ALT;
            fatta = true; giocate++;
            return gioca(...x);
          };
          try { run(bot); } catch (e) {
            GE.playCardEffect = gioca;
            if (e !== ALT) throw e;
            st0(() => GE.runBotTurn(bot), PASSO);
            return;
          }
          GE.playCardEffect = gioca;
        };
      }
      const emit = GameEngine.emit.bind(GameEngine);
      let ultimo = 0;
      GameEngine.emit = (ev, d) => {
        if (['card_played', 'damage_taken', 'act_advanced', 'player_corrupted', 'game_over', 'round_started', 'defense_window_opened', 'player_died'].includes(ev)) window.__evento(ev);
        emit(ev, d);
        if (primoPiano && ev === 'card_played' && d && d.card) window.__primoPiano(d.card, d.player, d.targetId);
        if (window.__DEBUG && (ev === 'card_played' || ev === 'player_corrupted')) console.log(ev, JSON.stringify({ chi: d && (d.player ? d.player.name : d.name), stato: d && (d.player ? d.player.state : d.state), bersaglio: d && d.targetId, turno: st.turnIndex, giocatori: st.players.map(x => x.name + (x.isLocal ? '*' : '') + ':' + x.state) }));
        if (segui === 'sempre' && ev === 'card_played' && Date.now() - ultimo > 1600) {
          ultimo = Date.now();
          window.__camera('centro', 1.3, 0.35);
          setTimeout(() => window.__camera(null, 1, 0.5), 900);
        }
        if (ev !== 'defense_window_opened') return;
        // La finestra di difesa si vede per un attimo, poi difende l'IA ("difesa": "nascosta" = non si vede)
        if (difesaNascosta) document.querySelectorAll('.modal-overlay.active').forEach(m => { if (m.id !== 'modalGameOver') m.classList.remove('active'); });
        (window.__setTimeoutVero || setTimeout)(() => {
          const pd = GameEngine.pendingDefense;
          if (!pd) return;
          pd.reactionCards = pd.reactionCards || (d && d.reactionCards) || [];
          pd.parryCards = pd.parryCards || (d && d.parryCards) || [];
          clearInterval(UI._defenseCountdownInterval); UI._defenseCountdownInterval = null;
          document.querySelectorAll('.modal-overlay.active').forEach(m => { if (m.id !== 'modalGameOver') m.classList.remove('active'); });
          GameEngine.respondToDefense({ type: 'bot_fallback' });
        }, difesaNascosta ? 30 : 700);
      };
      if (window.__DEBUG) console.log('avvio', !!window.__turnoMio, st.turnIndex, st.phase, Object.keys(window.__MOMENTI || {}).join());
      if (window.__turnoMio) {
        const me = st.players[0];
        st.turnIndex = 0; st.phase = 'action'; me.actedThisRound = false; me.pbUsedThisTurn = false;
        me.slots = { Potenza: me.str, Agilità: me.spd, Agilita: me.spd, Intelligenza: me.tech, Vigore: me.end, potenza: me.str, agilita: me.spd, intelligenza: me.tech, vigore: me.end };
        UI.renderGameView(st);
      }
      // I bot partono un attimo dopo l'inizio della registrazione
      if (st.phase === 'action') setTimeout(() => GameEngine.checkTurn(), 300);
    }, [r.intro === false ? null : (r.momento || null), r.segui || false, r.primo_piano !== false, r.difesa === 'nascosta', { passo: r.passo_bot, max: r.max_giocate, lento: r.lento }]);
    if (r.intro === false) {
      await p.evaluate(() => { const st = GameEngine.state; st.players.forEach(pl => { pl.isBot = true; }); });
      await p.evaluate(m => { if (m && window.__MOMENTI[m]) { window.__MOMENTI[m](); UI.renderGameView(GameEngine.state); } }, r.momento || null);
      await p.evaluate(() => { window.__attoIniziale = GameEngine.state.actIndex; });
    }
    return async durata => {
      if (r.intro !== false) await attesa(p, 2900);
      await avvia();
      await attesa(p, Math.max(0, durata - (r.intro !== false ? 2900 : 0)));
    };
  },
  async bustina(p, r) {
    await p.evaluate(leggendaria => {
      UI.navTo ? UI.navTo('scr-shop') : UI.showScreen('scr-shop');
      if (leggendaria) {
        // L'ultima carta della bustina è una Leggendaria (per il video "apertura fortunata")
        const orig = Collezione.pescaDiRarita.bind(Collezione);
        let n = 0;
        Collezione.pescaDiRarita = (rr, f) => orig(++n === 5 ? 'leggendaria' : rr, f);
      }
    }, r.momento === 'leggendaria');
    return async durata => { await attesa(p, durata); };
  },
  async storia(p, r) {
    await p.evaluate(() => { if (Storia.dati) Storia.dati.introViste = {}; Storia.apri(); });
    return async durata => {
      const fine = Date.now() + durata;
      while (Date.now() < fine) {
        await attesa(p, Math.min(2600, Math.max(0, fine - Date.now())));
        if (Date.now() < fine) await p.evaluate(() => { const sc = document.getElementById('storiaScena'); if (sc) sc.click(); });
      }
    };
  },
  async mazzo(p, r) {
    await p.evaluate(() => UI.navTo ? UI.navTo('scr-deckbuilder') : UI.showScreen('scr-deckbuilder'));
    return async durata => { await attesa(p, 400); await scorri(p, null, durata - 400); };
  },
  async eroi(p, r) {
    await p.evaluate(() => UI.navTo ? UI.navTo('scr-hero-pick') : UI.showScreen('scr-hero-pick'));
    return async durata => {
      const fine = Date.now() + durata;
      await attesa(p, 500);
      while (Date.now() < fine - 300) {
        await attesa(p, r.passo || 1000);
        await p.evaluate(() => { const c = document.getElementById('heroCarousel'); if (c) c.scrollBy({ left: c.clientWidth * 0.8, behavior: 'smooth' }); });
      }
      await attesa(p, Math.max(0, fine - Date.now()));
    };
  },
  async carta(p, r) {
    await p.evaluate(nome => {
      const tutte = Object.values(window.MONOMYTHOS_DATA.action_cards).flat();
      const c = (nome && tutte.find(x => x.id === nome || x.nome === nome)) || tutte[Math.floor(Math.random() * tutte.length)];
      UI.inspectCard(c);
    }, r.carta || null);
    return async durata => { await attesa(p, durata); };
  }
};

// Durata da registrare: fino alla fine dell'ultima inquadratura che usa la ripresa
function durataRipresa(nome) {
  const r = copione.riprese[nome];
  const fine = copione.inquadrature.filter(q => q.ripresa === nome && typeof (q.da || 0) === 'number').map(q => (q.da || 0) + q.durata * (q.velocita || 1));
  return Math.max(r.durata || 0, ...fine) + 0.3;
}

(async () => {
  // Il flag fa uscire i fotogrammi alla risoluzione reale (1080x1920) e non a quella della pagina
  const browser = await chromium.launch({ args: ['--force-device-scale-factor=' + DPR] });
  const riprese = {};
  for (const nome of Object.keys(copione.riprese)) {
    const r = copione.riprese[nome];
    const prepara = RIPRESE[r.tipo];
    if (!prepara) { console.error(`Ripresa ${nome}: tipo sconosciuto "${r.tipo}"`); process.exit(1); }
    const durata = durataRipresa(nome);
    const dir = path.join(outDir, 'ripresa_' + nome);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
    const p = await preparaPagina(ctx);
    // Eventi del gioco con il loro tempo: il montaggio può tagliare "1 secondo prima della vittoria"
    const eventiGrezzi = [];
    await p.exposeFunction('__evento', nome => { eventiGrezzi.push({ nome, t: Date.now() / 1000 }); });
    await p.addScriptTag({ content: MOMENTI_JS });
    const gira = await prepara(p, r);
    // L'inquadratura iniziale (t = 0) è già pronta nel primo fotogramma
    for (const c of (r.camera || []).filter(c => c.t === 0)) await p.evaluate(([a, z]) => window.__camera(a, z, 0), [c.su || null, c.zoom || 1]);
    await attesa(p, 300);
    // Dove si trovano gli elementi del gioco (in pixel del video), per le etichette del montaggio
    const zone = await p.evaluate(([B, k]) => {
      const out = {};
      for (const [nome, sel] of Object.entries(B)) {
        const el = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        if (!el) continue;
        const r = el.getBoundingClientRect();
        out[nome] = [r.left, r.top, r.width, r.height].map(v => Math.round(v * k));
      }
      return out;
    }, [BERSAGLI, 1080 / VIEW.width]);
    // Cattura lo schermo con il protocollo DevTools: arriva un fotogramma JPEG a ogni cambiamento
    const cdp = await ctx.newCDPSession(p);
    const fotogrammi = [];
    let n = 0;
    cdp.on('Page.screencastFrame', f => {
      const file = String(n++).padStart(5, '0') + '.jpg';
      fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64'));
      fotogrammi.push({ file, t: f.metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
    const t0 = Date.now() / 1000;
    // Movimenti di macchina e azioni a tempo, in parallelo all'attività della ripresa
    const timers = [];
    (r.camera || []).filter(c => c.t > 0).forEach(c => timers.push(setTimeout(() => p.evaluate(([a, z, d]) => window.__camera(a, z, d), [c.su || null, c.zoom || 1, c.dur == null ? 0.6 : c.dur]).catch(() => {}), c.t * 1000)));
    (r.azioni || []).forEach(a => {
      const f = AZIONI_TEMPO[a.fai];
      if (!f) { console.error(`Azione sconosciuta "${a.fai}"`); process.exit(1); }
      timers.push(setTimeout(() => p.evaluate(f).catch(e => console.warn('  azione', a.fai, e.message)), a.t * 1000));
    });
    await gira(durata * 1000);
    timers.forEach(clearTimeout);
    const t1 = Date.now() / 1000;
    await cdp.send('Page.stopScreencast').catch(() => {});
    await ctx.close();
    // Elenco per ffmpeg (concat demuxer): il primo fotogramma parte da t0, ognuno resta fino al successivo
    const validi = fotogrammi.filter(f => f.t <= t1);
    let lista = 'ffconcat version 1.0\n';
    validi.forEach((f, k) => {
      const inizio = Math.max(f.t, t0);
      const fine = k + 1 < validi.length ? Math.max(validi[k + 1].t, t0) : t1;
      if (fine - inizio <= 0 && k + 1 < validi.length) return;
      lista += `file '${f.file}'\nduration ${Math.max(0.001, fine - inizio).toFixed(3)}\n`;
    });
    if (validi.length) lista += `file '${validi[validi.length - 1].file}'\n`;
    fs.writeFileSync(path.join(dir, 'fotogrammi.txt'), lista);
    const eventi = eventiGrezzi.filter(e => e.t >= t0 && e.t <= t1).map(e => ({ nome: e.nome, t: +(e.t - t0).toFixed(2) }));
    riprese[nome] = { cartella: path.basename(dir), fotogrammi: validi.length, durata: +(t1 - t0).toFixed(2), eventi, zone };
    console.log(`ripresa ${nome} (${r.tipo}): ${validi.length} fotogrammi in ${(t1 - t0).toFixed(1)} s` + (eventi.length ? ' · eventi: ' + eventi.map(e => e.nome + '@' + e.t).join(', ') : ''));
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'riprese.json'), JSON.stringify({ id, lingua, riprese }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
