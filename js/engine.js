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
    this.listeners.forEach(l => {
      if (l.event === event || l.event === '*') {
        l.cb(event, data, this.state);
      }
    });
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
    if (Array.isArray(options.actThreats) && options.actThreats.length === 3) {
      const fixed = options.actThreats.map(n => data.threats.find(t => t.nome === n)).filter(Boolean);
      if (fixed.length === 3) actThreats = fixed;
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
      if (!customDeckConfig && window.Progression && !cfg.isBot && !cfg.remoteUid) {
        customDeckConfig = window.Progression.getActiveDeckForHero(cfg.name) || (window.Progression.data.activeDeckName ? window.Progression.getCustomDeck(window.Progression.data.activeDeckName) : null);
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
        trm: 0,
        pe: 0,
        vp: 0,
        state: 'hero', // 'hero' or 'villain'
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

  setupCurrentThreat() {
    const raw = this.state.actThreats[this.state.actIndex];
    const numHeroes = this.state.players.filter(p => !p.isDead).length || 2;

    // §8.2 Crisi Composita: negli Atti I e II, una Minaccia di Livello ≤ 3 si fonde con una seconda dal pool
    let secondary = null;
    const BIL = window.MONOMYTHOS_BILANCIAMENTO || {};
    if (BIL.crisiComposita !== false && !this.state.noCrisi && this.state.actIndex < 2 && raw.livello <= 3) {
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
      const groupHp = Math.max(g.count, Math.round(g.card.vu * (groupLiv + (numHeroes * (BIL.pesoEroi || 1) + Math.max(0, numHeroes - 2) * (BIL.pesoEroiOltre2 || 0))) * (BIL.scalaVita || 1) * (this.state.difficolta || 1)));
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
    const D = this.state.difficolta || 1;
    const primMax = Math.max(1, Math.round(raw.primario.val * (liv + (numHeroes * (BIL.pesoEroi || 1) + Math.max(0, numHeroes - 2) * (BIL.pesoEroiOltre2 || 0))) * (BIL.scalaSoglie || 1) * D));
    const brutMax = Math.max(1, Math.round(raw.bruto.val * (liv + (numHeroes * (BIL.pesoEroi || 1) + Math.max(0, numHeroes - 2) * (BIL.pesoEroiOltre2 || 0))) * (BIL.scalaSoglie || 1) * D));

    this.state.currentThreat = {
      ...raw,
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
      isBoss: this.state.actIndex === 2
    };

    if (this.state.isRogueHeroBoss) {
      this.setupRogueHeroBoss(this.state.bossHeroName || "Titano d'Acciaio");
      return;
    }

    if (this.state.actIndex === 2) {
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
      p.actedThisRound = false;
      p.retentionUsedThisRound = false;
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
      if (this.state.round > 1) {
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

    this.state.turnIndex = 0;
    this.addLog('sys', `--- Round ${this.state.round} ---`);
    this.emit('round_started', this.state);

    this.checkTurn();
  }

  // Pescaggio massimo: min(5, Velocità + 1); Sfiancato blocca le carte extra (§3.4, §8.5)
  getMaxDraw(p) {
    if (p.weakened && !p.logoramento) return 1;
    return Math.min(5, (p.spd || 1) + 1) + (p.drawBonus || 0);
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

  // Target resolver helper (Point 7)
  resolveTarget(targetId) {
    if (!this.state || !this.state.currentThreat) return null;
    const th = this.state.currentThreat;
    if (!targetId || targetId === 'threat_boss' || targetId === 'boss') {
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

    // 1. Threat Boss
    candidates.push({
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
    if (player.slots[norm] !== undefined) {
      player.slots[norm] = Math.max(0, player.slots[norm] - cost);
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
      fxList.forEach(fx => {
        // Evaluate conditions
        if (fx.condition === 'hero' && player.state !== 'hero') return;
        if (fx.condition === 'villain' && player.state !== 'villain') return;

        // If played actively in-turn, reaction cards provide active defensive shield/prep
        if (fx.timing && fx.timing !== 'play') {
          if (fx.type === 'shield' || fx.type === 'parry' || fx.type === 'damageReduction') {
            const shieldAmt = fx.amount || card.valore || 2;
            player.shield = (player.shield || 0) + shieldAmt;
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

    this.emit('card_played', { player, card, targetId });
    this.checkThreatDefeated();
    return { ok: true };
  }

  // Tactical Sacrifice onto Multi-Path (Opzione B)
  tacticalSacrifice(playerId, cardUid, trackChoice = 'primario') {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead) return { ok: false, msg: 'Giocatore non attivo' };

    if (player.sacrificesThisRound >= 2) {
      return { ok: false, msg: 'Massimo 2 sacrifici tattici per round consentiti' };
    }

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

  // Base Power activation
  activateBasePower(playerId, optionIndex = 0) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead) return { ok: false, msg: 'Giocatore non attivo' };
    if (player.pbUsedThisTurn) return { ok: false, msg: 'Potere Base già usato questo turno' };

    player.pbUsedThisTurn = true;
    player.actedThisRound = true;
    const th = this.state.currentThreat;

    if (player.name === 'Iron Aegis') {
      if (optionIndex === 0) {
        th.hp = Math.max(0, th.hp - 1);
        this.addLog('hero', `${player.name} attiva [Sovraccarico Cinetico]: 1 danno gratuito alla Minaccia`);
      } else {
        player.slots.Potenza = (player.slots.Potenza || 0) + 1;
        this.addLog('hero', `${player.name} attiva [Sovraccarico Cinetico]: +1 Slot Potenza temporaneo`);
      }
    } else if (player.name === 'Neon Phantom') {
      if (optionIndex === 0) {
        if (player.deck.length > 0 && player.hand.length < player.maxHand) {
          player.hand.push(player.deck.pop());
          this.addLog('hero', `${player.name} attiva [Scatto Quantistico]: pesca 1 carta extra`);
        }
      } else {
        player.slots.Agilità = (player.slots.Agilità || 0) + 1;
        this.addLog('hero', `${player.name} attiva [Scatto Quantistico]: +1 Slot Agilità temporaneo`);
      }
    } else {
      // Generic base power
      player.shield += 1;
      this.addLog('hero', `${player.name} attiva ${player.pbName}`);
    }

    this.emit('base_power_used', { player, optionIndex });
    this.checkThreatDefeated();
    return { ok: true };
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
    if (list.length === 0) intents.__boss = { kind: 'attack', dmg: th.forza, target: target.name };
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

    // Reset temporary buffs
    this.state.players.forEach(p => {
      p.tempResistance = 0;
      p.damageReduction = 0;
      p.tempDrawRate = 0;
    });

    // Decrement Operational Timer
    th.timer--;
    this.addLog('threat', `Timer Operativo: ${th.timer}/${th.timerMax}`);

    // Check Detonation
    if (th.timer <= 0) {
      this.addLog('threat', `[DETONAZIONE] Esplosione del Timer! 3 danni diretti e +1 TRM a tutti gli eroi!`);
      this.state.players.forEach(p => {
        if (p.isDead) return;
        p.vita = Math.max(0, p.vita - 3);
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
    const enemies = attackers.length > 0 ? attackers : (livingMooks.length > 0 ? livingMooks.slice(0, 1) : [{ name: th.nome, isBoss: true }]);

    let enemyIndex = 0;
    const processNextAttack = () => {
      if (this.isGameOver() || this.checkThreatDefeated() || this.checkAllHeroesDead()) return;

      if (enemyIndex >= enemies.length) {
        // La riduzione di Forza vale un round
        if (th._forzaBase != null) { th.forza = th._forzaBase; delete th._forzaBase; }
        // Proceed to next round
        this.state.round++;
        setTimeout(() => {
          this.startRound();
        }, 1200);
        return;
      }

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
      this.resolveEnemyAttack(enemy, target, Math.max(0, th.forza + forzaExtra - (sfiancato ? 1 : 0)), () => {
        setTimeout(processNextAttack, 400);
      });
    };

    processNextAttack();
  }

  // Resolve Enemy Attack with Defense Window for reactions & dynamic parry (Point 6)
  resolveEnemyAttack(enemy, target, rawDmg, onComplete = null) {
    let effectiveDmg = rawDmg;

    // Apply active damage reduction
    if (target.damageReduction) {
      effectiveDmg = Math.max(0, effectiveDmg - target.damageReduction);
    }

    // §3.3 Travolgere: solo la parte di danno oltre la Resistenza (minimo 1, §3.3.2) è imparabile
    const effectiveEnd = Math.max(1, target.end + (target.tempResistance || 0));
    const isTrample = (effectiveDmg > effectiveEnd);
    const excess = Math.max(0, effectiveDmg - effectiveEnd);
    const mitigable = effectiveDmg - excess;

    this.addLog('threat', `${enemy.name} attacca ${target.name} con Forza ${effectiveDmg}! (Resistenza: ${effectiveEnd}${isTrample ? ' — Travolgere!' : ''})`);

    // Reaction cards and hand cards for Dynamic Parry
    const reactionCards = target.hand.filter(c => c.fx_list && c.fx_list.some(f => f.timing === 'reaction'));
    const parryCards = [...target.hand];

    const applyRemainingDamage = (absorbed, dodged, reflected) => {
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

      target.vita = Math.max(0, target.vita - penetrated);

      if (penetrated > 0) {
        this.addLog('threat', `${target.name} incassa ${penetrated} danni (Vita: ${target.vita}/${target.vitaMax})`);
      } else {
        this.addLog('hero', `[COLPO AMMORTIZZATO] Danno completamente assorbito dalla Parata Dinamica!`);
      }
      this.checkPlayerDeath(target);
      this.emit('damage_taken', { target, dmg: penetrated, parried: absorbed, reflected, trample: isTrample });
      if (onComplete) onComplete();
    };

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

  // Tasso di conversione della Parata Dinamica (§3.3): assorbito = ⌊somma dei Valori ÷ tasso⌋
  getParryRate() {
    const th = this.state.currentThreat;
    return (th && th.parryRate) || 1;
  }

  executeBotDefense(target, effectiveDmg, reactionCards, parryCards, applyRemainingDamage) {
    const rCards = reactionCards || target.hand.filter(c => c.fx_list && c.fx_list.some(f => f.timing === 'reaction'));
    if (rCards.length > 0) {
      const rCard = rCards[0];
      const rIdx = target.hand.findIndex(c => c.uid === rCard.uid);
      if (rIdx !== -1) target.hand.splice(rIdx, 1);
      target.discard.push(rCard);

      const ctx = {
        source: target,
        card: rCard,
        incomingAttack: { rawDmg: effectiveDmg, parried: 0, dodged: false }
      };
      rCard.fx_list.forEach(fx => {
        if (fx.timing === 'reaction') {
          window.EffectRegistry.execute(fx.type, this, ctx, fx);
        }
      });
      applyRemainingDamage(ctx.incomingAttack.parried || 0, ctx.incomingAttack.dodged, 0);
    } else if (target.hand.length > 0 && effectiveDmg > 0) {
      // Bot discards cards to absorb the mitigable damage
      const rate = this.getParryRate();
      let valueSum = 0;
      target.hand.sort((a, b) => (a.valore || 0) - (b.valore || 0));
      while (target.hand.length > 1 && Math.floor(valueSum / rate) < effectiveDmg) {
        const pCard = target.hand.pop();
        target.discard.push(pCard);
        valueSum += (pCard.valore || 0);
      }
      const absorbedTotal = Math.floor(valueSum / rate);
      this.addLog('hero', `[PARATA] ${target.name} effettua Parata Dinamica, assorbendo ${absorbedTotal} danni`);
      applyRemainingDamage(absorbedTotal, false, 0);
    } else {
      applyRemainingDamage(0, false, 0);
    }
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
          incomingAttack: { enemy, rawDmg, parried: 0, dodged: false }
        };
        if (card.fx_list) {
          card.fx_list.forEach(fx => {
            if (fx.timing === 'reaction') {
              window.EffectRegistry.execute(fx.type, this, ctx, fx);
            }
          });
        }
        applyRemainingDamage(ctx.incomingAttack.parried || 0, ctx.incomingAttack.dodged, 0);
      } else {
        applyRemainingDamage(0, false, 0);
      }
    } else if (choice.type === 'parry' || choice.type === 'parry_cards' || choice.type === 'parry_card' || choice.type === 'parry_multi') {
      const uids = choice.cardUids || (choice.cardUid ? [choice.cardUid] : []);
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
      const liv = th.livello;
      th.primarioMax = th.primario.val * (liv + numLiving);
      th.brutoMax = th.bruto.val * (liv + numLiving);
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

      if (this.state.actIndex < 2) {
        // Advance to next Act
        this.state.actIndex++;
        if (window.Progression && this.state.ranked) window.Progression.addCredits(100, 'Minaccia risolta'); if (window.Collezione && !this.state.isOnlineGuest) window.Collezione.registraMinaccia();
        this.setupCurrentThreat();
        this.addLog('sys', `=== AVANZAMENTO: ATTO ${this.state.actIndex === 1 ? 'II' : 'FINALE'} — ${this.state.currentThreat.nome} ===`);
        this.emit('act_advanced', this.state);
        this.startRound();
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

  // Simple, smart tactical Bot AI with Target Selection (Point 7)
  runBotTurn(bot) {
    if (this.isGameOver() || bot.isDead || this.state.phase !== 'action') return;

    // 1. Try to use Base Power if available
    if (!bot.pbUsedThisTurn) {
      this.activateBasePower(bot.id, 0);
    }

    // 2. Decide between playing card or sacrificing
    const th = this.state.currentThreat;
    const primRatio = th.primarioProgress / th.primarioMax;
    const brutRatio = th.brutoProgress / th.brutoMax;

    // Carte giocabili: il bot evita le carte che danno Trauma quando è vicino al Punto di Rottura
    const soglia = (window.MONOMYTHOS_BILANCIAMENTO || {}).sogliaVillain || 5;
    const traumaOf = c => (c.fx_list || []).reduce((t, f) => t + (f.type === 'trauma' && f.amount > 0 ? f.amount : 0), 0);
    const getPlayable = () => bot.hand.filter(c => this.getPlayerSlot(bot, c.cat) >= c.valore && bot.trm + traumaOf(c) < soglia - 1)
      .sort((a, b) => traumaOf(a) - traumaOf(b));
    let playableCards = getPlayable();
    let plays = 0;

    while (playableCards.length > 0 && plays < 4 && !this.isGameOver() && this.state.phase === 'action' && this.state.currentThreat === th && (th.hp > 0 || primRatio < 0.8)) {
      const c = playableCards[0];
      const targetInfo = this.getValidTargetsForCard(bot.id, c);
      let chosenTargetId = 'threat_boss';
      if (targetInfo.requiresTarget) {
        const valids = targetInfo.candidates.filter(can => can.isValid);
        // Prioritize wounded mooks, then boss
        const validMook = valids.find(can => can.type === 'mook');
        if (validMook) {
          chosenTargetId = validMook.id;
        } else if (valids.length > 0) {
          chosenTargetId = valids[0].id;
        }
      }
      const before = bot.hand.length;
      this.playCardEffect(bot.id, c.uid, chosenTargetId);
      plays++;
      if (bot.hand.length === before || bot.isDead) break;
      playableCards = getPlayable();
    }
    if (this.isGameOver() || this.state.currentThreat !== th) { setTimeout(() => this.endTurn(), 600); return; }
    if (plays === 0 && bot.hand.length > 1 && bot.sacrificesThisRound < 2) {
      // Tactical sacrifice: solo carte della Categoria richiesta; il bot resta sul binario già avviato (§5)
      const preferred = primRatio >= brutRatio ? ['primario', 'bruto'] : ['bruto', 'primario'];
      for (const track of preferred) {
        const reqCat = this.normalizeCategory(track === 'primario' ? th.primario.cat : th.bruto.cat);
        const c = bot.hand.find(x => this.normalizeCategory(x.cat) === reqCat);
        if (c) { this.tacticalSacrifice(bot.id, c.uid, track); break; }
      }
    }

    // Se non ha potuto agire, Scarto di Sopravvivenza per evitare la penalità per passività
    if (!bot.actedThisRound && bot.hand.length > 0) {
      this.survivalDiscard(bot.id);
    }

    setTimeout(() => {
      this.endTurn();
    }, 600);
  }

  addLog(type, text) {
    this.state.log.push({ type, text, time: new Date().toLocaleTimeString() });
    if (this.state.log.length > 50) this.state.log.shift();
    this.emit('log_added', { type, text });
  }
}

window.GameEngine = new MonomythosEngine();
