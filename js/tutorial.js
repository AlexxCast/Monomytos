// Tutorial: al primo accesso parte subito la prima missione della Storia, con un consigliere
// che spiega il gioco passo per passo mentre si gioca. Finita la missione si sceglie il mazzo starter.
(function () {
  const P = () => window.Progression;
  const E = () => window.GameEngine;

  const PASSI = {
    benvenuto: { testo: 'Benvenuto, Portatore! Questa è la Minaccia da sconfiggere. Si batte in due modi: porta a 0 la sua Vita oppure riempi uno dei suoi binari (Primario o Bruto).', dove: '#threatCentralCard' },
    mano: { testo: 'Queste sono le tue carte. Ogni carta costa slot della sua Categoria: i numeri colorati sopra la mano sono gli slot che hai in questo turno.', dove: '#playerHandCarousel' },
    gioca: { testo: 'Tocca una carta e scegli "Gioca Effetto" per usarla: per esempio infliggi danni a un nemico.', dove: '#playerHandCarousel' },
    sacrificio: { testo: 'Ottimo! Una carta si può anche scartare come Sacrificio Tattico: non costa slot e fa avanzare un binario della Minaccia. Al massimo 2 volte per round.', dove: '#lblPrimario' },
    potere: { testo: 'Questo è il tuo Potere Base: è gratis, una volta per turno. Non dimenticarlo!', dove: '#btnPbDock' },
    pesca: { testo: 'Con + e − scegli quante carte pescare al prossimo round. Attento: se il mazzo finisce prendi molto Trauma.', dove: '#drawChoiceLabel' },
    fine: { testo: 'Quando hai finito tocca Fine Turno. Se in un round non fai nessuna mossa prendi 1 Trauma: muoviti sempre!', dove: '.btn-endturn' },
    difesa: { testo: 'Un nemico ti attacca! Puoi scartare carte per parare il colpo: il loro Valore assorbe i danni. Se il danno supera la tua Resistenza, la parte in più passa comunque (Travolgere).', dove: '#modalDefenseWindow' },
    nemici: { testo: 'Le etichette sopra i nemici ti dicono chi attaccheranno e con quanta Forza. Usale per decidere se difenderti o attaccare.', dove: '#mooksContainer' },
    trauma: { testo: 'Questo è il tuo Trauma. A 5 Trauma l\'eroe diventa Villain e gioca contro la squadra: tienilo basso!', dove: '#playerDockTrauma' },
    atto: { testo: 'Atto superato! Ogni missione ha 3 Minacce sempre più forti. Continua così.', dove: '#threatCentralCard' },
    fineTutorial: { testo: 'Tutorial completato! Adesso scegli il tuo mazzo starter: da lì comincia la tua collezione.', dove: null }
  };

  const Tutorial = {
    attivo: false,
    visti: {},
    coda: [],

    serve() {
      const d = P() && P().data;
      return !!d && !d.tutorialFatto && !(window.Collezione && window.Collezione.haStarter());
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
      on('match_started', () => setTimeout(() => {
        this.mostra('benvenuto'); this.mostra('mano'); this.mostra('gioca');
      }, 3200));
      on('turn_changed', () => { if (mioTurno() && this.visti.gioca) this.mostra('nemici'); });
      on('card_played', d => {
        if (!d.player || !d.player.isLocal) return;
        this.mostra('sacrificio'); this.mostra('potere'); this.mostra('pesca'); this.mostra('fine');
      });
      on('defense_window_opened', () => this.mostra('difesa'));
      on('round_started', st => {
        const me = st.players.find(p => p.isLocal);
        if (me && me.trm > 0) this.mostra('trauma');
      });
      on('act_advanced', () => setTimeout(() => this.mostra('atto'), 2500));
      E().on('game_over', () => { if (this.inPartita) this.conclude(); });
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
