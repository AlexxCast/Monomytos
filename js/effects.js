// Monomythos Modular Card Effect Engine & Centralized Card Layout Registry
// 100% Data-Driven & Extensible

class EffectRegistryClass {
  constructor() {
    this.handlers = new Map();
    this.initStandardHandlers();
  }

  register(type, handler) {
    this.handlers.set(type, handler);
  }

  has(type) {
    return this.handlers.has(type);
  }

  execute(type, engine, context, effectDef) {
    const handler = this.handlers.get(type);
    if (!handler) {
      console.warn(`[EffectRegistry] Handler non trovato per tipo: ${type}`);
      return { ok: false, msg: `Nessun handler per ${type}` };
    }
    return handler(engine, context, effectDef);
  }

  initStandardHandlers() {
    // 1. DAMAGE
    this.register('damage', (engine, ctx, fx) => {
      const { source, target, card } = ctx;
      let amt = fx.amount || 1;
      // (amt può essere ridotto dagli effetti della Minaccia sotto)

      // Apply source attack boosts
      if (source.boostedAttack) {
        amt += source.boostedAttack;
        delete source.boostedAttack;
      }
      if (source.boostedCategory && (source.boostedCategory.category === card.cat || source.boostedCategory.category === 'All')) {
        amt += source.boostedCategory.amount || 0;
        delete source.boostedCategory;
      }

      const th = engine.state.currentThreat;
      const targetEntity = ctx.targetEntity || engine.resolveTarget(ctx.targetId) || { type: 'boss', name: th.nome };

      // Danno pari a un multiplo della Resistenza (Ultimatum Cinetico)
      if (fx.perResistenza) amt = fx.perResistenza * ((source.end || 1) + (source.tempResistance || 0)) + (amt - (fx.amount || 1));
      // Bonus condizionali scritti sulle carte (+N se la condizione è vera)
      if (fx.bonus) {
        const b = fx.bonus, st = engine.state, e = targetEntity.entity;
        const vivi = st.players.filter(p => !p.isDead);
        const vero = {
          ferito: () => targetEntity.type === 'mook' && e && e.hp < e.maxHp,
          primo: () => !(st.attacchiRound > 0),
          ultimo: () => vivi[vivi.length - 1] === source,
          colpito: () => source.ultimoDanno != null && source.ultimoDanno >= st.round - 1,
          potere: () => !!source.pbUsedThisTurn,
          indebolito: () => !!(e && (e.stunned || e.weakened))
        }[b.se];
        if (vero && vero()) { amt += b.amount || 1; engine.addLog('hero', `[BONUS] ${card && card.nome ? card.nome : 'Attacco'}: +${b.amount || 1} danno`); }
      }
      // Firmware Corrotto: +1 a tutti i tuoi attacchi per il resto dell'Atto
      if (source.bonusDannoAtto != null && source.bonusDannoAtto === engine.state.actIndex) amt += 1;
      // Gloria Personale: il prossimo attacco fa il doppio
      if (source.raddoppiaAttacco && card && card.cat !== 'Torretta') { amt *= 2; delete source.raddoppiaAttacco; engine.addLog('hero', `[GLORIA PERSONALE] Danno raddoppiato: ${amt}`); }
      if (source.hand) engine.state.attacchiRound = (engine.state.attacchiRound || 0) + 1;

      // Danno ad area vero: colpisce ogni nemico vivo con lo stesso danno (Protocollo Zero, Macello Indiscriminato...)
      if (fx.target === 'all_enemies' && !fx.splash && th.mooks && th.mooks.some(m => !m.isDead)) {
        let a = amt;
        if (source.state !== 'villain') a = engine.mx('dannoEroe', a, { source });
        th.mooks.forEach(m => {
          if (m.isDead) return;
          m.hp -= a;
          engine.addLog('hero', `${source.name} infligge ${a} danni a ${m.name} (${Math.max(0, m.hp)} HP rimasti)`);
          if (m.hp <= 0) { m.isDead = true; engine.addLog('hero', `[ELIMINATO] ${m.name} è stato sconfitto!`); }
        });
        engine.syncThreatHp();
        return { ok: true, amount: a, area: true };
      }

      if (targetEntity.type === 'mook') {
        const mook = targetEntity.entity;
        if (source.state !== 'villain') amt = engine.mx('dannoEroe', amt, { source });
        // Marchio dell'Abisso: il bersaglio marchiato subisce +1 dal colpo successivo
        if (mook.marchio) { amt += mook.marchio; engine.addLog('hero', `[MARCHIO] ${mook.name} subisce +${mook.marchio} danno`); delete mook.marchio; }
        const colpisci = (m, n) => {
          m.hp -= n;
          engine.addLog('hero', `${source.name} infligge ${n} danni a ${m.name} (${Math.max(0, m.hp)} HP rimasti)`);
          if (m.hp <= 0) { m.isDead = true; engine.addLog('hero', `[ELIMINATO] ${m.name} è stato sconfitto!`); }
        };
        colpisci(mook, amt);
        const altro = () => (th.mooks || []).filter(m => !m.isDead && m !== mook).sort((a, b) => a.hp - b.hp)[0];
        // Fendente ad Arco: un colpo in più su un secondo nemico
        if (fx.secondo && altro()) colpisci(altro(), fx.secondo);
        // Lama senza Rimorso: se il bersaglio muore, l'attacco si ripete su un altro nemico
        if (fx.ripetiSeMuore && mook.isDead && altro()) { engine.addLog('hero', `[DI NUOVO] ${card && card.nome ? card.nome : 'L\'attacco'} colpisce ancora`); colpisci(altro(), amt); }
        engine.syncThreatHp();
      } else if (targetEntity.type === 'player') {
        const pTarget = targetEntity.entity;
        const cardEffectText = (card?.effetto || fx.desc || '').toLowerCase();
        const ignoresParry = fx.ignoreParry || cardEffectText.includes('ignora la parata') || cardEffectText.includes('ignorando parata');

        if (!ignoresParry && typeof engine.resolveEnemyAttack === 'function' && amt > 0) {
          engine.resolveEnemyAttack(source, pTarget, amt);
        } else {
          const shieldAbsorb = Math.min(pTarget.shield, amt);
          pTarget.shield -= shieldAbsorb;
          const netDmg = amt - shieldAbsorb;
          pTarget.vita = Math.max(0, pTarget.vita - netDmg);
          engine.addLog('threat', `${source.name} infligge ${amt} danni a ${pTarget.name}${ignoresParry ? ' (ignora Parata)' : ''} (Assorbiti da Scudo: ${shieldAbsorb}, Vita: ${pTarget.vita}/${pTarget.vitaMax})`);
          engine.checkPlayerDeath(pTarget);
        }
      } else {
        // Default: Boss / Threat
        th.hp = Math.max(0, th.hp - amt);
        engine.addLog('hero', `${source.name} infligge ${amt} danni al Boss ${th.nome} (${th.hp}/${th.maxHp} HP)`);
      }

      // Splash damage to other enemies
      if (fx.splash && th.mooks) {
        th.mooks.forEach(m => {
          if (!m.isDead && (!targetEntity.entity || m.id !== targetEntity.entity.id)) {
            m.hp -= fx.splash;
            engine.addLog('hero', `[EFFETTO COLLATERALE] ${m.name} subisce ${fx.splash} danno collaterale!`);
            if (m.hp <= 0) {
              m.isDead = true;
              engine.addLog('hero', `[ELIMINATO] ${m.name} è stato sconfitto!`);
            }
          }
        });
      }

      engine.syncThreatHp();
      return { ok: true, amount: amt };
    });

    // 2. HEAL
    this.register('heal', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 1;
      let targetPlayer = source;
      if (fx.target !== 'self' && ctx.targetEntity && ctx.targetEntity.type === 'player') {
        targetPlayer = ctx.targetEntity.entity;
      }
      const before = targetPlayer.vita;
      targetPlayer.vita = Math.min(targetPlayer.vitaMax, targetPlayer.vita + amt);
      const healed = targetPlayer.vita - before;
      engine.addLog('hero', `${source.name} cura ${healed} HP a ${targetPlayer.name} (${targetPlayer.vita}/${targetPlayer.vitaMax} HP)`);
      return { ok: true, healed };
    });

