// Monomythos Complete Game Engine - 100% Rules Compliance
class MonomythosEngine {
  constructor() {
    this.state = null;
    this.listeners = [];
  }

  on(event, cb) {
    this.listeners.push({ event, cb });
  }

  emit(event, data) {
    if (event === 'game_over') this.bonusMoraleFinale();
    this.listeners.forEach(l => {
      if (l.event === event || l.event === '*') {
        l.cb(event, data, this.state);
      }
    });
  }

  // A fine partita (Classificata e Storia) ogni Punto Eroe/VP rimasto vale 5 crediti — scelta di Alessio 2026-11-05
  bonusMoraleFinale() {
    const st = this.state;
    if (!st || st._bonusMorale || !(st.ranked || st.story) || !window.Progression) return;
    st._bonusMorale = true;
    const me = st.players.find(p => p.isLocal);
    if (!me) return;
    const punti = me.state === 'villain' ? (me.vp || 0) : (me.pe || 0);
    const cr = punti * ((window.MONOMYTHOS_BILANCIAMENTO || {}).creditiPerPunto || 5);
    if (cr > 0) {
      window.Progression.addCredits(cr, me.state === 'villain' ? 'VP rimasti' : 'Punti Eroe rimasti');
      this.addLog('sys', `[BONUS] ${punti} ${me.state === 'villain' ? 'VP' : 'Punti Eroe'} rimasti: +${cr} Crediti Cosmici`);
    }
  }

