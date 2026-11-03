// Registra le scene di gameplay di un copione con Playwright (browser senza schermo).
// Uso: node promo/registra.js <id_copione> [url_sito] [cartella_uscita]
// Esempio: node promo/registra.js bustina_leggendaria http://localhost:8799 promo/uscita
// Per ogni scena del copione salva i fotogrammi verticali (1080x1920) in una cartella e un
// elenco con la durata di ciascuno; promo/monta.js li trasforma in video.
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
// vale 2,5 pixel reali, così le immagini catturate sono nitide in Full HD (1080x1920).
const VIEW = { width: 432, height: 768 };
const DPR = 2.5;
const attesa = (p, ms) => p.waitForTimeout(ms);

async function preparaPagina(ctx) {
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept().catch(() => {}));
  p.on('pageerror', e => console.warn('  errore pagina:', e.message));
  // Niente account: il gioco parte in modalità locale come negli strumenti di diagnosi
  await p.route('**/js/firebase-config.js', r => r.fulfill({ body: 'window.MONOMYTHOS_FIREBASE=null;', contentType: 'application/javascript' }));
  await p.addInitScript(l => { try { localStorage.setItem('monomythos_lingua', l); } catch (e) {} }, lingua);
  await p.goto(base + '/index.html');
  await attesa(p, 1500);
  await p.evaluate(() => { const s = document.getElementById('appLaunchSplashOverlay'); if (s) s.style.display = 'none'; });
  if (await p.$('.starter-card')) {
    await p.evaluate(() => Collezione.scegliStarter(Collezione.STARTER[0].eroe));
    await attesa(p, 500);
  }
  // Account dimostrativo: crediti e tutte le carte, così le schermate sono piene
  await p.evaluate(() => {
    const d = Progression.data;
    d.credits = 99999;
    const dati = window.MONOMYTHOS_DATA;
    if (dati && dati.action_cards) Object.values(dati.action_cards).flat().forEach(c => { if (c && c.id) d.unlockedCards[c.id] = Math.max(2, d.unlockedCards[c.id] || 0); });
    if (Array.isArray(d.unlockedHeroes) && dati && dati.action_cards) Object.keys(dati.action_cards).forEach(h => { if (!d.unlockedHeroes.includes(h)) d.unlockedHeroes.push(h); });
    Progression.save && Progression.save();
    UI.hideModals && UI.hideModals();
  });
  return p;
}

// Scorrimento lento di un elemento (o della pagina) per mostrare una schermata piena
async function scorri(p, selettore, durata) {
  const passi = Math.max(1, Math.round(durata / 50));
  for (let i = 0; i < passi; i++) {
    await p.evaluate(([s, i, n]) => {
      const el = (s && document.querySelector(s)) || document.querySelector('.screen.active') || document.scrollingElement;
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop = max * (i / n);
    }, [selettore, i, passi]);
    await attesa(p, 50);
  }
}

