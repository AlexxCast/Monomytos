// Monomythos: scambio di carte tra amici (Cloud Firestore, piano gratuito).
// Ogni giocatore ha un codice amico. Chi propone uno scambio mette da parte la carta che offre;
// se l'amico accetta riceve la carta chiesta, se rifiuta o si annulla la carta torna indietro.
(function () {
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const Scambi = {
    ricevuti: [],
    inviati: [],
    _unsubs: [],

    get db() { return window.Account && window.Account.db; },
    get me() { return window.Account && window.Account.user; },
    get P() { return window.Progression; },
    carta(id) { return Object.values(window.MONOMYTHOS_DATA.action_cards).flat().find(c => c.id === id); },
    nome(id) { const c = this.carta(id); return c ? c.nome : id; },
    toast(t) { window.UI && window.UI.showToast(t); },
    errore(e) {
      console.error('Scambi:', e);
      this.toast(e && e.code === 'permission-denied' ? 'Scambi non ancora attivi: vanno aggiornate le regole di Firebase.' : 'Errore negli scambi. Riprova.');
    },

    async codiceAmico() {
      if (!this.db || !this.me) return null;
      const d = this.P.data;
      if (d.codiceAmico) return d.codiceAmico;
      for (let i = 0; i < 6; i++) {
        const code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
        const ref = this.db.collection('amici').doc(code);
        try {
          const snap = await ref.get();
          if (snap.exists) continue;
          await ref.set({ uid: this.me.uid, nick: window.Account.nickname() });
          d.codiceAmico = code;
          this.P.save();
          return code;
        } catch (e) { this.errore(e); return null; }
      }
      return null;
    },

    avvia() {
      this.ferma();
      if (!this.db || !this.me) return;
      const col = this.db.collection('scambi');
      this._unsubs.push(col.where('a', '==', this.me.uid).onSnapshot(s => {
        this.ricevuti = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.stato === 'proposto');
        this.aggiornaBadge(); this.render();
      }, e => console.warn('Scambi ricevuti:', e)));
      this._unsubs.push(col.where('da', '==', this.me.uid).onSnapshot(s => {
        this.inviati = s.docs.map(d => ({ id: d.id, ...d.data() }));
        this.inviati.filter(x => ['accettato', 'rifiutato', 'annullato'].includes(x.stato)).forEach(x => this.chiudi(x));
        this.render();
      }, e => console.warn('Scambi inviati:', e)));
    },
    ferma() { this._unsubs.forEach(u => { try { u(); } catch (e) {} }); this._unsubs = []; },

    async proponi() {
      const code = (document.getElementById('scambioCodice').value || '').toUpperCase().trim();
      const dai = document.getElementById('scambioDai').value;
      const vuoi = document.getElementById('scambioVuoi').value;
      if (!code || !dai || !vuoi) return this.toast('Scegli codice amico, carta da dare e carta da chiedere.');
      if (code === this.P.data.codiceAmico) return this.toast('Questo è il tuo codice: usa quello di un amico.');
      if (window.Collezione.doppioni(dai) < 1) return this.toast('Puoi scambiare solo i doppioni (dalla terza copia in poi).');
      try {
        const amico = await this.db.collection('amici').doc(code).get();
        if (!amico.exists) return this.toast('Nessun giocatore con il codice ' + code + '.');
        const a = amico.data();
        // La carta offerta viene messa da parte subito
        this.P.data.unlockedCards[dai]--;
        this.P.save();
        await this.db.collection('scambi').add({
          da: this.me.uid, daNick: window.Account.nickname(), a: a.uid, aNick: a.nick,
          dai, vuoi, stato: 'proposto', ts: firebase.firestore.FieldValue.serverTimestamp()
        });
        this.toast(`Proposta inviata a ${a.nick}: ${this.nome(dai)} per ${this.nome(vuoi)}.`);
      } catch (e) {
        this.errore(e);
      }
      this.render();
    },

    async rispondi(id, accetta) {
      const s = this.ricevuti.find(x => x.id === id);
      if (!s) return;
      if (accetta && !(this.P.getCardOwnedCount(s.vuoi) > 0)) return this.toast(`Non possiedi ${this.nome(s.vuoi)}.`);
      if (accetta && window.Collezione.doppioni(s.vuoi) < 1 && !confirm(`${this.nome(s.vuoi)} non è un doppione: ti resterà una copia in meno. Accetti lo stesso?`)) return;
      const ref = this.db.collection('scambi').doc(id);
      try {
        const ok = await this.db.runTransaction(async tx => {
          const snap = await tx.get(ref);
          if (!snap.exists || snap.data().stato !== 'proposto') return false;
          tx.update(ref, { stato: accetta ? 'accettato' : 'rifiutato' });
          return true;
        });
        if (!ok) return this.toast('Questo scambio non è più disponibile.');
        if (accetta) {
          const d = this.P.data;
          d.unlockedCards[s.vuoi] = Math.max(0, (d.unlockedCards[s.vuoi] || 0) - 1);
          d.unlockedCards[s.dai] = (d.unlockedCards[s.dai] || 0) + 1;
          this.P.save();
          this.toast(`Scambio fatto! Hai ricevuto ${this.nome(s.dai)}.`);
        } else this.toast('Scambio rifiutato.');
      } catch (e) { this.errore(e); }
    },

    async annulla(id) {
      try { await this.db.collection('scambi').doc(id).update({ stato: 'annullato' }); } catch (e) { this.errore(e); }
    },

    // Chi ha proposto chiude lo scambio una volta sola: riceve la carta o si riprende la sua
    async chiudi(s) {
      if (this._chiudendo && this._chiudendo.has(s.id)) return;
      (this._chiudendo = this._chiudendo || new Set()).add(s.id);
      const ref = this.db.collection('scambi').doc(s.id);
      try {
        const stato = await this.db.runTransaction(async tx => {
          const snap = await tx.get(ref);
          const st = snap.exists && snap.data().stato;
          if (!['accettato', 'rifiutato', 'annullato'].includes(st)) return null;
          tx.update(ref, { stato: 'chiuso', esito: st });
          return st;
        });
        if (!stato) return;
        const d = this.P.data;
        if (stato === 'accettato') {
          d.unlockedCards[s.vuoi] = (d.unlockedCards[s.vuoi] || 0) + 1;
          this.toast(`${s.aNick} ha accettato: hai ricevuto ${this.nome(s.vuoi)}!`);
        } else {
          d.unlockedCards[s.dai] = (d.unlockedCards[s.dai] || 0) + 1;
          if (stato === 'rifiutato') this.toast(`${s.aNick} ha rifiutato lo scambio: ${this.nome(s.dai)} torna a te.`);
        }
        this.P.save();
      } catch (e) { this.errore(e); }
    },

    aggiornaBadge() {
      document.querySelectorAll('.scambi-badge').forEach(el => {
        el.textContent = this.ricevuti.length;
        el.style.display = this.ricevuti.length ? '' : 'none';
      });
    },

    async apri() {
      if (!this.db || !this.me) return this.toast('Accedi al tuo account per scambiare carte.');
      window.UI.showModal('modalScambi');
      this.render();
      const code = await this.codiceAmico();
      const el = document.getElementById('scambioMioCodice');
      if (el && code) el.textContent = code;
      this.render();
    },

    render() {
      const box = document.getElementById('scambiBody');
      if (!box || !this.P) return;
      const all = Object.values(window.MONOMYTHOS_DATA.action_cards).flat();
      const C = window.Collezione;
      const miei = all.filter(c => C.doppioni(c.id) > 0);
      const opt = c => `<option value="${c.id}">${esc(c.nome)} · ${C.infoRarita(c).nome}</option>`;
      const sel = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
      const prev = { codice: sel('scambioCodice'), dai: sel('scambioDai'), vuoi: sel('scambioVuoi') };
      const riga = (s, tipo) => {
        const stato = { proposto: 'In attesa', chiuso: s.esito === 'accettato' ? 'Fatto' : (s.esito === 'rifiutato' ? 'Rifiutato' : 'Annullato'), accettato: 'Fatto', rifiutato: 'Rifiutato', annullato: 'Annullato' }[s.stato] || s.stato;
        return `<li class="scambio-row">
          <span>${tipo === 'in' ? `<b>${esc(s.daNick)}</b> ti dà <b>${esc(this.nome(s.dai))}</b> e chiede <b>${esc(this.nome(s.vuoi))}</b>`
            : `A <b>${esc(s.aNick)}</b>: dai <b>${esc(this.nome(s.dai))}</b> per <b>${esc(this.nome(s.vuoi))}</b> · ${stato}`}</span>
          <span class="scambio-btns">${tipo === 'in'
            ? `<button class="btn btn-primary btn-sm" onclick="Scambi.rispondi('${s.id}', true)">Accetta</button><button class="btn btn-subtle btn-sm" onclick="Scambi.rispondi('${s.id}', false)">Rifiuta</button>`
            : (s.stato === 'proposto' ? `<button class="btn btn-subtle btn-sm" onclick="Scambi.annulla('${s.id}')">Annulla</button>` : '')}</span>
        </li>`;
      };
      box.innerHTML = `
        <div class="scambio-code">Il tuo codice amico: <b id="scambioMioCodice">${esc(this.P.data.codiceAmico || '...')}</b>
          <button class="btn btn-subtle btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('scambioMioCodice').textContent); UI.showToast('Codice copiato!')">Copia</button></div>
        <p class="scambio-help">Puoi dare solo i <b>doppioni</b>: le copie dalla terza in poi, perché nel mazzo ne servono al massimo 2.</p>
        <div class="scambio-form">
          <label>Codice dell'amico<input id="scambioCodice" maxlength="6" placeholder="ES. K7PQ2M" value="${esc(prev.codice)}"></label>
          <label>Dai (tuoi doppioni)<select id="scambioDai">${miei.length ? miei.map(opt).join('') : '<option value="">Non hai doppioni</option>'}</select></label>
          <label>Chiedi in cambio<select id="scambioVuoi">${all.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(opt).join('')}</select></label>
          <button class="btn btn-primary" onclick="Scambi.proponi()" ${miei.length ? '' : 'disabled'}>Proponi scambio</button>
        </div>
        <h4 class="scambio-title">Proposte ricevute</h4>
        <ul class="scambio-list">${this.ricevuti.length ? this.ricevuti.map(s => riga(s, 'in')).join('') : '<li class="scambio-empty">Nessuna proposta.</li>'}</ul>
        <h4 class="scambio-title">Le tue proposte</h4>
        <ul class="scambio-list">${this.inviati.length ? this.inviati.slice(-10).reverse().map(s => riga(s, 'out')).join('') : '<li class="scambio-empty">Nessuna proposta inviata.</li>'}</ul>`;
      if (prev.dai) document.getElementById('scambioDai').value = prev.dai;
      if (prev.vuoi) document.getElementById('scambioVuoi').value = prev.vuoi;
    }
  };

  window.Scambi = Scambi;
})();