  // Initialize a new match
  startMatch(options = {}) {
    const data = window.MONOMYTHOS_DATA;
    if (!data) throw new Error('Monomythos data not loaded');

    const heroConfigs = options.heroes || [
      { name: 'Iron Aegis', isBot: false },
      { name: 'Neon Phantom', isBot: true }
    ];

    // Pick 3 random distinct threats for Act I, Act II, Act Finale
    // Mazzi Minacce dei giocatori: si pesca a caso dall'insieme, poi dalla più debole alla più forte
    const poolNames = Array.isArray(options.threatPool) ? new Set(options.threatPool) : null;
    let pool = poolNames ? data.threats.filter(t => poolNames.has(t.nome)) : [...data.threats];
    if (pool.length < 3) pool = [...data.threats];
    const shuffledThreats = [...pool].sort(() => Math.random() - 0.5);
    let actThreats = shuffledThreats.slice(0, 3).sort((a, b) => a.livello - b.livello);
    // Storia: le Minacce degli Atti sono fisse e nell'ordine del racconto
    // (da 1 a 3 Atti: nella Storia ogni carta Minaccia compare una sola volta, quindi una missione può averne meno di 3)
    if (Array.isArray(options.actThreats) && options.actThreats.length >= 1 && options.actThreats.length <= 3) {
      const fixed = options.actThreats.map(n => data.threats.find(t => t.nome === n)).filter(Boolean);
      if (fixed.length === options.actThreats.length) actThreats = fixed;
    }

    // Initialize players
    const players = heroConfigs.map((cfg, idx) => {
      let meta = { ...(data.chars_meta[cfg.name] || {
        str: 2, spd: 2, tech: 2, end: 2, vita: 25,
        pb_name: 'Potere Base', pb_desc: 'Effetto base'
      }) };

      // Check if player has a custom deck specified or saved in progression
      let deck = [];
      let customDeckConfig = cfg.customDeck;
      // Un eroe precon gioca il SUO mazzo precon (mai il mazzo personalizzato attivo): il personalizzato arriva solo da cfg.customDeck
      if (!customDeckConfig && cfg.name === 'Custom Hero' && window.Progression && !cfg.isBot && !cfg.remoteUid) {
        const an = window.Progression.data.activeDeckName;
        customDeckConfig = an ? window.Progression.getCustomDeck(an) : null;
      }
      let precon = false;
      if (!customDeckConfig && window.Collezione && window.Collezione.mazzoStarterDati && data.action_cards[cfg.name]) {
        // Mazzo precon: 30 carte diverse x2, solo carte che l'eroe può giocare (Tag dell'Archetipo e statistiche), con abbastanza attacchi
        try { customDeckConfig = { hero: cfg.name, ...(({ carte, creation }) => ({ cards: carte, creation }))(window.Collezione.mazzoStarterDati(cfg.name)) }; precon = true; } catch (e) { customDeckConfig = null; }
      }
      // Nome del mazzo usato, da mostrare in partita
      let mazzoNome = cfg.mazzoNome || (precon && !cfg.isBot ? 'Precon' : null);
      if (!mazzoNome && customDeckConfig && !precon && window.Progression && !cfg.isBot && !cfg.remoteUid) {
        const cd = window.Progression.data.customDecks || {};
        mazzoNome = Object.keys(cd).find(k => cd[k] === customDeckConfig) || null;
      }

      if (customDeckConfig && customDeckConfig.creation) {
        const cr = customDeckConfig.creation;
        if (cr.str !== undefined) meta.str = cr.str;
        if (cr.spd !== undefined) meta.spd = cr.spd;
        if (cr.tech !== undefined) meta.tech = cr.tech;
        if (cr.end !== undefined) meta.end = cr.end;
        if (cr.vita) meta.vita = cr.vita;
        if (cr.pb) meta.pb_name = cr.pb;
        if (cr.pb_desc) meta.pb_desc = cr.pb_desc;
      }

      // §8.5: ogni statistica parte da 1; i modificatori si sommano; valore nominale massimo 5
      ['str', 'spd', 'tech', 'end'].forEach(k => {
        meta[k] = Math.max(1, Math.min(5, 1 + (meta[k] || 0)));
      });

      if (customDeckConfig && customDeckConfig.cards && Object.keys(customDeckConfig.cards).length > 0) {
        // Build deck from custom deck map
        Object.keys(customDeckConfig.cards).forEach(cid => {
          const count = customDeckConfig.cards[cid];
          const allCards = Object.values(data.action_cards).flat();
          const cardTemplate = allCards.find(c => c.id === cid);
          if (cardTemplate) {
            for (let i = 0; i < count; i++) {
              deck.push({ ...cardTemplate, uid: Math.random().toString(36).substring(2, 9) });
            }
          }
        });
      }

      // Ensure deck has 60 cards (standard Monomythos deck rule)
      const availableCards = data.action_cards[cfg.name] || data.action_cards['Iron Aegis'];
      // §8.8: massimo 4 copie per carta e massimo 12 Carte Oscure
      const isDark = c => !!(c.osc || c.cat === 'Oscuro' || c.layout_type === 'purple');
      const copies = {};
      deck.forEach(c => { copies[c.id] = (copies[c.id] || 0) + 1; });
      let darkCount = deck.filter(isDark).length;
      let padIdx = 0;
      let misses = 0;
      // Il mazzo personalizzato si gioca così com'è (solo carte possedute); il mazzo base dell'eroe arriva a 60
      const targetSize = deck.length > 0 && customDeckConfig ? deck.length : 60;
      while (deck.length < targetSize && availableCards && availableCards.length > 0 && misses < availableCards.length) {
        const c = availableCards[padIdx % availableCards.length];
        padIdx++;
        if ((copies[c.id] || 0) >= 4 || (isDark(c) && darkCount >= 12)) { misses++; continue; }
        misses = 0;
        copies[c.id] = (copies[c.id] || 0) + 1;
        if (isDark(c)) darkCount++;
        deck.push({ ...c, uid: Math.random().toString(36).substring(2, 9) });
      }
      deck = deck.sort(() => Math.random() - 0.5);

      const maxHand = 5 + meta.end;
      const initialHand = deck.splice(0, Math.min(maxHand, 5 + meta.end));

      return {
        id: `p_${idx}`,
        name: cfg.name,
        mazzoNome,
        isBot: !!cfg.isBot,
        uid: cfg.uid || null,
        remoteUid: cfg.remoteUid || null,
        displayName: cfg.displayName || null,
        isLocal: cfg.isLocal !== undefined ? cfg.isLocal : !cfg.isBot,
        str: meta.str,
        spd: meta.spd,
        tech: meta.tech,
        end: meta.end,
        vitaMax: meta.vita,
        vita: meta.vita,
        shield: 0,
        // Percorso del Velo (Storia): l'eroe parte già Villain
        trm: cfg.villain ? ((window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5) : 0,
        pe: 0,
        vp: 0,
        state: cfg.villain ? 'villain' : 'hero', // 'hero' or 'villain'
        isDead: false,
        pbName: meta.pb_name,
        pbDesc: meta.pb_desc,
        pbUsedThisTurn: false,
        sacrificesThisRound: 0,
        actedThisRound: false,
        retentionUsedThisRound: false,
        retainedCards: [],
        logoramento: false,
        drawChoice: null, // null = massimo consentito (§8.5)
        maxHand: maxHand,
        slots: {
          Potenza: meta.str,
          Agilità: meta.spd,
          Agilita: meta.spd,
          Intelligenza: meta.tech,
          Vigore: meta.end,
          potenza: meta.str,
          agilita: meta.spd,
          intelligenza: meta.tech,
          vigore: meta.end
        },
        deck: deck,
        hand: initialHand,
        discard: []
      };
    });

    this.state = {
      actIndex: 0, // 0 = Act I, 1 = Act II, 2 = Act Finale
      actThreats: actThreats,
      // I crediti si guadagnano solo in Classificata (la Storia dà i suoi premi a fine missione)
      ranked: !!options.ranked,
      story: options.story || null,
      noCrisi: !!options.story,
      // Moltiplicatore di difficoltà (Vita e soglie dei nemici), usato dalle missioni della Storia
      difficolta: options.difficolta || 1,
      // Regole a strati (prime missioni della Storia): 1 = solo Vita, 2 = + binari e Pesca, null = tutte le regole
      livelloRegole: options.livelloRegole || null,
      forzaExtra: options.forzaExtra || 0,
      threatPool: pool.map(t => t.nome),
      currentThreat: null,
      round: 1,
      turnIndex: 0,
      phase: 'draw', // 'draw', 'action', 'enemy', 'gameover'
      players: players,
      playedCardsThisRound: [],
      cosmicMutationActive: false,
      isRogueHeroBoss: !!options.isRogueHeroBoss,
      bossHeroName: options.bossHeroName || "Titano d'Acciaio",
      log: [],
      winner: null // 'heroes', 'threat', 'villain'
    };

    this.setupCurrentThreat();
    this.addLog('sys', `=== INIZIO MISSIONE — ATTO I: ${this.state.currentThreat.nome} ===`);
    this.emit('match_started', this.state);

    this.startRound();
    return this.state;
  }

  // Regole a strati: quali regole sono attive in questa partita
  regola(nome) {
    const L = this.state && this.state.livelloRegole;
    if (!L) return true;
    if (nome === 'binari' || nome === 'pesca') return L >= 2;
    if (nome === 'villain' || nome === 'trauma') return L >= 3;
    return true;
  }

  // Indice dell'Atto Finale (2 di solito; meno nelle missioni della Storia con 1 o 2 Minacce)
  ultimoAtto() { return Math.max(0, ((this.state && this.state.actThreats) || [0, 0, 0]).length - 1); }

  setupCurrentThreat() {
    const raw = this.state.actThreats[this.state.actIndex];
    const numHeroes = this.state.players.filter(p => !p.isDead).length || 2;

    // §8.2 Crisi Composita: negli Atti I e II, una Minaccia di Livello ≤ 3 si fonde con una seconda dal pool
    let secondary = null;
    const BIL = window.MONOMYTHOS_BILANCIAMENTO || {};
    if (BIL.crisiComposita !== false && !this.state.noCrisi && this.state.actIndex < this.ultimoAtto() && raw.livello <= 3) {
      const used = new Set(this.state.actThreats.map(t => t.nome));
      const allowed = this.state.threatPool ? new Set(this.state.threatPool) : null;
      let pool = (window.MONOMYTHOS_DATA.threats || []).filter(t => !used.has(t.nome) && (!allowed || allowed.has(t.nome)));
      if (pool.length === 0) pool = (window.MONOMYTHOS_DATA.threats || []).filter(t => !used.has(t.nome));
      if (pool.length > 0) secondary = pool[Math.floor(Math.random() * pool.length)];
    }
    const liv = raw.livello + (secondary ? secondary.livello : 0);

    const parseEnemies = (card) => {
      const m = String(card.nemici || '').match(/(\d+)×?\s*(.+)/);
      return m ? { count: parseInt(m[1]) || 1, name: m[2].trim() } : { count: 1, name: card.nemici || 'Nemico' };
    };

    // §8.1 Formula unica: Vita totale = Vita Unitaria × (Livello + Numero Eroi), divisa tra i nemici della carta.
    // Nella Crisi Composita il Livello è quello composito; i nemici di entrambe le carte entrano in gioco.
    const groups = [{ card: raw, ...parseEnemies(raw) }];
    if (secondary) groups.push({ card: secondary, ...parseEnemies(secondary) });

    const mooks = [];
    let totalHp = 0;
    groups.forEach(g => {
      // Bilanciamento (scelta di Alessio): i nemici della carta secondaria usano il proprio Livello, non quello composito
      const groupLiv = g.card === raw ? liv : g.card.livello;
      const groupHp = Math.max(g.count, Math.round(g.card.vu * (groupLiv + (numHeroes * (BIL.pesoEroi || 1) + Math.max(0, numHeroes - 2) * (BIL.pesoEroiOltre2 || 0))) * (BIL.scalaVita || 1) * (BIL.scalaGruppo && numHeroes > 1 ? BIL.scalaGruppo : 1) * (this.state.difficolta || 1)));
      totalHp += groupHp;
      const mookHp = Math.ceil(groupHp / g.count);
      for (let i = 0; i < g.count; i++) {
        mooks.push({
          id: `mook_${mooks.length}`,
          name: `${g.name} ${String.fromCharCode(65 + i)}`,
          hp: mookHp,
          maxHp: mookHp,
          isDead: false,
          subsidiary: g.card !== raw
        });
      }
    });
    if (secondary) {
      this.addLog('threat', `[CRISI COMPOSITA] ${raw.nome} si fonde con ${secondary.nome}: Livello ${liv}`);
    }

    // Thresholds: SogliaUnitaria × (Livello + NumeroEroi)
    const primMax = this.sogliaBinario(raw.primario.val, liv, numHeroes);
    const brutMax = this.sogliaBinario(raw.bruto.val, liv, numHeroes);

    this.state.currentThreat = {
      ...raw,
      // Missioni della Storia: Forza in più dei nemici (campo forza della missione)
      forza: (raw.forza || 0) + (this.state.forzaExtra || 0),
      livello: liv,
      fusedWith: secondary ? secondary.nome : null,
      parryRate: 1,
      hp: totalHp,
      maxHp: totalHp,
      mooks: mooks,
      timerMax: raw.timer,
      timer: raw.timer,
      primarioProgress: 0,
      primarioMax: primMax,
      brutoProgress: 0,
      brutoMax: brutMax,
      isBoss: this.state.actIndex === this.ultimoAtto()
    };
    // La Vita della Minaccia è esattamente la somma degli sgherri
    this.syncThreatHp();
    this.state.currentThreat.maxHp = this.state.currentThreat.hp;

    if (this.state.isRogueHeroBoss) {
      this.setupRogueHeroBoss(this.state.bossHeroName || "Titano d'Acciaio");
      return;
    }

    if (this.state.actIndex === this.ultimoAtto()) {
      // Act Finale State Freezing
      this.state.players.forEach(p => {
        p.stateFrozen = true;
      });
      this.state.cosmicMutationActive = true;
      const rateMatch = String(raw.cosmico || '').match(/(\d)\s*:\s*1/);
      this.state.currentThreat.parryRate = rateMatch ? parseInt(rateMatch[1]) : 1;
      this.addLog('threat', `[COSMICO] STATE FREEZING & EFFETTO ATTIVO: ${raw.cosmico}`);
    }
  }

  // Soglia di un binario: SogliaUnitaria × (Livello + peso degli eroi) × manopole × difficoltà
  sogliaBinario(val, liv, numHeroes) {
    const BIL = window.MONOMYTHOS_BILANCIAMENTO || {};
    const D = (this.state && this.state.difficolta) || 1;
    const peso = numHeroes * (BIL.pesoEroi || 1) + Math.max(0, numHeroes - 2) * (BIL.pesoEroiOltre2 || 0);
    return Math.max(1, Math.round(val * (liv + peso) * (BIL.scalaSoglie || 1) * (BIL.scalaGruppo && numHeroes > 1 ? BIL.scalaGruppo : 1) * D));
  }

  setupRogueHeroBoss(bossHeroName) {
    const data = window.MONOMYTHOS_DATA;
    const meta = data.chars_meta[bossHeroName] || { str: 4, spd: 0, tech: 0, end: 4, vita: 32 };
    const numHeroes = this.state.players.filter(p => !p.isDead).length || 2;
    const totalHp = meta.vita * 2;

    this.state.currentThreat = {
      nome: `${bossHeroName} (Boss Corrotto)`,
      livello: 4,
      nemici: `1× ${bossHeroName} [Villain]`,
      vu: meta.vita,
      forza: meta.str + 1,
      timer: 4,
      timerMax: 4,
      hp: totalHp,
      maxHp: totalHp,
      primario: { val: 3, cat: 'Intelligenza', raw: '3 [Intelligenza]' },
      bruto: { val: 4, cat: 'Potenza', raw: '4 [Potenza]' },
      primarioProgress: 0,
      primarioMax: 3 * (4 + numHeroes),
      brutoProgress: 0,
      brutoMax: 4 * (4 + numHeroes),
      pericoloso: 'Furia Eroe Corrotto: Colpi devastanti che infliggono +1 TRM.',
      cosmico: 'Egemonia del Fato: la Parata Dinamica converte a 2:1 (somma dei Valori ÷ 2).',
      parryRate: 2,
      logica: 'Aggressivo → Attacca ad area e bersaglia chi ha meno carte',
      img: data.chars_meta[bossHeroName]?.img || 'assets/icons/minaccia.webp',
      mooks: [{
        id: 'boss_npc',
        name: `${bossHeroName} [Villain]`,
        hp: totalHp,
        maxHp: totalHp,
        isDead: false
      }],
      isBoss: true,
      isRogueHero: true
    };
    this.state.cosmicMutationActive = true;
    this.addLog('threat', `[BOSS] Eroe Corrotto: ${bossHeroName} è sceso in campo come Villain!`);
  }

  startRound() {
    this.state.phase = 'action';
    this.state.playedCardsThisRound = [];

    // Reset player slots and counters
    this.state.players.forEach(p => {
      if (p.isDead) return;
      p.shield = 0;
      p.sacrificesThisRound = 0;
      p.pbUsedThisTurn = false;
      p.pbExtraUsed = false;
      p.actedThisRound = false;
      p.retentionUsedThisRound = false;
      p.tempResistance = 0;
      p.damageReduction = 0;
      p.attaccoGiocatoRound = false;
      p.slots = {
        Potenza: p.str,
        Agilità: p.spd,
        Agilita: p.spd,
        Intelligenza: p.tech,
        Vigore: p.end,
        potenza: p.str,
        agilita: p.spd,
        intelligenza: p.tech,
        vigore: p.end
      };

      // Ritenzione Tattica: le carte trattenute tornano in mano a fine round (§3.3.3)
      if (p.retainedCards && p.retainedCards.length > 0) {
        p.retainedCards.forEach(rc => {
          const di = p.discard.findIndex(c => c.uid === rc.uid);
          if (di !== -1) p.discard.splice(di, 1);
          p.hand.push(rc);
        });
        p.retainedCards = [];
      }

      // Dal Round 2: pescaggio a scelta da 1 a min(5, Velocità + 1) (§8.5). Al Round 1 vale la mano iniziale.
      if (this.state.round > 1 && this.mx('saltaPescata', false)) {
        if (p === this.state.players.find(x => !x.isDead)) this.addLog('threat', `[CARESTIA] Round pari: nessuno pesca a inizio turno`);
      } else if (this.state.round > 1) {
        const maxDraw = this.getMaxDraw(p);
        const wanted = p.drawChoice == null ? this.getBotDrawChoice(p, maxDraw) : p.drawChoice;
        const drawCount = Math.max(1, Math.min(maxDraw, wanted));
        for (let i = 0; i < drawCount; i++) {
          if (p.hand.length >= p.maxHand) break;
          this.drawOne(p);
        }
        p.drawBonus = 0;
        if (p.weakened && p.weakenedRound != null && p.weakenedRound < this.state.round) { p.weakened = false; p.weakenedRound = null; }
      }
    });

    // Turret Automatica e simili: 1 danno allo sgherro più ferito a inizio round, per i round rimasti
    this.state.players.forEach(p => {
      if (p.isDead || !(p.torretta > 0)) return;
      p.torretta--;
      if (this.sgherroBersaglio()) {
        this.addLog('hero', `[TORRETTA] La torretta di ${p.name} spara`);
        window.EffectRegistry.execute('damage', this, { source: p, card: { cat: 'Torretta' }, targetId: 'threat_boss', targetEntity: this.resolveTarget('threat_boss') }, { type: 'damage', amount: 1 });
      }
    });
    this.checkThreatDefeated();
    if (this.isGameOver()) return;
    this.state.attacchiRound = 0;

    this.state.turnIndex = 0;
    this.addLog('sys', `--- Round ${this.state.round} ---`);
    this.emit('round_started', this.state);

    this.checkTurn();
  }

  // Pescaggio massimo: min(5, Velocità + 1); Sfiancato blocca le carte extra (§3.4, §8.5)
  getMaxDraw(p) {
    if (p.weakened && !p.logoramento) return 1;
    const max = (window.MONOMYTHOS_BILANCIAMENTO || {}).pescaMax || 5;
    return Math.min(max, (p.spd || 1) + 1) + (p.drawBonus || 0);
  }

  // Scelta del bot: pesca al massimo, ma si ferma se il mazzo sta per finire (Push Your Luck)
  getBotDrawChoice(p, maxDraw) {
    if (p.deck.length <= maxDraw) return Math.max(1, p.deck.length - 1);
    return maxDraw;
  }

  // Il giocatore umano dichiara quante carte pescherà al prossimo round
  setDrawChoice(playerId, n) {
    const p = this.state.players.find(x => x.id === playerId);
    if (!p) return;
    p.drawChoice = Math.max(1, Math.min(this.getMaxDraw(p), n));
    this.emit('draw_choice_changed', p);
  }

  drawOne(p) {
    if (p.deck.length === 0) this.handleDeckOut(p);
    if (p.deck.length > 0) {
      p.hand.push(p.deck.pop());
      return true;
    }
    return false;
  }

  // Decking Out (§4.2): rimescola gli scarti, +10 TRM, Villain immediato e Logoramento Sistemico permanente
  handleDeckOut(p) {
    if (p.discard.length === 0) return;
    p.deck = [...p.discard].sort(() => Math.random() - 0.5);
    p.discard = [];
    p.trm = Math.min(5, p.trm + 10);
    p.logoramento = true;
    this.addLog('threat', `[DECKOUT] ${p.name} ha esaurito il mazzo! +10 TRM e Logoramento Sistemico: ogni carta giocata costa 1 Vita.`);
    this.checkBreakingPoint(p);
  }

  checkTurn() {
    const activePlayer = this.getActivePlayer();
    if (!activePlayer || activePlayer.isDead) {
      this.endTurn();
      return;
    }

    if (activePlayer.isBot) {
      setTimeout(() => this.runBotTurn(activePlayer), 800);
    }
  }

  getActivePlayer() {
    return this.state.players[this.state.turnIndex];
  }

  // Effetti Pericolosi/Cosmici della Minaccia in gioco (js/minacce_effetti.js)
  mx(gancio, valore, info) {
    return window.EffettiMinaccia ? window.EffettiMinaccia.mod(this, gancio, valore, info) : valore;
  }

  // La Minaccia è la somma dei suoi sgherri (scelta di Alessio 2026-11-05): non si attacca direttamente.
  // Un colpo "alla Minaccia" va allo sgherro vivo più ferito.
  sgherroBersaglio() {
    const th = this.state && this.state.currentThreat;
    const vivi = ((th && th.mooks) || []).filter(m => !m.isDead && m.hp > 0);
    if (!vivi.length) return null;
    return vivi.reduce((a, b) => (b.hp < a.hp ? b : a));
  }

  // Vita della Minaccia = somma della Vita degli sgherri vivi
  syncThreatHp() {
    const th = this.state && this.state.currentThreat;
    if (!th || !th.mooks || !th.mooks.length) return;
    th.hp = th.mooks.reduce((t, m) => t + (m.isDead ? 0 : Math.max(0, m.hp)), 0);
  }

  // Target resolver helper (Point 7)
  resolveTarget(targetId) {
    if (!this.state || !this.state.currentThreat) return null;
    const th = this.state.currentThreat;
    if (!targetId || targetId === 'threat_boss' || targetId === 'boss') {
      const m = this.sgherroBersaglio();
      if (m) return { id: m.id, type: 'mook', name: m.name, entity: m };
      return { id: 'threat_boss', type: 'boss', name: th.nome, entity: th };
    }
    if (th.mooks) {
      const mook = th.mooks.find(m => m.id === targetId);
      if (mook) return { id: mook.id, type: 'mook', name: mook.name, entity: mook };
    }
    const player = this.state.players.find(p => p.id === targetId);
    if (player) return { id: player.id, type: 'player', name: player.name, entity: player };
    return { id: 'threat_boss', type: 'boss', name: th.nome, entity: th };
  }

  // Evaluate candidate targets for a card (Point 7)
  getValidTargetsForCard(playerId, card) {
    const player = this.state.players.find(p => p.id === playerId);
    const th = this.state.currentThreat;
    const candidates = [];
    if (!player || !th) return { requiresTarget: false, candidates };

    const fxList = card.fx_list || [];
    const isTargeted = fxList.some(f => f.target === 'choose' || f.target === 'choose_ally' || f.target === 'target');
    const hasHealOrBuff = fxList.some(f => f.type === 'heal' || f.type === 'shield' || f.type === 'draw' || f.type === 'revive');
    const hasDamage = fxList.some(f => f.type === 'damage' || f.type === 'stun' || f.type === 'weaken' || f.type === 'weakenForza');

    // 1. Threat Boss: solo se non restano sgherri (la Minaccia è la somma degli sgherri)
    if (!this.sgherroBersaglio()) candidates.push({
      id: 'threat_boss',
      type: 'boss',
      name: th.nome,
      hp: th.hp,
      maxHp: th.maxHp,
      isValid: hasDamage || (!hasHealOrBuff),
      desc: `Boss Calamità (${th.hp}/${th.maxHp} HP)`
    });

    // 2. Mooks of Threat
    if (th.mooks && th.mooks.length > 0) {
      th.mooks.forEach(m => {
        candidates.push({
          id: m.id,
          type: 'mook',
          name: m.name,
          hp: m.hp,
          maxHp: m.maxHp,
          isValid: !m.isDead && (hasDamage || (!hasHealOrBuff)),
          desc: m.isDead ? 'Sconfitto' : `Sgherro (${m.hp}/${m.maxHp} HP)`
        });
      });
    }

    // 3. Players (Allies / PvP opponents)
    this.state.players.forEach(p => {
      const isSelf = p.id === player.id;
      let valid = false;
      let desc = `${p.name} [${p.state.toUpperCase()}] (${p.vita}/${p.vitaMax} HP)`;

      if (hasHealOrBuff) {
        valid = !p.isDead || fxList.some(f => f.type === 'revive');
      } else if (hasDamage) {
        // PvP rules: valid if source is Villain or target is Villain
        valid = !isSelf && !p.isDead && (player.state === 'villain' || p.state === 'villain' || this.state.isPvP);
        if (!valid && !isSelf) {
          desc += ' (Non bersagliabile da un Eroe)';
        }
      }

      candidates.push({
        id: p.id,
        type: 'player',
        name: isSelf ? `Tu (${p.name})` : p.name,
        hp: p.vita,
        maxHp: p.vitaMax,
        isValid: valid,
        desc: desc,
        isSelf: isSelf
      });
    });

    return {
      requiresTarget: isTargeted,
      candidates: candidates
    };
  }

  // Helper for resilient category matching
  normalizeCategory(cat) {
    if (!cat) return 'potenza';
    const c = String(cat).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (c.includes('pot') || c.includes('str') || c.includes('fisic')) return 'potenza';
    if (c.includes('agi') || c.includes('spd') || c.includes('cinet')) return 'agilita';
    if (c.includes('int') || c.includes('tech') || c.includes('tecno')) return 'intelligenza';
    if (c.includes('vig') || c.includes('end') || c.includes('res') || c.includes('dif')) return 'vigore';
    return c;
  }

  getPlayerSlot(player, cat) {
    if (!player || !player.slots) return 0;
    const norm = this.normalizeCategory(cat);
    if (player.slots[norm] !== undefined) return player.slots[norm];
    if (player.slots[cat] !== undefined) return player.slots[cat];
    for (const [k, v] of Object.entries(player.slots)) {
      if (this.normalizeCategory(k) === norm) return v;
    }
    return 0;
  }

  deductPlayerSlot(player, cat, cost) {
    if (!player || !player.slots) return;
    const norm = this.normalizeCategory(cat);
    for (const k of Object.keys(player.slots)) {
      if (this.normalizeCategory(k) === norm) {
        player.slots[k] = Math.max(0, player.slots[k] - cost);
      }
    }
    // (prima qui si toglieva il costo una seconda volta dallo slot minuscolo: ogni carta costava il doppio)
  }

  // Condizioni delle carte. Alcune si leggono prima di giocare la carta (foto), altre dopo il colpo (bersaglio morto o vivo).
  fotoCondizioni(player) {
    const st = this.state;
    const altri = st.players.filter(p => p !== player && !p.isDead);
    return {
      primo: !(st.attacchiRound > 0),
      alleatoColpito: altri.some(p => p.ultimoDanno != null && p.ultimoDanno >= st.round - 1),
      potere: !!player.pbUsedThisTurn,
      vitaPiena: player.vita >= player.vitaMax
    };
  }

  condizioneVera(se, player, targetEntity, foto) {
    const f = foto || this.fotoCondizioni(player);
    const e = targetEntity && targetEntity.entity;
    switch (se) {
      case 'primo': return f.primo;
      case 'nonPrimo': return !f.primo;
      case 'alleatoColpito': return f.alleatoColpito;
      case 'potere': return f.potere;
      case 'vitaPiena': return f.vitaPiena;
      case 'mano4': return player.hand.length >= 4;
      case 'bersaglioMorto': return !!(targetEntity && targetEntity.type === 'mook' && e && e.isDead);
      case 'bersaglioVivo': return !!(targetEntity && targetEntity.type === 'mook' && e && !e.isDead);
      case 'bersaglioGiocatore': return !!(targetEntity && targetEntity.type === 'player');
      case 'bersaglioNemico': return !(targetEntity && targetEntity.type === 'player');
      default: return true;
    }
  }

  // Play a card for effect (Opzione A - Modular Data-Driven System via EffectRegistry)
  playCardEffect(playerId, cardUid, targetId = null) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead) return { ok: false, msg: 'Giocatore non attivo' };

