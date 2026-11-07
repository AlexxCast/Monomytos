// Pagina Mazzo: 1) elenco dei mazzi creati + "Crea mazzo" con la carta creazione che gira,
// 2) creazione dell'eroe a slot (uno per categoria, ognuno apre la griglia delle sue carte),
// 3) costruzione del mazzo su una griglia 3 x n di carte complete (tocco = carta ingrandita).
(function () {
  const U = () => window.UI;
  const P = () => window.Progression;
  const DATA = () => window.MONOMYTHOS_DATA || {};
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RUOLI = ['origine', 'archetipo', 'costume', 'pb'];
  const NOME_RUOLO = { origine: 'Origine', archetipo: 'Archetipo', costume: 'Costume', pb: 'Potere Base' };
  const DESC_RUOLO = {
    origine: 'Vita di partenza e statistiche',
    archetipo: 'Tag di carte ammessi nel mazzo',
    costume: 'Bonus alle statistiche e passiva',
    pb: 'Azione gratuita una volta per turno'
  };
  const STAT = [['str', 'Pot', 'potenza'], ['spd', 'Agi', 'agilita'], ['tech', 'Int', 'inteligenza'], ['end', 'Vig', 'vigore']];
  const tutteAzioni = () => {
    const vist = new Set();
    return Object.values(DATA().action_cards || {}).flat().filter(c => !vist.has(c.id) && vist.add(c.id));
  };

  const Mazzi = {
    vista: 'elenco',
    nomeOriginale: null,

    // ---------- Carta creazione con la cornice argento ----------
    cartaCreazioneDOM(card) {
      if (!card) return '';
      const ui = U();
      const art = ui.getCreationCardImage(card);
      const stats = STAT.filter(([k]) => card[k]).map(([k, l]) => `${l} ${card.role === 'costume' ? '+' : ''}${card[k]}`).join(' · ');
      let titolo = '', testo = '';
      if (card.role === 'origine') { titolo = `${card.vita || 25} Vita`; testo = stats || 'Statistiche base'; }
      else if (card.role === 'costume') { titolo = stats || 'Costume'; testo = card.testo && card.testo !== '—' ? card.testo : 'Passiva'; }
      else if (card.role === 'archetipo') {
        const m = (card.testo || '').match(/Tag\s*Autorizzati\s*:\s*([^.]+)/i);
        titolo = 'Tag ammessi'; testo = m ? m[1].trim() : (card.testo || 'Tutti i tag');
      } else { titolo = 'Azione 1/turno'; testo = (card.testo || '').replace(/^Azione gratuita 1\/turno:\s*/i, ''); }
      const best = STAT.slice().sort((a, b) => (card[b[0]] || 0) - (card[a[0]] || 0))[0];
      const icona = (card[best[0]] || 0) > 0 ? `assets/icons/${best[2]}.png` : '';
      return `<div class="hero-silver-frame-wrap db-carta-creaz">
        <img class="hero-bg-img" src="${esc(art)}" alt="" onerror="this.src='assets/cards/retrocartamazzo.webp'">
        <img class="hero-frame-img" src="assets/layouts/layout_silver.webp" alt="">
        <div class="hero-vignette-bubble"><div class="hero-card-title">${esc(card.name)}</div><div class="hero-card-tag">[${esc(NOME_RUOLO[card.role] || '')}]</div></div>
        <div class="hero-card-desc-box"><div class="hero-card-pb-title">${esc(titolo)}</div><div class="hero-card-pb-text">${esc(testo)}</div></div>
        <div class="hero-card-val-circle">${card.role === 'origine' ? esc(card.vita || 25) : ''}</div>
        <div class="hero-card-icon-circle">${icona ? `<img src="${icona}" alt="">` : ''}</div>
      </div>`;
    },

    // ---------- Navigazione tra le tre viste ----------
    vai(v) {
      this.vista = v;
      const ids = { elenco: 'dbElenco', creazione: 'dbCreazione', costruzione: 'dbCostruzione' };
      Object.entries(ids).forEach(([k, id]) => { const el = document.getElementById(id); if (el) el.classList.toggle('attiva', k === v); });
      const scr = document.getElementById('scr-deckbuilder');
      if (scr) scr.dataset.vista = v;
      const tit = { elenco: ['I tuoi mazzi', 'Scegli un mazzo o creane uno nuovo'],
        creazione: ['Crea il tuo eroe', 'Tocca uno slot per scegliere la carta di quella categoria'],
        costruzione: ['Costruisci il mazzo', 'Tocca una carta per vederla ingrandita'] }[v];
      const t = document.getElementById('dbTitolo'), s = document.getElementById('dbSottotitolo');
      if (t) t.textContent = tit[0];
      if (s) s.textContent = tit[1];
      if (v === 'elenco') { this.renderElenco(); this.avviaFlip(); } else this.fermaFlip();
      if (v === 'costruzione') { this.renderEroeRiga(); U().filterDeckCards(U().currentDeckFilter || 'all'); }
      const sc = document.querySelector('#scr-deckbuilder .deckbuilder-scroll-content');
      if (sc) sc.scrollTop = 0;
      const gl = document.getElementById('deckCardsList');
      if (gl) gl.scrollTop = 0;
    },
    indietro() {
      if (this.vista === 'costruzione') return this.vai(this.nomeOriginale ? 'elenco' : 'creazione');
      if (this.vista === 'creazione') return this.vai('elenco');
      this.fermaFlip();
      U().showScreen('scr-lobby');
    },
    apri() {
      U().showScreen('scr-deckbuilder');
      this.vai('elenco');
    },

    // ---------- Vista 1: elenco ----------
    renderElenco() {
      const box = document.getElementById('dbMazziGrid');
      if (!box || !P()) return;
      const lista = P().getCustomDecksList();
      const attivo = P().data.activeDeckName;
      box.innerHTML = lista.length ? lista.map(m => {
        const n = Object.values(m.cards || {}).reduce((a, b) => a + b, 0);
        return `<button class="db-mazzo ${m.name === attivo ? 'attivo' : ''}" data-nome="${esc(m.name)}">
          <span class="db-mazzo-pila"><img src="assets/cards/retrocartamazzo.webp" alt=""><img src="assets/cards/retrocartamazzo.webp" alt=""><img src="assets/cards/retrocartamazzo.webp" alt=""></span>
          <b class="db-mazzo-nome">${esc(m.name)}</b>
          <small>${n} carte${m.name === attivo ? ' · in uso' : ''}</small>
          <span class="db-mazzo-modifica" data-mod="${esc(m.name)}">✎ Modifica</span>
        </button>`;
      }).join('') : '<p class="db-vuoto">Non hai ancora mazzi personalizzati.</p>';
      // tocco = scegli il mazzo da usare; "Modifica" = apri la costruzione
      box.querySelectorAll('.db-mazzo').forEach(b => { b.onclick = () => this.scegliMazzo(b.dataset.nome); });
      box.querySelectorAll('.db-mazzo-modifica').forEach(b => { b.onclick = (ev) => { ev.stopPropagation(); this.apriMazzo(b.dataset.mod); }; });
    },
    // Carta creazione che gira: davanti cornice argento, dietro il retro classico; ogni giro una carta diversa
    avviaFlip() {
      const fr = document.getElementById('dbFlipFront'), flip = document.getElementById('dbFlip');
      const cc = DATA().creation_cards || [];
      if (!fr || !flip || !cc.length) return;
      let ultima = -1;
      const cambia = () => {
        let i; do { i = Math.floor(Math.random() * cc.length); } while (cc.length > 1 && i === ultima);
        ultima = i; fr.innerHTML = this.cartaCreazioneDOM(cc[i]);
      };
      cambia();
      this.fermaFlip();
      const inner = flip.querySelector('.db-flip-in');
      const periodo = 4000;
      inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = '';
      // quando si vede il retro (circa al 62% del giro) si cambia la carta davanti
      this._flipT0 = setTimeout(() => { cambia(); this._flipT = setInterval(cambia, periodo); }, periodo * 0.62);
    },
    fermaFlip() { clearTimeout(this._flipT0); clearInterval(this._flipT); },

    // ---------- Caricare un mazzo (esistente o nuovo) ----------
    carica(nome) {
      const ui = U();
      ui.populateDeckCreationDropdowns();
      const def = { origine: 'Ex-Geniere', archetipo: 'Avanguardia Pesante', costume: 'Armatura Exo-K', pb: 'Sovraccarico Cinetico' };
      const ex = nome ? P().getCustomDeck(nome) : null;
      ui.currentDeckBuilding = ex ? JSON.parse(JSON.stringify(ex)) : { hero: 'Custom Hero', creation: { ...def }, cards: {} };
      ui.currentDeckBuilding.name = nome || this.nomeNuovo();
      if (!ui.currentDeckBuilding.creation) ui.currentDeckBuilding.creation = { ...def };
      if (!ui.currentDeckBuilding.cards) ui.currentDeckBuilding.cards = {};
      const cc = DATA().creation_cards || [];
      const crd = ui.currentDeckBuilding.creation;
      RUOLI.forEach(r => {
        const cur = cc.find(c => c.role === r && c.name === crd[r]);
        if (!cur || !ui.creationCardOwned(cur)) {
          const alt = cc.find(c => c.role === r && ui.creationCardOwned(c));
          if (alt) crd[r] = alt.name;
        }
      });
      const sel = { origine: 'deckSelOrigine', archetipo: 'deckSelArchetipo', costume: 'deckSelCostume', pb: 'deckSelPb' };
      RUOLI.forEach(r => { const el = document.getElementById(sel[r]); if (el && crd[r]) el.value = crd[r]; });
      const inp = document.getElementById('deckNameInput');
      if (inp) inp.value = ui.currentDeckBuilding.name;
      this.nomeOriginale = ex ? nome : null;
      const del = document.getElementById('dbElimina');
      if (del) del.style.display = ex ? '' : 'none';
      ui.currentDeckFilter = 'all';
      document.querySelectorAll('.deck-filter-tab').forEach((b, i) => b.classList.toggle('active', i === 0));
      ui.onDeckCreationChanged();
    },
    nomeNuovo() {
      const nomi = new Set(Object.keys(P().data.customDecks || {}));
      let n = nomi.size + 1;
      while (nomi.has(`Mazzo ${n}`)) n++;
      return `Mazzo ${n}`;
    },
    scegliMazzo(nome) {
      const d = P().data.customDecks || {};
      const k = d[nome]; const n = k ? Object.values(k.cards || {}).reduce((a, b) => a + b, 0) : 0;
      const R = window.Collezione ? window.Collezione.REGOLE_MAZZO : { carteMin: 60 };
      if (n < R.carteMin) return U().showToast(`"${nome}" non è completo (${n}/${R.carteMin}): tocca Modifica per finirlo.`);
      P().data.activeDeckName = nome; P().save(); U().mazzoScelto = null;
      try { window.AudioEngine?.playSfx('card_tap'); } catch (e) {}
      U().showToast(`Mazzo in uso: ${nome}`);
      this.renderElenco();
    },
    nuovo() { this.carica(null); this.vai('creazione'); },
    apriMazzo(nome) { this.carica(nome); this.vai('costruzione'); },
    async elimina() {
      const nome = this.nomeOriginale;
      if (!nome) return;
      const ok = window.Dialogo ? await window.Dialogo.conferma(`Eliminare il mazzo "${nome}"? Le carte restano nella tua collezione.`, { ok: 'Elimina', pericolo: true }) : true;
      if (!ok) return;
      P().deleteCustomDeck(nome);
      if (P().data.activeDeckName === nome) { P().data.activeDeckName = Object.keys(P().data.customDecks)[0] || null; P().save(); }
      U().showToast(`Mazzo "${nome}" eliminato`);
      this.vai('elenco');
    },
    salva() {
      const ui = U();
      const inp = document.getElementById('deckNameInput');
      const nome = (inp && inp.value.trim()) || ui.currentDeckBuilding.name || this.nomeNuovo();
      ui.updateDeckBuilderCounts();
      if (!ui._deckValid) return ui.showToast('Il mazzo non è ancora valido: guarda il messaggio sopra i filtri.');
      P().saveCustomDeck(nome, ui.currentDeckBuilding.hero || 'Custom Hero', ui.currentDeckBuilding.cards, ui.currentDeckBuilding.creation);
      if (this.nomeOriginale && this.nomeOriginale !== nome) P().deleteCustomDeck(this.nomeOriginale);
      ui.showToast(`Mazzo "${nome}" salvato!`);
      this.vai('elenco');
    },

    // ---------- Vista 2: slot di creazione ----------
    renderSlot() {
      const box = document.getElementById('deckCreationCardSlots');
      const ui = U();
      if (!box || !ui.currentDeckBuilding) return;
      const cc = DATA().creation_cards || [];
      const crd = ui.currentDeckBuilding.creation || {};
      box.innerHTML = RUOLI.map(r => {
        const card = cc.find(c => c.role === r && c.name === crd[r]) || cc.find(c => c.role === r);
        const n = cc.filter(c => c.role === r && ui.creationCardOwned(c)).length;
        return `<button class="db-slot" data-ruolo="${r}">
          <span class="db-slot-lbl">${NOME_RUOLO[r]}</span>
          ${this.cartaCreazioneDOM(card)}
          <small>${n} ${n === 1 ? 'carta' : 'carte'} · tocca per cambiare</small>
        </button>`;
      }).join('');
      box.querySelectorAll('.db-slot').forEach(b => { b.onclick = () => ui.openCreationCardPicker(b.dataset.ruolo); });
    },
    apriGrigliaRuolo(ruolo) {
      const ui = U();
      const list = document.getElementById('creationPickerList');
      if (!list) return;
      const cards = (DATA().creation_cards || []).filter(c => c.role === ruolo && ui.creationCardOwned(c));
      const cur = ui.currentDeckBuilding && ui.currentDeckBuilding.creation ? ui.currentDeckBuilding.creation[ruolo] : '';
      const t = document.getElementById('creationPickerTitle'), s = document.getElementById('creationPickerSubtitle');
      if (t) t.textContent = `Scegli: ${NOME_RUOLO[ruolo]}`;
      if (s) s.textContent = DESC_RUOLO[ruolo];
      list.className = 'db-griglia-creaz';
      list.innerHTML = cards.map(c => `<button class="db-scelta ${c.name === cur ? 'scelta' : ''}" data-nome="${esc(c.name)}">
        ${this.cartaCreazioneDOM(c)}<small>${esc(c.char || '')}${c.name === cur ? ' · scelta ✓' : ''}</small></button>`).join('');
      list.querySelectorAll('.db-scelta').forEach(b => { b.onclick = () => ui.selectCreationCard(ruolo, b.dataset.nome); });
      ui.showModal('modalPickCreationCard');
    },

    // ---------- Vista 3: griglia 3 x n ----------
    renderEroeRiga() {
      const el = document.getElementById('dbEroeRiga');
      const ui = U();
      if (!el || !ui.currentDeckBuilding) return;
      const c = ui.currentDeckBuilding.creation || {};
      const v = (k) => Math.max(1, Math.min(5, 1 + (+c[k] || 0)));
      el.innerHTML = `<span class="db-stat db-stat-vita" title="Vita">♥ ${esc(c.vita)}</span>` +
        STAT.map(([k, l, ic]) => `<span class="db-stat" title="${l}"><img src="assets/icons/${ic}.png" alt="">${v(k)}</span>`).join('') +
        `<span class="db-stat-nome" title="Origine · Potere Base">${esc(c.origine)}</span>`;
    },
    renderGriglia(allowedTags, category) {
      const ui = U();
      const box = document.getElementById('deckCardsList');
      if (!box || !ui.currentDeckBuilding) return;
      const norm = t => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
      const amm = (allowedTags || []).map(norm);
      let carte = tutteAzioni().filter(c => {
        if (!amm.length) return true;
        const t = norm(c.tag || 'Untagged');
        return amm.some(a => a === t || t.includes(a) || a.includes(t));
      });
      if (category && category !== 'all') {
        carte = category === 'Oscura' ? carte.filter(c => !!c.osc) : carte.filter(c => { const a = norm(c.cat), b = norm(category); return a.includes(b) || b.includes(a); });
      }
      const tot = carte.length;
      carte = carte.filter(c => P().getCardOwnedCount(c.id) > 0);
      if (window.Collezione) carte.sort((a, b) => window.Collezione.infoRarita(b).ordine - window.Collezione.infoRarita(a).ordine);
      const creaz = ui.currentDeckBuilding.creation;
      // le carte che questo eroe non potrebbe mai giocare non si mostrano (Alessio 7/11)
      const giocabili = carte.filter(c => !window.Collezione || !creaz || window.Collezione.giocabile(c, creaz));
      const nonGioc = carte.length - giocabili.length;
      carte = giocabili;
      let html = '';
      if (tot > carte.length + nonGioc) html += `<div class="db-nascoste db-span">Possiedi ${carte.length + nonGioc} di ${tot} carte · le altre nelle <a href="#" onclick="UI.openShop(); return false;">bustine</a> e nella Storia</div>`;
      if (nonGioc) html += `<div class="db-nascoste db-span">${nonGioc} ${nonGioc === 1 ? 'carta nascosta' : 'carte nascoste'}: con questo eroe non si possono giocare.</div>`;
      if (!carte.length) html += '<div class="db-vuoto db-span">Nessuna carta posseduta con questi filtri.</div>';
      html += carte.map(c => {
        const n = ui.currentDeckBuilding.cards[c.id] || 0;
        const own = P().getCardOwnedCount(c.id);
        const ok = !window.Collezione || !creaz || window.Collezione.giocabile(c, creaz);
        return `<div class="db-cella ${n ? 'in-mazzo' : ''} ${ok ? '' : 'non-giocabile'}" data-id="${esc(c.id)}">
          <div class="db-cella-carta">${ui.getCardDOM(c, false)}${ok ? '' : '<span class="db-nogioco">Non giocabile</span>'}</div>
          <div class="db-stepper"><button class="stepper-btn" data-d="-1">−</button><span class="stepper-val" id="cnt_${esc(c.id)}">${n}</span><button class="stepper-btn" data-d="1"${ok ? '' : ' disabled'}>+</button></div>
          <small class="db-hai">Hai ${own}</small>
        </div>`;
      }).join('');
      box.innerHTML = html;
      box.querySelectorAll('.db-cella').forEach(el => {
        const id = el.dataset.id;
        el.querySelector('.db-cella-carta').onclick = () => this.zoomCarta(id);
        el.querySelectorAll('.stepper-btn').forEach(b => { b.onclick = (ev) => { ev.stopPropagation(); this.cambia(id, +b.dataset.d); }; });
      });
    },
    cambia(id, d) {
      const ui = U();
      ui.changeCardDeckCount(id, d);
      const n = ui.currentDeckBuilding.cards[id] || 0;
      document.querySelectorAll(`.db-cella[data-id="${CSS.escape(id)}"]`).forEach(el => el.classList.toggle('in-mazzo', n > 0));
      const z = document.getElementById('dbZoomN');
      if (z && z.dataset.id === id) z.textContent = n;
    },
    // Carta ingrandita con tutte le caratteristiche
    zoomCarta(id) {
      const ui = U();
      const c = tutteAzioni().find(x => x.id === id);
      if (!c) return;
      let z = document.getElementById('dbZoom');
      if (!z) { z = document.createElement('div'); z.id = 'dbZoom'; z.className = 'minaccia-zoom'; document.body.appendChild(z); }
      const creaz = ui.currentDeckBuilding && ui.currentDeckBuilding.creation;
      const ok = !window.Collezione || !creaz || window.Collezione.giocabile(c, creaz);
      const r = window.Collezione ? window.Collezione.infoRarita(c) : null;
      const n = ui.currentDeckBuilding.cards[id] || 0;
      const righe = [
        r ? `<span class="rarity-badge" style="--rar:${r.colore}">${esc(r.nome)}</span>` : '',
        `<b>Costo:</b> ${esc(c.valore != null ? c.valore : 1)} ${esc(c.cat || '')}`,
        c.tag ? `<b>Tag:</b> ${esc(c.tag)}` : '',
        c.osc ? '<b>Carta Oscura</b>' : '',
        `<b>Possedute:</b> ${P().getCardOwnedCount(id)}`,
        ok ? '' : `<b class="db-rosso">Non giocabile con questo eroe</b> (costa ${esc(c.valore)} ${esc(c.cat)}, hai ${window.Collezione.slotMax(creaz, c.cat)} slot)`
      ].filter(Boolean).join('<br>');
      z.innerHTML = `<div class="minaccia-zoom-box db-zoom-box">
        <div class="db-zoom-carta">${ui.getCardDOM(c, true)}</div>
        <div class="db-zoom-info"><p class="db-zoom-eff">${c.effetto || c.desc || ''}</p><p>${righe}</p></div>
        <div class="db-stepper db-zoom-stepper"><button class="stepper-btn" data-d="-1">−</button><span class="stepper-val" id="dbZoomN" data-id="${esc(id)}">${n}</span><button class="stepper-btn" data-d="1"${ok ? '' : ' disabled'}>+</button></div>
        <div class="minaccia-zoom-azioni"><button class="btn btn-subtle" id="dbZoomChiudi">Chiudi</button></div>
      </div>`;
      const chiudi = () => z.classList.remove('aperto');
      z.onclick = (ev) => { if (ev.target === z) chiudi(); };
      z.querySelector('#dbZoomChiudi').onclick = chiudi;
      z.querySelectorAll('.db-zoom-stepper .stepper-btn').forEach(b => { b.onclick = () => this.cambia(id, +b.dataset.d); });
      requestAnimationFrame(() => z.classList.add('aperto'));
    }
  };

  // ---------- Scelta in "Gioca": prima il mazzo personalizzato, poi i precon ----------
  Mazzi.mazzoValido = (nome) => {
    const m = nome && P() && P().getCustomDeck(nome);
    const R = window.Collezione ? window.Collezione.REGOLE_MAZZO : { carteMin: 60 };
    return !!(m && Object.values(m.cards || {}).reduce((a, b) => a + b, 0) >= R.carteMin);
  };
  Mazzi.eroeDelMazzo = (m) => {
    const cm = DATA().chars_meta || {};
    return m && m.hero && m.hero !== 'Custom Hero' && cm[m.hero] && (DATA().action_cards || {})[m.hero] ? m.hero : 'Custom Hero';
  };
  Mazzi.slidePersonalizzato = function () {
    const ui = U(), p = P();
    if (!p) return null;
    const nome = p.data.activeDeckName, ok = this.mazzoValido(nome);
    // false = il giocatore ha scelto un precon; altrimenti la prima opzione (il mazzo personalizzato) è quella selezionata
    if (ui.mazzoScelto !== false) ui.mazzoScelto = ok ? nome : null;
    const m = ok ? p.getCustomDeck(nome) : null, cr = (m && m.creation) || {};
    const eroe = this.eroeDelMazzo(m), cc = DATA().creation_cards || [];
    let art = 'assets/cards/retrocartamazzo.webp';
    const slug = eroe.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (eroe !== 'Custom Hero' && DATA().card_img_map && DATA().card_img_map[slug]) art = DATA().card_img_map[slug];
    else { const o = cc.find(c => c.role === 'origine' && c.name === cr.origine); if (o) art = ui.getCreationCardImage(o); }
    const st = k => Math.min(5, 1 + (cr[k] || 0));
    const slide = document.createElement('div');
    slide.setAttribute('data-hero', '__mazzo__');
    slide.className = `hero-slide hero-slide-mazzo ${ui.mazzoScelto ? 'selected' : ''} ${ok ? '' : 'vuoto'}`;
    const tot = m ? Object.values(m.cards || {}).reduce((x, y) => x + y, 0) : 0;
    slide.innerHTML = ok ? `
      <div class="hero-slide-etichetta">Il tuo mazzo</div>
      <div class="hero-mazzo-pila">
        <img src="assets/cards/retrocartamazzo.webp" alt=""><img src="assets/cards/retrocartamazzo.webp" alt=""><img src="assets/cards/retrocartamazzo.webp" alt="">
      </div>
      <div class="hero-mazzo-nome">${esc(nome)}</div>
      <div class="hero-mazzo-info">${tot} carte</div>` : `
      <div class="hero-slide-etichetta">Il tuo mazzo</div>
      <div class="hero-silver-frame-wrap hero-mazzo-vuoto">
        <img class="hero-bg-img" src="assets/cards/retrocartamazzo.webp" alt="">
        <div class="hero-mazzo-vuoto-testo">Non hai ancora un mazzo personalizzato da 60 carte</div>
      </div>`;
    const scegli = () => {
      ui.mazzoScelto = nome;
      if (eroe !== 'Custom Hero') ui.selectedHero = eroe;
      document.querySelectorAll('#heroCarousel .hero-slide').forEach(s => s.classList.toggle('selected', s === slide));
    };
    const gioca = () => {
      scegli();
      if (ui.pendingMultiplayer) ui.openMultiplayerModal(true);
      else ui.startSoloGame(eroe);
    };
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = ok ? 'Gioca questo mazzo' : 'Crea un mazzo';
    btn.onclick = (e) => { e.stopPropagation(); try { window.AudioEngine?.playSfx('card_tap'); } catch (err) {} ok ? gioca() : this.apri(); };
    slide.appendChild(btn);
    if (ok) {
      const cambia = document.createElement('button');
      cambia.className = 'hero-mazzo-cambia';
      cambia.textContent = 'Cambia mazzo';
      cambia.onclick = (e) => { e.stopPropagation(); this.apri(); };
      slide.appendChild(cambia);
    }
    slide.onclick = () => {
      try { window.AudioEngine?.playSfx('card_tap'); } catch (err) {}
      if (!ok) return this.apri();
      if (ui.mazzoScelto === nome && slide.classList.contains('selected')) gioca(); else scegli();
    };
    return slide;
  };

  window.Mazzi = Mazzi;

  // Collega la nuova pagina ai metodi esistenti dell'interfaccia
  const collega = () => {
    const ui = U();
    if (!ui) return setTimeout(collega, 50);
    ui.openDeckBuilder = () => Mazzi.apri();
    ui.renderDeckCreationSlots = () => Mazzi.renderSlot();
    ui.openCreationCardPicker = (r) => Mazzi.apriGrigliaRuolo(r);
    ui.renderDeckBuilderCards = (tags, cat) => Mazzi.renderGriglia(tags, cat || ui.currentDeckFilter || 'all');
    ui.saveCurrentDeck = () => Mazzi.salva();
    // Giocatore locale: col mazzo personalizzato scelto in "Gioca" passa il mazzo al motore, altrimenti gioca il precon
    ui.configGiocatore = function (heroName) {
      const nome = this.mazzoScelto;
      if (nome && Mazzi.mazzoValido(nome)) {
        const m = P().getCustomDeck(nome);
        return { name: Mazzi.eroeDelMazzo(m), isBot: false, customDeck: m, mazzoNome: nome };
      }
      return { name: heroName, isBot: false };
    };
    // messaggio di validità corto dentro il tappetino (il testo completo resta al tocco)
    const contaOrig = ui.updateDeckBuilderCounts.bind(ui);
    ui.updateDeckBuilderCounts = () => {
      contaOrig();
      const st = document.getElementById('deckValidationStatus');
      if (!st || !ui.currentDeckBuilding) return;
      const pieno = st.textContent;
      const R = window.Collezione ? window.Collezione.REGOLE_MAZZO : { carteMin: 60, carteMax: 60 };
      const tot = Object.values(ui.currentDeckBuilding.cards || {}).reduce((a, b) => a + b, 0);
      st.title = pieno;
      st.textContent = ui._deckValid ? '✓ Pronto' : tot < R.carteMin ? `Mancano ${R.carteMin - tot}` : tot > R.carteMax ? `${tot - R.carteMax} di troppo` : '⚠ Tocca qui';
    };
    const selOrig = ui.selectCreationCard.bind(ui);
    ui.selectCreationCard = (r, n) => { selOrig(r, n); Mazzi.renderEroeRiga(); };
  };
  collega();
})();
