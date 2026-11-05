// Economia Morale (manuale §4, §4.3, §8.7): Punti Eroe (PE) e Villain Points (VP).
// Corregge le carte dove il testo diceva una cosa e il motore ne faceva un'altra:
// - "[Eroe] +N HP" sono Punti Eroe, non Vita;
// - le carte "Spesa Morale" con [Costo: 2 HP] / [Villain — Costo: 1 VP] spendono davvero i punti
//   e applicano solo la parte del proprio stato (prima toglievano 2 Vita e davano entrambe le parti).
(function () {
  const dmg = (n, extra) => Object.assign({ type: 'damage', amount: n, target: 'choose', timing: 'play', splash: 0, desc: `Infliggi ${n} danni` }, extra || {});
  const H = fx => Object.assign({ condition: 'hero', timing: 'play' }, fx);
  const V = fx => Object.assign({ condition: 'villain', timing: 'play' }, fx);
  const SPESA = {
    ironaegis_10: [H({ type: 'shield', amount: 4, target: 'self' }), V(dmg(4, { ignoreParry: true }))],
    neonphantom_6: [H({ type: 'draw', amount: 3, target: 'self' }), V(dmg(2)), V({ type: 'draw', amount: 1, target: 'self' })],
    guardianadiconfine_10: [H({ type: 'shield', amount: 5, target: 'self' }), V({ type: 'heal', amount: 4, target: 'self' })],
    lamaerrante_6: [H(dmg(4)), V(dmg(5))],
    titanodacciaio_10: [H(dmg(5)), V(dmg(6, { splash: 6 }))],
    architettoombra_10: [H({ type: 'draw', amount: 2, target: 'self' }), H({ type: 'shield', amount: 2, target: 'self' }), V({ type: 'weakenForza', amount: 2, target: 'choose' }), V(dmg(2))],
    sussurrodellabisso_6: [H(dmg(4, { ignoreParry: true })), V({ type: 'heal', amount: 3, target: 'self' }), V({ type: 'draw', amount: 1, target: 'self' })],
    duellantespezzato_10: [H(dmg(4)), V(dmg(5))]
  };

  function normalizza(data) {
    if (!data || data._moraleOk) return;
    data._moraleOk = true;
    Object.values(data.action_cards || {}).forEach(lista => (lista || []).forEach(c => {
      if (SPESA[c.id]) {
        c.fx_list = SPESA[c.id].map(f => Object.assign({}, f));
        c.costoMorale = { pe: 2, vp: 1 };
      }
      (c.fx_list || []).forEach((f, i) => {
        const m = f.type === 'heal' && f.condition === 'hero' && String(f.desc || '').match(/\+\s*(\d+)\s*HP/);
        if (m) c.fx_list[i] = { type: 'heroPoints', pe: parseInt(m[1]), condition: 'hero', target: 'self', timing: f.timing || 'play', desc: `[Eroe] +${m[1]} Punti Eroe` };
      });
    }));
  }

  // Quanto costa la carta a questo giocatore ({tipo:'pe'|'vp', n}) o null
  function costo(card, player) {
    const c = card && card.costoMorale;
    if (!c || !player) return null;
    return player.state === 'villain' ? { tipo: 'vp', n: c.vp } : { tipo: 'pe', n: c.pe };
  }
  function puoPagare(card, player) {
    const k = costo(card, player);
    return !k || (player[k.tipo] || 0) >= k.n;
  }
  function motivo(card, player) {
    const k = costo(card, player);
    if (!k || puoPagare(card, player)) return '';
    return k.tipo === 'pe' ? `Servono ${k.n} Punti Eroe (ne hai ${player.pe || 0})` : `Servono ${k.n} VP (ne hai ${player.vp || 0})`;
  }
  function paga(card, player) {
    const k = costo(card, player);
    if (!k) return null;
    player[k.tipo] = Math.max(0, (player[k.tipo] || 0) - k.n);
    return k;
  }

  window.Morale = { normalizza, costo, puoPagare, motivo, paga, SPESA };
  if (window.MONOMYTHOS_DATA) normalizza(window.MONOMYTHOS_DATA);
})();
