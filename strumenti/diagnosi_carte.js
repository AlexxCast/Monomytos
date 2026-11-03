// Diagnosi: gioca ogni effetto di ogni carta nel motore e controlla che cambi davvero qualcosa.
// Uso: node strumenti/diagnosi_carte.js <cartella gioco>
const vm = require('vm'), fs = require('fs');
const dir = process.argv[2] || '.';

function nuovoMotore() {
  const q = [];
  const ctx = { console: { log() {}, warn: (...a) => ctx._warn.push(a.join(' ')), error: (...a) => ctx._warn.push(a.join(' ')) }, _warn: [], Math, JSON, Object, Array, String, Set, Map, parseInt, Date, setTimeout: f => q.push(f) };
  ctx.window = ctx; ctx.MONOMYTHOS_BILANCIAMENTO = {}; vm.createContext(ctx);
  for (const f of ['cards_data.js', 'effects.js', 'bilanciamento.js', 'engine.js']) vm.runInContext(fs.readFileSync(dir + '/js/' + f, 'utf8'), ctx);
  return { ctx, E: ctx.GameEngine, q };
}

function snap(st) {
  return JSON.stringify({
    th: { hp: st.currentThreat.hp, pp: st.currentThreat.primarioProgress, bp: st.currentThreat.brutoProgress, timer: st.currentThreat.timer,
      mooks: st.currentThreat.mooks.map(m => [m.hp, m.isDead, m.stunned, m.weakened, m.taunted, m.weakenForza, JSON.stringify(m)]) , extra: Object.keys(st.currentThreat).sort().map(k => typeof st.currentThreat[k] === 'object' ? '' : k + '=' + st.currentThreat[k]) },
    pl: st.players.map(p => {
      const o = {};
      Object.keys(p).sort().forEach(k => {
        if (['hand', 'deck', 'discard', 'retainedCards'].includes(k)) o[k] = p[k].length;
        else if (['slots', 'actedThisRound'].includes(k)) return;
        else o[k] = p[k];
      });
      o.handIds = p.hand.map(c => c.id).join(',');
      return o;
    }),
    glob: Object.keys(st).filter(k => !['players', 'currentThreat', 'log', 'playedCardsThisRound', 'actThreats', 'threatPool'].includes(k)).map(k => k + '=' + JSON.stringify(st[k]))
  });
}

const base = nuovoMotore();
const D = base.ctx.MONOMYTHOS_DATA;
const carte = Object.values(D.action_cards).flat();
const report = { ok: 0, nulla: [], errori: [], reazioniOk: 0, reazioniNulla: [] };

function prepara(eroe, stato) {
  const m = nuovoMotore();
  const { E } = m;
  E.startMatch({ heroes: [{ name: eroe, isBot: false, isLocal: true }, { name: eroe === 'Neon Phantom' ? 'Iron Aegis' : 'Neon Phantom', isBot: true }] });
  const st = E.state;
  st.phase = 'action'; st.turnIndex = 0;
  const me = st.players[0];
  me.state = stato; me.isVillain = stato === 'villain';
  me.slots = { potenza: 20, agilita: 20, intelligenza: 20, vigore: 20 };
  st.players.forEach(p => { p.vita = Math.max(1, p.vitaMax - 10); p.trauma = 2; });
  me.pe = 3; me.vp = 3; me.fato = 3;
  me.hand = me.hand.slice(0, 2);
  st.currentThreat.forza = 4;
  return { ...m, st, me };
}

for (const card of carte) {
  const fxs = card.fx_list || [];
  fxs.forEach((fx, i) => {
    const stato = fx.condition === 'villain' ? 'villain' : 'hero';
    const reazione = fx.timing && fx.timing !== 'play';
    const nome = `${card.char} · ${card.nome} · effetto ${i + 1} (${fx.type}${fx.condition ? ', ' + fx.condition : ''}${reazione ? ', reazione' : ''})`;
    try {
      if (!reazione) {
        const { E, st, me, ctx } = prepara(card.char, stato);
        const c = { ...card, fx_list: [fx], effetto: '', uid: 'test_' + card.id };
        me.hand.push(c);
        const prima = snap(st);
        // Bersaglio: alleato per cure/scudi/rianimazioni, altrimenti il nemico
        const ally = st.players[1];
        if (fx.type === 'revive') { ally.isDead = true; ally.vita = 0; }
        const prima2 = snap(st);
        const bers = ['heal', 'shield', 'revive', 'resistance', 'damageReduction'].includes(fx.type) && fx.target === 'ally' ? ally.id : null;
        const r = E.playCardEffect(me.id, c.uid, bers);
        if (!r.ok) { report.errori.push(nome + ': non giocabile (' + r.msg + ')'); return; }
        // tolgo l'effetto "carta giocata" (mano -1, scarti +1) confrontando con una giocata vuota
        const { E: E2, st: st2, me: me2 } = prepara(card.char, stato);
        const vuota = { ...card, fx_list: [], fx: {}, effetto: '', uid: 'vuota' };
        st2.players.forEach((p, k) => { p.vita = st.players[k].vita; });
        const dopo = snap(st);
        if (dopo === (fx.type === 'revive' ? prima2 : prima)) report.nulla.push(nome);
        else {
          // differenza solo per la carta spostata?
          const a = JSON.parse(fx.type === 'revive' ? prima2 : prima), b = JSON.parse(dopo);
          const pa = a.pl[0], pb = b.pl[0];
          const soloMovimento = JSON.stringify(a.th) === JSON.stringify(b.th) && JSON.stringify(a.glob) === JSON.stringify(b.glob) &&
            a.pl.slice(1).every((p, k) => JSON.stringify(p) === JSON.stringify(b.pl[k + 1])) &&
            [...new Set([...Object.keys(pa), ...Object.keys(pb)])].every(k => ['hand', 'discard', 'handIds'].includes(k) || JSON.stringify(pa[k]) === JSON.stringify(pb[k]));
          if (soloMovimento) report.nulla.push(nome); else report.ok++;
        }
      } else {
        // Reazione: un nemico attacca, si risponde con la carta e si misura il danno subito rispetto a nessuna difesa
        const prova = (usa) => {
          const { E, st, me, q } = prepara(card.char, stato);
          const c = { ...card, uid: 'r_' + card.id };
          me.hand.push(c);
          me.vita = me.vitaMax;
          const enemy = st.currentThreat.mooks[0] || { name: 'Boss', hp: 5 };
          const target = fx.target === 'ally' ? st.players[1] : me;
          target.vita = target.vitaMax;
          E.on('defense_window_opened', () => q.push(() => E.respondToDefense(usa ? { type: 'reaction_card', cardUid: c.uid } : { type: 'none' })));
          E.resolveEnemyAttack(enemy, target, 6);
          let n = 0; while (q.length && n++ < 200) q.shift()();
          if (E.pendingDefense) E.respondToDefense(usa ? { type: 'reaction_card', cardUid: c.uid } : { type: 'none' });
          return snap(st);
        };
        const senza = prova(false), con = prova(true);
        if (senza === con) report.reazioniNulla.push(nome); else report.reazioniOk++;
      }
    } catch (e) {
      report.errori.push(nome + ': ERRORE ' + e.message);
    }
  });
}

const totFx = carte.reduce((n, c) => n + (c.fx_list || []).length, 0);
console.log(JSON.stringify({ carte: carte.length, effetti: totFx, giocateOk: report.ok, reazioniOk: report.reazioniOk,
  senzaEffetto: report.nulla, reazioniSenzaEffetto: report.reazioniNulla, errori: report.errori }, null, 1));
