// Tutorial: al primo accesso parte subito la prima missione della Storia, con un consigliere
// che spiega il gioco passo per passo mentre si gioca. Finita la missione si sceglie il mazzo starter.
(function () {
  const P = () => window.Progression;
  const E = () => window.GameEngine;

  const PASSI = {
    // Missione 1 (regole livello 1): solo Vita, carte, Potere Base, difesa
    benvenuto: { testo: 'Benvenuto, Portatore! Questa è la Minaccia da sconfiggere: porta a 0 la sua Vita colpendo i suoi nemici.', dove: '#threatCentralCard' },
    mano: { testo: 'Queste sono le tue carte. Ogni carta costa slot della sua Categoria: i numeri colorati sopra la mano sono gli slot che hai in questo turno.', dove: '#playerHandCarousel' },
    gioca: { testo: 'Tocca una carta e scegli "Gioca Effetto" per usarla: per esempio infliggi danni a un nemico.', dove: '#playerHandCarousel' },
    potere: { testo: 'Questo è il tuo Potere Base: è gratis, una volta per turno. Non dimenticarlo!', dove: '#btnPbDock' },
    fine: { testo: 'Quando hai finito tocca Fine Turno. Gioca sempre almeno una carta per round: il tempo della Minaccia scorre.', dove: '.btn-endturn' },
    difesa: { testo: 'Un nemico ti attacca! Puoi scartare carte per parare il colpo: il loro Valore assorbe i danni.', dove: '#modalDefenseWindow' },
    nemici: { testo: 'Le etichette sopra i nemici ti dicono chi attaccheranno e con quanta Forza. Usale per decidere se difenderti o attaccare.', dove: '#mooksContainer' },
    atto: { testo: 'Atto superato! Ora arriva una Minaccia più forte. Continua così.', dove: '#threatCentralCard' },
    fineTutorial: { testo: 'Tutorial completato! Continua la Storia per scoprire cosa succede ad Ataca, oppure gioca con gli amici dalla Home.', dove: null },
    // Missione 2 (livello 2): binari e Pesca
    binari: { testo: 'Nuova regola: i binari! Come nell\'Arena, non serve stendere tutti: oltre a togliere Vita, puoi battere la Minaccia riempiendo uno dei suoi due binari, d\'ingegno o di forza.', dove: '#lblPrimario' },
    sacrificio: { testo: 'Tocca una carta e scegli Sacrificio Tattico: la scarti senza spendere slot e il binario avanza. Vale solo la Categoria del binario, al massimo 2 volte per round.', dove: '#lblPrimario' },
    pesca: { testo: 'Con + e − scegli quante carte pescare al prossimo round. Più carte = più scelte, ma il mazzo finisce prima.', dove: '#drawChoiceLabel' },
    // Missione 3 (tutte le regole): Trauma e Villain
    trauma: { testo: 'Da qui conta il Trauma: è il Velo che ti entra nella mente. Lo prendi se in un round non fai nessuna mossa, da alcuni nemici e se il mazzo finisce (molto!).', dove: '#playerDockTrauma' },
    villain: { testo: 'A 5 Trauma l\'eroe diventa Villain e gioca contro la squadra. Tienilo basso, e tieni d\'occhio quello dei compagni!', dove: '#playerDockTrauma' }
  };

  const Tutorial = {
    attivo: false,
    visti: {},
    coda: [],

    serve() {
      const d = P() && P().data;
      // primo accesso (niente starter), oppure starter appena scelto e tutorial non ancora finito
      return !!d && !d.tutorialFatto && (!(window.Collezione && window.Collezione.haStarter()) || !!d.starterPrimaDelTutorial);
    },

    avvia() {
      if (this.attivo || !window.Storia) return false;
      // prima si sceglie la lingua, così il tutorial si legge subito nella propria lingua
      const L = window.I18N;
      if (L && !L.scelta && !navigator.webdriver && document.getElementById('sceltaLingua')) {
        if (!this._attesaLingua) this._attesaLingua = setInterval(() => {
          if (!L.scelta) return;
          clearInterval(this._attesaLingua); this._attesaLingua = null;
          if (document.getElementById('sceltaLingua')) setTimeout(() => this.avvia(), 300); else this.avvia();
        }, 200);
        return true;
      }
      // La Storia ha come protagonista l'eroe dello starter: prima si sceglie lo starter, poi parte la missione
      const C = window.Collezione;
      if (C && !C.haStarter()) {
        this._attesaStarter = true;
        C.renderStarter();
        window.UI.showScreen('scr-starter');
        return true;
      }
      this._attesaStarter = false;
      this.attivo = true;
      this.inPartita = true;
      this.visti = {};
      this.coda = [];
      this.aggancia();
      window.Storia.gioca('c1m1');
      return true;
    },

    aggancia() {
      if (this._agganciato) return;
      this._agganciato = true;
      const on = (ev, fn) => E().on(ev, (nome, d) => { if (this.attivo) { try { fn(d); } catch (e) { console.error('Tutorial', e); } } });
      const mioTurno = () => { const st = E().state, a = st && st.players[st.turnIndex]; return a && a.isLocal && st.phase === 'action'; };
      on('turn_changed', () => { if (mioTurno() && this.visti.gioca) this.mostra('nemici'); });
      on('card_played', d => {
        if (!d.player || !d.player.isLocal) return;
        this.mostra('potere'); this.mostra('fine');
      });
      on('defense_window_opened', () => this.mostra('difesa'));
      on('act_advanced', () => setTimeout(() => this.mostra('atto'), 2500));
      E().on('game_over', () => { if (this.inPartita) this.conclude(); });
    },

    // Chiamato dalla Storia appena si vede il tavolo di gioco (prima si poteva già finire il turno)
    inizioPartita(state) {
      if (!state) return;
      if (this.attivo && this.inPartita) {
        this.mostra('benvenuto'); this.mostra('mano'); this.mostra('gioca');
        return;
      }
      // Regole a strati: la prima volta che una regola entra in gioco arriva il suo consiglio
      if (!state.story || state.players.some(p => p.isLocal && p.state === 'villain')) return;
      const d = P() && P().data;
      if (!d) return;
      const viste = d.consigliRegole || (d.consigliRegole = {});
      const L = state.livelloRegole || 3;
      const gruppi = [];
      if (L >= 2 && !viste.l2) { viste.l2 = true; gruppi.push('binari', 'sacrificio', 'pesca'); }
      if (L >= 3 && !viste.l3) { viste.l3 = true; gruppi.push('trauma', 'villain'); }
      if (!gruppi.length) return;
      P().save();
      gruppi.forEach(id => { this.visti[id] = false; this.mostra(id); });
    },

    // Mette un consiglio in coda: ognuno si vede una sola volta
    mostra(id) {
      if (this.visti[id] || !PASSI[id]) return;
      this.visti[id] = true;
      this.coda.push(id);
      if (!this._aperto) this.prossimo();
    },

    prossimo() {
      this.chiudiBolla();
      const id = this.coda.shift();
      if (!id) { this._aperto = false; return; }
      this._aperto = true;
      const p = PASSI[id];
      const T = window.I18N ? window.I18N.t : (x => x);
      const el = document.createElement('div');
      el.className = 'tutorial-bolla';
      el.innerHTML = `<div class="tutorial-chi">${T('Consiglio dell\'eroe')}</div><div class="tutorial-testo"></div>
        <div class="tutorial-azioni"><button class="btn btn-subtle tutorial-salta">${T('Salta tutorial')}</button><button class="btn btn-primary tutorial-ok">${T('Ho capito')}</button></div>`;
      el.querySelector('.tutorial-testo').textContent = T(p.testo);
      el.querySelector('.tutorial-ok').onclick = (e) => { e.stopPropagation(); this.prossimo(); };
      el.querySelector('.tutorial-salta').onclick = (e) => { e.stopPropagation(); this.coda = []; this.attivo = false; this.segnaFatto(); this.prossimo(); };
      document.body.appendChild(el);
      this._bolla = el;
      const t = p.dove && document.querySelector(p.dove);
      if (t && t.getBoundingClientRect().width) {
        t.classList.add('tutorial-evidenzia');
        this._evid = t;
        // la bolla si mette dalla parte opposta all'elemento evidenziato
        const r = t.getBoundingClientRect();
        el.classList.toggle('in-basso', r.top + r.height / 2 < window.innerHeight / 2);
      } else el.classList.add('in-basso');
      if (id === 'fineTutorial') el.querySelector('.tutorial-salta').style.display = 'none';
    },

    chiudiBolla() {
      if (this._bolla) { this._bolla.remove(); this._bolla = null; }
      if (this._evid) { this._evid.classList.remove('tutorial-evidenzia'); this._evid = null; }
    },

    segnaFatto() {
      const d = P() && P().data;
      if (d && !d.tutorialFatto) { d.tutorialFatto = true; P().save(); }
    },

    conclude() {
      this.segnaFatto();
      this.coda = [];
      this.chiudiBolla();
      this._aperto = false;
      this.attivo = false;
      this.inPartita = false;
      // dopo la schermata di fine missione la Home porta alla scelta dello starter
      this._dopo = true;
    },

    // Chiamato quando si torna alla Home dopo il tutorial
    dopoPartita() {
      if (!this._dopo) return;
      this._dopo = false;
      this.visti = {};
      this.attivo = true;
      this.mostra('fineTutorial');
      this.attivo = false;
    }
  };

  window.Tutorial = Tutorial;
})();
