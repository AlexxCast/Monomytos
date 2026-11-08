// Monomythos: statistiche anonime delle visite (GoatCounter, gratis, senza cookie).
// Conta le aperture del sito/demo e alcuni passi del gioco come "eventi" (evento/...).
// Niente dati personali: solo il nome del passo. Il pannello è su https://monomythos.goatcounter.com
(function () {
  const CODICE = 'monomythos';
  const app = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  // app / demo (sito pubblico) / completo (?completo=1): deciso al momento, la classe is-demo arriva dopo
  const prefisso = () => app ? 'app/' : (window.Demo && window.Demo.attiva ? 'demo/' : 'web/');
  const coda = [];
  const invia = (path, title, event) => {
    const gc = window.goatcounter;
    if (gc && gc.count) gc.count({ path, title: title || path, event: !!event });
    else coda.push([path, title, event]);
  };
  const Visite = window.Visite = {
    evento(nome, titolo) { try { invia(prefisso() + nome, titolo || nome, true); } catch (e) { /* le statistiche non devono mai bloccare il gioco */ } }
  };
  window.goatcounter = Object.assign(window.goatcounter || {}, { no_onload: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${CODICE}.goatcounter.com/count`;
  s.onload = () => {
    try {
      window.goatcounter.count({ path: prefisso() + (location.pathname.replace(/^\/Monomytos\/?/, '') || 'inizio') });
      coda.splice(0).forEach(a => invia(...a));
    } catch (e) {}
  };
  document.head.appendChild(s);

  // Passi del gioco da contare
  const avvolgi = (obj, nome, fn) => {
    if (!obj || typeof obj[nome] !== 'function') return;
    const orig = obj[nome];
    obj[nome] = function (...a) { try { fn.apply(this, a); } catch (e) {} return orig.apply(this, a); };
  };
  const collega = () => {
    avvolgi(window.Collezione, 'scegliStarter', nome => Visite.evento('starter-scelto', 'Starter scelto: ' + nome));
    avvolgi(window.Storia, 'avvia', m => m && Visite.evento('missione-iniziata/' + m.id, 'Missione iniziata: ' + (m.titolo || m.id)));
    avvolgi(window.Storia, 'esito', (m, vinto) => m && Visite.evento((vinto ? 'missione-vinta/' : 'missione-persa/') + m.id, (vinto ? 'Missione vinta: ' : 'Missione persa: ') + (m.titolo || m.id)));
    avvolgi(window.Demo, 'blocca', cosa => Visite.evento('demo-lucchetto', 'Lucchetto demo: ' + (cosa || '')));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', collega); else collega();
})();
