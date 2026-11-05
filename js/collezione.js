// Monomythos: collezione, rarità, mazzo starter, bustine, Storia ed eventi.
// Tutti i numeri di bilanciamento stanno qui in cima, per cambiarli senza toccare il resto.
(function () {
  const RARITA = {
    comune:      { nome: 'Comune',      colore: '#9aa3ad', ordine: 0, doppione: 5 },
    noncomune:   { nome: 'Non comune',  colore: '#3fcf86', ordine: 1, doppione: 10 },
    rara:        { nome: 'Rara',        colore: '#2bc4e6', ordine: 2, doppione: 25 },
    epica:       { nome: 'Epica',       colore: '#a35cff', ordine: 3, doppione: 60 },
    leggendaria: { nome: 'Leggendaria', colore: '#f5b82e', ordine: 4, doppione: 150 }
  };

  // Minacce: ogni giocatore ha il suo mazzo; in partita si pesca a caso dal mazzo di tutti i giocatori
  const RARITA_MINACCIA = { 1: 'comune', 2: 'noncomune', 3: 'rara', 4: 'rara', 5: 'epica', 6: 'leggendaria' };
  const MINACCE_STARTER = ['Blackout Ostile', 'Torneo Clandestino', 'Incursione dei Droni Cinetici',
    "L'Assedio dei Predoni delle Rovine", 'Imboscata sulla Falesia', 'Cultisti del Velo'];
  const MAZZO_MINACCE = { min: 3, max: 8 };
  const COSTO_BUSTA_MINACCE = 200;

  // Un mazzo starter da scegliere al primo accesso: uno per statistica principale
  const STARTER = [
    { eroe: 'Titano d\'Acciaio', mazzo: 'Colpo Pesante', stat: 'Potenza', testo: 'Danni enormi e pugni che spaccano gli scudi. Facile da giocare.' },
    { eroe: 'Neon Phantom', mazzo: 'Ombra Rapida', stat: 'Agilità', testo: 'Colpi veloci, schivate e combo nello stesso turno.' },
    { eroe: 'Architetto Ombra', mazzo: 'Mente Tattica', stat: 'Intelligenza', testo: 'Trappole, controllo dei nemici e carte che si potenziano.' },
    { eroe: 'Iron Aegis', mazzo: 'Muro d\'Acciaio', stat: 'Vigore', testo: 'Scudi e cure: protegge la squadra e resiste a tutto.' }
  ];

  // Quante copie dà lo sblocco di un eroe (starter compreso). Epiche e Leggendarie solo dalle bustine.
  const COPIE_SBLOCCO = { comune: 2, noncomune: 2, rara: 1, epica: 0, leggendaria: 0 };
  // Mazzo personalizzato: solo carte possedute, al massimo 2 copie per carta
  const REGOLE_MAZZO = { carteMin: 60, carteMax: 60, copieMax: 2, oscureMax: 24 };
  // Copie oltre questo numero diventano crediti (le copie oltre la seconda sono doppioni da scambiare)
  const COPIE_MAX_COLLEZIONE = 6;
  const CREDITI_INIZIALI = 300;
  const COSTO_EROE = 600;

  // Bustina da 5 carte: 3 slot comuni, 1 slot non comune o meglio, 1 slot rara o meglio
  const SLOT_BUSTINA = [
    { comune: 80, noncomune: 20 },
    { comune: 80, noncomune: 20 },
    { comune: 80, noncomune: 20 },
    { noncomune: 85, rara: 15 },
    { rara: 76, epica: 20, leggendaria: 4 }
  ];

  // STAGIONE 1 della Storia: si avanza sconfiggendo Minacce (ogni Atto vinto conta, anche se la partita finisce male)
  const STAGIONE = {
    nome: 'Stagione 1 · La Prima Calamità',
    capitoli: [
      { minacce: 1,  titolo: 'Il Risveglio',          testo: 'Un segnale dal vuoto: la prima Calamità si è mossa.', premio: { bustine: 1 } },
      { minacce: 3,  titolo: 'Un alleato inatteso',   testo: 'Qualcuno risponde alla chiamata.',                     premio: { eroe: 1 } },
      { minacce: 6,  titolo: 'La città nella nebulosa', testo: 'Le strade brillano di energia strana.',             premio: { crediti: 300, bustine: 1, minaccia: 1 } },
      { minacce: 10, titolo: 'Il patto spezzato',     testo: 'Un eroe è stato visto passare al buio.',              premio: { eroe: 1 } },
      { minacce: 15, titolo: 'Cuore oscuro',          testo: 'Il Trauma si diffonde: servono carte più forti.',     premio: { bustine: 2, epica: 1, minaccia: 1 } },
      { minacce: 21, titolo: 'Fratture nel cielo',    testo: 'La galassia rossa si avvicina.',                      premio: { eroe: 1, crediti: 300 } },
      { minacce: 28, titolo: 'L\'ultimo baluardo',    testo: 'Resta un ultimo varco da difendere.',                 premio: { eroe: 1, bustine: 2, minaccia: 1 } },
      { minacce: 36, titolo: 'La Prima Calamità',     testo: 'Affronta la fonte di tutto. Fine della Stagione 1.',   premio: { eroe: 1, leggendaria: 1, crediti: 500, minaccia: 1 } }
    ]
  };

  // Eventi a tempo (date in formato AAAA-MM-GG, estremi compresi). Per pubblicare nuove carte
  // si aggiunge un evento con "nuoveCarte" (id delle carte) e si mette la carta in cards_data.js.
  const EVENTI = [
    { id: 'lancio', nome: 'Pioggia di Stelle', dal: '2026-11-01', al: '2026-12-31',
      testo: 'Evento di lancio: le Minacce danno il doppio dei crediti.', effetto: { creditiX: 2 } }
  ];

  const all = () => Object.values((window.MONOMYTHOS_DATA || {}).action_cards || {}).flat();
  const oggi = () => new Date().toISOString().slice(0, 10);
  const pick = (weights) => {
    const tot = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
    return Object.keys(weights)[0];
  };

  // Rarità: Deus Ex = Leggendaria, Oscure = Epica; le altre carte di ogni eroe sono
  // ordinate per forza (valore + numero di effetti): le 3 più forti Rare, poi 4 Non comuni, il resto Comuni.
  let _rar = null;
  function tabellaRarita() {
    if (_rar) return _rar;
    _rar = {};
    const ac = (window.MONOMYTHOS_DATA || {}).action_cards || {};
    Object.keys(ac).forEach(h => {
      const normali = [];
      ac[h].forEach(c => {
        if (c.deus) _rar[c.id] = 'leggendaria';
        else if (c.osc) _rar[c.id] = 'epica';
        else normali.push(c);
      });
      const forza = c => (c.valore || 0) + (c.fx_list || []).length * 1.5 + (c.kw && c.kw !== '—' ? 1 : 0);
      normali.sort((a, b) => forza(b) - forza(a) || a.num - b.num)
        .forEach((c, i) => { _rar[c.id] = i < 3 ? 'rara' : (i < 7 ? 'noncomune' : 'comune'); });
    });
    return _rar;
  }

  const Collezione = {
    RARITA, STARTER, STAGIONE, EVENTI, COSTO_EROE, MAZZO_MINACCE, COSTO_BUSTA_MINACCE, REGOLE_MAZZO, COPIE_MAX_COLLEZIONE,
    doppioni(id) { return Math.max(0, ((this.p && this.p.data.unlockedCards[id]) || 0) - REGOLE_MAZZO.copieMax); },

    // ---------- Minacce ----------
    tutteMinacce() { return (window.MONOMYTHOS_DATA || {}).threats || []; },
    rarMinaccia(t) { return RARITA_MINACCIA[t.livello] || 'comune'; },
    minaccePossedute() { return (this.p && this.p.data.minacce) || []; },
    mazzoMinacce() {
      const d = this.p && this.p.data;
      if (!d) return [];
      const own = this.minaccePossedute();
      let deck = (d.mazzoMinacce || own).filter(n => own.includes(n));
      if (deck.length < MAZZO_MINACCE.min) deck = own.slice(0, MAZZO_MINACCE.max);
      return deck;
    },
    toggleMinaccia(nome) {
      const d = this.p.data;
      let deck = this.mazzoMinacce().slice();
      if (deck.includes(nome)) {
        if (deck.length <= MAZZO_MINACCE.min) return window.UI.showToast(`Il mazzo Minacce deve avere almeno ${MAZZO_MINACCE.min} carte.`);
        deck = deck.filter(n => n !== nome);
      } else {
        if (deck.length >= MAZZO_MINACCE.max) return window.UI.showToast(`Massimo ${MAZZO_MINACCE.max} Minacce nel mazzo.`);
        deck.push(nome);
      }
      d.mazzoMinacce = deck;
      this.p.save();
      this.renderMinacce();
    },
    aggiungiMinaccia(nome) {
      const d = this.p.data;
      d.minacce = d.minacce || [];
      if (d.minacce.includes(nome)) return false;
      d.minacce.push(nome);
      if (d.mazzoMinacce && d.mazzoMinacce.length < MAZZO_MINACCE.max) d.mazzoMinacce.push(nome);
      return true;
    },
    // Una Minaccia nuova a caso, più facile trovare quelle comuni
    pescaMinacciaNuova() {
      const pesi = { comune: 40, noncomune: 30, rara: 18, epica: 9, leggendaria: 3 };
      const nuove = this.tutteMinacce().filter(t => !this.minaccePossedute().includes(t.nome));
      if (!nuove.length) return null;
      const tot = nuove.reduce((a, t) => a + pesi[this.rarMinaccia(t)], 0);
      let r = Math.random() * tot;
      for (const t of nuove) { r -= pesi[this.rarMinaccia(t)]; if (r <= 0) return t; }
      return nuove[0];
    },
    compraBustaMinacce() {
      const d = this.p.data;
      if (d.credits < COSTO_BUSTA_MINACCE) return window.UI.showToast('Crediti insufficienti per la Busta Minacce.');
      const t = this.pescaMinacciaNuova();
      if (!t) return window.UI.showToast('Hai già tutte le Minacce!');
      d.credits -= COSTO_BUSTA_MINACCE;
      this.aggiungiMinaccia(t.nome);
      this.p.save();
      document.querySelectorAll('.creditsDisplay').forEach(el => { el.textContent = d.credits; });
      window.UI.showToast(`Nuova Minaccia ${RARITA[this.rarMinaccia(t)].nome}: ${t.nome}!`);
      this.renderMinacce();
      window.UI.renderShopView && window.UI.renderShopView();
    },
    apriMinacce() { this.renderMinacce(); window.UI.showModal('modalMinacce'); },
    renderMinacce() {
      const box = document.getElementById('minacceBody');
      if (!box || !this.p) return;
      const deck = this.mazzoMinacce(), own = this.minaccePossedute();
      const list = this.tutteMinacce().slice().sort((a, b) => a.livello - b.livello);
      box.innerHTML = `<p class="minacce-intro">Nel tuo mazzo: <b>${deck.length}</b> (da ${MAZZO_MINACCE.min} a ${MAZZO_MINACCE.max}). In partita le 3 Minacce si pescano a caso dai mazzi di tutti i giocatori, dalla più debole alla più forte.</p>
        <div class="minacce-grid">${list.map(t => {
          const has = own.includes(t.nome), on = deck.includes(t.nome), r = RARITA[this.rarMinaccia(t)];
          return `<button class="minaccia-card ${has ? '' : 'locked'} ${on ? 'on' : ''}" data-nome="${t.nome.replace(/"/g, '&quot;')}" ${has ? '' : 'disabled'}>
            <img src="${t.img || 'assets/icons/minaccia.webp'}" alt="" onerror="this.src='assets/icons/minaccia.webp'">
            <span class="minaccia-info"><b>${t.nome}</b><span class="rarity-badge" style="--rar:${r.colore}">${r.nome} · Liv ${t.livello}</span>
            <small>${has ? (on ? 'Nel mazzo' : 'Tocca per aggiungere') : '🔒 Da sbloccare'}</small></span>
          </button>`;
        }).join('')}</div>`;
      box.querySelectorAll('.minaccia-card:not(.locked)').forEach(b => { b.onclick = () => this.toggleMinaccia(b.dataset.nome); });
    },


    rarita(cardOrId) {
      const id = typeof cardOrId === 'string' ? cardOrId : cardOrId && cardOrId.id;
      return tabellaRarita()[id] || 'comune';
    },
    infoRarita(cardOrId) { return RARITA[this.rarita(cardOrId)]; },
    badge(cardOrId) {
      const r = this.infoRarita(cardOrId);
      return `<span class="rarity-badge" style="--rar:${r.colore}">${r.nome}</span>`;
    },

    get p() { return window.Progression; },
    haStarter() { return !!(this.p && this.p.data.starter); },

    // Prima volta (o salvataggio del vecchio sistema): collezione vuota, si sceglie lo starter
    migra() {
      const d = this.p.data;
      if (d.collezioneV === 1) return;
      d.collezioneV = 1;
      d.starter = null;
      d.unlockedHeroes = [];
      d.unlockedCards = {};
      d.customDecks = {};
      d.activeDeckName = null;
      d.credits = CREDITI_INIZIALI;
      d.storia = { minacce: 0, capitoli: 0 };
      d.bustineGratis = 0;
      this.p.save();
    },

    sbloccaEroe(nome) {
      const d = this.p.data;
      if (!d.unlockedHeroes.includes(nome)) d.unlockedHeroes.push(nome);
      ((window.MONOMYTHOS_DATA.action_cards || {})[nome] || []).forEach(c => {
        const n = COPIE_SBLOCCO[this.rarita(c)] || 0;
        if (n) d.unlockedCards[c.id] = Math.max(d.unlockedCards[c.id] || 0, n);
      });
    },

    // Mazzo starter da 60 carte (30 carte diverse × 2 copie), tutte regalate: le carte dell'eroe
    // (senza Epiche e Leggendarie) più carte Comuni/Non comuni di altri eroi con i Tag ammessi dall'Archetipo
    creaMazzoStarter(nome) {
      const D = window.MONOMYTHOS_DATA, d = this.p.data;
      const s = STARTER.find(x => x.eroe === nome) || { mazzo: 'Mazzo di ' + nome };
      const cc = D.creation_cards || [];
      const pick = role => cc.find(c => c.role === role && c.char === nome) || {};
      const o = pick('origine'), a = pick('archetipo'), co = pick('costume'), pb = pick('pb');
      const m = (a.testo || '').match(/Tag\s*Autorizzati\s*:\s*([^.]+)/i);
      const tags = ['Untagged', ...(m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : ['Attacco Fisico', 'Abilità Tech', 'Gadget', 'Difesa', 'Burst'])];
      const norm = t => String(t || 'Untagged').toLowerCase().replace(/[^a-z0-9]/g, '');
      const tagOk = c => { const t = norm(c.tag); return tags.map(norm).some(x => x === t || t.includes(x) || x.includes(t)); };
      const base = r => ['comune', 'noncomune', 'rara'].includes(r);
      const proprie = (D.action_cards[nome] || []).filter(c => base(this.rarita(c)) && tagOk(c));
      const ordine = { comune: 0, noncomune: 1, rara: 2 };
      const altre = Object.keys(D.action_cards).filter(h => h !== nome).flatMap(h => D.action_cards[h])
        .filter(c => ['comune', 'noncomune'].includes(this.rarita(c)) && tagOk(c))
        .sort((x, y) => ordine[this.rarita(x)] - ordine[this.rarita(y)] || x.num - y.num);
      const scelte = [];
      [...proprie, ...altre].forEach(c => { if (scelte.length < REGOLE_MAZZO.carteMin / REGOLE_MAZZO.copieMax && !scelte.includes(c)) scelte.push(c); });
      const carte = {};
      scelte.forEach(c => {
        carte[c.id] = REGOLE_MAZZO.copieMax;
        d.unlockedCards[c.id] = Math.max(d.unlockedCards[c.id] || 0, REGOLE_MAZZO.copieMax);
      });
      const str = Math.min(5, (o.str || 0) + (co.str || 0)), spd = Math.min(5, (o.spd || 0) + (co.spd || 0));
      const tech = Math.min(5, (o.tech || 0) + (co.tech || 0)), end = Math.min(5, (o.end || 0) + (co.end || 0));
      const creation = { origine: o.name, archetipo: a.name, costume: co.name, pb: pb.name, str, spd, tech, end, vita: o.vita || 25, allowedTags: tags, pb_desc: pb.testo || '' };
      this.p.saveCustomDeck(s.mazzo, nome, carte, creation);
      return Object.values(carte).reduce((x, y) => x + y, 0);
    },

    // Account creati prima di questa versione: se non hanno un mazzo da 60 valido, ricevono quello starter
    assicuraMazzoStarter() {
      const d = this.p && this.p.data;
      if (!d || !d.starter || d.mazzoStarterV === 1) return;
      d.mazzoStarterV = 1;
      const valido = Object.values(d.customDecks || {}).some(k => Object.values(k.cards || {}).reduce((x, y) => x + y, 0) >= REGOLE_MAZZO.carteMin);
      if (!valido) this.creaMazzoStarter(d.starter);
      this.p.save(true);
    },

    scegliStarter(nome) {
      const s = STARTER.find(x => x.eroe === nome);
      if (!s) return;
      this.sbloccaEroe(nome);
      this.creaMazzoStarter(nome);
      this.p.data.mazzoStarterV = 1;
      MINACCE_STARTER.forEach(m => this.aggiungiMinaccia(m));
      this.p.data.mazzoMinacce = MINACCE_STARTER.slice();
      this.p.data.starter = nome;
      this.p.data.bustineGratis = (this.p.data.bustineGratis || 0) + 1;
      this.p.save();
      window.UI.selectedHero = nome;
      this.aggiornaHome();
      window.UI.showScreen('scr-lobby');
      window.UI.showToast(`Mazzo "${s.mazzo}" pronto! Hai anche 1 bustina in regalo nel Negozio.`);
      if (window.Online) window.Online.dopoAccesso();
    },

    prossimoEroeBloccato() {
      const ordine = ['Iron Aegis', 'Neon Phantom', 'Guardiana di Confine', 'Lama Errante',
        'Titano d\'Acciaio', 'Architetto Ombra', 'Sussurro dell\'Abisso', 'Duellante Spezzato'];
      return ordine.find(h => !this.p.isHeroUnlocked(h));
    },

    // Una carta pescata dalla bustina: doppioni oltre le 4 copie diventano crediti
    _aggiungi(card, risultati) {
      const d = this.p.data;
      const r = this.rarita(card);
      const prima = d.unlockedCards[card.id] || 0;
      if (prima >= COPIE_MAX_COLLEZIONE) {
        d.credits += RARITA[r].doppione;
        risultati.push({ card, rarita: r, nuova: false, crediti: RARITA[r].doppione });
      } else {
        d.unlockedCards[card.id] = prima + 1;
        risultati.push({ card, rarita: r, nuova: prima === 0 });
      }
    },

    pescaDiRarita(r, filtro) {
      let pool = all().filter(c => this.rarita(c) === r && (!filtro || filtro(c)));
      if (!pool.length) pool = all().filter(c => this.rarita(c) === r);
      return pool[Math.floor(Math.random() * pool.length)];
    },

    apriBustina(tipo = 'standard', costo = 150) {
      const d = this.p.data;
      const gratis = costo === 0;
      if (gratis) {
        if (!(d.bustineGratis > 0)) return { ok: false, msg: 'Non hai bustine in regalo' };
        d.bustineGratis--;
      } else if (d.credits < costo) {
        return { ok: false, msg: 'Crediti insufficienti per la bustina' };
      } else {
        d.credits -= costo;
      }
      const filtro = tipo === 'kinetic' ? (c => c.cat === 'Agilità' || c.cat === 'Potenza')
        : tipo === 'techno' ? (c => c.cat === 'Intelligenza' || c.osc) : null;
      const risultati = [];
      SLOT_BUSTINA.forEach(w => this._aggiungi(this.pescaDiRarita(pick(w), filtro), risultati));
      this.p.save();
      return { ok: true, cards: risultati.map(x => x.card), dettagli: risultati, credits: d.credits };
    },

    eventiAttivi() {
      const t = oggi();
      return EVENTI.filter(e => e.dal <= t && t <= e.al);
    },
    moltiplicatoreCrediti() {
      return this.eventiAttivi().reduce((m, e) => m * ((e.effetto && e.effetto.creditiX) || 1), 1);
    },

    // Chiamato dal motore a ogni Minaccia sconfitta
    // Statistica: Minacce sconfitte in tutte le partite (i premi della Storia ora sono in storia.js)
    registraMinaccia() {
      if (!this.p) return;
      const d = this.p.data;
      d.storia = d.storia || { minacce: 0, capitoli: 0 };
      d.storia.minacce++;
      this.p.save();
    },

    _premia(cap) {
      const d = this.p.data, pr = cap.premio, voci = [];
      if (pr.crediti) { d.credits += pr.crediti; voci.push(`${pr.crediti} crediti`); }
      if (pr.bustine) { d.bustineGratis = (d.bustineGratis || 0) + pr.bustine; voci.push(`${pr.bustine} ${pr.bustine > 1 ? 'bustine' : 'bustina'}`); }
      if (pr.eroe) {
        const h = this.prossimoEroeBloccato();
        if (h) { this.sbloccaEroe(h); voci.push(`nuovo eroe: ${h}`); } else { d.credits += 300; voci.push('300 crediti'); }
      }
      if (pr.minaccia) {
        const t = this.pescaMinacciaNuova();
        if (t) { this.aggiungiMinaccia(t.nome); voci.push(`Minaccia: ${t.nome}`); } else { d.credits += 200; voci.push('200 crediti'); }
      }
      ['epica', 'leggendaria'].forEach(r => {
        if (pr[r]) { const ris = []; this._aggiungi(this.pescaDiRarita(r), ris); voci.push(`carta ${RARITA[r].nome}: ${ris[0].card.nome}`); }
      });
      return { titolo: cap.titolo, voci };
    },

    _annunciaCapitoli(lista) {
      const ui = window.UI;
      if (!ui) return;
      setTimeout(() => {
        lista.forEach((c, i) => setTimeout(() => {
          ui.fxBanner && ui.fxBanner(`CAPITOLO: ${c.titolo.toUpperCase()}`, 'Premio: ' + c.voci.join(', '), 'gold');
          ui.showToast && ui.showToast(`Storia: ${c.titolo}. Premio: ${c.voci.join(', ')}`);
        }, i * 2600));
      }, 800);
    },

    // ---------- Interfaccia ----------
    renderStarter() {
      const box = document.getElementById('starterChoices');
      if (!box) return;
      const meta = window.MONOMYTHOS_DATA.chars_meta;
      const img = (h) => {
        const slug = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (window.MONOMYTHOS_DATA.card_img_map || {})[slug] || (meta[h] && meta[h].img) || 'assets/cards/ironaegis.webp';
      };
      const icone = { Potenza: 'potenza.png', 'Agilità': 'agilita.png', Intelligenza: 'inteligenza.png', Vigore: 'vigore.png' };
      box.innerHTML = STARTER.map(s => `
        <button class="starter-card" data-hero="${s.eroe.replace(/"/g, '&quot;')}">
          <img class="starter-art" src="${img(s.eroe)}" alt="">
          <span class="starter-stat"><img src="assets/icons/${icone[s.stat]}" alt="">${s.stat}</span>
          <span class="starter-info">
            <b class="starter-deck">${s.mazzo}</b>
            <span class="starter-hero">${s.eroe}</span>
            <span class="starter-text">${s.testo}</span>
          </span>
        </button>`).join('');
      box.querySelectorAll('.starter-card').forEach(b => {
        b.onclick = () => {
          const h = b.dataset.hero;
          const s = STARTER.find(x => x.eroe === h);
          const T = window.I18N ? window.I18N.t : (x => x);
          const msg = `${T('Scegli il mazzo')} "${T(s.mazzo)}" ${T('con')} ${T(h)}? ${T('Gli altri eroi li sblocchi giocando la Storia.')}`;
          window.Dialogo.conferma(msg, { ok: 'Scegli' }).then(si => { if (si) this.scegliStarter(h); });
        };
      });
    },

    renderStoria() {
      const box = document.getElementById('storiaBody');
      if (!box) return;
      const d = this.p.data, st = d.storia || { minacce: 0, capitoli: 0 };
      const ev = this.eventiAttivi();
      const tot = all().length;
      const posseduteUniche = all().filter(c => (d.unlockedCards[c.id] || 0) > 0).length;
      box.innerHTML = `
        ${ev.map(e => `<div class="storia-evento"><b>EVENTO · ${e.nome}</b><span>${e.testo} Fino al ${e.al.split('-').reverse().join('/')}.</span></div>`).join('')}
        <div class="storia-stats">
          <div><b>${st.minacce}</b><span>Minacce sconfitte</span></div>
          <div><b>${d.unlockedHeroes.length}/8</b><span>Eroi</span></div>
          <div><b>${posseduteUniche}/${tot}</b><span>Carte</span></div>
        </div>
        <h4 class="storia-season">${STAGIONE.nome}</h4>
        <ol class="storia-capitoli">
          ${STAGIONE.capitoli.map((c, i) => {
            const fatto = i < st.capitoli, attuale = i === st.capitoli;
            const pr = c.premio, voci = [];
            if (pr.eroe) voci.push('Nuovo eroe');
            if (pr.bustine) voci.push(`${pr.bustine} bustin${pr.bustine > 1 ? 'e' : 'a'}`);
            if (pr.crediti) voci.push(`${pr.crediti} CR`);
            if (pr.epica) voci.push('Carta Epica');
            if (pr.leggendaria) voci.push('Carta Leggendaria');
            if (pr.minaccia) voci.push('Nuova Minaccia');
            return `<li class="${fatto ? 'done' : ''} ${attuale ? 'current' : ''}">
              <span class="cap-num">${fatto ? '✓' : i + 1}</span>
              <span class="cap-body"><b>${c.titolo}</b><small>${c.testo}</small>
              <em>${attuale ? `${st.minacce}/${c.minacce} Minacce · ` : (fatto ? '' : `Servono ${c.minacce} Minacce · `)}Premio: ${voci.join(', ')}</em></span>
            </li>`;
          }).join('')}
        </ol>
        <p class="storia-note">Ogni Atto vinto conta come Minaccia sconfitta, anche se poi la missione va male.</p>`;
    },

    assicuraMinacce() {
      this.assicuraMazzoStarter();
      const d = this.p && this.p.data;
      if (d && d.starter && !(d.minacce && d.minacce.length)) {
        MINACCE_STARTER.forEach(m => this.aggiungiMinaccia(m));
        d.mazzoMinacce = MINACCE_STARTER.slice();
        this.p.save(true);
      }
    },

    aggiornaHome() {
      if (window.Storia) return window.Storia.aggiornaHome();
      const el = document.getElementById('homeStorySub');
      if (!el || !this.p) return;
      const st = this.p.data.storia || { minacce: 0, capitoli: 0 };
      const cap = STAGIONE.capitoli[st.capitoli];
      el.textContent = cap ? `Capitolo ${st.capitoli + 1}: ${cap.titolo} · ${st.minacce}/${cap.minacce}` : 'Stagione 1 completata!';
    },

    apriStoria() { if (window.Storia) return window.Storia.apri(); this.renderStoria(); window.UI.showModal('modalStoria'); },

    init() {
      if (!this.p) return;
      this.migra();
      const ui = window.UI;
      if (ui && !ui._collezioneGuard) {
        const orig = ui.showScreen.bind(ui);
        ui.showScreen = (id) => {
          const T = window.Tutorial;
          if (T && T.inPartita && id === 'scr-game') return orig(id);
          if (id !== 'scr-auth' && id !== 'scr-starter' && !this.haStarter()) {
            this.renderStarter();
            if (T) setTimeout(() => T.dopoPartita(), 400);
            id = 'scr-starter';
          }
          return orig(id);
        };
        ui._collezioneGuard = true;
      }
      this.aggiornaHome();
      this.assicuraMinacce();
      document.querySelectorAll('.creditsDisplay').forEach(el => { el.textContent = this.p.getCredits(); });
      if (!this.haStarter()) {
        // Primo accesso senza account obbligatorio: parte subito la prima missione come tutorial
        const A = window.Account;
        if (window.Tutorial && window.Tutorial.serve() && !(A && A.required)) { setTimeout(() => window.Tutorial.avvia(), 300); return; }
        this.renderStarter(); window.UI.showScreen('scr-lobby');
      }
    }
  };

  window.Collezione = Collezione;
  window.addEventListener('DOMContentLoaded', () => Collezione.init());
})();
