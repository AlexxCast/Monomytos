// Diagnosi interfaccia: su ogni schermata tocca ogni pulsante visibile e registra errori JavaScript
// e pulsanti che non fanno nulla. Uso: node strumenti/diagnosi_pulsanti.js http://localhost:8799 [larghezza] [altezza]
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:8799';
const W = +process.argv[3] || 390, H = +process.argv[4] || 844;
// Pulsanti da non toccare in automatico (escono dall'account o aprono servizi esterni)
const SALTA = /logout|esci dall'account|eliminaAccount|signOut|window\.open|location\.href|promptExitGame|navigator\.clipboard/i;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push({ dove: p._dove, msg: e.message }));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|firebase|gstatic|ERR_/i.test(m.text())) errs.push({ dove: p._dove, msg: 'console: ' + m.text() }); });
  p._accetta = false;
  p.on('dialog', d => (p._accetta ? d.accept() : d.dismiss()).catch(() => {}));
  await p.route('**/js/firebase-config.js', r => r.fulfill({ body: 'window.MONOMYTHOS_FIREBASE=null;', contentType: 'application/javascript' }));
  // Lingua della prova: LINGUA=it oppure LINGUA=en (di base quella del browser)
  if (process.env.LINGUA) await p.addInitScript(l => { try { localStorage.setItem('monomythos_lingua', l); } catch (e) {} }, process.env.LINGUA);
  await p.goto(base + '/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('appLaunchSplashOverlay'); if (s) s.style.display = 'none'; });
  if (await p.$('.starter-card')) { p._accetta = true; await p.evaluate(() => Collezione.scegliStarter(Collezione.STARTER[0].eroe)); p._accetta = false; await p.waitForTimeout(500); }
  await p.evaluate(() => { Progression.data.credits = 5000; Progression.save && Progression.save(); });

  const schermate = ['scr-lobby', 'scr-hero-pick', 'scr-deckbuilder', 'scr-shop', 'scr-storia'];
  const risultati = [];
  for (const scr of schermate) {
    await p.evaluate(s => { UI.hideModals(); s === 'scr-storia' ? Storia.apri() : (UI.navTo ? UI.navTo(s) : UI.showScreen(s)); }, scr);
    await p.waitForTimeout(500);
    await p.evaluate(() => { const sc = document.getElementById('storiaScena'); if (sc) sc.remove(); });
    const TAG = (s) => {
      const root = document.getElementById(s);
      const els = [...root.querySelectorAll('button, [onclick], .nav-item')].concat([...document.querySelectorAll('#bottomNav .nav-item, header.main-header button')]);
      return [...new Set(els)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
        .map((e, i) => { e.dataset.diag = s + '_' + i; return { id: e.dataset.diag, txt: (e.innerText || e.title || e.getAttribute('aria-label') || '').trim().slice(0, 40), on: e.getAttribute('onclick') || '', dis: e.disabled }; });
    };
    await p.evaluate(`window.__tag = ${TAG.toString()}`);
    const lista = await p.evaluate(s => window.__tag(s), scr);
    for (const el of lista) {
      if (SALTA.test(el.on) || el.dis) { risultati.push({ scr, ...el, esito: el.dis ? 'disattivato' : 'saltato' }); continue; }
      await p.evaluate(s => { UI.hideModals(); const sc = document.getElementById('storiaScena'); if (sc) sc.remove(); s === 'scr-storia' ? (UI.showScreen(s), Storia.render()) : UI.showScreen(s); }, scr);
      await p.waitForTimeout(150);
      await p.evaluate(s => window.__tag(s), scr);
      const prima = await p.evaluate(() => document.body.dataset.screen + '|' + [...document.querySelectorAll('.modal-overlay.active')].map(m => m.id).join(',') + '|' + document.body.innerHTML.length);
      p._dove = `${scr} → "${el.txt}"`;
      const nErr = errs.length;
      const ok = await p.evaluate(id => { const e = document.querySelector(`[data-diag="${id}"]`); if (!e) return false; e.click(); return true; }, el.id);
      await p.waitForTimeout(450);
      const dopo = await p.evaluate(() => document.body.dataset.screen + '|' + [...document.querySelectorAll('.modal-overlay.active')].map(m => m.id).join(',') + '|' + document.body.innerHTML.length + (document.querySelector('.app-toast') ? '|toast' : '') + (document.getElementById('storiaScena') ? '|scena' : ''));
      risultati.push({ scr, ...el, esito: !ok ? 'sparito' : (errs.length > nErr ? 'ERRORE' : (prima === dopo ? 'nessun cambiamento' : 'ok')) });
    }
  }
  // Partita: pulsanti principali
  await p.evaluate(() => { UI.hideModals(); UI.startSoloGame(Progression.data.unlockedHeroes[0]); });
  await p.waitForTimeout(4000);
  p._dove = 'partita';
  const partita = await p.evaluate(() => {
    const out = [];
    const E = GameEngine, me = E.state.players[0];
    E.state.turnIndex = 0; E.state.phase = 'action'; UI.renderGameView(E.state);
    const card = document.querySelector('#playerHandCarousel .monomyth-card');
    card && card.click();
    out.push('tocco carta → ' + ([...document.querySelectorAll('.modal-overlay.active')].map(m => m.id).join(',') || 'niente'));
    UI.hideModals();
    document.getElementById('threatCentralCard').click();
    out.push('tocco Minaccia → ' + ([...document.querySelectorAll('.modal-overlay.active')].map(m => m.id).join(',') || 'niente'));
    UI.hideModals();
    const pb = [...document.querySelectorAll('#scr-game button')].find(b => /schiacciata|potere|scatto|sovraccarico|guardia|lama|bisbiglio|calcolo/i.test(b.innerText) && b.offsetParent);
    if (pb) { pb.click(); out.push('Potere base → ' + ([...document.querySelectorAll('.modal-overlay.active')].map(m => m.id).join(',') || 'niente')); UI.hideModals(); }
    const plus = [...document.querySelectorAll('#scr-game button')].find(b => b.innerText.trim() === '+');
    const lbl = () => (document.getElementById('drawChoiceLabel') || {}).textContent;
    const l0 = lbl(); plus && plus.click(); out.push('Pesca + : ' + l0 + ' → ' + lbl());
    const end = document.querySelector('.btn-endturn');
    const r0 = E.state.turnIndex; end && end.click(); out.push('Fine turno: turno ' + r0 + ' → ' + E.state.turnIndex);
    return out;
  });
  const riassunto = {};
  risultati.forEach(r => { riassunto[r.esito] = (riassunto[r.esito] || 0) + 1; });
  console.log(JSON.stringify({ viewport: W + 'x' + H, riassunto, problemi: risultati.filter(r => ['ERRORE', 'nessun cambiamento', 'sparito'].includes(r.esito)), partita, errori: errs }, null, 1));
  await b.close();
})();
