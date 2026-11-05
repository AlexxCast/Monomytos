// Effetti Pericolosi (sempre attivi mentre la Minaccia è in gioco) ed Effetti Cosmici
// (solo quando la Minaccia è l'Atto Finale) delle 14 Minacce — manuale §5 e §8.2.
// Il motore chiama EffettiMinaccia.mod(engine, gancio, valore, info) nei punti giusti;
// ogni regola modifica il valore o agisce sullo stato e lo restituisce.
(function () {
  const vivi = th => (th.mooks || []).filter(m => !m.isDead && m.hp > 0);
  const cura = (engine, filtro, n, perche) => {
    const th = engine.state.currentThreat;
    let tot = 0;
    vivi(th).filter(filtro).forEach(m => { const prima = m.hp; m.hp = Math.min(m.maxHp, m.hp + n); tot += m.hp - prima; });
    if (tot > 0) { engine.syncThreatHp(); engine.addLog('threat', `[${perche}] I nemici recuperano ${tot} Vita`); }
  };
  const danno = (engine, p, n, perche) => {
    if (!p || p.isDead) return;
    p.vita = Math.max(0, p.vita - n);
    engine.addLog('threat', `[${perche}] ${p.name} subisce ${n} danni diretti (Vita: ${p.vita}/${p.vitaMax})`);
    engine.checkPlayerDeath(p);
  };

  // gancio → funzione(engine, valore, info) per ogni Minaccia; P = Pericoloso, C = Cosmico
  const REGOLE = {
    'Blackout Ostile': {
      P: { valoreSacrificio: (e, v, i) => i.track === 'primario' ? Math.max(1, v - 1) : v },
      C: { fineRound: e => e.state.players.forEach(p => danno(e, p, 1, 'ZONA MORTA DIGITALE')) }
    },
    'Torneo Clandestino': {
      P: { maxSacrifici: () => 1 },
      C: { maxCarteParata: () => 2 }
    },
    'Incursione dei Droni Cinetici': {
      P: { forzaAttacco: (e, v) => { const th = e.state.currentThreat; const droni = (th.mooks || []).filter(m => !m.subsidiary); return droni.length && droni.every(m => !m.isDead) ? v + 1 : v; } },
      C: {
        fineRound: e => e.state.players.forEach(p => danno(e, p, 1, 'ZONA MORTA RADIOATTIVA')),
        resistenza: (e, v) => v - 1
      }
    },
    "L'Assedio dei Predoni delle Rovine": {
      P: { colpito: (e, v, i) => { const p = i.target; if (i.danni > 0 && p.hand.length) { const c = p.hand.splice(Math.floor(Math.random() * p.hand.length), 1)[0]; p.discard.push(c); e.addLog('threat', `[SACCHEGGIO] ${p.name} perde [${c.nome}]`); } return v; } },
      C: { saltaPescata: (e, v) => e.state.round % 2 === 0 ? true : v }
    },
    'Imboscata sulla Falesia': {
      P: { scudo: (e, v) => Math.floor(v / 2) },
      C: { scudoMax: () => 2 }
    },
    'Cultisti del Velo': {
      P: { cartaOscura: (e, v) => { cura(e, m => /cultist/i.test(m.name), 2, 'TENTAZIONE'); return v; } },
      C: { traumaOscuro: (e, v) => v + 1 }
    },
    'Rivolta della Fonderia': {
      P: { danniDetonazione: (e, v) => Math.max(v, 4) },
      C: { danniDetonazione: (e, v) => Math.max(v, 5) }
    },
    "L'Intelligenza Rogue": {
      P: { valoreSacrificio: (e, v, i) => /abilit|gadget/i.test(i.card.tag || '') ? Math.max(1, Math.floor(v / 2)) : v },
      C: { valoreSacrificio: (e, v) => Math.max(1, v - 1) }
    },
    'Il Campione Imbattuto': {
      P: { maxSacrifici: () => 1 },
      C: { dannoEroe: (e, v) => Math.max(1, v - 1) }
    },
    'Il Rivale Traditore': {
      P: { vpGenerati: (e, v, i) => { if (i.player.state === 'villain') danno(e, i.player, 2, 'SPECCHIO INFRANTO'); return v; } },
      C: { vpGenerati: (e, v, i) => { danno(e, i.player, 2, 'SPECCHIO ASSOLUTO'); return v; } }
    },
    'Il Colosso di Rovina': {
      P: { faseNemici: e => { const th = e.state.currentThreat; th._erosione = Math.min(2, (th._erosione || 0) + 1); e.addLog('threat', `[EROSIONE] Resistenza di tutti -${th._erosione}`); }, resistenza: (e, v) => v - (e.state.currentThreat._erosione || 0) },
      C: { faseNemici: e => { const th = e.state.currentThreat; th._erosione = Math.min(3, (th._erosione || 0) + 1); e.addLog('threat', `[ROVINA TOTALE] Resistenza di tutti -${th._erosione}`); }, resistenza: (e, v) => v - (e.state.currentThreat._erosione || 0) }
    },
    "Il Custode d'Acciaio": {
      P: { vpGenerati: (e, v) => { const th = e.state.currentThreat; th._forzaVp = (th._forzaVp || 0) + 1; e.addLog('threat', `[FONDERIA IN FUSIONE] Il Custode guadagna +1 Forza per questo round`); return v; }, forzaAttacco: (e, v) => v + (e.state.currentThreat._forzaVp || 0), fineRound: e => { e.state.currentThreat._forzaVp = 0; } },
      C: { faseNemici: e => { const th = e.state.currentThreat; if (e.state.round % 2 === 0) { th._forzaPerm = (th._forzaPerm || 0) + 1; e.addLog('threat', `[FUSIONE TOTALE] Il Custode guadagna +1 Forza permanente (${th._forzaPerm})`); } }, forzaAttacco: (e, v) => v + (e.state.currentThreat._forzaPerm || 0) }
    },
    "Il Mietitore dell'Astro Oscuro": {
      P: { forzaAttacco: (e, v, i) => i.indice === 0 ? v + 1 : v }
      // Cosmico (Parata 2:1) già gestito dal motore con parryRate
    },
    "L'Eco Senza Nome": {
      P: { pescaMultipla: (e, v) => { cura(e, () => true, 1, 'RISONANZA'); return v; } },
      C: { vpGenerati: (e, v) => { cura(e, () => true, 2, 'SIMBIOSI OSCURA'); return v; } }
    }
  };

  function attive(engine) {
    const st = engine.state, th = st && st.currentThreat;
    if (!th || th.isRogueHero) return [];
    const r = REGOLE[th.nome];
    if (!r) return [];
    const out = [];
    if (r.P) out.push(r.P);
    if (r.C && st.actIndex === 2) out.push(r.C);
    return out;
  }

  // Applica tutte le regole attive per un gancio. Per i ganci "valore" restituisce il valore modificato.
  function mod(engine, gancio, valore, info) {
    let v = valore;
    attive(engine).forEach(r => { if (typeof r[gancio] === 'function') { const x = r[gancio](engine, v, info || {}); if (x !== undefined) v = x; } });
    return v;
  }

  window.EffettiMinaccia = { mod, attive, REGOLE };
})();