    const cardIdx = player.hand.findIndex(c => c.uid === cardUid);
    if (cardIdx === -1) return { ok: false, msg: 'Carta non in mano' };
    const card = player.hand[cardIdx];

    // Check slot cost with resilient category matching
    const cat = card.cat;
    const cost = card.valore || 0;
    const availableSlots = this.getPlayerSlot(player, cat);
    if (availableSlots < cost) {
      return { ok: false, msg: `Slot ${cat} insufficienti (richiesti: ${cost}, disponibili: ${availableSlots})` };
    }

    // Default target for attack cards if not explicitly set
    const fxList = card.fx_list || [];
    if (!targetId && (card.fx?.dmg || fxList.some(f => f.type === 'damage' || f.type === 'stun' || f.type === 'weaken' || f.type === 'weakenForza'))) {
      targetId = 'threat_boss';
    }

    // Spesa Morale (§4.3): le carte con [Costo] spendono Punti Eroe (o VP da Villain)
    if (window.Morale && !window.Morale.puoPagare(card, player)) {
      return { ok: false, msg: window.Morale.motivo(card, player) };
    }
    // Spesa del Fato (§4.3): servono 2 VP da Villain oppure 2 Punti Eroe, altrimenti la carta si può solo sacrificare
    if (fxList.some(f => f.type === 'fateSpend') && !((player.state === 'villain' && (player.vp || 0) >= 2) || (player.pe || 0) >= 2)) {
      return { ok: false, msg: player.state === 'villain' ? `Servono 2 VP (ne hai ${player.vp || 0})` : `Servono 2 Punti Eroe (ne hai ${player.pe || 0})` };
    }
    const pagato = window.Morale ? window.Morale.paga(card, player) : null;
    if (pagato) this.addLog(pagato.tipo === 'pe' ? 'hero' : 'threat', `[SPESA MORALE] ${player.name} spende ${pagato.n} ${pagato.tipo === 'pe' ? 'Punti Eroe' : 'VP'} (rimasti: ${player[pagato.tipo]})`);

    // Deduct slots
    this.deductPlayerSlot(player, cat, cost);
    player.hand.splice(cardIdx, 1);
    player.discard.push(card);
    player.actedThisRound = true;
    this.state.playedCardsThisRound.push({ player: player.name, card: card });

    this.addLog('hero', `${player.name} gioca [${card.nome}]: ${card.effetto}`);

    // Logoramento Sistemico (§3.4): ogni giocata costa 1 Punto di Vita Base
    if (player.logoramento) {
      player.vita = Math.max(0, player.vita - 1);
      this.addLog('threat', `[LOGORAMENTO] ${player.name} paga 1 Vita per giocare la carta (${player.vita}/${player.vitaMax})`);
      this.checkPlayerDeath(player);
      if (player.isDead) return { ok: true };
    }

    if (card.osc) this.mx('cartaOscura', null, { player, card });

