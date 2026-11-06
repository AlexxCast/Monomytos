// Monomythos: versione DEMO del sito web.
// Sul sito (browser) si gioca un'anteprima: il primo capitolo della Storia, l'allenamento con i bot e l'Eroe Corrotto.
// Collezione, bustine, negozio, partite online e scambi restano per il gioco completo su Google Play.
// L'app Android (Capacitor) carica lo stesso sito ma resta COMPLETA: viene riconosciuta e la demo non si attiva.
//
// Come avere il gioco completo anche dal browser (per Alessio e per i tester):
//   aprire il sito con ?completo=1 alla fine dell'indirizzo (resta salvato su quel browser);
//   ?completo=0 torna alla demo.
(function () {
  // ----- Impostazioni da cambiare a mano -----
  const DATA_LANCIO = 'dicembre 2026';
  // Link alla preregistrazione su Google Play: quando esiste, incollarlo qui e il pulsante lo apre
  const LINK_PLAY = '';
  const SOCIAL = '@monomythosgame';
  // Capitoli della Storia giocabili nella demo (contati dall'inizio)
  const CAPITOLI_DEMO = 2;

  const CHIAVE = 'monomythos_completo';

  function rilevaApp() {
    try {
      const C = window.Capacitor;
      if (C && (typeof C.isNativePlatform === 'function' ? C.isNativePlatform() : C.isNative)) return true;
    } catch (e) {}
    // WebView di Android (l'app): lo user agent contiene "; wv)"
    if (/; wv\)/.test(navigator.userAgent || '')) return true;
    return false;
  }

  function sceltaManuale() {
    try {
      const p = new URLSearchParams(location.search).get('completo');
      if (p === '1') localStorage.setItem(CHIAVE, '1');
      if (p === '0') localStorage.removeItem(CHIAVE);
      return localStorage.getItem(CHIAVE) === '1';
    } catch (e) { return false; }
  }

  const completo = rilevaApp() || navigator.webdriver === true || sceltaManuale();

  const Demo = {
    attiva: !completo,
    t: s => (window.I18N ? window.I18N.t(s) : s),
    DATA_LANCIO, LINK_PLAY, SOCIAL, CAPITOLI_DEMO,

    // Finestra che spiega cosa c'è nel gioco completo
    blocca(cosa) {
      const T = Demo.t;
      const testo = `${T(cosa)} ${T('è disponibile nel gioco completo su Google Play, in uscita a')} ${T(DATA_LANCIO)}.\n\n` +
        (LINK_PLAY
          ? T('Preregistrati ora: al lancio ricevi una bustina esclusiva.')
          : `${T('Segui')} ${SOCIAL} ${T('per sapere quando esce e ricevere una bustina esclusiva al lancio.')}`);
      const D = window.Dialogo;
      if (!D) return;
      if (LINK_PLAY) {
        D.conferma(testo, { titolo: T('Versione demo'), ok: T('Preregistrati'), annulla: T('Più tardi') })
          .then(ok => { if (ok) window.open(LINK_PLAY, '_blank', 'noopener'); });
      } else {
        D.avviso(testo, { titolo: T('Versione demo') });
      }
    },

    // Avvolge un metodo: nella demo mostra il messaggio invece di aprire la funzione
    chiudi(obj, nome, cosa) {
      if (!obj || typeof obj[nome] !== 'function') return;
      const orig = obj[nome];
      obj[nome] = function (...a) {
        if (Demo.attiva) { Demo.blocca(cosa); return; }
        return orig.apply(this, a);
      };
    },

    capitoloDemo(m) {
      const S = window.Storia;
      if (!S || !S.CAPITOLI) return true;
      const cap = S.capitoloDi(m);
      const i = S.CAPITOLI.indexOf(cap);
      return i >= 0 && i < CAPITOLI_DEMO;
    },

    banner() {
      const T = Demo.t;
      const side = document.querySelector('#scr-lobby .home-side');
      if (!side || side.querySelector('.demo-banner')) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'demo-banner';
      b.setAttribute('data-no-i18n', '');
      b.innerHTML = `<b>${T('VERSIONE DEMO')}</b><small>${T('Gioco completo su Google Play a')} ${T(DATA_LANCIO)}</small>`;
      b.onclick = () => Demo.blocca('Il gioco con collezione, bustine e partite online');
      side.insertBefore(b, side.firstChild);
    },

    avvia() {
      document.documentElement.classList.toggle('is-demo', Demo.attiva);
      if (!Demo.attiva) return;
      const UI = window.UI, S = window.Storia;

      // Collezione, negozio, online, scambi: solo nel gioco completo
      this.chiudi(UI, 'openDeckBuilder', 'La collezione e il mazzo personalizzato');
      this.chiudi(UI, 'openShop', 'Il negozio con le bustine');
      this.chiudi(UI, 'openMultiplayerModal', 'Giocare online con gli amici');
      this.chiudi(UI, 'joinMultiplayerRoom', 'Giocare online con gli amici');
      this.chiudi(window.Online, 'cercaPartita', 'La partita Classificata online');
      this.chiudi(window.Scambi, 'apri', 'Lo scambio di carte');
      this.chiudi(window.Collezione, 'apriMinacce', 'Il mazzo delle Minacce');
      if (window.Online) window.Online._pendingJoin = null;

      // Storia: solo il primo capitolo
      if (S) {
        const sbloccata = S.sbloccata, gioca = S.gioca, render = S.render;
        S.sbloccata = function (id) {
          const m = this.missione(id);
          if (m && !Demo.capitoloDemo(m)) return false;
          return sbloccata.call(this, id);
        };
        S.gioca = function (id) {
          const m = this.missione(id);
          if (m && !Demo.capitoloDemo(m)) return Demo.blocca('Il resto della Storia');
          return gioca.call(this, id);
        };
        S.render = function (...a) {
          const r = render.apply(this, a);
          const T = Demo.t;
          const box = document.getElementById('storiaPercorso');
          if (box && !box.querySelector('.demo-storia')) {
            const caps = box.querySelectorAll('.sp-capitolo');
            const dopo = caps[CAPITOLI_DEMO];
            if (dopo) {
              const avviso = document.createElement('button');
              avviso.type = 'button';
              avviso.className = 'demo-storia';
              avviso.setAttribute('data-no-i18n', '');
              avviso.innerHTML = `<b>${T('Fine della demo')}</b><small>${T('I capitoli successivi sono nel gioco completo su Google Play, in uscita a')} ${T(DATA_LANCIO)}.</small>`;
              avviso.onclick = () => Demo.blocca('Il resto della Storia');
              box.insertBefore(avviso, dopo);
            }
          }
          return r;
        };
      }
      this.banner();
    }
  };

  // Traduzioni inglesi dei testi della demo
  Object.assign(window.MONOMYTHOS_EN = window.MONOMYTHOS_EN || {}, {
    'è disponibile nel gioco completo su Google Play, in uscita a': 'is available in the full game on Google Play, coming in',
    'Preregistrati ora: al lancio ricevi una bustina esclusiva.': 'Pre-register now: you get an exclusive pack at launch.',
    'Segui': 'Follow',
    'per sapere quando esce e ricevere una bustina esclusiva al lancio.': 'to know when it comes out and get an exclusive pack at launch.',
    'Versione demo': 'Demo version',
    'Preregistrati': 'Pre-register',
    'Più tardi': 'Later',
    'VERSIONE DEMO': 'DEMO VERSION',
    'Gioco completo su Google Play a': 'Full game on Google Play in',
    'Il gioco con collezione, bustine e partite online': 'The game with collection, packs and online matches',
    'La collezione e il mazzo personalizzato': 'The collection and custom deck',
    'Il negozio con le bustine': 'The pack shop',
    'Giocare online con gli amici': 'Playing online with friends',
    'La partita Classificata online': 'Online Ranked matches',
    'Lo scambio di carte': 'Card trading',
    'Il mazzo delle Minacce': 'The Threat deck',
    'Il resto della Storia': 'The rest of the Story',
    'Fine della demo': 'End of the demo',
    'I capitoli successivi sono nel gioco completo su Google Play, in uscita a': 'The next chapters are in the full game on Google Play, coming in',
    'dicembre 2026': 'December 2026'
  });

  window.Demo = Demo;
  // Si attiva dopo UI.init (che parte a DOMContentLoaded)
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => {
    try { Demo.avvia(); } catch (e) { console.error('Demo:', e); }
  }, 0));
})();
