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
    const shuffledThreats = [...data.threats].sort(() => Math.random() - 0.5);
    const actThreats = shuffledThreats.slice(0, 3);

    // Initialize players
    const players = heroConfigs.map((cfg, idx) => {
      let meta = { ...(data.chars_meta[cfg.name] || {
        str: 2, spd: 2, tech: 2, end: 2, vita: 25,
        pb_name: 'Potere Base', pb_desc: 'Effetto base'
      }) };

      // Check if player has a custom deck specified or saved in progression
      let deck = [];
      let customDeckConfig = cfg.customDeck;
      if (!customDeckConfig && window.Progression && !cfg.isBot) {
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
      let padIdx = 0;
      while (deck.length < 60 && availableCards && availableCards.length > 0) {
        const c = availableCards[padIdx % availableCards.length];
        deck.push({ ...c, uid: Math.random().toString(36).substring(2, 9) });
        padIdx++;
      }
      deck = deck.sort(() => Math.random() - 0.5);

      const maxHand = 5 + meta.end;
      const initialHand = deck.splice(0, Math.min(maxHand, 5 + meta.end));

      return {
        id: `p_${idx}`,
        name: cfg.name,
        isBot: !!cfg.isBot,
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
    const liv = raw.livello;

    // Formula unica: Vita totale = VitaUnitaria × (Livello + NumeroEroi)
    const totalHp = raw.vu * (liv + numHeroes);
    
    // Parse mooks
    let mookCount = 1;
    let mookName = 'Nemico';
    const mMatch = raw.nemici.match(/(\d+)×?\s*(.+)/);
    if (mMatch) {
      mookCount = parseInt(mMatch[1]) || 1;
      mookName = mMatch[2].trim();
    }

    const mooks = [];
    const mookHp = Math.ceil(totalHp / mookCount);
    for (let i = 0; i < mookCount; i++) {
      mooks.push({
        id: `mook_${i}`,
        name: `${mookName} ${String.fromCharCode(65 + i)}`,
        hp: mookHp,
        maxHp: mookHp,
        isDead: false
      });
    }

    // Thresholds: SogliaUnitaria × (Livello + NumeroEroi)
    const primMax = raw.primario.val * (liv + numHeroes);
    const brutMax = raw.bruto.val * (liv + numHeroes);

    this.state.currentThreat = {
      ...raw,
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
      cosmico: 'Egemonia del Fato: La Parata Dinamica assorbe 1 danno ogni 2 carte scartate.',
      logica: 'Aggressivo → Attacca ad area e bersaglia chi ha meno carte',
      img: data.chars_meta[bossHeroName]?.img || 'assets/icons/minaccia.png',
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

      // Draw cards: 1 base + floor(Spd / 2)
      const drawCount = 1 + Math.floor(p.spd / 2);
      for (let i = 0; i < drawCount; i++) {
        if (p.hand.length < p.maxHand) {
          if (p.deck.length === 0) {
            // Decking Out penalty: shuffle discard, +10 TRM (§4.1)
            if (p.discard.length > 0) {
              p.deck = [...p.discard].sort(() => Math.random() - 0.5);
              p.discard = [];
              p.trm = Math.min(5, p.trm + 2); // Cap at 5 with breaking point check
              this.addLog('threat', `[DECKOUT] ${p.name} ha esaurito il mazzo! (+2 TRM)`);
              this.checkBreakingPoint(p);
            }
          }
          if (p.deck.length > 0) {
            p.hand.push(p.deck.pop());
          }
        }
      }
    });

    this.state.turnIndex = 0;
    this.addLog('sys', `--- Round ${this.state.round} ---`);
    this.emit('round_started', this.state);

    this.checkTurn();
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
    this.state.playedCardsThisRound.push({ player: player.name, card: card });

    this.addLog('hero', `${player.name} gioca [${card.nome}]: ${card.effetto}`);

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

    // Rule: Matching Category = Full Value, Different Category = Half Value (min 1)
    let contribution = card.valore;
    if (card.cat !== reqCat) {
      contribution = Math.max(1, Math.floor(card.valore / 2));
    }

    if (trackChoice === 'primario') {
      th.primarioProgress = Math.min(th.primarioMax, th.primarioProgress + contribution);
      this.addLog('hero', `${player.name} sacrifica [${card.nome}] sul binario Primario (+${contribution} ${th.primario.cat})`);
    } else {
      th.brutoProgress = Math.min(th.brutoMax, th.brutoProgress + contribution);
      this.addLog('hero', `${player.name} sacrifica [${card.nome}] sul binario Bruto (+${contribution} ${th.bruto.cat})`);
    }

    player.sacrificesThisRound++;
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

  checkBreakingPoint(player) {
    if (player.trm >= 5 && player.state === 'hero') {
      player.state = 'villain';
      this.addLog('threat', `[TRAUMA] PUNTO DI ROTTURA! ${player.name} ha accumulato 5 Trauma e si trasforma in VILLAIN!`);
      this.emit('player_corrupted', player);
    }
  }

  endTurn() {
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
  runEnemyPhase() {
    this.state.phase = 'enemy';
    const th = this.state.currentThreat;
    this.addLog('threat', `=== FASE MINACCIA ===`);

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
    const enemies = livingMooks.length > 0 ? livingMooks : [{ name: th.nome, isBoss: true }];

    let enemyIndex = 0;
    const processNextAttack = () => {
      if (this.isGameOver() || this.checkThreatDefeated() || this.checkAllHeroesDead()) return;

      if (enemyIndex >= enemies.length) {
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

      // Targeting
      let target = livingPlayers[0];
      if (th.forcedTarget) {
        const ft = livingPlayers.find(p => p.id === th.forcedTarget);
        if (ft) target = ft;
        delete th.forcedTarget;
      } else if (th.logica && th.logica.includes('meno carte')) {
        target = livingPlayers.reduce((min, p) => p.hand.length < min.hand.length ? p : min, livingPlayers[0]);
      } else {
        target = livingPlayers.reduce((min, p) => p.vita < min.vita ? p : min, livingPlayers[0]);
      }

      this.resolveEnemyAttack(enemy, target, th.forza, () => {
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

    const effectiveEnd = target.end + (target.tempResistance || 0);
    const isTrample = (effectiveDmg > effectiveEnd);

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

      const unabsorbed = Math.max(0, effectiveDmg - absorbed);
      let penetrated = 0;

      if (isTrample) {
        // Trample: unabsorbed damage bypasses shield directly to base HP (§7.7)
        penetrated = unabsorbed;
        if (unabsorbed > 0) {
          this.addLog('threat', `[TRAVOLGERE] Danno residuo (${unabsorbed}) penetra direttamente la Vita Base bypassando gli scudi!`);
        }
      } else {
        // Normal damage: shield absorbs first, then HP
        penetrated = Math.max(0, unabsorbed - target.shield);
        target.shield = Math.max(0, target.shield - unabsorbed);
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

    const localPlayer = this.state.players.find(p => (p.isLocal || p.id === 'p_0') && !p.isDead) || this.state.players.find(p => !p.isDead);
    const isTargetLocal = Boolean(target.isLocal || (localPlayer && target.id === localPlayer.id));

    if (isTargetLocal) {
      // Direct Attack on Local Human Player: open interactive defense window
      this.pendingDefense = {
        enemy,
        target,
        defender: target,
        rawDmg: effectiveDmg,
        effectiveEnd,
        isTrample,
        applyRemainingDamage
      };
      this.emit('defense_window_opened', {
        enemy,
        target,
        defender: target,
        rawDmg: effectiveDmg,
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
        effectiveEnd,
        isTrample,
        reactionCards: localReactions,
        parryCards: localParryCards,
        isAllyDefense: true
      });
    } else {
      // Bot-only match / no living human: execute bot AI defense directly
      this.executeBotDefense(target, effectiveDmg, reactionCards, parryCards, applyRemainingDamage);
    }
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
      // Bot discards cards to absorb damage
      let absorbedTotal = 0;
      while (target.hand.length > 0 && absorbedTotal < effectiveDmg) {
        const pCard = target.hand.pop();
        target.discard.push(pCard);
        const val = this.state.cosmicMutationActive ? 1 : Math.max(1, pCard.valore || 1);
        absorbedTotal += val;
      }
      this.addLog('hero', `[PARATA] ${target.name} effettua Parata Dinamica, assorbendo ${absorbedTotal} danni`);
      applyRemainingDamage(absorbedTotal, false, 0);
    } else {
      applyRemainingDamage(0, false, 0);
    }
  }

  // Response callback from user defense window
  respondToDefense(choice) {
    if (!this.pendingDefense) return;
    const { enemy, target, rawDmg, reactionCards, parryCards, applyRemainingDamage } = this.pendingDefense;
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
      let totalAbsorb = 0;
      uids.forEach(uid => {
        const playerWithCard = this.state.players.find(p => p.hand.some(c => c.uid === uid));
        if (playerWithCard) {
          const cIdx = playerWithCard.hand.findIndex(c => c.uid === uid);
          if (cIdx !== -1) {
            const card = playerWithCard.hand.splice(cIdx, 1)[0];
            playerWithCard.discard.push(card);
            // Dynamic Parry: 1:1 card discarded or card value (min 1)
            const absorb = Math.max(1, card.valore || 1);
            totalAbsorb += absorb;
            this.addLog('hero', `[PARATA] ${playerWithCard.name} scarta [${card.nome}] (+${absorb} assorbimento${target.id !== playerWithCard.id ? ' per difendere ' + target.name : ''})`);
          }
        }
      });
      if (totalAbsorb > 0) {
        this.addLog('hero', `[PARATA DINAMICA] Assorbiti in totale ${totalAbsorb} danni scartando ${uids.length} carte.`);
      }
      applyRemainingDamage(totalAbsorb, false, 0);
    } else if (choice.type === 'bot_fallback') {
      // Let companion bot defend itself
      this.executeBotDefense(target, rawDmg, reactionCards, parryCards, applyRemainingDamage);
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
      }
    }
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
        if (window.Progression) window.Progression.addCredits(100, 'Minaccia risolta');
        this.setupCurrentThreat();
        this.addLog('sys', `=== AVANZAMENTO: ATTO ${this.state.actIndex === 1 ? 'II' : 'FINALE'} — ${this.state.currentThreat.nome} ===`);
        this.emit('act_advanced', this.state);
        this.startRound();
        return true;
      } else {
        // Final Victory!
        this.state.phase = 'gameover';
        this.state.winner = 'heroes';
        if (window.Progression) window.Progression.addCredits(300, 'Vittoria Finale Cosmica');
        this.addLog('hero', `[VITTORIA] VITTORIA COSMICA! La Calamità è stata sventata! (+300 Crediti Cosmici)`);
        this.emit('game_over', { winner: 'heroes' });
        return true;
      }
    }
    return false;
  }

  checkAllHeroesDead() {
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

    // Check playable cards
    const playableCards = bot.hand.filter(c => {
      const cost = c.valore;
      return (bot.slots[c.cat] || 0) >= cost;
    });

    if (playableCards.length > 0 && (th.hp > 0 || primRatio < 0.8)) {
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
      this.playCardEffect(bot.id, c.uid, chosenTargetId);
    } else if (bot.hand.length > 1 && bot.sacrificesThisRound < 2) {
      // Tactical sacrifice
      const track = primRatio >= brutRatio ? 'primario' : 'bruto';
      const c = bot.hand[0];
      this.tacticalSacrifice(bot.id, c.uid, track);
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