    // Disciplina d'Assalto (N) (§3.3.3): +1 danno se dopo la giocata restano almeno N carte in mano
    const text = String(card.effetto || '');
    const discMatch = text.match(/DISCIPLINA D['’]ASSALTO\s*\((\d+)\)/i);
    if (discMatch && player.hand.length >= parseInt(discMatch[1])) {
      player.boostedAttack = (player.boostedAttack || 0) + 1;
      this.addLog('hero', `[DISCIPLINA D'ASSALTO] ${player.name} ha ancora ${player.hand.length} carte: +1 danno`);
    }

    // Modular Execution via EffectRegistry
    const targetEntity = this.resolveTarget(targetId);

    if (fxList.length === 0) {
      // Legacy fallback
      if (card.fx?.dmg) {
        window.EffectRegistry.execute('damage', this, { source: player, card, targetId, targetEntity }, { type: 'damage', amount: card.fx.dmg });
      }
      if (card.fx?.shield) {
        window.EffectRegistry.execute('shield', this, { source: player, card, targetId, targetEntity }, { type: 'shield', amount: card.fx.shield });
      }
      if (card.fx?.heal) {
        window.EffectRegistry.execute('heal', this, { source: player, card, targetId, targetEntity }, { type: 'heal', amount: card.fx.heal });
      }
    } else {
      // Condizioni scritte sulla carta ("se attacchi per primo", "se hai 4+ carte"...): si leggono prima di giocarla
      const foto = this.fotoCondizioni(player);
      fxList.forEach(fx => {
        // Evaluate conditions
        if (fx.condition === 'hero' && player.state !== 'hero') return;
        if (fx.condition === 'villain' && player.state !== 'villain') return;
        if (fx.se && !this.condizioneVera(fx.se, player, targetEntity, foto)) return;

        // If played actively in-turn, reaction cards provide active defensive shield/prep
        if (fx.timing && fx.timing !== 'play') {
          if (fx.type === 'shield' || fx.type === 'parry' || fx.type === 'damageReduction') {
            const shieldAmt = this.mx('scudo', fx.amount || card.valore || 2, { source: player });
            player.shield = Math.min(this.mx('scudoMax', Infinity, { source: player }), (player.shield || 0) + shieldAmt);
            this.addLog('hero', `[ASSETTO DIFENSIVO] ${player.name} prepara ${card.nome}: +${shieldAmt} Scudo attivo.`);
            return;
          } else if (fx.type === 'damage') {
            const ctx = {
              source: player,
              card: card,
              targetId: targetId || 'threat_boss',
              targetEntity: targetEntity || this.resolveTarget('threat_boss')
            };
            window.EffectRegistry.execute(fx.type, this, ctx, fx);
            return;
          }
        }

        const ctx = {
          source: player,
          card: card,
          targetId: targetId,
          targetEntity: targetEntity
        };
        window.EffectRegistry.execute(fx.type, this, ctx, fx);
      });
    }

    // Ritenzione Tattica (X) (§3.3.3): se dopo l'effetto la mano ha meno di X carte, la carta torna in mano a fine round. Max 1 per round.
    const retMatch = text.match(/RITENZIONE TATTICA\s*\((\d+)\)/i);
    if (retMatch && !player.retentionUsedThisRound && player.hand.length < parseInt(retMatch[1])) {
      player.retentionUsedThisRound = true;
      player.retainedCards.push(card);
      this.addLog('hero', `[RITENZIONE TATTICA] [${card.nome}] tornerà in mano a ${player.name} a fine round`);
    }

    // Eco dell'Abisso copia l'ultima Carta Oscura giocata
    if (card.osc && !fxList.some(f => f.type === 'eco')) this.state.ultimaOscura = { nome: card.nome, fx_list: fxList.map(f => Object.assign({}, f)) };

    this.emit('card_played', { player, card, targetId });
    this.checkThreatDefeated();
    return { ok: true };
  }

  // Tactical Sacrifice onto Multi-Path (Opzione B)
  tacticalSacrifice(playerId, cardUid, trackChoice = 'primario') {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead) return { ok: false, msg: 'Giocatore non attivo' };
    if (!this.regola('binari')) return { ok: false, msg: 'I binari si sbloccano nella prossima missione' };

    const maxSac = this.mx('maxSacrifici', 2);
    if (player.sacrificesThisRound >= maxSac) {
      return { ok: false, msg: maxSac === 1 ? 'Regole d\'Onore: massimo 1 Sacrificio Tattico per round' : 'Massimo 2 sacrifici tattici per round consentiti' };
    }

    if (this.state.bloccoSacrificiRound === this.state.round) return { ok: false, msg: 'Gloria Personale: questo turno niente Sacrifici Tattici' };
    const cardIdx = player.hand.findIndex(c => c.uid === cardUid);
    if (cardIdx === -1) return { ok: false, msg: 'Carta non in mano' };
    const card = player.hand[cardIdx];

    const th = this.state.currentThreat;
    const reqCat = trackChoice === 'primario' ? th.primario.cat : th.bruto.cat;

    // §5: nessun tasso di conversione tra categorie diverse; vale solo la Categoria richiesta dal binario
    if (this.normalizeCategory(card.cat) !== this.normalizeCategory(reqCat)) {
      return { ok: false, msg: `Questo binario accetta solo carte ${reqCat}` };
    }
    let contribution = card.valore;
    // Calcolo Balistico e simili: raddoppia il prossimo Sacrificio Tattico
    if (player.boostedSacrifice) {
      contribution = Math.round(contribution * player.boostedSacrifice);
      this.addLog('hero', `[POTENZIAMENTO] Sacrificio raddoppiato: ${card.valore} → ${contribution}`);
      delete player.boostedSacrifice;
    }

    // Il Mio Trionfo: per tutto il turno i tuoi sacrifici valgono il doppio
    if (player.sacrDoppiRound === this.state.round) {
      contribution *= 2;
      this.addLog('hero', `[IL MIO TRIONFO] Sacrificio doppio: ${contribution}`);
    }
    const contribPrima = contribution;
    contribution = this.mx('valoreSacrificio', contribution, { card, track: trackChoice, player });
    if (contribution !== contribPrima) this.addLog('threat', `[MINACCIA] Il sacrificio vale ${contribution} invece di ${contribPrima}`);

    if (trackChoice === 'primario') {
      th.primarioProgress = Math.min(th.primarioMax, th.primarioProgress + contribution);
      this.addLog('hero', `${player.name} sacrifica [${card.nome}] sul binario Primario (+${contribution} ${th.primario.cat})`);
    } else {
      th.brutoProgress = Math.min(th.brutoMax, th.brutoProgress + contribution);
      this.addLog('hero', `${player.name} sacrifica [${card.nome}] sul binario Bruto (+${contribution} ${th.bruto.cat})`);
    }

    player.sacrificesThisRound++;
    player.actedThisRound = true;
    player.hand.splice(cardIdx, 1);
    player.discard.push(card);

    this.emit('sacrifice_made', { player, card, trackChoice, contribution });
    this.checkThreatDefeated();
    return { ok: true, contribution };
  }

  // Carte "Guarda": scartare una Minaccia futura (viene sostituita da un'altra di livello simile) o carte dalla cima del proprio mazzo
  discardFutureThreat(playerId, nome) {
    const st = this.state;
    if (!st || st.story) return { ok: false, msg: 'Nella Storia le Minacce sono fisse' };
    const i = st.actThreats.findIndex((t, k) => k > st.actIndex && t.nome === nome);
    if (i < 0) return { ok: false, msg: 'Minaccia non trovata' };
    const vecchia = st.actThreats[i];
    const usate = new Set(st.actThreats.map(t => t.nome));
    const allowed = st.threatPool ? new Set(st.threatPool) : null;
    let pool = (window.MONOMYTHOS_DATA.threats || []).filter(t => !usate.has(t.nome) && (!allowed || allowed.has(t.nome)));
    if (!pool.length) pool = (window.MONOMYTHOS_DATA.threats || []).filter(t => !usate.has(t.nome));
    if (!pool.length) return { ok: false, msg: 'Nessuna Minaccia con cui sostituirla' };
    pool.sort((a, b) => Math.abs(a.livello - vecchia.livello) - Math.abs(b.livello - vecchia.livello));
    const vicine = pool.filter(t => Math.abs(t.livello - vecchia.livello) === Math.abs(pool[0].livello - vecchia.livello));
    const nuova = vicine[Math.floor(Math.random() * vicine.length)];
    st.actThreats[i] = nuova;
    const p = st.players.find(x => x.id === playerId);
    this.addLog('hero', `${p ? p.name : 'Un eroe'} scarta la Minaccia futura ${vecchia.nome}: al suo posto arriverà ${nuova.nome}`);
    this.emit('threat_replaced', { vecchia, nuova });
    return { ok: true, nuova };
  }

  // "Guarda il mazzo": il giocatore vede le prime N carte e può scartarne 1 o metterla in mezzo al mazzo.
  // I bot mettono in mezzo una carta che non potrebbero giocare (costo più alto dei loro slot).
  guardaMazzo(p, n) {
    const top = p.deck.slice(-n).reverse();
    if (!top.length) { this.addLog('hero', `${p.name} non ha carte nel mazzo da guardare`); return; }
    this.addLog('hero', `[GUARDA IL MAZZO] ${p.name} guarda le prime ${top.length} carte del suo mazzo`);
    if (p.isBot || (!p.isLocal && !p.remoteUid)) {
      const brutta = top.find(c => this.getPlayerSlot({ slots: { potenza: p.str, agilita: p.spd, intelligenza: p.tech, vigore: p.end } }, c.cat) < (c.valore || 0));
      if (brutta) this.riponiCartaMazzo(p.id, brutta.uid, 'mezzo');
      return;
    }
    this.emit('guarda_mazzo', { player: p, carte: top });
  }

  // dove: 'scarta' (negli scarti) oppure 'mezzo' (a metà del mazzo)
  riponiCartaMazzo(playerId, uid, dove) {
    const p = this.state.players.find(x => x.id === playerId);
    if (!p) return { ok: false };
    const i = p.deck.findIndex(c => c.uid === uid);
    if (i < 0) return { ok: false, msg: 'Carta non più nel mazzo' };
    const [c] = p.deck.splice(i, 1);
    if (dove === 'scarta') {
      p.discard.push(c);
      this.addLog('hero', `${p.name} scarta [${c.nome}] dalla cima del mazzo`);
    } else {
      p.deck.splice(Math.floor(p.deck.length / 2), 0, c);
      this.addLog('hero', `${p.name} mette una carta in mezzo al mazzo`);
    }
    return { ok: true };
  }

  discardFromDeckTop(playerId, uids) {
    const p = this.state.players.find(x => x.id === playerId);
    if (!p || !Array.isArray(uids)) return { ok: false };
    const via = p.deck.filter(c => uids.includes(c.uid));
    p.deck = p.deck.filter(c => !uids.includes(c.uid));
    p.discard.push(...via);
    if (via.length) this.addLog('hero', `${p.name} scarta dalla cima del mazzo: ${via.map(c => c.nome).join(', ')}`);
    return { ok: true };
  }