    // 3. SHIELD
    this.register('shield', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = engine.mx('scudo', fx.amount || 1, { source });
      source.shield = Math.min(engine.mx('scudoMax', Infinity, { source }), (source.shield || 0) + amt);
      engine.addLog('hero', `${source.name} ottiene Scudo +${amt} (Totale Scudo: ${source.shield})`);
      return { ok: true, amount: amt };
    });

    // 4. DRAW
    this.register('draw', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 1;
      let drawn = 0;
      for (let i = 0; i < amt; i++) {
        if (source.hand.length < source.maxHand) {
          if (source.deck.length === 0 && source.discard.length > 0) {
            source.deck = [...source.discard].sort(() => Math.random() - 0.5);
            source.discard = [];
            source.trm = Math.min(5, source.trm + 2);
            engine.addLog('threat', `[DECKOUT] ${source.name} ricicla gli scarti! (+2 TRM)`);
            engine.checkBreakingPoint(source);
          }
          if (source.deck.length > 0) {
            source.hand.push(source.deck.pop());
            drawn++;
          }
        }
      }
      engine.addLog('hero', `${source.name} pesca ${drawn} carte dal mazzo`);
      if (drawn > 1) engine.mx('pescaMultipla', null, { source, drawn });
      return { ok: true, drawn };
    });

    // 5. DISCARD
    this.register('discard', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 1;
      let targetPlayer = source;
      if (ctx.targetEntity && ctx.targetEntity.type === 'player') {
        targetPlayer = ctx.targetEntity.entity;
      }
      let discarded = 0;
      for (let i = 0; i < amt; i++) {
        if (targetPlayer.hand.length > 0) {
          const c = targetPlayer.hand.pop();
          targetPlayer.discard.push(c);
          discarded++;
        }
      }
      engine.addLog('hero', `${targetPlayer.name} scarta ${discarded} carte dalla mano`);
      return { ok: true, discarded };
    });

    // 6. TRAUMA
    this.register('trauma', (engine, ctx, fx) => {
      const { source } = ctx;
      let amt = fx.amount || 1;
      if (amt > 0 && ctx.card && ctx.card.osc) amt = engine.mx('traumaOscuro', amt, { source });
      source.trm = Math.max(0, Math.min(5, source.trm + amt));
      if (amt > 0) {
        engine.addLog('threat', `[TRAUMA] ${source.name} accumula +${amt} TRM (${source.trm}/5)`);
        engine.checkBreakingPoint(source);
      } else {
        engine.addLog('hero', `[SERENITÀ] ${source.name} riduce ${Math.abs(amt)} TRM (${source.trm}/5)`);
      }
      return { ok: true, trm: source.trm };
    });

    // 7. HERO POINTS / VP
    this.register('heroPoints', (engine, ctx, fx) => {
      const { source } = ctx;
      if (source.state === 'hero') {
        if (fx.pe) {
          source.pe = (source.pe || 0) + fx.pe;
          engine.addLog('hero', `${source.name} accumula ${fx.pe} Punti Eroe (PE: ${source.pe})`);
        }
        if (fx.trauma) {
          source.trm = Math.max(0, Math.min(5, source.trm + fx.trauma));
          engine.addLog('hero', `${source.name} riduce ${Math.abs(fx.trauma)} TRM (${source.trm}/5)`);
        }
      } else {
        // Villain
        const vpGain = fx.vp || (fx.pe || 1);
        source.vp = (source.vp || 0) + vpGain;
        engine.addLog('threat', `[VILLAIN] ${source.name} guadagna +${vpGain} VP (Totale VP: ${source.vp})`);
        engine.mx('vpGenerati', vpGain, { player: source });
      }
      return { ok: true };
    });

    // 8. STUN
    this.register('stun', (engine, ctx, fx) => {
      const { source } = ctx;
      const targetEntity = ctx.targetEntity || engine.resolveTarget(ctx.targetId);
      if (targetEntity && targetEntity.entity) {
        targetEntity.entity.stunned = true;
        engine.addLog('hero', `[STORDITO] ${targetEntity.name} è stordito e salta la prossima azione!`);
      } else {
        source.stunned = true;
        engine.addLog('threat', `${source.name} subisce Stordito`);
      }
      return { ok: true };
    });

    // 9. WEAKEN (SFIANCATO)
    this.register('weaken', (engine, ctx, fx) => {
      // Malus "Applica Sfiancato" sulle carte Oscure: colpisce chi gioca la carta (pesca 1 sola carta al prossimo round)
      if (fx.target === 'self') {
        ctx.source.weakened = true;
        ctx.source.weakenedRound = engine.state.round;
        engine.addLog('threat', `[SFIANCATO] ${ctx.source.name} è sfiancato: al prossimo round pesca 1 sola carta`);
        return { ok: true };
      }
      // Su un nemico: il suo prossimo attacco fa 1 danno in meno
      const targetEntity = ctx.targetEntity || engine.resolveTarget(ctx.targetId);
      if (targetEntity && targetEntity.entity) {
        targetEntity.entity.weakened = true;
        engine.addLog('hero', `[SFIANCATO] ${targetEntity.name} è sfiancato`);
      }
      return { ok: true };
    });

    // 10. WEAKEN FORZA (REDUCE ENEMY ATTACK STRENGTH)
    this.register('weakenForza', (engine, ctx, fx) => {
      const amt = fx.amount || 1;
      const th = engine.state.currentThreat;
      // Vale per questo round: a fine Fase Nemici la Forza torna quella di prima
      if (th._forzaBase == null) th._forzaBase = th.forza;
      th.forza = Math.max(0, th.forza - amt);
      engine.addLog('hero', `[DEPOTENZIAMENTO] La Forza della Minaccia è ridotta di ${amt} per questo round (Forza attuale: ${th.forza})`);
      return { ok: true, newForza: th.forza };
    });

    // 11. TAUNT / PROVOCAZIONE
    this.register('taunt', (engine, ctx, fx) => {
      const { source } = ctx;
      const th = engine.state.currentThreat;
      th.forcedTarget = source.id;
      engine.addLog('hero', `[PROVOCAZIONE] La Minaccia è costretta a bersagliare ${source.name} al prossimo attacco!`);
      return { ok: true };
    });

    // 12. SCRY (GUARDA CARTE MAZZO MINACCIA)
    this.register('scry', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 2;
      const threats = engine.state.actThreats || [];
      const preview = threats.slice(engine.state.actIndex + 1, engine.state.actIndex + 1 + amt).map(t => t.nome);
      engine.addLog('hero', `[ANALISI TATTICA] ${source.name} scruta le prossime calamità: ${preview.join(' → ') || 'Nessuna carta restante'}`);
      engine.emit('scry_performed', { source, preview });
      return { ok: true, preview };
    });

    // 13. RESISTANCE (PER IL TRAVOLGERE)
    this.register('resistance', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 2;
      source.tempResistance = (source.tempResistance || 0) + amt;
      engine.addLog('hero', `${source.name} incrementa di +${amt} la Resistenza effettiva contro Travolgere per questo turno`);
      return { ok: true, amount: amt };
    });

    // 14. DAMAGE REDUCTION BUFF
    this.register('damageReduction', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 2;
      source.damageReduction = (source.damageReduction || 0) + amt;
      engine.addLog('hero', `${source.name} attiva una barriera che riduce di ${amt} tutti i danni subiti fino al prossimo turno`);
      return { ok: true, amount: amt };
    });

    // 15. DRAW RATE BOOST
    this.register('drawRateBoost', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 1;
      source.tempDrawRate = (source.tempDrawRate || 0) + amt;
      source.drawBonus = (source.drawBonus || 0) + amt; // usato al pescaggio del prossimo round
      engine.addLog('hero', `${source.name} ottiene +${amt} al limite di Draw Rate per questo turno`);
      return { ok: true, amount: amt };
    });

    // 16. BOOST NEXT CATEGORY
    this.register('boostNextCategory', (engine, ctx, fx) => {
      const { source } = ctx;
      source.boostedCategory = { category: fx.category || 'All', amount: fx.amount || 2 };
      engine.addLog('hero', `${source.name} prepara un amplificatore: +${fx.amount} alla prossima carta ${fx.category}`);
      return { ok: true };
    });

    // 17. BOOST NEXT ATTACK
    this.register('boostNextAttack', (engine, ctx, fx) => {
      const { source } = ctx;
      source.boostedAttack = (source.boostedAttack || 0) + (fx.amount || 1);
      engine.addLog('hero', `${source.name} potenzia il prossimo attacco (+${fx.amount} danno)`);
      return { ok: true };
    });

    // 18. BOOST NEXT SACRIFICE
    this.register('boostNextSacrifice', (engine, ctx, fx) => {
      const { source } = ctx;
      source.boostedSacrifice = fx.multiplier || 2;
      engine.addLog('hero', `${source.name} raddoppia il Valore del prossimo Sacrificio Tattico per la Minaccia`);
      return { ok: true };
    });

    // 19. SELF DAMAGE
    this.register('selfDamage', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 1;
      source.vita = Math.max(0, source.vita - amt);
      engine.addLog('threat', `[COSTO VITALE] ${source.name} sacrifica ${amt} HP propri (${source.vita}/${source.vitaMax} HP)`);
      engine.checkPlayerDeath(source);
      return { ok: true, amount: amt };
    });

    // 20. REVIVE (PROTOCOLLO DEFIBRILLAZIONE)
    this.register('revive', (engine, ctx, fx) => {
      const { source } = ctx;
      // Si rianima solo un giocatore (mai un nemico o la Minaccia), di preferenza quello caduto
      let targetPlayer = ctx.targetEntity?.type === 'player' ? ctx.targetEntity.entity : null;
      if (!targetPlayer || !(targetPlayer.isDead || targetPlayer.vita <= 0)) {
        targetPlayer = engine.state.players.find(p => p.isDead || p.vita <= 0) || null;
      }
      if (targetPlayer) {
        targetPlayer.isDead = false;
        targetPlayer.vita = fx.amount || 1;
        engine.addLog('hero', `[DEFIBRILLAZIONE] ${source.name} rianima ${targetPlayer.name} con ${targetPlayer.vita} HP!`);
      }
      return { ok: true };
    });

    // 21. STEAL CARD (VILLAIN CRITICAL REACTION)
    this.register('stealCard', (engine, ctx, fx) => {
      const { source } = ctx;
      // Si può rubare solo dalla mano di un giocatore (non da un nemico o dalla Minaccia)
      const targetPlayer = ctx.targetEntity?.type === 'player' ? ctx.targetEntity.entity : null;
      if (targetPlayer && Array.isArray(targetPlayer.hand) && targetPlayer.hand.length > 0) {
        const stolen = targetPlayer.hand.pop();
        source.hand.push(stolen);
        engine.addLog('threat', `[VILLAIN FURTO] ${source.name} ruba [${stolen.nome}] dalla mano di ${targetPlayer.name}!`);
      }
      return { ok: true };
    });

    // 22. FATE SPEND (§4.3)
    this.register('fateSpend', (engine, ctx, fx) => {
      const { source } = ctx;
      if (source.state === 'villain' && (source.vp || 0) >= 2) {
        source.vp -= 2;
        source.trm = Math.max(0, source.trm - 1);
        this.execute('draw', engine, ctx, { amount: 2 });
        engine.addLog('threat', `[SPESA DEL FATO] ${source.name} spende 2 VP: pesca 2 carte e rimuove 1 TRM!`);
      } else if ((source.pe || 0) >= 2) {
        source.pe -= 2;
        const th = engine.state.currentThreat;
        // "Il binario in testa": quello più vicino a chiudersi
        const restaP = th.primarioMax - th.primarioProgress, restaB = th.brutoMax - th.brutoProgress;
        if (restaB < restaP) th.brutoProgress = Math.min(th.brutoMax, th.brutoProgress + 2);
        else th.primarioProgress = Math.min(th.primarioMax, th.primarioProgress + 2);
        engine.addLog('hero', `[SPESA DEL FATO] ${source.name} spende 2 PE: +2 sul binario ${restaB < restaP ? 'Bruto' : 'Primario'}!`);
        engine.checkThreatDefeated();
      } else {
        engine.addLog('sys', `[SPESA DEL FATO] ${source.name} non ha abbastanza punti (servono 2 VP da Villain o 2 Punti Eroe): nessun effetto`);
      }
      return { ok: true };
    });

    // 23. REACTION / PARRY
    this.register('parry', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 2;
      if (ctx.incomingAttack) {
        ctx.incomingAttack.parried = (ctx.incomingAttack.parried || 0) + amt;
        engine.addLog('hero', `[PARATA] ${source.name} assorbe/riduce ${amt} danni dall'attacco in arrivo!`);
      }
      return { ok: true, parried: amt };
    });

    // 24. REACTION: DODGE
    this.register('dodge', (engine, ctx, fx) => {
      const { source } = ctx;
      if (ctx.incomingAttack) {
        ctx.incomingAttack.dodged = true;
        engine.addLog('hero', `[EVASIONE TOTALE] ${source.name} schiva completamente l'attacco nemico!`);
      }
      return { ok: true, dodged: true };
    });

    // 25. REACTION: REFLECT
    this.register('reflect', (engine, ctx, fx) => {
      const { source } = ctx;
      const amt = fx.amount || 1;
      const attacker = ctx.incomingAttack?.enemy;
      if (attacker) {
        const th = engine.state.currentThreat;
        const colpito = (th.mooks || []).find(m => m === attacker || m.id === attacker.id) || engine.sgherroBersaglio();
        if (colpito && !colpito.isDead) {
          colpito.hp -= amt;
          if (colpito.hp <= 0) { colpito.isDead = true; engine.addLog('hero', `[ELIMINATO] ${colpito.name} è stato sconfitto!`); }
          engine.syncThreatHp();
        } else th.hp = Math.max(0, th.hp - amt);
        engine.addLog('hero', `[RIFLESSO] ${source.name} riflette ${amt} danni contro ${attacker.name}!`);
        engine.checkThreatDefeated();
      }
      return { ok: true, reflected: amt };
    });

    // 26. REACTION: REDIRECT
    this.register('redirect', (engine, ctx, fx) => {
      const { source } = ctx;
      let targetAlly = ctx.targetEntity?.entity;
      if (!targetAlly) {
        targetAlly = engine.state.players.find(p => p.id !== source.id && !p.isDead);
      }
      if (targetAlly && ctx.incomingAttack) {
        ctx.incomingAttack.target = targetAlly;
        engine.addLog('threat', `[VILLAIN TRADIMENTO] ${source.name} dirotta l'attacco su ${targetAlly.name}!`);
      }
      return { ok: true };
    });

    // 26b. TORRETTA: 1 danno a inizio dei prossimi N round (engine.startRound)
    this.register('torretta', (engine, ctx, fx) => {
      const { source } = ctx;
      source.torretta = (source.torretta || 0) + (fx.amount || 2);
      engine.addLog('hero', `${source.name} piazza una torretta: 1 danno a inizio dei prossimi ${fx.amount || 2} round`);
      return { ok: true };
    });

    // 27. SPLIT AREA ATTACK
    this.register('splitAreaAttack', (engine, ctx, fx) => {
      const { source } = ctx;
      engine.addLog('hero', `[VOLTAFACCIA] ${source.name} assorbe il danno ad area proteggendo la squadra`);
      return { ok: true };
    });
  }
}

