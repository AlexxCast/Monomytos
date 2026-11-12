// Effetti delle carte rivisti il 2026-11-12 (Alessio: "gli effetti delle carte non funzionano: sistemali o cambiali").
// Ogni carta qui sotto ora fa quello che c'è scritto. Dove il testo chiedeva cose che il gioco digitale non ha
// (Gadget, posizioni adiacenti, attacchi ad area dei nemici...) il testo è stato cambiato con un effetto simile che funziona.
// Va caricato dopo morale.js ed effects.js. I testi nuovi hanno la traduzione in js/lingua_en.js.
(function () {
  const R = window.EffectRegistry;
  const E = () => window.GameEngine;
  const altriVivi = (eng, p) => eng.state.players.filter(x => x !== p && !x.isDead);
  const aCaso = arr => arr[Math.floor(Math.random() * arr.length)];
  const menoVita = arr => [...arr].sort((a, b) => a.vita - b.vita)[0];

  // ---------- Nuovi effetti ----------
  // Guarda il mazzo: prime N carte, poi 1 si può scartare o mettere in mezzo al mazzo
  R.register('guardaMazzo', (eng, ctx, fx) => { eng.guardaMazzo(ctx.source, fx.amount || 3); return { ok: true }; });

  // Rimuove Sfiancato da te (target self) o da te/un alleato (target ally)
  R.register('cleanse', (eng, ctx, fx) => {
    const p = ctx.source;
    const chi = fx.target === 'self' ? [p] : [p, ...altriVivi(eng, p)];
    const q = chi.find(x => x.weakened);
    if (q) { q.weakened = false; q.weakenedRound = null; eng.addLog('hero', `${p.name} rimuove Sfiancato da ${q.name}`); }
    else eng.addLog('hero', `Nessuno è Sfiancato`);
    return { ok: true };
  });

  R.register('weakenAlleato', (eng, ctx) => {
    const q = aCaso(altriVivi(eng, ctx.source));
    if (q) { q.weakened = true; q.weakenedRound = eng.state.round; eng.addLog('threat', `[SFIANCATO] ${ctx.source.name} sfianca ${q.name}: al prossimo round pesca 1 sola carta`); }
    return { ok: true };
  });

  R.register('noParata', (eng, ctx) => { ctx.source.noParataRound = eng.state.round; eng.addLog('threat', `${ctx.source.name} non potrà parare in questo round`); return { ok: true }; });
  R.register('noPB', (eng, ctx) => { ctx.source.noPbRound = eng.state.round + 1; eng.addLog('threat', `${ctx.source.name} non potrà usare il Potere Base al prossimo turno`); return { ok: true }; });

  // Gli slot tornano pieni (Lacerazione Temporale)
  R.register('ricaricaSlot', (eng, ctx) => {
    const p = ctx.source;
    p.slots = { Potenza: p.str, Agilità: p.spd, Agilita: p.spd, Intelligenza: p.tech, Vigore: p.end, potenza: p.str, agilita: p.spd, intelligenza: p.tech, vigore: p.end };
    eng.addLog('hero', `${p.name} ha di nuovo tutti gli slot pieni`);
    return { ok: true };
  });

  // Rescissione: niente Potere Base per la partita, +1 Potenza per sempre
  R.register('rescissione', (eng, ctx) => {
    const p = ctx.source;
    p.noPbSempre = true;
    p.str = Math.min(6, (p.str || 1) + 1);
    ['Potenza', 'potenza'].forEach(k => { p.slots[k] = (p.slots[k] || 0) + 1; });
    eng.addLog('threat', `[RESCISSIONE] ${p.name} rinuncia al Potere Base per sempre: +1 slot Potenza permanente`);
    return { ok: true };
  });

  // Consuma tutti gli slot rimasti della categoria della carta
  R.register('consumaSlot', (eng, ctx) => {
    const p = ctx.source, n = eng.normalizeCategory(ctx.card && ctx.card.cat);
    Object.keys(p.slots || {}).forEach(k => { if (eng.normalizeCategory(k) === n) p.slots[k] = 0; });
    eng.addLog('threat', `${p.name} consuma tutti gli slot ${ctx.card ? ctx.card.cat : ''}`);
    return { ok: true };
  });

  // Il prossimo attacco nemico va sull'alleato con meno Vita
  R.register('tauntAlleato', (eng, ctx) => {
    const q = menoVita(altriVivi(eng, ctx.source));
    if (q) { eng.state.currentThreat.forcedTarget = q.id; eng.addLog('threat', `[VILLAIN] Il prossimo attacco nemico andrà su ${q.name}`); }
    return { ok: true };
  });

  // Muro Vivente: tutti gli attacchi di questo round su di te
  R.register('tauntRound', (eng, ctx) => {
    eng.state.currentThreat.bersaglioRound = { id: ctx.source.id, round: eng.state.round };
    eng.addLog('hero', `[MURO VIVENTE] In questo round tutti gli attacchi nemici colpiranno ${ctx.source.name}`);
    return { ok: true };
  });

  R.register('schivaProssimo', (eng, ctx) => { ctx.source.schivaProssimo = true; eng.addLog('hero', `${ctx.source.name} ignorerà il prossimo attacco contro di sé`); return { ok: true }; });
  R.register('annullaProssimo', (eng, ctx) => { eng.state.currentThreat.annullaProssimo = true; eng.addLog('hero', `Il prossimo attacco nemico andrà a vuoto`); return { ok: true }; });
  R.register('raddoppiaAttacco', (eng, ctx) => { ctx.source.raddoppiaAttacco = true; eng.addLog('hero', `${ctx.source.name}: il prossimo attacco farà il doppio dei danni`); return { ok: true }; });
  R.register('bloccaSacrifici', (eng) => { eng.state.bloccoSacrificiRound = eng.state.round; eng.addLog('threat', `Questo turno nessuno può fare Sacrifici Tattici`); return { ok: true }; });
  R.register('sacrificiDoppi', (eng, ctx) => { ctx.source.sacrDoppiRound = eng.state.round; eng.addLog('hero', `${ctx.source.name}: questo turno i Sacrifici Tattici valgono il doppio`); return { ok: true }; });
  R.register('tradimento', (eng, ctx) => { ctx.source.tradimentoRound = eng.state.round; eng.addLog('threat', `[TRADIMENTO] In questo round un alleato subirà i colpi diretti a ${ctx.source.name}`); return { ok: true }; });
  R.register('intoccabile', (eng, ctx) => { ctx.source.intoccabileRound = eng.state.round; eng.addLog('threat', `In questo round i nemici attaccheranno solo gli alleati di ${ctx.source.name}`); return { ok: true }; });
  R.register('bonusDannoAtto', (eng, ctx) => { ctx.source.bonusDannoAtto = eng.state.actIndex; eng.addLog('hero', `${ctx.source.name}: +1 danno a ogni attacco fino alla fine dell'Atto`); return { ok: true }; });

  // Danno diretto agli alleati (senza difesa)
  const feriscAlleato = (eng, q, n) => {
    q.vita = Math.max(0, q.vita - n);
    if (n > 0) q.ultimoDanno = eng.state.round;
    eng.addLog('threat', `${q.name} subisce ${n} danni (Vita: ${q.vita}/${q.vitaMax})`);
    eng.checkPlayerDeath(q);
  };
  R.register('dannoAlleati', (eng, ctx, fx) => { altriVivi(eng, ctx.source).forEach(q => feriscAlleato(eng, q, fx.amount || 1)); return { ok: true }; });
  R.register('dannoAlleato', (eng, ctx, fx) => { feriscAlleato(eng, aCaso(altriVivi(eng, ctx.source)) || ctx.source, fx.amount || 1); return { ok: true }; });

  R.register('scartaAlleato', (eng, ctx) => {
    const q = aCaso(altriVivi(eng, ctx.source).filter(x => x.hand.length));
    if (q) { const c = q.hand.splice(Math.floor(Math.random() * q.hand.length), 1)[0]; q.discard.push(c); eng.addLog('threat', `${q.name} scarta [${c.nome}]`); }
    return { ok: true };
  });

  // Un alleato (quello con meno carte) pesca 1 carta; senza alleati peschi tu
  R.register('pescaAlleato', (eng, ctx, fx) => {
    const q = [...altriVivi(eng, ctx.source)].sort((a, b) => a.hand.length - b.hand.length)[0] || ctx.source;
    R.execute('draw', eng, { source: q }, { amount: fx.amount || 1 });
    return { ok: true };
  });

  R.register('marchio', (eng, ctx, fx) => {
    const t = ctx.targetEntity && ctx.targetEntity.type === 'mook' && !ctx.targetEntity.entity.isDead ? ctx.targetEntity.entity : eng.sgherroBersaglio();
    if (t) { t.marchio = (t.marchio || 0) + (fx.amount || 1); eng.addLog('hero', `[MARCHIO] ${t.name} subirà +${fx.amount || 1} danno dal prossimo colpo`); }
    return { ok: true };
  });

  R.register('trasferisciTrauma', (eng, ctx, fx) => {
    const p = ctx.source, q = aCaso(altriVivi(eng, p));
    const n = Math.min(fx.amount || 2, p.trm || 0);
    if (q && n > 0) {
      p.trm -= n; q.trm = Math.min(5, (q.trm || 0) + n);
      eng.addLog('threat', `[COMUNIONE] ${p.name} passa ${n} TRM a ${q.name}`);
      eng.checkBreakingPoint(q);
    }
    return { ok: true };
  });

  // Resistenza per il Travolgere all'alleato con meno Vita (anche negativa)
  R.register('resistenzaAlleato', (eng, ctx, fx) => {
    const q = menoVita(altriVivi(eng, ctx.source));
    if (q) { q.tempResistance = (q.tempResistance || 0) + (fx.amount || 1); eng.addLog(fx.amount < 0 ? 'threat' : 'hero', `${q.name} ${fx.amount < 0 ? 'perde' : 'ottiene'} ${Math.abs(fx.amount || 1)} Resistenza per questo round`); }
    return { ok: true };
  });

  // Eco dell'Abisso: copia l'ultima Carta Oscura giocata
  R.register('eco', (eng, ctx) => {
    const u = eng.state.ultimaOscura;
    if (!u) { eng.addLog('sys', `Nessuna Carta Oscura da copiare`); return { ok: true }; }
    eng.addLog('threat', `[ECO] ${ctx.source.name} copia [${u.nome}]`);
    u.fx_list.forEach(f => {
      if (f.type === 'eco' || f.timing === 'reaction' || f.timing === 'critical') return;
      if (f.condition === 'hero' && ctx.source.state !== 'hero') return;
      if (f.condition === 'villain' && ctx.source.state !== 'villain') return;
      R.execute(f.type, eng, ctx, f);
    });
    return { ok: true };
  });

  // ---------- Reazioni che spostano il colpo ----------
  // Il colpo diretto a un alleato lo prendi tu
  R.register('intercetta', (eng, ctx) => {
    const ia = ctx.incomingAttack;
    if (ia && ia.attaccato && ia.attaccato !== ctx.source) ia.target = ctx.source;
    return { ok: true };
  });
  // Dividi a metà il colpo diretto a un alleato
  R.register('dividi', (eng, ctx) => {
    const ia = ctx.incomingAttack;
    if (ia && ia.attaccato && ia.attaccato !== ctx.source) ia.dividiCon = ctx.source;
    return { ok: true };
  });
  // Villain: il colpo va a un alleato (a caso, mai a chi era già il bersaglio)
  R.register('redirect', (eng, ctx) => {
    const ia = ctx.incomingAttack;
    if (!ia) return { ok: true };
    const q = aCaso(altriVivi(eng, ctx.source).filter(x => x !== ia.attaccato));
    if (q) ia.target = q;
    return { ok: true };
  });
  // Il colpo si divide tra tutti gli alleati al posto tuo
  R.register('redirectTutti', (eng, ctx) => {
    const ia = ctx.incomingAttack;
    const tra = altriVivi(eng, ctx.source);
    if (ia && tra.length && ia.attaccato === ctx.source) ia.dividiTra = tra;
    return { ok: true };
  });

  // Secondo colpo sul nemico più ferito (Assalto Fluido): il bersaglio si ricalcola
  const dannoBase = R.handlers.get('damage');
  R.register('damage', (eng, ctx, fx) => {
    if (fx.nuovoBersaglio) ctx = Object.assign({}, ctx, { targetId: 'threat_boss', targetEntity: eng.resolveTarget('threat_boss') });
    return dannoBase(eng, ctx, fx);
  });

  // ---------- Carte ----------
  const D = (n, x) => Object.assign({ type: 'damage', amount: n, target: 'choose', timing: 'play', splash: 0 }, x || {});
  const F = (type, x) => Object.assign({ type, target: 'self', timing: 'play' }, x || {});
  const H = f => Object.assign({ condition: 'hero' }, f);
  const V = f => Object.assign({ condition: 'villain' }, f);
  const RE = f => Object.assign({}, f, { timing: 'reaction' });
  const vp = n => V(F('heroPoints', { vp: n }));
  const pe = (n, se) => F('heroPoints', se ? { pe: n, se } : { pe: n });
  const trm = n => F('trauma', { amount: n });
  const guarda = 'Pesca 1 carta, poi guarda le prime 3 carte del tuo mazzo: puoi scartarne 1 o metterla in mezzo al mazzo.';
  const ripara = '[Eroe] Reazione: ti metti a scudo di un alleato e riduci di 2 il danno. [Villain] Reazione: un alleato subisce l\'attacco al posto tuo. Genera 1 VP (se in Stato Villain).';
  // "Azione Morale": [Eroe] -1 TRM e cura/pesca; [Villain] VP
  const morale = (n, extra) => [H(trm(-1)), H(extra), vp(n)];

  const CARTE = {
    ironaegis_1: { t: 'Infliggi 2 danni. [Eroe] +1 HP se un alleato ha subito danni nell\'ultimo round. [Villain] +1 VP se un alleato ha subito danni nell\'ultimo round.',
      fx: [D(2), H(pe(1, 'alleatoColpito')), V(F('heroPoints', { vp: 1, se: 'alleatoColpito' }))] },
    ironaegis_2: { t: '[Eroe] Reazione: riduci di 2 il danno di un attacco su di te o su un alleato. [Villain] Reazione: se sei attaccato, afferri un alleato come scudo e il colpo va a lui.',
      fx: [RE(H(F('parry', { amount: 2 }))), RE(V(F('redirect')))] },
    ironaegis_6: { t: guarda, fx: [F('draw', { amount: 1 }), F('guardaMazzo', { amount: 3 })] },
    ironaegis_7: { t: 'Infliggi 1 danno. [Eroe] Rimuovi Sfiancato da te o da un alleato. [Villain] Un alleato a caso subisce Sfiancato.',
      fx: [D(1), H(F('cleanse', { target: 'ally' })), V(F('weakenAlleato'))] },
    ironaegis_11: { fx: morale(2, F('heal', { amount: 2 })) },
    ironaegis_15: { fx: [D(5), trm(1), F('selfDamage', { amount: 2 }), F('noParata')] },
    ironaegis_16: { t: 'Reazione: quando un alleato viene attaccato, subisci tu l\'intero colpo al posto suo. Genera 1 VP (se in Stato Villain). Malus: +2 TRM.',
      fx: [RE(F('intercetta')), RE(trm(2)), RE(vp(1))] },
    ironaegis_17: { fx: [D(1, { perResistenza: 2 }), F('consumaSlot'), trm(2), vp(1)] },

    neonphantom_1: { fx: [D(2), H(pe(1, 'primo')), V(F('heroPoints', { vp: 1, se: 'nonPrimo' }))] },
    neonphantom_4: { t: 'Spendi 1 Tech. Cura 1 HP e rimuovi Sfiancato da te stesso.', fx: [F('heal', { amount: 1 }), F('cleanse')] },
    neonphantom_5: { t: 'Al prossimo round puoi pescare 1 carta in più.' },
    neonphantom_9: { t: 'Infliggi 1 danno, poi un secondo colpo da 1 danno al nemico più ferito. DISCIPLINA D\'ASSALTO (1): +1 danno se hai ancora 1+ carta in mano.',
      fx: [D(1), D(1, { nuovoBersaglio: true })] },
    neonphantom_11: { fx: morale(2, F('draw', { amount: 1 })) },
    neonphantom_14: { t: 'Pesca 2 carte e i tuoi slot tornano pieni. Malus: +2 TRM, Sfiancata al prossimo round.',
      fx: [F('draw', { amount: 2 }), F('ricaricaSlot'), F('weaken'), trm(2)] },
    neonphantom_15: { fx: [D(6), F('consumaSlot'), trm(1), F('noPB')] },
    neonphantom_16: { fx: [D(5, { ripetiSeMuore: true }), trm(2), vp(1)] },
    neonphantom_17: { fx: [F('rescissione'), trm(2), vp(1)] },

    guardianadiconfine_1: { fx: [D(2), F('stun', { target: 'choose', se: 'mano4' })] },
    guardianadiconfine_2: { t: 'Reazione: riduci di 2 il danno di un attacco su di te. RITENZIONE TATTICA (4): se hai <4 carte dopo, torna in mano.' },
    guardianadiconfine_3: { t: '[Eroe] Reazione: quando un alleato viene attaccato, dividi il danno a metà tra voi due. [Villain] Reazione: se sei bersagliata, il colpo va a un alleato; lui lo subisce per intero, tu nessuno.',
      fx: [RE(H(F('dividi'))), RE(V(F('redirect')))] },
    guardianadiconfine_6: { t: guarda, fx: [F('draw', { amount: 1 }), F('guardaMazzo', { amount: 3 })] },
    guardianadiconfine_8: { fx: [RE(H(F('parry', { amount: 2 }))), { type: 'revive', amount: 1, target: 'ally', timing: 'critical' }] },
    guardianadiconfine_9: { t: 'Infliggi 1 danno. [Eroe] Il prossimo attacco nemico bersaglia te invece di un alleato. [Villain] Il prossimo attacco nemico bersaglia l\'alleato con meno Vita.',
      fx: [D(1), H(F('taunt')), V(F('tauntAlleato'))] },
    guardianadiconfine_11: { fx: morale(2, F('heal', { amount: 2 })) },
    guardianadiconfine_14: { t: 'Spendi 2 Tech. In questo round tutti gli attacchi nemici colpiscono te e ottieni Scudo 3. Malus: +1 TRM, Sfiancata 1 round.',
      fx: [F('tauntRound'), F('shield', { amount: 3 }), F('weaken'), trm(1)] },
    guardianadiconfine_15: { fx: [D(5), F('resistance', { amount: 2 }), trm(1), F('selfDamage', { amount: 2 })] },
    guardianadiconfine_16: { t: 'Il prossimo attacco nemico contro di te va a vuoto (gli alleati non sono protetti). Genera 1 VP (se in Stato Villain). Malus: +2 TRM, Sfiancata 1 round.',
      fx: [F('schivaProssimo'), F('weaken'), trm(2), vp(1)] },
    guardianadiconfine_17: { t: 'Reazione: se sei attaccata, il colpo va a un alleato al posto tuo. Genera 1 VP (se in Stato Villain). Malus: +2 TRM permanente.',
      fx: [RE(F('redirect')), RE(trm(2)), RE(vp(1))] },

    lamaerrante_1: { t: 'Infliggi 2 danni. Se attacchi per primo nel round, +1 HP.', fx: [D(2), pe(1, 'primo')] },
    lamaerrante_3: { fx: [D(2, { bonus: { se: 'potere', amount: 1 } })] },
    lamaerrante_4: { t: 'Spendi 1 Tech. Cura 1 HP e rimuovi Sfiancato.', fx: [F('heal', { amount: 1 }), F('cleanse')] },
    lamaerrante_5: { fx: [D(1, { secondo: 1 })] },
    lamaerrante_9: { fx: [D(1), F('draw', { amount: 1, se: 'bersaglioMorto' })] },
    lamaerrante_11: { fx: morale(2, F('heal', { amount: 2 })) },
    lamaerrante_14: { fx: [D(6), trm(1), F('noParata')] },
    lamaerrante_15: { t: 'Consuma tutti gli slot Agilità. 4 danni + ripeti l\'attacco se il bersaglio è ancora vivo. Malus: +2 TRM.',
      fx: [D(4), F('consumaSlot'), D(4, { se: 'bersaglioVivo' }), trm(2)] },
    lamaerrante_17: { t: 'Raddoppia il danno del tuo prossimo attacco; questo turno nessuno può fare Sacrifici Tattici. Genera 1 VP (se in Stato Villain). Malus: +2 TRM.',
      fx: [F('raddoppiaAttacco'), F('bloccaSacrifici'), trm(2), vp(1)] },

    titanodacciaio_1: { fx: [D(3), trm(1), vp(1)] },
    titanodacciaio_2: { t: ripara, fx: [RE(H(F('parry', { amount: 2 }))), RE(V(F('redirect'))), RE(vp(1))] },
    titanodacciaio_11: { fx: morale(2, F('heal', { amount: 2 })) },
    titanodacciaio_15: { t: 'Reazione: se sei attaccato, il danno si divide tra tutti gli alleati al posto tuo. Genera 3 VP (se in Stato Villain). Malus: +1 TRM.',
      fx: [RE(F('redirectTutti')), RE(trm(1)), RE(vp(3))] },
    titanodacciaio_16: { t: '8 danni a ogni nemico; anche ogni alleato subisce 1 danno. Genera 2 VP (se in Stato Villain). Malus: +2 TRM.',
      fx: [D(8, { target: 'all_enemies' }), F('dannoAlleati', { amount: 1 }), trm(2), vp(2)] },
    titanodacciaio_17: { t: 'Per tutto questo turno i tuoi Sacrifici Tattici valgono il doppio. Genera 2 VP (se in Stato Villain). Malus: +2 TRM permanente.',
      fx: [F('sacrificiDoppi'), trm(2), vp(2)] },

    architettoombra_3: { fx: [D(2, { se: 'bersaglioNemico' }), { type: 'heal', amount: 2, target: 'choose_ally', timing: 'play', se: 'bersaglioGiocatore' }] },
    architettoombra_5: { t: 'Pesca 2 carte, poi guarda le prime 3 carte del tuo mazzo: puoi scartarne 1 o metterla in mezzo al mazzo.',
      fx: [F('draw', { amount: 2 }), F('guardaMazzo', { amount: 3 })] },
    architettoombra_11: { fx: morale(2, F('draw', { amount: 1 })) },
    architettoombra_15: { t: 'Spendi 2 Tech. Il prossimo attacco nemico va a vuoto, chiunque colpisca. Malus: +1 TRM, niente Potere Base al prossimo turno.',
      fx: [F('annullaProssimo'), trm(1), F('noPB')] },
    architettoombra_16: { t: '+2 danni al tuo prossimo attacco; un alleato a caso scarta 1 carta. Genera 1 VP (se in Stato Villain). Malus: +2 TRM.',
      fx: [F('boostNextAttack', { amount: 2 }), F('scartaAlleato'), trm(2), vp(1)] },
    architettoombra_17: { t: 'Fino alla fine dell\'Atto i tuoi attacchi infliggono +1 danno; un alleato a caso scarta 1 carta. Genera 1 VP (se in Stato Villain). Malus: +1 TRM.',
      fx: [F('bonusDannoAtto'), F('scartaAlleato'), trm(1), vp(1)] },

    sussurrodellabisso_1: { fx: [D(2), trm(1), vp(1)] },
    sussurrodellabisso_3: { fx: [D(2), F('heal', { amount: 1 }), vp(1)] },
    sussurrodellabisso_4: { t: '[Eroe] Un alleato pesca 1 carta. [Villain] Un alleato a caso scarta 1 carta. Genera 1 VP (se in Stato Villain).',
      fx: [H(F('pescaAlleato')), V(F('scartaAlleato')), vp(1)] },
    sussurrodellabisso_5: { fx: [F('pescaAlleato'), vp(1)] },
    sussurrodellabisso_7: { fx: [D(1), F('marchio', { amount: 1 })] },
    sussurrodellabisso_8: { fx: [RE(F('reflect', { amount: 1 })), RE(vp(1))] },
    sussurrodellabisso_10: { fx: morale(3, F('heal', { amount: 2 })) },
    sussurrodellabisso_14: { t: 'Consuma tutti gli slot Tech. 6 danni diretti. Genera 3 VP (se in Stato Villain). Malus: +2 TRM, Sfiancata al prossimo round.',
      fx: [D(6), F('consumaSlot'), F('weaken'), trm(2), vp(3)] },
    sussurrodellabisso_16: { t: 'Trasferisci 2 dei tuoi TRM su un alleato a caso. Genera 1 VP (se in Stato Villain). Malus: +1 TRM comunque per te.',
      fx: [F('trasferisciTrauma', { amount: 2 }), trm(1), vp(1)] },
    sussurrodellabisso_17: { fx: [F('eco', { target: 'choose' }), trm(2), vp(1)] },

    duellantespezzato_1: { t: 'Infliggi 3 danni e subisci 1 TRM. Genera 1 VP (se in Stato Villain).', fx: [D(3), trm(1), vp(1)] },
    duellantespezzato_2: { t: ripara, fx: [RE(H(F('parry', { amount: 2 }))), RE(V(F('redirect'))), RE(vp(1))] },
    duellantespezzato_3: { fx: [RE(F('reflect', { amount: 1 })), RE(vp(1))] },
    duellantespezzato_4: { t: '[Eroe] Rimuovi Sfiancato da un alleato e pesca 1 carta. [Villain] Un alleato a caso subisce Sfiancato. Genera 1 VP (se in Stato Villain).',
      fx: [H(F('cleanse', { target: 'ally' })), H(F('draw', { amount: 1 })), V(F('weakenAlleato')), vp(1)] },
    duellantespezzato_6: { t: '[Eroe] Il prossimo attacco nemico bersaglia te invece di un alleato. [Villain] Il prossimo attacco nemico bersaglia l\'alleato con meno Vita. Genera 1 VP (se in Stato Villain).',
      fx: [H(F('taunt')), V(F('tauntAlleato')), vp(1)] },
    duellantespezzato_7: { fx: [H(F('selfDamage', { amount: 1 })), V(F('dannoAlleato', { amount: 1 })), F('draw', { amount: 2 }), vp(1)] },
    duellantespezzato_9: { t: '[Eroe] Reazione: quando un alleato viene attaccato, dividi il danno a metà con lui. [Villain] Reazione: se sei attaccata, il colpo va a un alleato. Genera 1 VP (se in Stato Villain).',
      fx: [RE(H(F('dividi'))), RE(V(F('redirect'))), RE(vp(1))] },
    duellantespezzato_12: { t: '[Eroe] +1 Resistenza per il Travolgere questo turno, anche per l\'alleato con meno Vita. [Villain] +2 Resistenza per il Travolgere questo turno, ma l\'alleato con meno Vita perde 1 Resistenza.',
      fx: [H(F('resistance', { amount: 1 })), H(F('resistenzaAlleato', { amount: 1 })), V(F('resistance', { amount: 2 })), V(F('resistenzaAlleato', { amount: -1 }))] },
    duellantespezzato_14: { t: 'Consuma tutti gli slot Agilità. 6 danni diretti. Genera 2 VP (se in Stato Villain). Malus: +1 TRM, niente Potere Base al prossimo turno.',
      fx: [D(6), F('consumaSlot'), trm(1), F('noPB'), vp(2)] },
    duellantespezzato_15: { fx: [F('tradimento'), trm(2), vp(3)] },
    duellantespezzato_16: { t: 'Infliggi 3 danni, il doppio se il nemico è Stordito o Sfiancato. Genera 1 VP (se in Stato Villain). Malus: +2 TRM.',
      fx: [D(3, { bonus: { se: 'indebolito', amount: 3 } }), trm(2), vp(1)] },
    duellantespezzato_17: { t: 'Se hai la Vita piena, in questo round i nemici attaccano solo i tuoi alleati (se ce ne sono). Genera 2 VP (se in Stato Villain). Malus: +2 TRM permanente.',
      fx: [F('intoccabile', { se: 'vitaPiena' }), trm(2), vp(2)] }
  };

  function applica(data) {
    if (!data || data._effettiOk) return;
    data._effettiOk = true;
    Object.values(data.action_cards || {}).forEach(lista => (lista || []).forEach(c => {
      const k = CARTE[c.id];
      if (!k) return;
      if (k.fx) c.fx_list = k.fx.map(f => Object.assign({}, f));
      if (k.t) c.effetto = k.t;
    }));
  }

  window.EffettiCarte = { CARTE, applica };
  if (window.MONOMYTHOS_DATA) applica(window.MONOMYTHOS_DATA);
})();