  // Potere Base: due opzioni per eroe, con testo e effetto reali (dal manuale, semplificati per il digitale)
  getBasePowerOptions(player) {
    const dmg = (titolo) => ({ titolo, desc: 'Infliggi 1 danno allo sgherro più ferito.', badge: '1 danno', run: (e, p) => e._pbDanno(p, 'threat_boss') });
    const slot = (cat) => ({ titolo: `+1 Slot ${cat}`, desc: `Ottieni 1 Slot ${cat} in più da spendere per giocare carte in questo turno.`, badge: `+1 ${cat}`, run: (e, p) => { p.slots[cat] = (p.slots[cat] || 0) + 1; const k = cat.toLowerCase().replace('à', 'a'); p.slots[k] = (p.slots[k] || 0) + 1; if (cat === 'Agilità') p.slots.Agilita = p.slots.Agilità; return `+1 Slot ${cat}`; } });
    const T = {
      'Iron Aegis': [dmg('Colpo cinetico'), slot('Potenza')],
      'Neon Phantom': [
        { titolo: 'Scatto', desc: 'Pesca 1 carta extra (senza rischio se il mazzo è vuoto).', badge: '+1 carta', ok: p => p.deck.length > 0 && p.hand.length < p.maxHand, run: (e, p) => { p.hand.push(p.deck.pop()); return 'pesca 1 carta extra'; } },
        slot('Agilità')],
      'Guardiana di Confine': [
        { titolo: 'Barriera', desc: 'Ottieni 1 Scudo: assorbe 1 danno del prossimo attacco.', badge: '+1 Scudo', run: (e, p) => { p.shield += 1; return '+1 Scudo'; } },
        { titolo: 'Cura', desc: 'Recuperi 1 Vita.', badge: '+1 Vita', ok: p => p.vita < p.vitaMax, run: (e, p) => { p.vita = Math.min(p.vitaMax, p.vita + 1); return 'recupera 1 Vita'; } }],
      'Lama Errante': [dmg('Affondo'),
        { titolo: 'Recupero', desc: "Riprendi in mano l'ultima carta che hai scartato.", badge: '+1 carta', ok: p => p.discard.length > 0 && p.hand.length < p.maxHand, run: (e, p) => { const c = p.discard.pop(); p.hand.push(c); return `riprende in mano ${c.nome || c.name || 'una carta'}`; } }],
      "Titano d'Acciaio": [
        { titolo: 'Schianto ad area', desc: 'Infliggi 1 danno a ogni sgherro (alla Minaccia se non ce ne sono).', badge: '1 danno a tutti', run: (e, p) => { const vivi = ((e.state.currentThreat.mooks) || []).filter(m => !m.isDead); if (vivi.length) vivi.forEach(m => e._pbDanno(p, m.id)); else e._pbDanno(p, 'threat_boss'); return '1 danno a tutti i nemici'; } },
        slot('Potenza')],
      'Architetto Ombra': [slot('Intelligenza'),
        { titolo: 'Analisi', desc: 'Guarda le prime 3 carte del tuo mazzo: puoi scartarne 1 o metterla in mezzo al mazzo.', badge: 'Guarda 3', ok: p => p.deck.length > 0, run: (e, p) => { e.guardaMazzo(p, 3); return 'guarda le prime 3 carte del suo mazzo'; } }],
      "Sussurro dell'Abisso": [dmg('Impeto oscuro'),
        { titolo: 'Patto oscuro', desc: 'Solo se sei Villain: ottieni 1 Punto Vittoria e subisci 1 Trauma.', badge: '+1 PV', ok: p => p.state === 'villain', run: (e, p) => { p.vp += 1; p.trm += 1; e.mx('vpGenerati', 1, { player: p }); return '+1 Punto Vittoria e +1 Trauma'; } }],
      'Duellante Spezzato': [dmg('Colpo sleale'),
        { titolo: 'Preparazione', desc: 'Il tuo prossimo attacco infligge 1 danno in più.', badge: '+1 al prossimo', run: (e, p) => { p.boostedAttack = (p.boostedAttack || 0) + 1; return '+1 danno al prossimo attacco'; } }]
    };
    return T[player.name] || [
      { titolo: 'Protezione', desc: 'Ottieni 1 Scudo: assorbe 1 danno del prossimo attacco.', badge: '+1 Scudo', run: (e, p) => { p.shield += 1; return '+1 Scudo'; } },
      dmg('Colpo')];
  }

  _pbDanno(player, targetId) {
    window.EffectRegistry.execute('damage', this, { source: player, card: { cat: 'Potere Base' }, targetId, targetEntity: this.resolveTarget(targetId) }, { type: 'damage', amount: 1 });
    return '1 danno';
  }

