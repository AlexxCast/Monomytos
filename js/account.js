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
        // Senza internet si gioca lo stesso con i dati salvati sul telefono;
        // al prossimo accesso online le partite fatte offline vengono tenute
        this.offline = true;
        this.ospiteLocale = true;
        document.body.classList.remove('needs-auth');
        this.updateBadge();
        if (window.Collezione) window.Collezione.migra();
        if (window.Tutorial && window.Tutorial.serve()) window.Tutorial.avvia();
        else window.UI.showScreen('scr-lobby');
        window.UI.showToast('Sei offline: giochi con i dati di questo telefono.');
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
    isGuest() { return !!(this.user && this.user.isAnonymous) || !!this.ospiteLocale; },

    // Gioca subito senza email. Con Firebase "Anonimo" attivo i progressi restano nell'account ospite
    // (e si può giocare online); altrimenti si gioca con i dati salvati su questo dispositivo.
    async ospite() {
      if (this.isGuest()) { document.body.classList.remove('needs-auth'); window.UI.showScreen('scr-lobby'); return; }
      if (!this.ready) { this.setMsg('Un momento, sto collegando il server...'); return; }
      this.setMsg('Accesso come ospite...');
      try {
        await this.auth.signInAnonymously();
      } catch (e) {
        console.warn('Ospite senza account:', e && e.code);
        this.ospiteLocale = true;
        // Se sul dispositivo sono rimasti i dati di un account, l'ospite parte da zero (starter e tutorial)
        if (window.Progression.data && window.Progression.data._uid) {
          window.Progression.data = window.Progression.getDefaultData();
          window.Progression.save(true);
        }
        document.body.classList.remove('needs-auth');
        this.updateBadge();
        if (window.Collezione) { window.Collezione.migra(); }
        if (window.Tutorial && window.Tutorial.serve()) window.Tutorial.avvia();
        else window.UI.showScreen('scr-lobby');
      }
    },

    guardScreens() {
      const ui = window.UI;
      if (!ui || ui._accountGuard) return;
      const orig = ui.showScreen.bind(ui);
      ui.showScreen = (id) => {
        if (this.required && !this.user && !this.ospiteLocale && id !== 'scr-auth') id = 'scr-auth';
        return orig(id);
      };
      ui._accountGuard = true;
    },

    showAuth() {
      document.body.classList.add('needs-auth');
      const g = document.getElementById('authGuestBtn');
      if (g) g.textContent = this.isGuest() ? 'TORNA AL GIOCO' : 'GIOCA COME OSPITE';
      window.UI && window.UI.showScreen('scr-auth');
    },

    // Pulsante account nel menu: l'ospite può creare un account senza perdere i progressi
    menu() {
      if (this.isGuest()) {
        this.showAuth(); this.setTab('register');
        this.setMsg('Crea un account gratuito: i progressi da ospite restano tuoi.');
      } else if (this.user) this.logout();
      else this.showAuth();
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
          // Il profilo sul server vince su quello del dispositivo, tranne se sul telefono ci sono
          // progressi più recenti dello stesso account (partite fatte offline)
          const loc = window.Progression.data || {};
          const piuRecenteQui = loc._uid === u.uid && (loc._modificato || 0) > (data.progression._modificato || 0);
          if (piuRecenteQui) this.queueSave();
          else window.Progression.data = { ...window.Progression.getDefaultData(), ...data.progression };
          window.Progression.data._uid = u.uid;
          window.Progression.save(true);
        } else {
          // Account nuovo: profilo pulito (niente dati rimasti sul dispositivo da altri account),
          // tranne quando un ospite senza account si registra: tiene i suoi progressi
          window.Progression.data = this._portaDati ? { ...window.Progression.getDefaultData(), ...this._portaDati } : window.Progression.getDefaultData();
          this._portaDati = null; this.ospiteLocale = false;
          window.Progression.data._uid = u.uid;
          if (window.Collezione) window.Collezione.migra();
          this.profile = {
            nickname: (snap.exists && snap.data().nickname) || this._pendingNick || (u.isAnonymous ? 'Ospite' : (u.email || 'Eroe').split('@')[0]),
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
      if (window.Tutorial && window.Tutorial.serve()) {
        // Primo accesso: si parte subito con la prima missione della Storia, che fa da tutorial
        window.Tutorial.avvia();
      } else {
        window.UI.showScreen('scr-lobby');
        window.UI.showToast(`Bentornato, ${this.nickname()}!`);
      }
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
          if (this.user && this.user.isAnonymous) {
            // L'ospite diventa un account vero e tiene tutti i progressi
            const cred = firebase.auth.EmailAuthProvider.credential(email, pass);
            await this.user.linkWithCredential(cred);
            this.profile = { ...(this.profile || {}), nickname: this._pendingNick };
            await this.db.collection('users').doc(this.user.uid).set({ nickname: this._pendingNick, progression: window.Progression.data }, { merge: true });
            document.body.classList.remove('needs-auth');
            this.updateBadge();
            window.UI.showScreen('scr-lobby');
            window.UI.showToast('Account creato: i tuoi progressi sono salvi.');
            return false;
          }
          if (this.ospiteLocale) this._portaDati = JSON.parse(JSON.stringify(window.Progression.data));
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
      if (!(await window.Dialogo.conferma('Vuoi uscire dal tuo account?', { ok: 'Esci' }))) return;
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
      el.textContent = this.isGuest() ? 'SALVA PROGRESSI' : (this.user ? `ESCI (${this.nickname()})` : 'ACCEDI');
    }
  };

  window.Account = Account;
  window.addEventListener('DOMContentLoaded', () => {
    Account.setTab('login');
    Account.init();
  });
})();
