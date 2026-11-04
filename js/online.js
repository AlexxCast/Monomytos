// Monomythos online: stanze e partite tra giocatori connessi, tramite Cloud Firestore (piano gratuito).
// L'host esegue il motore di gioco e pubblica lo stato; gli altri giocatori mostrano quello stato
// e mandano le loro mosse all'host. Nessun server da pagare.
(function () {
  const SEND_EVENTS = ['match_started', 'round_started', 'turn_changed', 'card_played', 'sacrifice_made', 'damage_taken',
    'base_power_used', 'player_corrupted', 'act_advanced', 'game_over', 'attack_dodged', 'player_died', 'draw_choice_changed'];
  const MAX_PLAYERS = 4;
  const DEFENSE_TIMEOUT_MS = 30000;
  const PING_MS = 10000;          // l'host segnala ogni 10 secondi che è ancora collegato
  const HOST_SPARITO_MS = 30000;  // senza segnali per 30 secondi un altro giocatore prende il posto dell'host
  const TURNO_MAX_MS = 90000;     // un giocatore fermo per 90 secondi nel suo turno passa al bot
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let _cardIndex = null;
  const cardIndex = () => {
    if (!_cardIndex) {
      _cardIndex = {};
      Object.values((window.MONOMYTHOS_DATA || {}).action_cards || {}).flat().forEach(c => { _cardIndex[c.id] = c; });
    }
    return _cardIndex;
  };

  // Le carte viaggiano come {id, uid} più i soli campi cambiati durante la partita
  function packCard(c) {
    const t = c && c.id && cardIndex()[c.id];
    if (!t) return c;
    const out = { id: c.id, uid: c.uid, __c: 1 };
    Object.keys(c).forEach(k => {
      if (k === 'id' || k === 'uid') return;
      if (JSON.stringify(c[k]) !== JSON.stringify(t[k])) out[k] = c[k];
    });
    return out;
  }
  function pack(v) {
    if (Array.isArray(v)) return v.map(pack);
    if (v && typeof v === 'object') {
      if (v.id && v.uid && cardIndex()[v.id]) return packCard(v);
      const o = {};
      Object.keys(v).forEach(k => { if (typeof v[k] !== 'function') o[k] = pack(v[k]); });
      return o;
    }
    return v;
  }
  function unpack(v) {
    if (Array.isArray(v)) return v.map(unpack);
    if (v && typeof v === 'object') {
      if (v.__c) { const { __c, ...rest } = v; return { ...cardIndex()[v.id], ...rest }; }
      const o = {};
      Object.keys(v).forEach(k => { o[k] = unpack(v[k]); });
      return o;
    }
    return v;
  }
  // Riferimenti a giocatori e carte dentro i dati degli eventi
  function packEventData(d, state) {
    if (!d || typeof d !== 'object') return d;
    if (state.players.includes(d)) return { __p: d.id };
    const o = Array.isArray(d) ? [] : {};
    Object.keys(d).forEach(k => {
      const x = d[k];
      if (x && typeof x === 'object' && state.players.includes(x)) o[k] = { __p: x.id };
      else if (x && typeof x === 'object' && x.uid && x.id) o[k] = packCard(x);
      else if (x && typeof x === 'object') o[k] = JSON.parse(JSON.stringify(pack(x)));
      else if (typeof x !== 'function') o[k] = x;
    });
    return o;
  }
  function unpackEventData(d, state) {
    if (!d || typeof d !== 'object') return d;
    const res = x => (x && x.__p) ? state.players.find(p => p.id === x.__p) : unpack(x);
    if (d.__p) return res(d);
    const o = Array.isArray(d) ? [] : {};
    Object.keys(d).forEach(k => { o[k] = res(d[k]); });
    return o;
  }

  const Online = {
    code: null,
    isHost: false,
    room: null,
    seq: 0,
    lastSeq: -1,
    _pendingJoin: null,
    _events: [],
    _flushTimer: null,
    _defense: null,
    _defenseTimer: null,
    _unsubs: [],
    _mirror: false,

    get db() { return window.Account && window.Account.db; },
    get me() { return window.Account && window.Account.user; },
    ready() { return !!(this.db && this.me); },
    roomRef(code) { return this.db.collection('rooms').doc(code || this.code); },
    nick() { return (window.Account && window.Account.nickname()) || 'Eroe'; },

    toast(t) { window.UI && window.UI.showToast(t); },
    erroreRegole(e) {
      console.error('Online:', e);
      if (e && e.code === 'permission-denied') this.toast('Online non ancora attivo: vanno aggiornate le regole di Firebase (vedi LEGGIMI_account).');
      else this.toast('Errore di connessione online. Riprova.');
    },

    stop() {
      this._unsubs.forEach(u => { try { u(); } catch (e) {} });
      this._unsubs = [];
      clearTimeout(this._flushTimer);
      clearTimeout(this._defenseTimer);
      clearTimeout(this._autoTimer);
      clearTimeout(this._watchTimer);
      clearTimeout(this._lobbyTimer);
      this._nPlayers = 0;
      this._segnale = 0; this._firma = null; this._subentrando = false; this._turnoKey = null;
      if (this._mirror) this.unmirror();
      this.code = null; this.room = null; this.isHost = false; this.lastSeq = -1;
      if (window.GameEngine) window.GameEngine.onRemoteDefense = null;
    },

    mioPosto(hero) {
      return { uid: this.me.uid, name: this.nick(), hero, minacce: window.Collezione ? window.Collezione.mazzoMinacce() : [] };
    },

    async creaStanza(hero, pubblica = false) {
      if (!this.ready()) return this.toast('Accedi al tuo account per giocare online.');
      this.stop();
      let code = '';
      for (let tent = 0; tent < 5; tent++) {
        code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
        try {
          const snap = await this.roomRef(code).get();
          if (!snap.exists || (snap.data().status === 'ended')) break;
        } catch (e) { return this.erroreRegole(e); }
      }
      try {
        await this.roomRef(code).set({
          host: this.me.uid,
          status: 'lobby',
          players: [this.mioPosto(hero)],
          public: !!pubblica,
          lobbyPing: Date.now(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) { return this.erroreRegole(e); }
      this.code = code; this.isHost = true;
      this.ascoltaStanza();
      this.ascoltaAzioni();
      return code;
    },

    async entra(code, hero, silenzioso = false) {
      code = String(code || '').toUpperCase().trim();
      if (!code) return;
      if (!this.ready()) { this._pendingJoin = { code, hero }; this.toast('Accedi per entrare nella stanza ' + code); return; }
      this.stop();
      const ref = this.roomRef(code);
      try {
        await this.db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists) throw new Error('Stanza ' + code + ' non trovata.');
          const r = snap.data();
          const players = r.players || [];
          if (players.some(p => p.uid === this.me.uid)) return;
          if (r.status !== 'lobby') throw new Error('La partita in questa stanza è già iniziata.');
          if (players.length >= MAX_PLAYERS) throw new Error('La stanza è piena (massimo 4 eroi).');
          tx.update(ref, { players: [...players, this.mioPosto(hero)] });
        });
      } catch (e) {
        if (silenzioso) return false;
        if (e && e.code) { this.erroreRegole(e); return false; }
        this.toast(e.message); return false;
      }
      this.code = code; this.isHost = false;
      this.ascoltaStanza();
      if (!silenzioso) this.setCerca('');
      window.UI.showScreen('scr-room-wait');
      this.renderLobby();
      return true;
    },

    // ---------- PARTITA CASUALE ----------
    // Stanze pubbliche in attesa con l'host ancora collegato (segnale negli ultimi 30 secondi)
    async stanzeLibere() {
      const q = await this.db.collection('rooms').where('public', '==', true).where('status', '==', 'lobby').limit(25).get();
      const ora = Date.now();
      return q.docs.map(d => ({ code: d.id, ...d.data() }))
        .filter(r => (r.players || []).length < MAX_PLAYERS && r.host !== this.me.uid &&
          !(r.players || []).some(p => p.uid === this.me.uid) &&
          ora - (r.lobbyPing || (r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : 0)) < 30000)
        .sort((a, b) => (b.players || []).length - (a.players || []).length || (a.code < b.code ? -1 : 1));
    },

    async cercaPartita(hero) {
      if (!this.ready()) return this.toast('Accedi al tuo account per giocare online.');
      // chiude per bene un'eventuale stanza precedente, così nessuno entra in una stanza vuota
      await this.esci();
      window.UI.showScreen('scr-room-wait');
      this.setCerca('Cerco altri eroi...');
      let candidati = [];
      try { candidati = await this.stanzeLibere(); } catch (e) { this.erroreRegole(e); return window.UI.showScreen('scr-lobby'); }
      for (const r of candidati) {
        const ok = await this.entra(r.code, hero, true);
        if (ok) { this.setCerca('Trovata una squadra! Si parte appena l\'host è pronto.'); return; }
      }
      const code = await this.creaStanza(hero, true);
      if (!code) return window.UI.showScreen('scr-lobby');
      this.renderLobby();
      this.setCerca('Nessuna squadra libera: ho aperto una stanza. Aspetto altri giocatori...');
      this._cercaDal = Date.now();
      this._eroeCerca = hero;
      this.attesaPubblica();
    },

    // Mentre aspetto da solo nella mia stanza pubblica: segnalo che ci sono e continuo a cercare.
    // Se due giocatori aprono una stanza nello stesso momento, chi ha il codice "più grande" passa nell'altra.
    attesaPubblica() {
      clearTimeout(this._lobbyTimer);
      const r = this.room;
      if (!this.code || !this.isHost || (r && (!r.public || r.status !== 'lobby'))) return;
      this.roomRef().update({ lobbyPing: Date.now() }).catch(() => {});
      const soloIo = !r || (r.players || []).length < 2;
      const mio = this.code;
      (soloIo ? this.stanzeLibere() : Promise.resolve([])).then(async (lista) => {
        const altra = lista.find(x => x.code < mio || (x.players || []).length >= 2);
        if (altra && this.code === mio && this.isHost && (!this.room || (this.room.players || []).length < 2)) {
          const hero = this._eroeCerca;
          await this.esci();
          const ok = await this.entra(altra.code, hero, true);
          if (ok) { this.setCerca('Trovata una squadra! Si parte appena l\'host è pronto.'); return; }
          return this.cercaPartita(hero);
        }
        this._lobbyTimer = setTimeout(() => this.attesaPubblica(), 5000);
      }).catch(() => { this._lobbyTimer = setTimeout(() => this.attesaPubblica(), 5000); });
    },

    setCerca(t) {
      const el = document.getElementById('roomSearchMsg');
      if (el) { el.textContent = t || ''; el.style.display = t ? '' : 'none'; }
    },

    // Host di una stanza pubblica: parte da solo quando la squadra è pronta
    autoAvvio() {
      const r = this.room;
      if (!this.isHost || !r || !r.public || r.status !== 'lobby') return;
      const n = (r.players || []).length;
      clearTimeout(this._autoTimer);
      const bots = document.getElementById('btnPlayBots');
      if (bots) bots.style.display = n < 2 ? '' : 'none';
      if (n >= MAX_PLAYERS) return this.avviaPartita();
      if (n >= 2) {
        let sec = 15;
        const tick = () => {
          if (!this.room || this.room.status !== 'lobby') return;
          this.setCerca(`Squadra di ${(this.room.players || []).length}: si parte tra ${sec} secondi (aspetto altri giocatori)`);
          if (sec-- <= 0) return this.avviaPartita();
          this._autoTimer = setTimeout(tick, 1000);
        };
        tick();
      }
    },

    async giocaConBot() {
      const hero = (window.UI && window.UI.selectedHero) || 'Iron Aegis';
      await this.esci();
      window.UI.squadSize = 3;
      window.UI.startSoloGame(hero);
    },

    async esci() {
      const code = this.code, wasHost = this.isHost, room = this.room;
      this.stop();
      if (!code || !this.db) return;
      try {
        // Se la partita è in corso l'host non la chiude: un altro giocatore ne prende il posto
        if (wasHost && room && room.status === 'playing') await this.roomRef(code).update({ hostLeft: true });
        else if (wasHost) await this.roomRef(code).update({ status: 'ended' });
        else if (room && room.status === 'playing') {
          await this.roomRef(code).collection('actions').add({
            uid: this.me.uid, type: 'leave', args: [], n: this.me.uid.slice(0, 6) + '_esce_' + Date.now(),
            ts: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else if (room && room.status === 'lobby') {
          await this.roomRef(code).update({ players: (room.players || []).filter(p => p.uid !== this.me.uid) });
        }
      } catch (e) {}
    },

    ascoltaStanza() {
      const unsub = this.roomRef().onSnapshot(snap => {
        if (!snap.exists) return;
        const r = snap.data();
        this.room = r;
        const firma = r.host + '|' + (r.seq || 0) + '|' + (r.hostPing || 0) + '|' + !!r.hostLeft;
        if (firma !== this._firma) { this._firma = firma; this._segnale = Date.now(); }
        if (r.status === 'ended' && !this.isHost) {
          this.toast('L\'host ha chiuso la stanza.');
          this.stop();
          window.UI.showScreen('scr-lobby');
          return;
        }
        if (r.status === 'lobby') {
          const prima = this._nPlayers;
          this._nPlayers = (r.players || []).length;
          this.renderLobby();
          if (this.isHost && r.public && prima !== this._nPlayers) this.autoAvvio();
        }
        if (!this.isHost && (r.status === 'playing' || r.status === 'finished') && r.stateJson) this.applicaStato(r);
      }, e => this.erroreRegole(e));
      this._unsubs.push(unsub);
    },

    renderLobby() {
      const r = this.room;
      const box = document.getElementById('roomPlayerList');
      const codeEl = document.getElementById('createdRoomCode');
      if (codeEl && this.code) codeEl.textContent = this.code;
      const link = document.getElementById('roomShareLink');
      if (link && this.code) link.value = `${location.origin}${location.pathname}?room=${this.code}`;
      const btn = document.getElementById('btnStartOnline');
      if (btn) {
        btn.style.display = this.isHost ? '' : 'none';
        btn.disabled = !r || (r.players || []).length < 2;
        btn.textContent = (r && (r.players || []).length < 2) ? 'Aspetta almeno un altro giocatore' : 'Inizia la Missione';
      }
      const wait = document.getElementById('roomGuestWait');
      if (wait) wait.style.display = this.isHost ? 'none' : '';
      if (!box || !r) return;
      box.innerHTML = (r.players || []).map(p => `
        <div class="room-player ${p.uid === r.host ? 'is-host' : ''}">
          <span><b>${escapeHtml(p.name)}${p.uid === (this.me && this.me.uid) ? ' (tu)' : ''}</b> · ${escapeHtml(p.hero)}</span>
          <span class="room-player-tag">${p.uid === r.host ? 'Host' : 'Pronto'}</span>
        </div>`).join('') +
        Array.from({ length: Math.max(0, MAX_PLAYERS - (r.players || []).length) }, () =>
          '<div class="room-player empty"><span>Posto libero</span><span class="room-player-tag">In attesa...</span></div>').join('');
    },

    // ---------- HOST ----------
    async avviaPartita() {
      if (!this.isHost || !this.room) return;
      const players = this.room.players || [];
      if (players.length < 2) return this.toast('Serve almeno un altro giocatore nella stanza.');
      const E = window.GameEngine;
      const pool = [...new Set(players.flatMap(p => p.minacce || []))];
      E.startMatch({
        ranked: !!this.room.public,
        threatPool: pool.length >= 3 ? pool : null,
        heroes: players.map(p => ({
          name: p.hero, isBot: false, uid: p.uid, displayName: p.name,
          isLocal: p.uid === this.me.uid, remoteUid: p.uid === this.me.uid ? null : p.uid
        }))
      });
      E.onRemoteDefense = (d) => this.chiediDifesa(d);
      this.agganciaEventiHost();
      await this.pubblica(true);
      this.sorveglia();
      const threat = E.state.currentThreat;
      window.UI.playMatchIntroLoading(threat, () => window.UI.showScreen('scr-game'));
    },

    agganciaEventiHost() {
      const E = window.GameEngine;
      if (E._onlineHook) return;
      const orig = E.emit.bind(E);
      E.emit = (ev, data) => {
        orig(ev, data);
        if (!this.isHost || !this.code) return;
        if (SEND_EVENTS.includes(ev)) {
          try { this._events.push({ e: ev, d: packEventData(data, E.state) }); } catch (e) {}
        }
        this.programmaPubblica();
      };
      E._onlineHook = true;
    },

    programmaPubblica() {
      if (this._flushTimer) return;
      this._flushTimer = setTimeout(() => { this._flushTimer = null; this.pubblica(); }, 250);
    },

    async pubblica(first = false) {
      if (!this.isHost || !this.code) return;
      const E = window.GameEngine;
      const events = this._events.splice(0, this._events.length).slice(-30);
      this.seq++;
      const payload = {
        stateJson: JSON.stringify(pack(E.state)),
        events,
        seq: this.seq,
        defense: this._defense || null
      };
      if (first) payload.status = 'playing';
      if (E.state.phase === 'gameover') payload.status = 'finished';
      try { await this.roomRef().update(payload); } catch (e) { this.erroreRegole(e); }
    },

    chiediDifesa(d) {
      const t = d.target;
      this._defense = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        uid: t.remoteUid, targetId: t.id,
        enemy: { nome: d.enemy.nome || d.enemy.name, name: d.enemy.name || d.enemy.nome, pericoloso: d.enemy.pericoloso || null },
        rawDmg: d.rawDmg, mitigable: d.mitigable, effectiveEnd: d.effectiveEnd, isTrample: !!d.isTrample
      };
      this.pubblica();
      clearTimeout(this._defenseTimer);
      this._defenseTimer = setTimeout(() => this.risolviDifesa({ type: 'bot_fallback' }), DEFENSE_TIMEOUT_MS);
    },

    risolviDifesa(choice) {
      if (!this._defense) return;
      clearTimeout(this._defenseTimer);
      this._defense = null;
      window.GameEngine.respondToDefense(choice || { type: 'bot_fallback' });
      this.programmaPubblica();
    },

    ascoltaAzioni(saltaEsistenti = false) {
      let primo = saltaEsistenti;
      const unsub = this.roomRef().collection('actions').orderBy('ts').onSnapshot(snap => {
        const salta = primo; primo = false;
        snap.docChanges().forEach(ch => {
          if (ch.type !== 'added') return;
          const a = ch.doc.data();
          if (salta) { (this._done = this._done || new Set()).add(a.n); return; }
          this.applicaAzione(a);
        });
      }, e => this.erroreRegole(e));
      this._unsubs.push(unsub);
    },

    applicaAzione(a) {
      const E = window.GameEngine;
      if (!E.state || !a || !a.uid) return;
      if (a.n && this._done && this._done.has(a.n)) return;
      (this._done = this._done || new Set()).add(a.n);
      const player = E.state.players.find(p => p.remoteUid === a.uid);
      if (!player) return;
      const args = a.args || [];
      const active = E.getActivePlayer();
      const mioTurno = active && active.id === player.id;
      if (mioTurno) this._turnoDal = Date.now();
      try {
        switch (a.type) {
          case 'leave':
            this.passaAlBot(player, 'ha lasciato la partita');
            break;
          case 'defense':
            if (this._defense && this._defense.uid === a.uid) this.risolviDifesa(args[0]);
            break;
          case 'playCardEffect':
            if (mioTurno && args[0] === player.id) E.playCardEffect(player.id, args[1], args[2]);
            break;
          case 'tacticalSacrifice':
            if (mioTurno && args[0] === player.id) E.tacticalSacrifice(player.id, args[1], args[2]);
            break;
          case 'activateBasePower':
            if (mioTurno && args[0] === player.id) E.activateBasePower(player.id, args[1]);
            break;
          case 'survivalDiscard':
            if (mioTurno && args[0] === player.id) E.survivalDiscard(player.id, args[1]);
            break;
          case 'setDrawChoice':
            if (args[0] === player.id) E.setDrawChoice(player.id, args[1]);
            break;
          case 'endTurn':
            if (mioTurno) E.endTurn();
            break;
        }
      } catch (e) { console.error('Azione online:', a.type, e); }
      this.programmaPubblica();
    },

    // ---------- CONTINUITÀ: host che esce, giocatori fermi ----------
    // Un giocatore remoto che esce o resta fermo viene giocato dal bot, così la partita non si blocca
    passaAlBot(player, motivo) {
      const E = window.GameEngine;
      if (!player || player.isBot) return;
      player.isBot = true; player.remoteUid = null; player.isLocal = false; player.botOnline = true;
      E.addLog && E.addLog('sys', `[ONLINE] ${player.displayName || player.name} ${motivo}: continua il bot`);
      if (this._defense && this._defense.targetId === player.id) this.risolviDifesa({ type: 'bot_fallback' });
      const active = E.getActivePlayer();
      if (E.state.phase === 'action' && active && active.id === player.id) E.checkTurn();
      this.programmaPubblica();
    },

    // Controllo periodico: l'host segnala di essere vivo, gli altri controllano che l'host ci sia ancora
    sorveglia() {
      clearTimeout(this._watchTimer);
      if (!this.code) return;
      const r = this.room, E = window.GameEngine, ora = Date.now();
      if (r && r.status === 'playing' && E && E.state) {
        if (this.isHost) {
          if (ora - (this._ping || 0) > PING_MS) {
            this._ping = ora;
            this.roomRef().update({ hostPing: ora, hostLeft: false }).catch(() => {});
          }
          const active = E.getActivePlayer();
          if (E.state.phase === 'action' && active && active.remoteUid && !active.isDead) {
            const key = E.state.round + ':' + E.state.turnIndex;
            if (this._turnoKey !== key) { this._turnoKey = key; this._turnoDal = ora; }
            else if (ora - this._turnoDal > TURNO_MAX_MS) this.passaAlBot(active, 'non risponde');
          }
        } else if (!this._subentrando && this.lastSeq >= 0) {
          // Chi prende il posto dell'host: il primo della lista, poi il secondo se il primo non c'è, e così via
          const altri = (r.players || []).filter(p => p.uid !== r.host).map(p => p.uid);
          const k = Math.max(0, altri.indexOf(this.me.uid));
          const attesa = (r.hostLeft ? 1500 : HOST_SPARITO_MS) + k * 12000;
          if (ora - this._segnale > attesa) this.subentra(r.host);
        }
      }
      this._watchTimer = setTimeout(() => this.sorveglia(), 2000);
    },

    async subentra(vecchioHost) {
      this._subentrando = true;
      const ref = this.roomRef();
      let ok = false;
      try {
        await this.db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const r = snap.exists && snap.data();
          if (!r || r.status !== 'playing' || r.host !== vecchioHost) return;
          tx.update(ref, { host: this.me.uid, hostLeft: false, hostPing: Date.now() });
          ok = true;
        });
      } catch (e) { console.error('Subentro host:', e); }
      if (!ok) { this._subentrando = false; this._segnale = Date.now(); return; }
      const E = window.GameEngine;
      this.unmirror();
      E.state.players.forEach(p => {
        if (p.uid === this.me.uid) { p.isLocal = true; p.isBot = false; p.remoteUid = null; }
        else if (p.uid === vecchioHost || p.botOnline) { p.isLocal = false; p.isBot = true; p.remoteUid = null; p.botOnline = true; }
        else { p.isLocal = false; p.isBot = false; p.remoteUid = p.uid; }
      });
      const vecchio = E.state.players.find(p => p.uid === vecchioHost);
      E.addLog && E.addLog('sys', `[ONLINE] ${(vecchio && (vecchio.displayName || vecchio.name)) || 'L\'host'} è uscito: ora sei tu l'host, il suo eroe continua col bot`);
      this.isHost = true;
      this.seq = this.lastSeq;
      this._defense = null;
      E.pendingDefense = null;
      E.onRemoteDefense = (d) => this.chiediDifesa(d);
      this.agganciaEventiHost();
      this.ascoltaAzioni(true);
      this._subentrando = false;
      this.toast('L\'host è uscito: la partita continua, ora la guidi tu.');
      await this.pubblica();
      // Riprendo da dove si era fermato: a metà Fase Minaccia si passa al round successivo
      if (E.state.phase === 'enemy') E.startRound();
      else if (E.state.phase === 'action') E.checkTurn();
      try { window.UI.renderGameView(E.state); } catch (e) {}
      this.programmaPubblica();
    },

    // ---------- OSPITE ----------
    mirror() {
      if (this._mirror) return;
      const E = window.GameEngine;
      this._orig = {};
      const manda = (type) => (...args) => { this.mandaAzione(type, args); return { ok: true, pending: true }; };
      ['playCardEffect', 'tacticalSacrifice', 'activateBasePower', 'survivalDiscard', 'setDrawChoice', 'endTurn'].forEach(m => {
        this._orig[m] = E[m]; E[m] = manda(m);
      });
      this._orig.respondToDefense = E.respondToDefense;
      E.respondToDefense = (choice) => { this._defenseShown = null; this.mandaAzione('defense', [choice]); };
      this._orig.startRound = E.startRound; E.startRound = () => {};
      this._orig.runEnemyPhase = E.runEnemyPhase; E.runEnemyPhase = () => {};
      this._mirror = true;
    },
    unmirror() {
      const E = window.GameEngine;
      Object.keys(this._orig || {}).forEach(m => { E[m] = this._orig[m]; });
      this._mirror = false;
    },

    _n: 0,
    async mandaAzione(type, args) {
      try {
        await this.roomRef().collection('actions').add({
          uid: this.me.uid, type, args: JSON.parse(JSON.stringify(args === undefined ? [] : args)),
          n: this.me.uid.slice(0, 6) + '_' + Date.now() + '_' + (this._n++),
          ts: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) { this.erroreRegole(e); }
    },

    applicaStato(r) {
      if (r.seq <= this.lastSeq) return;
      const primo = this.lastSeq < 0;
      this.lastSeq = r.seq;
      this.mirror();
      const E = window.GameEngine;
      const full = unpack(JSON.parse(r.stateJson));
      // Il motore e l'interfaccia vedono il giocatore locale al posto 0: ruoto l'ordine
      const myIdx = full.players.findIndex(p => p.uid === this.me.uid);
      const n = full.players.length;
      full.players.forEach(p => { p.isLocal = p.uid === this.me.uid; p.isBot = false; });
      if (myIdx > 0) {
        full.players = [...full.players.slice(myIdx), ...full.players.slice(0, myIdx)];
        full.turnIndex = ((full.turnIndex - myIdx) % n + n) % n;
      }
      E.state = full;
      if (primo) {
        this.sorveglia();
        window.UI.playMatchIntroLoading(full.currentThreat, () => window.UI.showScreen('scr-game'));
      }
      (r.events || []).forEach(ev => {
        if (primo && ev.e !== 'match_started') return;
        try { E.emit(ev.e, unpackEventData(ev.d, E.state)); } catch (e) { console.error(e); }
        if (!primo) this.premiOspite(ev);
      });
      try { window.UI.renderGameView(E.state); } catch (e) { console.error(e); }
      const d = r.defense;
      if (d && d.uid === this.me.uid && this._defenseShown !== d.id) {
        this._defenseShown = d.id;
        const me = E.state.players.find(p => p.isLocal);
        const reactionCards = me.hand.filter(c => (c.fx_list && c.fx_list.some(f => f.timing === 'reaction')));
        window.UI.openDefenseWindow({ ...d, target: me, defender: me, reactionCards, parryCards: [...me.hand] });
      }
      // a partita finita resto in ascolto: l'host può mandare ancora l'ultimo stato
    },

    // Anche chi non è host guadagna crediti e avanza nella Storia
    premiOspite(ev) {
      const P = window.Progression, C = window.Collezione;
      // Solo le partite Classificate (stanze pubbliche) danno crediti
      if (!P || !(this.room && this.room.public)) return;
      if (ev.e === 'act_advanced') { P.addCredits(100, 'Minaccia risolta (online)'); C && C.registraMinaccia(); }
      if (ev.e === 'game_over' && ev.d && ev.d.winner === 'heroes') { P.addCredits(300, 'Vittoria online'); C && C.registraMinaccia(); }
      if (ev.e === 'game_over' && ev.d && ev.d.winner === 'villain') {
        const me = window.GameEngine.state.players.find(p => p.isLocal);
        if (me && (ev.d.winners || []).includes(me.id)) P.addCredits(200, 'Vittoria da Villain (online)');
      }
    },

    // Dopo l'accesso: entra nella stanza del link, se c'era
    dopoAccesso() {
      if (this._pendingJoin) { const j = this._pendingJoin; this._pendingJoin = null; this.entra(j.code, j.hero || (window.UI && window.UI.selectedHero)); }
    }
  };

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  window.Online = Online;
})();