  // Base Power activation
  activateBasePower(playerId, optionIndex = 0) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead) return { ok: false, msg: 'Giocatore non attivo' };
    // Seconda attivazione nel turno pagando 3 Punti Eroe (3 VP da Villain) — scelta di Alessio 2026-11-05
    const extra = player.pbUsedThisTurn;
    if (extra) {
      const k = this.costoPbExtra(player);
      if (!k.ok) return { ok: false, msg: k.msg };
    }
    if (player.noPbSempre) return { ok: false, msg: 'Con Rescissione hai rinunciato al Potere Base per tutta la partita' };
    if (player.noPbRound === this.state.round) return { ok: false, msg: 'Questo turno niente Potere Base (malus della Carta Oscura)' };
    const opz = this.getBasePowerOptions(player)[optionIndex] || this.getBasePowerOptions(player)[0];
    if (opz.ok && !opz.ok(player)) return { ok: false, msg: 'Questa opzione ora non si può usare' };
    if (extra) {
      const k = this.costoPbExtra(player);
      player[k.tipo] -= k.n;
      player.pbExtraUsed = true;
      this.addLog(k.tipo === 'pe' ? 'hero' : 'threat', `[POTERE EXTRA] ${player.name} spende ${k.n} ${k.tipo === 'pe' ? 'Punti Eroe' : 'VP'} per usare di nuovo ${player.pbName}`);
    }

    player.pbUsedThisTurn = true;
    player.actedThisRound = true;
    const esito = opz.run(this, player);
    if (esito && esito !== '1 danno') this.addLog('hero', `${player.name} usa ${player.pbName} (${opz.titolo}): ${esito}`);

    this.emit('base_power_used', { player, optionIndex });
    this.checkThreatDefeated();
    return { ok: true };
  }

  // Costo della seconda attivazione del Potere Base nello stesso turno
  costoPbExtra(player) {
    const n = (window.MONOMYTHOS_BILANCIAMENTO || {}).costoPotereExtra || 3;
    const tipo = player.state === 'villain' ? 'vp' : 'pe';
    const nome = tipo === 'pe' ? 'Punti Eroe' : 'VP';
    if (player.pbExtraUsed) return { ok: false, tipo, n, msg: 'Potere Base già usato due volte in questo turno' };
    if ((player[tipo] || 0) < n) return { ok: false, tipo, n, msg: `Potere Base già usato: per usarlo di nuovo servono ${n} ${nome} (ne hai ${player[tipo] || 0})` };
    return { ok: true, tipo, n, msg: '' };
  }

  // Esiste almeno una mossa legale? (carta giocabile con gli slot, sacrificio su un binario compatibile o Potere Base)
  hasLegalMove(player) {
    const th = this.state.currentThreat;
    if (!player.pbUsedThisTurn) return true;
    return player.hand.some(c => {
      if (this.getPlayerSlot(player, c.cat) >= (c.valore || 0)) return true;
      if (th && player.sacrificesThisRound < 2) {
        const n = this.normalizeCategory(c.cat);
        return n === this.normalizeCategory(th.primario.cat) || n === this.normalizeCategory(th.bruto.cat);
      }
      return false;
    });
  }

  // Scarto di Sopravvivenza (§3): chi non può agire brucia 1 carta ed evita la penalità per passività
  survivalDiscard(playerId, cardUid = null) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead || player.hand.length === 0) return { ok: false, msg: 'Nessuna carta da scartare' };
    let idx = cardUid ? player.hand.findIndex(c => c.uid === cardUid) : -1;
    if (idx === -1) {
      idx = player.hand.reduce((best, c, i, arr) => (c.valore || 0) < (arr[best].valore || 0) ? i : best, 0);
    }
    const card = player.hand.splice(idx, 1)[0];
    player.discard.push(card);
    player.actedThisRound = true;
    this.addLog('hero', `[SCARTO DI SOPRAVVIVENZA] ${player.name} brucia [${card.nome}] per evitare la penalità`);
    return { ok: true };
  }

  checkBreakingPoint(player) {
    // §8.4: dopo lo State Freezing (Atto Finale) nessuno cambia schieramento
    if (player.stateFrozen) return;
    // Regole a strati: nelle prime missioni nessuno diventa Villain (il Trauma arriva dalla missione 3)
    if (!this.regola('villain')) { if (player.trm >= ((window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5)) player.trm = ((window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5) - 1; return; }
    if (player.trm >= ((window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5) && player.state === 'hero') {
      player.state = 'villain';
      this.addLog('threat', `[TRAUMA] PUNTO DI ROTTURA! ${player.name} ha accumulato 5 Trauma e si trasforma in VILLAIN!`);
      this.emit('player_corrupted', player);
      this.checkVillainVictory();
    }
  }

  endTurn() {
    const ending = this.getActivePlayer();
    if (ending && !ending.isDead && ending.hand.length > ending.maxHand) {
      ending.hand.sort((a, b) => (b.valore || 0) - (a.valore || 0));
      const excess = ending.hand.splice(ending.maxHand);
      ending.discard.push(...excess);
      this.addLog('sys', `[CLEANUP] ${ending.name} scarta ${excess.length} carte oltre il limite di mano`);
    }
    this.state.turnIndex++;
    if (this.state.turnIndex >= this.state.players.length) {
      // All players took turn -> Enemy Phase
      this.runEnemyPhase();
    } else {
      this.emit('turn_changed', this.state);
      this.checkTurn();
    }
  }

  // Enemy & Threat Phase execution (Point 6: Interactive Defense Window)
  // Bersaglio di un attacco nemico: bersaglio forzato, poi Logica della Minaccia, poi Vita più bassa
  pickEnemyTarget(livingPlayers, th) {
    // Muro Vivente: per tutto il round gli attacchi vanno su chi l'ha giocata
    if (th.bersaglioRound && th.bersaglioRound.round === this.state.round) {
      const mv = livingPlayers.find(p => p.id === th.bersaglioRound.id);
      if (mv) return mv;
    }
    // L'Ultimo a Restare: chi l'ha giocata non viene bersagliata finché c'è qualcun altro
    const altri = livingPlayers.filter(p => p.intoccabileRound !== this.state.round);
    if (altri.length && altri.length < livingPlayers.length) livingPlayers = altri;
    if (th.forcedTarget) {
      const ft = livingPlayers.find(p => p.id === th.forcedTarget);
      if (ft) return ft;
    }
    if (th.logica && th.logica.includes('meno carte')) {
      return livingPlayers.reduce((min, p) => p.hand.length < min.hand.length ? p : min, livingPlayers[0]);
    }
    return livingPlayers.reduce((min, p) => p.vita < min.vita ? p : min, livingPlayers[0]);
  }

  // Intenzioni dei nemici per la prossima Fase Minaccia (mostrate sopra ogni nemico)
  getEnemyIntents() {
    const th = this.state.currentThreat;
    const intents = {};
    if (!th) return intents;
    const living = this.state.players.filter(p => !p.isDead);
    if (living.length === 0) return intents;
    const target = this.pickEnemyTarget(living, th);
    const ready = (th.mooks || []).filter(m => !m.isDead && !m.stunned);
    const attackers = ready.filter(m => !m.subsidiary);
    const list = attackers.length > 0 ? attackers : ready.slice(0, 1);
    (th.mooks || []).forEach((m, i) => {
      if (m.isDead) return;
      if (list.includes(m)) intents[i] = { kind: 'attack', dmg: th.forza, target: target.name };
      else if (m.stunned) intents[i] = { kind: 'stunned' };
      else intents[i] = { kind: 'support' };
    });
    if (list.length === 0 && !(th.mooks || []).some(m => !m.isDead)) intents.__boss = { kind: 'attack', dmg: th.forza, target: target.name };
    return intents;
  }

  runEnemyPhase() {
    this.state.phase = 'enemy';
    const th = this.state.currentThreat;
    this.addLog('threat', `=== FASE MINACCIA ===`);

    // Penalità per Passività (§3): +1 TRM a chi non ha fatto alcuna mossa nel round
    this.state.players.forEach(p => {
      if (p.isDead || p.actedThisRound) return;
      p.trm = Math.min(5, p.trm + 1);
      this.addLog('threat', `[PASSIVITÀ] ${p.name} non ha agito questo round: +1 TRM`);
      this.checkBreakingPoint(p);
    });

    // Respiro Tattico (§3.3.2): chi entra nella Fase Nemici senza carte pesca 1 carta gratis
    this.state.players.forEach(p => {
      if (!p.isDead && p.hand.length === 0 && this.drawOne(p)) {
        this.addLog('hero', `[RESPIRO TATTICO] ${p.name} pesca 1 carta d'emergenza`);
      }
    });

    // Le difese preparate nel turno (Barriera Olografica, Pelle di Ferro...) valgono durante questa Fase Minaccia:
    // si azzerano all'inizio del round successivo (startRound), non prima degli attacchi
    this.state.players.forEach(p => { p.tempDrawRate = 0; });

    // Decrement Operational Timer
    th.timer--;
    this.addLog('threat', `Timer Operativo: ${th.timer}/${th.timerMax}`);

    this.mx('faseNemici', null);

    // Check Detonation
    if (th.timer <= 0) {
      const danniDet = this.mx('danniDetonazione', 3);
      this.addLog('threat', `[DETONAZIONE] Esplosione del Timer! ${danniDet} danni diretti e +1 TRM a tutti gli eroi!`);
      this.state.players.forEach(p => {
        if (p.isDead) return;
        p.vita = Math.max(0, p.vita - danniDet);
        p.trm = Math.min(5, p.trm + 1);
        this.checkBreakingPoint(p);
        this.checkPlayerDeath(p);
      });
      th.timer = th.timerMax; // Reset timer
    }

    // Enemies attack queue
    const livingMooks = th.mooks ? th.mooks.filter(m => !m.isDead && !m.stunned) : [];
    if (th.mooks) {
      th.mooks.forEach(m => { m.stunned = false; }); // Clear stun for next round
    }
    // §5: le minacce sussidiarie della Crisi Composita sono solo potenziamento numerico, non attaccano
    const attackers = livingMooks.filter(m => !m.subsidiary);
    // Se restano solo nemici storditi, questo round non attacca nessuno (prima attaccava comunque la Minaccia)
    const restanoStorditi = !!(th.mooks && th.mooks.some(m => !m.isDead && m.hp > 0));
    const enemies = attackers.length > 0 ? attackers : (livingMooks.length > 0 ? livingMooks.slice(0, 1) : (restanoStorditi ? [] : [{ name: th.nome, isBoss: true }]));
    if (!enemies.length) this.addLog('hero', `[STORDITO] I nemici sono storditi: questo round non attaccano`);

    let enemyIndex = 0;
    const processNextAttack = () => {
      if (this.isGameOver() || this.checkThreatDefeated() || this.checkAllHeroesDead()) return;

      if (enemyIndex >= enemies.length) {
        this.mx('fineRound', null);
        if (this.isGameOver() || this.checkAllHeroesDead()) return;
        // La riduzione di Forza vale un round
        if (th._forzaBase != null) { th.forza = th._forzaBase; delete th._forzaBase; }
        // Proceed to next round
        this.state.round++;
        setTimeout(() => {
          this.startRound();
        }, 1200);
        return;
      }

      const indiceAttacco = enemyIndex;
      const enemy = enemies[enemyIndex++];
      const livingPlayers = this.state.players.filter(p => !p.isDead);
      if (livingPlayers.length === 0) return;
      // Nemico Sfiancato: questo attacco fa 1 danno in meno
      const sfiancato = enemy.weakened || (enemy.isBoss && th.weakened);
      if (enemy.weakened) enemy.weakened = false;
      if (enemy.isBoss && th.weakened) th.weakened = false;

      // Targeting
      const target = this.pickEnemyTarget(livingPlayers, th);
      delete th.forcedTarget;

      const forzaExtra = Math.floor((livingPlayers.length - 1) * ((window.MONOMYTHOS_BILANCIAMENTO || {}).forzaPerEroe || 0));
      const forzaColpo = this.mx('forzaAttacco', th.forza + forzaExtra, { enemy, indice: indiceAttacco });
      this.resolveEnemyAttack(enemy, target, Math.max(0, forzaColpo - (sfiancato ? 1 : 0)), () => {
        setTimeout(processNextAttack, 400);
      });
    };

    processNextAttack();
  }

  // Resolve Enemy Attack with Defense Window for reactions & dynamic parry (Point 6)
  resolveEnemyAttack(enemy, target, rawDmg, onComplete = null) {
    let effectiveDmg = rawDmg;
    this._nemicoAttacco = enemy;

    // Apply active damage reduction
    if (target.damageReduction) {
      effectiveDmg = Math.max(0, effectiveDmg - target.damageReduction);
    }

    // §3.3 Travolgere: solo la parte di danno oltre la Resistenza (minimo 1, §3.3.2) è imparabile
    const effectiveEnd = Math.max(1, this.mx('resistenza', target.end + (target.tempResistance || 0), { target }));
    const isTrample = (effectiveDmg > effectiveEnd);
    const excess = Math.max(0, effectiveDmg - effectiveEnd);
    const mitigable = effectiveDmg - excess;

    this.addLog('threat', `${enemy.name} attacca ${target.name} con Forza ${effectiveDmg}! (Resistenza: ${effectiveEnd}${isTrample ? ' — Travolgere!' : ''})`);

    // Reaction cards and hand cards for Dynamic Parry
    const reactionCards = target.hand.filter(c => c.fx_list && c.fx_list.some(f => f.timing === 'reaction'));
    const parryCards = [...target.hand];

    const applyRemainingDamage = (absorbed, dodged, reflected, extra) => {
      if (dodged) {
        this.addLog('hero', `[DIFESA RIUSCITA] ${target.name} ha evitato l'attacco.`);
        this.emit('attack_dodged', { target, enemy });
        if (onComplete) onComplete();
        return;
      }

      // Parata e Scudo agiscono solo sulla parte mitigabile; l'eccedenza di Travolgere va sempre a segno
      let rest = Math.max(0, mitigable - absorbed);
      const fromShield = Math.min(target.shield || 0, rest);
      target.shield = (target.shield || 0) - fromShield;
      rest -= fromShield;
      const penetrated = excess + rest;
      if (excess > 0) {
        this.addLog('threat', `[TRAVOLGERE] ${excess} danni oltre la Resistenza (${effectiveEnd}) vanno a segno senza parata!`);
      }

      // Reazioni che spostano il colpo: su un altro giocatore (Villain, Intercetta), diviso a metà o tra tutti gli alleati
      const ia = extra || {};
      const quote = [];
      const vivo = q => q && !q.isDead;
      if (ia.dividiTra && ia.dividiTra.filter(vivo).length) {
        const tra = ia.dividiTra.filter(vivo);
        tra.forEach((q, i) => quote.push([q, Math.floor(penetrated / tra.length) + (i < penetrated % tra.length ? 1 : 0)]));
        this.addLog('threat', `[REAZIONE] Il colpo si divide tra ${tra.map(q => q.name).join(', ')}`);
      } else if (vivo(ia.dividiCon) && ia.dividiCon !== target) {
        quote.push([ia.dividiCon, Math.ceil(penetrated / 2)], [target, Math.floor(penetrated / 2)]);
        this.addLog('hero', `[REAZIONE] ${ia.dividiCon.name} divide il colpo a metà con ${target.name}`);
      } else if (vivo(ia.target) && ia.target !== target) {
        quote.push([ia.target, penetrated]);
        this.addLog(ia.target === ia.da ? 'hero' : 'threat', `[REAZIONE] Il colpo diretto a ${target.name} finisce su ${ia.target.name}`);
      } else quote.push([target, penetrated]);

      if (penetrated <= 0) this.addLog('hero', `[COLPO AMMORTIZZATO] Danno completamente assorbito dalla Parata Dinamica!`);
      quote.forEach(([q, n]) => {
        q.vita = Math.max(0, q.vita - n);
        if (n > 0) {
          q.ultimoDanno = this.state.round;
          this.addLog('threat', `${q.name} incassa ${n} danni (Vita: ${q.vita}/${q.vitaMax})`);
        }
        this.checkPlayerDeath(q);
        if (!q.isDead) this.mx('colpito', null, { target: q, danni: n });
        this.emit('damage_taken', { target: q, dmg: n, parried: absorbed, reflected, trample: isTrample });
      });
      if (onComplete) onComplete();
    };

    // Difese preparate nel proprio turno: attacco che va a vuoto, colpo girato su un alleato, niente Parata
    const th = this.state.currentThreat;
    const altriVivi = this.state.players.filter(p => p !== target && !p.isDead);
    if (th && th.annullaProssimo) {
      th.annullaProssimo = false;
      this.addLog('hero', `[SINGOLARITÀ] L'attacco di ${enemy.name} si perde nel vuoto`);
      return applyRemainingDamage(0, true, 0);
    }
    if (target.schivaProssimo) {
      target.schivaProssimo = false;
      this.addLog('hero', `[FORTEZZA] ${target.name} ignora completamente l'attacco`);
      return applyRemainingDamage(0, true, 0);
    }
    if (target.tradimentoRound === this.state.round && altriVivi.length) {
      const vittima = altriVivi[Math.floor(Math.random() * altriVivi.length)];
      this.addLog('threat', `[TRADIMENTO] ${target.name} si fa scudo con ${vittima.name}`);
      return applyRemainingDamage(0, false, 0, { target: vittima });
    }
    if (target.noParataRound === this.state.round) {
      this.addLog('threat', `[SENZA DIFESA] ${target.name} non può parare questo attacco`);
      return applyRemainingDamage(0, false, 0);
    }

    // Online: l'attacco a un giocatore remoto apre la finestra di difesa sul suo dispositivo
    if (target.remoteUid && typeof this.onRemoteDefense === 'function') {
      this.pendingDefense = { enemy, target, defender: target, rawDmg: effectiveDmg, mitigable, effectiveEnd, isTrample, reactionCards, parryCards, applyRemainingDamage };
      this.onRemoteDefense({ enemy, target, rawDmg: effectiveDmg, mitigable, effectiveEnd, isTrample });
      return;
    }

    const localPlayer = this.state.players.find(p => (p.isLocal || p.id === 'p_0') && !p.isDead) || this.state.players.find(p => !p.isDead);
    const isTargetLocal = Boolean(target.isLocal || (localPlayer && target.id === localPlayer.id));

    if (isTargetLocal) {
      // Direct Attack on Local Human Player: open interactive defense window
      this.pendingDefense = {
        enemy,
        target,
        defender: target,
        rawDmg: effectiveDmg,
        mitigable,
        effectiveEnd,
        isTrample,
        applyRemainingDamage
      };
      this.emit('defense_window_opened', {
        enemy,
        target,
        defender: target,
        rawDmg: effectiveDmg,
        mitigable,
        effectiveEnd,
        isTrample,
        reactionCards,
        parryCards
      });
    } else if (localPlayer) {
      // Attack on Companion: open defense window so human player can intervene to protect the ally
      const localReactions = localPlayer.hand.filter(c => c.fx_list && c.fx_list.some(f => f.timing === 'reaction') || (c.effetto && c.effetto.toLowerCase().includes('reazione')));
      const localParryCards = [...localPlayer.hand];

      this.pendingDefense = {
        enemy,
        target,
        defender: localPlayer,
        rawDmg: effectiveDmg,
        mitigable,
        effectiveEnd,
        isTrample,
        reactionCards,
        parryCards,
        applyRemainingDamage
      };
      this.emit('defense_window_opened', {
        enemy,
        target,
        defender: localPlayer,
        rawDmg: effectiveDmg,
        mitigable,
        effectiveEnd,
        isTrample,
        reactionCards: localReactions,
        parryCards: localParryCards,
        isAllyDefense: true
      });
    } else {
      // Bot-only match / no living human: execute bot AI defense directly
      this.executeBotDefense(target, mitigable, reactionCards, parryCards, applyRemainingDamage);
    }
  }

  // Effetti di una carta Reazione: solo quelli del proprio stato (Eroe o Villain); Ritenzione Tattica vale anche qui
  eseguiReazione(card, ctx) {
    const p = ctx.source;
    (card.fx_list || []).forEach(fx => {
      if (fx.timing !== 'reaction') return;
      if (fx.condition === 'hero' && p.state !== 'hero') return;
      if (fx.condition === 'villain' && p.state !== 'villain') return;
      window.EffectRegistry.execute(fx.type, this, ctx, fx);
    });
    this.addLog('hero', `${p.name} reagisce con [${card.nome}]`);
    const ret = String(card.effetto || '').match(/RITENZIONE TATTICA\s*\((\d+)\)/i);
    if (ret && !p.retentionUsedThisRound && p.hand.length < parseInt(ret[1])) {
      p.retentionUsedThisRound = true;
      p.retainedCards.push(card);
      this.addLog('hero', `[RITENZIONE TATTICA] [${card.nome}] tornerà in mano a ${p.name} a fine round`);
    }
  }

  // Tasso di conversione della Parata Dinamica (§3.3): assorbito = ⌊somma dei Valori ÷ tasso⌋
  getParryRate() {
    const th = this.state.currentThreat;
    return (th && th.parryRate) || 1;
  }

  // Difesa dei bot (2026-11-07): schivata sui colpi forti, poi incassa se la Vita è alta, altrimenti para con le carte meno utili
  executeBotDefense(target, effectiveDmg, reactionCards, parryCards, applyRemainingDamage) {
    const fxOf = c => c.fx_list || [];
    const reazioni = (reactionCards || target.hand.filter(c => fxOf(c).some(f => f.timing === 'reaction'))).filter(c => target.hand.includes(c));
    const usa = rCard => {
      const rIdx = target.hand.findIndex(c => c.uid === rCard.uid);
      if (rIdx !== -1) target.hand.splice(rIdx, 1);
      target.discard.push(rCard);
      const ctx = { source: target, target, card: rCard, incomingAttack: { enemy: this._nemicoAttacco, rawDmg: effectiveDmg, parried: 0, dodged: false, attaccato: target, da: target } };
      this.eseguiReazione(rCard, ctx);
      applyRemainingDamage(ctx.incomingAttack.parried || 0, ctx.incomingAttack.dodged, 0, ctx.incomingAttack);
    };
    if (effectiveDmg <= 0) return applyRemainingDamage(0, false, 0);
    const schiva = reazioni.find(c => fxOf(c).some(f => f.timing === 'reaction' && f.type === 'dodge'));
    if (schiva && (effectiveDmg >= 3 || target.vita <= effectiveDmg + 2)) return usa(schiva);
    const para = reazioni.find(c => fxOf(c).some(f => f.timing === 'reaction' && f.type === 'parry'));
    if (para && effectiveDmg >= 2) return usa(para);
    // Vita alta: incassa e tiene le carte
    if (target.vita - effectiveDmg > target.vitaMax * 0.45 && target.vita > effectiveDmg + 4) return applyRemainingDamage(0, false, 0);
    if (target.hand.length > 0) {
      const rate = this.getParryRate();
      const utile = c => (fxOf(c).some(f => f.type === 'damage') ? 2 : 0) + (fxOf(c).some(f => f.timing === 'reaction') ? 1 : 0) + (fxOf(c).some(f => f.type === 'boostNextSacrifice') ? 1 : 0);
      const ordine = [...target.hand].sort((x, y) => utile(x) - utile(y) || (y.valore || 0) - (x.valore || 0));
      const maxParata = this.mx('maxCarteParata', Infinity);
      let valueSum = 0, scartate = 0;
      for (const pCard of ordine) {
        if (Math.floor(valueSum / rate) >= effectiveDmg || scartate >= maxParata || target.hand.length <= 1) break;
        target.hand.splice(target.hand.indexOf(pCard), 1);
        target.discard.push(pCard);
        valueSum += (pCard.valore || 0); scartate++;
      }
      const absorbedTotal = Math.floor(valueSum / rate);
      this.addLog('hero', `[PARATA] ${target.name} effettua Parata Dinamica, assorbendo ${absorbedTotal} danni`);
      return applyRemainingDamage(absorbedTotal, false, 0);
    }
    applyRemainingDamage(0, false, 0);
  }

  // Response callback from user defense window
  respondToDefense(choice) {
    if (!this.pendingDefense) return;
    const { enemy, target, rawDmg, mitigable, reactionCards, parryCards, applyRemainingDamage } = this.pendingDefense;
    this.pendingDefense = null;

    if (choice.type === 'reaction_card') {
      const playerWithCard = this.state.players.find(p => p.hand.some(c => c.uid === choice.cardUid)) || target;
      const card = playerWithCard.hand.find(c => c.uid === choice.cardUid);
      if (card) {
        const cIdx = playerWithCard.hand.indexOf(card);
        playerWithCard.hand.splice(cIdx, 1);
        playerWithCard.discard.push(card);

        const ctx = {
          source: playerWithCard,
          target: target,
          card: card,
          incomingAttack: { enemy, rawDmg, parried: 0, dodged: false, attaccato: target, da: playerWithCard }
        };
        this.eseguiReazione(card, ctx);
        applyRemainingDamage(ctx.incomingAttack.parried || 0, ctx.incomingAttack.dodged, 0, ctx.incomingAttack);
      } else {
        applyRemainingDamage(0, false, 0);
      }
    } else if (choice.type === 'parry' || choice.type === 'parry_cards' || choice.type === 'parry_card' || choice.type === 'parry_multi') {
      let uids = choice.cardUids || (choice.cardUid ? [choice.cardUid] : []);
      const maxParata = this.mx('maxCarteParata', Infinity);
      if (uids.length > maxParata) { uids = uids.slice(0, maxParata); this.addLog('threat', `[ARENA ASSOLUTA] Si possono scartare al massimo ${maxParata} carte per colpo`); }
      let valueSum = 0;
      uids.forEach(uid => {
        const playerWithCard = this.state.players.find(p => p.hand.some(c => c.uid === uid));
        if (playerWithCard) {
          const cIdx = playerWithCard.hand.findIndex(c => c.uid === uid);
          if (cIdx !== -1) {
            const card = playerWithCard.hand.splice(cIdx, 1)[0];
            playerWithCard.discard.push(card);
            // Parata Dinamica: assorbe in base al Valore Caratteristica (§3.3)
            valueSum += (card.valore || 0);
            this.addLog('hero', `[PARATA] ${playerWithCard.name} scarta [${card.nome}] (Valore ${card.valore || 0}${target.id !== playerWithCard.id ? ', per difendere ' + target.name : ''})`);
          }
        }
      });
      const rate = this.getParryRate();
      const totalAbsorb = Math.floor(valueSum / rate);
      if (totalAbsorb > 0) {
        this.addLog('hero', `[PARATA DINAMICA] Assorbiti in totale ${totalAbsorb} danni scartando ${uids.length} carte.`);
      }
      applyRemainingDamage(totalAbsorb, false, 0);
    } else if (choice.type === 'bot_fallback') {
      // Let companion bot defend itself
      this.executeBotDefense(target, mitigable != null ? mitigable : rawDmg, reactionCards, parryCards, applyRemainingDamage);
    } else {
      // Take hit directly
      applyRemainingDamage(0, false, 0);
    }
  }

  checkPlayerDeath(player) {
    if (player.vita <= 0 && !player.isDead) {
      // Check for Protocollo Defibrillazione reaction in any player's hand
      let revived = false;
      this.state.players.forEach(p => {
        if (p.isDead || revived) return;
        const defibIdx = p.hand.findIndex(c => c.nome.includes('Defibrillazione') || (c.fx_list && c.fx_list.some(f => f.type === 'revive')));
        if (defibIdx !== -1) {
          const defibCard = p.hand.splice(defibIdx, 1)[0];
          p.discard.push(defibCard);
          player.vita = 1;
          revived = true;
          if (p.state === 'villain' && p !== player && player.hand.length) {
            const rubata = player.hand.splice(Math.floor(Math.random() * player.hand.length), 1)[0];
            p.hand.push(rubata);
            this.addLog('threat', `[VILLAIN] ${p.name} ruba [${rubata.nome}] a ${player.name} dopo averlo rianimato`);
          }
          this.addLog('hero', `[DEFIBRILLAZIONE] Reazione Critica! ${p.name} gioca Protocollo Defibrillazione e rianima ${player.name} con 1 HP!`);
        }
      });

      if (!revived) {
        player.isDead = true;
        this.addLog('threat', `[PERMADEATH] ${player.name} è caduto ed è estromesso dalla partita!`);
        this.recalculateMultiPathOnHeroDeath();
        this.emit('player_died', player);
        this.checkVillainVictory();
      }
    }
  }

  // Il Villain vince quando tutti gli altri giocatori sono morti e restano in piedi solo Villain
  checkVillainVictory() {
    if (!this.state || this.isGameOver() || this.state.players.length < 2) return false;
    const living = this.state.players.filter(p => !p.isDead);
    const someoneDead = this.state.players.some(p => p.isDead);
    if (!someoneDead || living.length === 0 || living.some(p => p.state !== 'villain')) return false;
    this.state.phase = 'gameover';
    this.state.winner = 'villain';
    this.state.villainWinners = living.map(p => p.id);
    const names = living.map(p => p.name).join(' e ');
    this.addLog('threat', `[VITTORIA DEL VILLAIN] ${names} resta in piedi sulle rovine: vince il Villain!`);
    if (window.Progression && this.state.ranked && living.some(p => !p.isBot && !p.remoteUid)) window.Progression.addCredits(200, 'Vittoria da Villain');
    this.emit('game_over', { winner: 'villain', winners: living.map(p => p.id) });
    return true;
  }

  recalculateMultiPathOnHeroDeath() {
    const numLiving = this.state.players.filter(p => !p.isDead).length;
    if (numLiving > 0 && this.state.currentThreat) {
      const th = this.state.currentThreat;
      if (th.isRogueHero) return;
      const liv = th.livello;
      // Stessa formula dell'inizio Atto (prima ignorava le manopole e le soglie salivano invece di scendere)
      th.primarioMax = Math.max(th.primarioProgress + 1, this.sogliaBinario(th.primario.val, liv, numLiving));
      th.brutoMax = Math.max(th.brutoProgress + 1, this.sogliaBinario(th.bruto.val, liv, numLiving));
      this.addLog('sys', `[SCALING] Ricalcolo Dinamico Multi-Path: soglie aggiornate a Primario ${th.primarioMax}, Bruto ${th.brutoMax}`);
    }
  }

  checkThreatDefeated() {
    const th = this.state.currentThreat;
    if (!th) return false;

    const disarmedPrimario = th.primarioProgress >= th.primarioMax;
    const disarmedBruto = th.brutoProgress >= th.brutoMax;
    const bossKilled = th.hp <= 0;

    if (disarmedPrimario || disarmedBruto || bossKilled) {
      const reason = disarmedPrimario ? 'Disinnesco Primario completato' : (disarmedBruto ? 'Disinnesco Bruto completato' : 'Tutti i nemici abbattuti');
      this.addLog('hero', `[VITTORIA] MINACCIA RISOLTA! (${reason})`);
      // Il binario è la via più difficile: chi lo completa ottiene un bottino (scelta di Alessio 2026-11-05)
      if ((disarmedPrimario || disarmedBruto) && !bossKilled) this.bottinoDisinnesco();

      if (this.state.actIndex < this.ultimoAtto()) {
        // Advance to next Act
        this.state.actIndex++;
        if (window.Progression && this.state.ranked) window.Progression.addCredits(100, 'Minaccia risolta'); if (window.Collezione && !this.state.isOnlineGuest) window.Collezione.registraMinaccia();
        this.setupCurrentThreat();
        this.addLog('sys', `=== AVANZAMENTO: ATTO ${this.state.actIndex === this.ultimoAtto() ? 'FINALE' : 'II'} — ${this.state.currentThreat.nome} ===`);
        this.emit('act_advanced', this.state);
        // Se l'Atto si chiude durante i turni degli eroi il round continua contro la nuova Minaccia:
        // niente slot nuovi e la Fase Minaccia arriva lo stesso (prima ripartiva un round intero senza attacchi nemici)
        if (this.state.phase !== 'action') this.startRound();
        return true;
      } else {
        // Final Victory!
        this.state.phase = 'gameover';
        this.state.winner = 'heroes';
        if (window.Progression && this.state.ranked) window.Progression.addCredits(300, 'Vittoria Finale Cosmica'); if (window.Collezione && !this.state.isOnlineGuest) window.Collezione.registraMinaccia();
        this.addLog('hero', `[VITTORIA] VITTORIA COSMICA! La Calamità è stata sventata!${this.state.ranked ? ' (+300 Crediti Cosmici)' : ''}`);
        this.emit('game_over', { winner: 'heroes' });
        return true;
      }
    }
    return false;
  }

  // Bottino del Disinnesco: ogni eroe vivo (non Villain) +3 Vita, -1 Trauma, +1 Punto Eroe e pesca 1 carta;
  // in Classificata e Storia anche +50 Crediti.
  bottinoDisinnesco() {
    const B = (window.MONOMYTHOS_BILANCIAMENTO || {}).bottinoDisinnesco || { vita: 3, trauma: 1, pe: 1, carte: 1, crediti: 50 };
    this.state.players.filter(p => !p.isDead && p.state !== 'villain').forEach(p => {
      p.vita = Math.min(p.vitaMax, p.vita + (B.vita || 0));
      p.trm = Math.max(0, (p.trm || 0) - (B.trauma || 0));
      p.pe = (p.pe || 0) + (B.pe || 0);
      for (let i = 0; i < (B.carte || 0); i++) if (p.hand.length < p.maxHand) this.drawOne(p);
    });
    if (window.Progression && (this.state.ranked || this.state.story) && B.crediti) window.Progression.addCredits(B.crediti, 'Bottino del Disinnesco');
    this.addLog('hero', `[BOTTINO] Disinnesco completato: ogni eroe +${B.vita} Vita, -${B.trauma} Trauma, +${B.pe} PE e pesca ${B.carte} carta${(this.state.ranked || this.state.story) && B.crediti ? ` (+${B.crediti} Crediti Cosmici)` : ''}`);
    this.emit('bottino_disinnesco', B);
  }

  checkAllHeroesDead() {
    if (this.checkVillainVictory()) return true;
    const living = this.state.players.filter(p => !p.isDead);
    if (living.length === 0) {
      this.state.phase = 'gameover';
      this.state.winner = 'threat';
      this.addLog('threat', `[SCONFITTA] Tutti gli eroi sono caduti.`);
      this.emit('game_over', { winner: 'threat' });
      return true;
    }
    return false;
  }

  isGameOver() {
    return this.state.phase === 'gameover';
  }

  // Bot tattico (2026-11-07): gioca come un giocatore esperto, così gli alleati e le simulazioni sono credibili.
  // Ordine: chiudere un binario nel turno (anche con le carte di raddoppio) > Potere Base > attacchi più efficienti
  // sui nemici che attaccano > controllo e cure > sacrifici delle carte che non servono.
  runBotTurn(bot) {
    if (this.isGameOver() || bot.isDead || this.state.phase !== 'action') return;
    const th0 = this.state.currentThreat;
    const fine = () => setTimeout(() => this.endTurn(), 600);
    const attivo = () => !this.isGameOver() && !bot.isDead && this.state.phase === 'action' && this.getActivePlayer() === bot;
    const fxOf = c => c.fx_list || [];
    const vale = f => !f.condition || (f.condition === 'hero' ? bot.state === 'hero' : bot.state === 'villain');
    const danno = c => fxOf(c).filter(f => f.type === 'damage' && vale(f) && (!f.timing || f.timing === 'play')).reduce((t, f) => t + (f.amount || 1), 0) || (c.fx && c.fx.dmg) || 0;
    const trauma = c => fxOf(c).filter(f => f.type === 'trauma' && f.amount > 0 && vale(f)).reduce((t, f) => t + f.amount, 0);
    const ha = (c, t) => fxOf(c).some(f => f.type === t && vale(f));
    const reazione = c => fxOf(c).some(f => f.timing === 'reaction');
    const soglia = (window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5;
    const gioc = c => this.getPlayerSlot(bot, c.cat) >= (c.valore || 0) && (!window.Morale || window.Morale.puoPagare(c, bot));
    const sicura = c => bot.state === 'villain' || bot.trm + trauma(c) < soglia - 1;
    const norm = x => this.normalizeCategory(x);
    const th = () => this.state.currentThreat;
    const maxSac = () => this.mx('maxSacrifici', 2);
    const binariOk = () => !this.regola || this.regola('binari');
    const play = (c, t) => { const r = this.playCardEffect(bot.id, c.uid, t); return r && r.ok; };
    const sac = (c, tr) => { const r = this.tacticalSacrifice(bot.id, c.uid, tr); return r && r.ok; };
    const binari = () => [['primario', th().primario.cat, th().primarioMax - th().primarioProgress], ['bruto', th().bruto.cat, th().brutoMax - th().brutoProgress]];
    const attaccanti = () => (th().mooks || []).filter(m => !m.isDead && !m.subsidiary);
    const vivi = () => (th().mooks || []).filter(m => !m.isDead);

    // Da Villain: attacca l'eroe più ferito con le carte che fanno danni
    if (bot.state === 'villain') {
      if (!bot.pbUsedThisTurn) this.activateBasePower(bot.id, 0);
      for (let g = 0; g < 4 && attivo() && th() === th0; g++) {
        const c = bot.hand.filter(x => gioc(x)).sort((a, b) => danno(b) - danno(a))[0];
        if (!c) break;
        const eroi = this.state.players.filter(p => !p.isDead && p.id !== bot.id && p.state === 'hero').sort((a, b) => a.vita - b.vita);
        if (!play(c, danno(c) && eroi[0] ? eroi[0].id : 'threat_boss')) break;
      }
      if (attivo() && !bot.actedThisRound && bot.hand.length > 0) this.survivalDiscard(bot.id);
      return fine();
    }

    // 1) Chiudere un binario in questo turno
    const chiudiBinario = () => {
      const left = maxSac() - bot.sacrificesThisRound;
      if (left <= 0 || !binariOk()) return false;
      for (const [tr, cat, need] of binari()) {
        const adatte = bot.hand.filter(c => norm(c.cat) === norm(cat)).sort((a, b) => (b.valore || 0) - (a.valore || 0));
        const scegli = escl => adatte.filter(c => c !== escl).slice(0, left);
        const somma = (arr, x2) => arr.reduce((t, c) => t + (c.valore || 0), 0) + (x2 && arr[0] ? arr[0].valore || 0 : 0);
        const base = scegli();
        if (base.length && somma(base, !!bot.boostedSacrifice) >= need) { base.forEach(c => attivo() && th() === th0 && sac(c, tr)); return true; }
        const raddoppio = !bot.boostedSacrifice && bot.hand.find(c => ha(c, 'boostNextSacrifice') && gioc(c));
        if (raddoppio) {
          const conR = scegli(raddoppio);
          if (conR.length && somma(conR, true) >= need) { play(raddoppio); conR.forEach(c => attivo() && th() === th0 && sac(c, tr)); return true; }
        }
      }
      return false;
    };
    if (chiudiBinario() || !attivo() || th() !== th0) return fine();

    // 2) Potere Base: l'opzione più utile in questo momento
    if (!bot.pbUsedThisTurn) {
      const opz = this.getBasePowerOptions(bot);
      let best = -1, bv = 0;
      opz.forEach((o, i) => {
        if (o.ok && !o.ok(bot)) return;
        const t = `${o.titolo} ${o.desc}`;
        let v = /danno/.test(t) ? 3 : /Pesca|carta/.test(t) ? (bot.hand.length < bot.maxHand - 1 ? 2.5 : 0) : /Slot/.test(t) ? 2 : /Vita/.test(t) ? (bot.vita < bot.vitaMax ? 1.5 : 0) : /Scudo/.test(t) ? 1 : /Guarda/.test(t) ? 0.5 : 0;
        if (/Villain/.test(o.desc)) v = 0;
        if (v > bv) { bv = v; best = i; }
      });
      if (best >= 0) this.activateBasePower(bot.id, best);
    }
    if (!attivo() || th() !== th0) return fine();

    // 3) Attacchi e carte utili
    const bersaglio = d => {
      const a = attaccanti(), pool = a.length ? a : vivi();
      const uccide = pool.filter(m => m.hp <= d).sort((x, y) => y.hp - x.hp)[0];
      return (uccide || [...pool].sort((x, y) => x.hp - y.hp)[0] || { id: 'threat_boss' }).id;
    };
    for (let g = 0; g < 8 && attivo() && th() === th0; g++) {
      if (chiudiBinario() || !attivo() || th() !== th0) return fine();
      const attacchi = bot.hand.filter(c => gioc(c) && sicura(c) && danno(c) > 0).sort((a, b) => danno(b) / Math.max(1, b.valore) - danno(a) / Math.max(1, a.valore));
      const utili = bot.hand.filter(c => gioc(c) && sicura(c) && !danno(c) && !reazione(c) && (
        ((ha(c, 'weakenForza') || ha(c, 'stun') || ha(c, 'taunt')) && attaccanti().length) ||
        (ha(c, 'heal') && bot.vita <= bot.vitaMax - 3) || (ha(c, 'draw') && bot.hand.length <= 3) || ha(c, 'heroPoints') || ha(c, 'shield') || ha(c, 'damageReduction')));
      const c = attacchi[0] || utili[0];
      if (!c) break;
      const t = (danno(c) || ha(c, 'stun') || ha(c, 'weakenForza')) ? bersaglio(danno(c)) : (ha(c, 'heal') ? bot.id : null);
      const prima = bot.hand.length;
      if (!play(c, t) || bot.hand.length === prima) break;
    }
    if (!attivo() || th() !== th0) return fine();

    // 4) Sacrifici con le carte che non servono (raddoppiati se conviene)
    for (let g = 0; g < 3 && attivo() && th() === th0 && binariOk() && bot.sacrificesThisRound < maxSac(); g++) {
      let fatto = false;
      for (const [tr, cat] of binari().sort((a, b) => a[2] - b[2])) {
        const inutile = bot.hand.filter(c => norm(c.cat) === norm(cat) && !(danno(c) > 0 && gioc(c) && sicura(c)) && !reazione(c)).sort((a, b) => (b.valore || 0) - (a.valore || 0))[0];
        if (!inutile) continue;
        const raddoppio = !bot.boostedSacrifice && (inutile.valore || 0) >= 2 && bot.hand.find(x => x !== inutile && ha(x, 'boostNextSacrifice') && gioc(x));
        if (raddoppio) play(raddoppio);
        if (attivo() && th() === th0) sac(inutile, tr);
        fatto = true;
        break;
      }
      if (!fatto) break;
    }

    // Se non ha potuto agire, Scarto di Sopravvivenza per evitare la penalità per passività
    if (attivo() && !bot.actedThisRound && bot.hand.length > 0) this.survivalDiscard(bot.id);
    fine();
  }

  addLog(type, text) {
    this.state.log.push({ type, text, time: new Date().toLocaleTimeString() });
    if (this.state.log.length > 50) this.state.log.shift();
    this.emit('log_added', { type, text });
  }
}

window.GameEngine = new MonomythosEngine();