window.EffectRegistry = new EffectRegistryClass();

// ========================================================
// CENTRALIZED CARD LAYOUT REGISTRY (Point 8)
// ========================================================
window.CARD_LAYOUT_CONFIG = {
  green: {
    type: 'green',
    name: 'Abilità Tech / Magia',
    frame: 'assets/layouts/layout_green.webp',
    icon: 'assets/icons/inteligenza.png',
    color: '#50b06b'
  },
  gold: {
    type: 'gold',
    name: 'Azioni di Attacco e Difesa',
    frame: 'assets/layouts/layout_gold.webp',
    icon: 'assets/icons/potenza.png',
    color: '#c8a24b'
  },
  blue: {
    type: 'blue',
    name: 'Deus Ex Machina',
    frame: 'assets/layouts/layout_blue.webp',
    icon: 'assets/icons/latout_deus ex machina.webp',
    color: '#4fb3c2'
  },
  purple: {
    type: 'purple',
    name: 'Carte Oscure',
    frame: 'assets/layouts/layout_purple.webp',
    icon: 'assets/icons/oscura.webp',
    color: '#9b59b6'
  },
  red: {
    type: 'red',
    name: 'Minacce',
    frame: 'assets/layouts/layout_red.webp',
    icon: 'assets/icons/minaccia.webp',
    color: '#b83a4f'
  },
  silver: {
    type: 'silver',
    name: 'Carte Personaggio',
    frame: 'assets/layouts/layout_silver.webp',
    icon: 'assets/icons/vigore.png',
    color: '#e0e6ed'
  },

  getLayout(card, isHero = false, isThreat = false) {
    if (!card) return this.gold;

    // 1. Minacce (Rosso)
    if (isThreat || card.vu !== undefined || card.primario || card.layout_type === 'red') {
      return this.red;
    }

    // 2. Carte Personaggio (Argento) - Eroi e Carte di Creazione (Origine, Archetipo, Costume, PB)
    if (isHero || card.isHero || card.role === 'origine' || card.role === 'archetipo' ||
        card.role === 'costume' || card.role === 'pb' || card.role === 'personaggio' ||
        card.layout_type === 'silver') {
      return this.silver;
    }

    // Il cerchio in basso a destra mostra il simbolo della statistica del costo (Potenza, Agilità, Vigore, Intelligenza),
    // anche sulle carte Oscure e Deus Ex Machina: il loro tipo lo dice già il colore della cornice
    const catIcon = { 'Potenza': 'assets/icons/potenza.png', 'Agilità': 'assets/icons/agilita.png', 'Vigore': 'assets/icons/vigore.png', 'Intelligenza': 'assets/icons/inteligenza.png' }[card.cat];
    const withCat = (l) => (catIcon ? { ...l, icon: catIcon } : l);

    // 3. Carte Oscure (Viola)
    if (card.osc || card.cat === 'Oscuro' || card.layout_type === 'purple') {
      return withCat(this.purple);
    }

    // 4. Deus Ex Machina (Blu)
    if (card.deus || card.tipo === 'deus' || card.nome?.includes('Defibrillazione') ||
        card.tag?.includes('Deus Ex') || card.layout_type === 'blue') {
      return withCat(this.blue);
    }

    // 5. Abilità Tech / Magia (Verde)
    if (card.cat === 'Intelligenza' || card.tipo === 'abilita' ||
        card.tag?.includes('Tech') || card.tag?.includes('Magia') ||
        card.tag?.includes('Abilità') || card.layout_type === 'green') {
      return withCat(this.green);
    }

    // 6. Azioni di Attacco e Difesa (Oro)
    let icon = this.gold.icon;
    if (card.cat === 'Agilità') icon = 'assets/icons/agilita.png';
    else if (card.cat === 'Vigore') icon = 'assets/icons/vigore.png';
    return {
      ...this.gold,
      icon: icon
    };
  }
};
