// Monomythos: account obbligatorio con Firebase Authentication (piano gratuito Spark)
// e salvataggio del profilo (crediti, carte, mazzi) su Cloud Firestore.
(function () {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const ERRORS = {
    'auth/invalid-email': 'Email non valida.',
    'auth/missing-password': 'Inserisci la password.',
    'auth/weak-password': 'La password deve avere almeno 6 caratteri.',
    'auth/email-already-in-use': 'Esiste già un account con questa email: accedi.',
    'auth/invalid-credential': 'Email o password sbagliate.',
    'auth/wrong-password': 'Email o password sbagliate.',
    'auth/user-not-found': 'Nessun account con questa email: registrati.',
    'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
    'auth/network-request-failed': 'Connessione assente. Controlla internet e riprova.'
  };

  const loadScript = (src) => new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => ko(new Error('Impossibile caricare ' + src));
    document.head.appendChild(s);
  });

  const Account = {
    required: false,
    ready: false,
    user: null,
    profile: null,
    _saveTimer: null,

    async init() {
      const cfg = window.MONOMYTHOS_FIREBASE;
      if (!cfg || !cfg.apiKey) { this.updateBadge(); return; } // nessun progetto: gioco libero
      this.required = true;
      this.guardScreens();
      this.showAuth();
      try {
        await loadScript(SDK + 'firebase-app-compat.js');
        await loadScript(SDK + 'firebase-auth-compat.js');
        await loadScript(SDK + 'firebase-firestore-compat.js');
      } catch (e) {
        this.setMsg('Non riesco a raggiungere il server degli account. Controlla la connessione e ricarica.', true);
        return;
      }
      firebase.initializeApp(cfg);
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      try { await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}
      this.ready = true;
      this.auth.onAuthStateChanged((u) => this.onUser(u));
    },

    // Finché non c'è un utente, qualsiasi schermata rimanda all'accesso
    guardScreens() {
      const ui = window.UI;
      if (!ui || ui._accountGuard) return;
      const orig = ui.showScreen.bind(ui);
      ui.showScreen = (id) => {
        if (this.required && !this.user && id !== 'scr-auth') id = 'scr-auth';
        return orig(id);
      };
      ui._accountGuard = true;
    },

    showAuth() {
      document.body.classList.add('needs-auth');
      window.UI && window.UI.showScreen('scr-auth');
    },

    async onUser(u) {
      this.user = u;
      if (!u) { this.profile = null; this.updateBadge(); this.showAuth(); return; }
      this.setMsg('Caricamento del profilo...');
      try {
        const ref = this.db.collection('users').doc(u.uid);
        const snap = await ref.get();
        if (snap.exists && snap.data().progression) {
          const data = snap.data();
          this.profile = data;
          // Il profilo sul server vince su quello del dispositivo
          window.Progression.data = { ...window.Progression.getDefaultData(), ...data.progression };
          window.Progression.save(true);
        } else {
          // Account nuovo: profilo pulito (niente dati rimasti sul dispositivo da altri account)
          window.Progression.data = window.Progression.getDefaultData();
          if (window.Collezione) window.Collezione.migra();
          this.profile = {
            nickname: (snap.exists && snap.data().nickname) || this._pendingNick || (u.email || 'Eroe').split('@')[0],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await ref.set({ ...this.profile, progression: window.Progression.data }, { merge: true });
        }
      } catch (e) {
        console.error('Profilo:', e);
        this.setMsg('Accesso riuscito, ma il profilo non si è caricato. Giochi con i dati di questo dispositivo.', true);
      }
      if (window.Collezione) { window.Collezione.migra(); window.Collezione.assicuraMinacce(); }
      document.body.classList.remove('needs-auth');
      this.updateBadge();
      try { window.UI.updateCreditsDisplay && window.UI.updateCreditsDisplay(); } catch (e) {}
      document.querySelectorAll('.creditsDisplay').forEach(el => { el.textContent = window.Progression.getCredits(); });
      window.UI.showScreen('scr-lobby');
      window.UI.showToast(`Bentornato, ${this.nickname()}!`);
      if (window.Online && window.Collezione && window.Collezione.haStarter()) window.Online.dopoAccesso();
      if (window.Scambi) window.Scambi.avvia();
    },

    nickname() {
      return (this.profile && this.profile.nickname) || (this.user && this.user.email ? this.user.email.split('@')[0] : 'Ospite');
    },

    // Chiamato da Progression.save(): salva sul server con un piccolo ritardo
    queueSave() {
      if (!this.user || !this.db) return;
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        this.db.collection('users').doc(this.user.uid)
          .set({ progression: window.Progression.data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
          .catch(e => console.error('Salvataggio profilo:', e));
      }, 800);
    },

    setTab(tab) {
      document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      document.getElementById('authNickRow').style.display = tab === 'register' ? '' : 'none';
      document.getElementById('authSubmit').textContent = tab === 'register' ? 'CREA ACCOUNT' : 'ENTRA';
      this._tab = tab;
      this.setMsg('');
    },

    setMsg(text, isError = false) {
      const el = document.getElementById('authMsg');
      if (!el) return;
      el.textContent = text || '';
      el.classList.toggle('error', !!isError);
    },

    async submit(ev) {
      if (ev) ev.preventDefault();
      if (!this.ready) { this.setMsg('Un momento, sto collegando il server...'); return false; }
      const email = document.getElementById('authEmail').value.trim();
      const pass = document.getElementById('authPassword').value;
      const btn = document.getElementById('authSubmit');
      btn.disabled = true;
      try {
        if (this._tab === 'register') {
          const nick = document.getElementById('authNick').value.trim();
          if (nick.length < 3) { this.setMsg('Il nome eroe deve avere almeno 3 caratteri.', true); return false; }
          this._pendingNick = nick.slice(0, 20);
          this.setMsg('Creo il tuo account...');
          await this.auth.createUserWithEmailAndPassword(email, pass);
        } else {
          this.setMsg('Accesso in corso...');
          await this.auth.signInWithEmailAndPassword(email, pass);
        }
      } catch (e) {
        this.setMsg(ERRORS[e.code] || ('Errore: ' + (e.message || e.code)), true);
      } finally {
        btn.disabled = false;
      }
      return false;
    },

    async resetPassword() {
      const email = document.getElementById('authEmail').value.trim();
      if (!email) { this.setMsg('Scrivi la tua email qui sopra, poi tocca di nuovo "Password dimenticata".', true); return; }
      try {
        await this.auth.sendPasswordResetEmail(email);
        this.setMsg('Ti ho mandato un\'email per scegliere una nuova password.');
      } catch (e) {
        this.setMsg(ERRORS[e.code] || 'Non sono riuscito a mandare l\'email.', true);
      }
    },

    async logout() {
      if (!this.auth) return;
      if (!confirm('Vuoi uscire dal tuo account?')) return;
      clearTimeout(this._saveTimer);
      try {
        await this.db.collection('users').doc(this.user.uid)
          .set({ progression: window.Progression.data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      } catch (e) {}
      // I progressi stanno nell'account: sul dispositivo non resta nulla
      try { localStorage.removeItem(window.Progression.storageKey); } catch (e) {}
      window.Progression.data = window.Progression.getDefaultData();
      if (window.Scambi) window.Scambi.ferma();
      await this.auth.signOut();
    },

    updateBadge() {
      const el = document.getElementById('accountMenuBtn');
      if (!el) return;
      if (!this.required) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.textContent = this.user ? `ESCI (${this.nickname()})` : 'ACCEDI';
    }
  };

  window.Account = Account;
  window.addEventListener('DOMContentLoaded', () => {
    Account.setTab('login');
    Account.init();
  });
})();