const AZIONI = {
  // Schermata principale
  async home(p, s) {
    await p.evaluate(() => UI.showScreen('scr-lobby'));
    return async () => { await scorri(p, null, s.durata * 1000); };
  },
  // Partita vera giocata dai bot: tutti i giocatori sono comandati dall'IA del gioco
  async partita(p, s) {
    await p.evaluate(([n, eroe]) => {
      UI.squadSize = n;
      UI.startSoloGame(eroe || Progression.data.unlockedHeroes[0] || 'Iron Aegis');
    }, [s.eroi || 3, s.eroe || null]);
    await attesa(p, 300);
    return async () => {
      // Dopo l'introduzione della Minaccia, il giocatore locale passa al bot
      await attesa(p, Math.min(3500, s.durata * 1000));
      await p.evaluate(() => {
        const st = GameEngine.state;
        st.players.forEach(pl => { pl.isBot = true; });
        // La finestra di difesa si vede per un attimo, poi difende l'IA (niente attese di 8 secondi)
        const emit = GameEngine.emit.bind(GameEngine);
        GameEngine.emit = (ev, d) => {
          emit(ev, d);
          if (ev !== 'defense_window_opened') return;
          setTimeout(() => {
            const pd = GameEngine.pendingDefense;
            if (!pd) return;
            pd.reactionCards = pd.reactionCards || (d && d.reactionCards) || [];
            pd.parryCards = pd.parryCards || (d && d.parryCards) || [];
            clearInterval(UI._defenseCountdownInterval); UI._defenseCountdownInterval = null;
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            GameEngine.respondToDefense({ type: 'bot_fallback' });
          }, 1400);
        };
        if (st.phase === 'action') GameEngine.checkTurn();
      });
      const resto = s.durata * 1000 - 3500;
      if (resto > 0) await attesa(p, resto);
    };
  },
  // Apertura di una bustina con le carte che si girano
  async bustina(p, s) {
    await p.evaluate(() => UI.navTo ? UI.navTo('scr-shop') : UI.showScreen('scr-shop'));
    return async () => {
      await attesa(p, 1200);
      await p.evaluate(t => UI.buyBoosterPack(t || 'standard', 150), s.tipo);
      await attesa(p, s.durata * 1000 - 1200);
    };
  },
  // Modalità Storia: prologo con i dialoghi a fumetto
  async storia(p, s) {
    await p.evaluate(() => { if (Storia.dati) Storia.dati.introViste = {}; });
    return async () => {
      await p.evaluate(() => Storia.apri());
      const fine = Date.now() + s.durata * 1000;
      while (Date.now() < fine) {
        await attesa(p, 2600);
        // Avanza il dialogo toccando la scena, come farebbe il giocatore
        await p.evaluate(() => { const sc = document.getElementById('storiaScena'); if (sc) sc.click(); });
      }
    };
  },
  // Costruzione del mazzo
  async mazzo(p, s) {
    await p.evaluate(() => UI.navTo ? UI.navTo('scr-deckbuilder') : UI.showScreen('scr-deckbuilder'));
    return async () => { await attesa(p, 800); await scorri(p, null, s.durata * 1000 - 800); };
  },
  // Scelta dell'eroe
  async eroi(p, s) {
    await p.evaluate(() => UI.navTo ? UI.navTo('scr-hero-pick') : UI.showScreen('scr-hero-pick'));
    return async () => {
      // Sfoglia il carosello degli eroi uno alla volta
      await attesa(p, 600);
      const fine = Date.now() + s.durata * 1000 - 600;
      while (Date.now() < fine) {
        await attesa(p, 1100);
        await p.evaluate(() => { const c = document.getElementById('heroCarousel'); if (c) c.scrollBy({ left: c.clientWidth * 0.8, behavior: 'smooth' }); });
      }
    };
  },
  // Una carta a tutto schermo (es. "carta della settimana")
  async carta(p, s) {
    return async () => {
      await p.evaluate(nome => {
        const tutte = Object.values(window.MONOMYTHOS_DATA.action_cards).flat();
        const c = (nome && tutte.find(x => x.id === nome || x.nome === nome || x.name === nome)) || tutte[Math.floor(Math.random() * tutte.length)];
        UI.inspectCard(c);
      }, s.carta || null);
      await attesa(p, s.durata * 1000);
    };
  }
};

(async () => {
  // Il flag fa uscire i fotogrammi alla risoluzione reale (1080x1920) e non a quella della pagina
  const browser = await chromium.launch({ args: ['--force-device-scale-factor=' + DPR] });
  const scene = [];
  for (let i = 0; i < copione.scene.length; i++) {
    const s = copione.scene[i];
    const azione = AZIONI[s.tipo];
    if (!azione) { console.error(`Scena ${i}: tipo sconosciuto "${s.tipo}"`); process.exit(1); }
    const dir = path.join(outDir, 'scena_' + i);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
    const p = await preparaPagina(ctx);
    // "salta": secondi registrati in più all'inizio e poi tagliati nel montaggio
    const gira = await azione(p, { ...s, durata: s.durata + (s.salta || 0) });
    // Cattura lo schermo con il protocollo DevTools: arriva un fotogramma JPEG a ogni cambiamento
    const cdp = await ctx.newCDPSession(p);
    const fotogrammi = [];
    let n = 0;
    cdp.on('Page.screencastFrame', async f => {
      const nome = String(n++).padStart(5, '0') + '.jpg';
      fs.writeFileSync(path.join(dir, nome), Buffer.from(f.data, 'base64'));
      fotogrammi.push({ nome, t: f.metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
    const t0 = Date.now() / 1000;
    await gira();
    const t1 = Date.now() / 1000;
    await cdp.send('Page.stopScreencast').catch(() => {});
    await ctx.close();
    // Elenco per ffmpeg (concat demuxer): ogni fotogramma resta a schermo fino al successivo
    let lista = 'ffconcat version 1.0\n';
    fotogrammi.forEach((f, k) => {
      const fine = k + 1 < fotogrammi.length ? fotogrammi[k + 1].t : t1;
      lista += `file '${f.nome}'\nduration ${Math.max(0.001, fine - f.t).toFixed(3)}\n`;
    });
    if (fotogrammi.length) lista += `file '${fotogrammi[fotogrammi.length - 1].nome}'\n`;
    fs.writeFileSync(path.join(dir, 'fotogrammi.txt'), lista);
    scene.push({ cartella: path.basename(dir), fotogrammi: fotogrammi.length, salta: s.salta || 0, durata: s.durata, registrati: +(t1 - t0).toFixed(2) });
    console.log(`scena ${i} (${s.tipo}) registrata: ${fotogrammi.length} fotogrammi in ${(t1 - t0).toFixed(1)} s`);
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'scene.json'), JSON.stringify({ id, lingua, scene }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
