// Testi che si adattano al loro spazio: se un nome è troppo lungo (titolo di una carta, nome di una
// Minaccia o di un eroe) il carattere si rimpicciolisce quel tanto che basta per farlo stare nei bordi,
// invece di essere tagliato. Funziona in tutte le lingue e con qualsiasi lunghezza.
(function () {
  // elementi da adattare e quanto possono rimpicciolirsi al massimo (frazione della dimensione normale)
  const REGOLE = [
    ['.card-vignette-title', 0.55],
    ['.card-vignette-tag', 0.7],
    ['.card-circle-val', 0.7],
    ['.threat-card-title, .threat-card-tag, .threat-card-effect-title, .threat-draw-front-name', 0.55],
    ['.target-cand-name, .rogue-boss-name, .parry-card-title, .creation-picker-card-name, .companion-name-txt', 0.65],
    ['.home-hero-name, .starter-deck', 0.6],
    ['.btn-pb, .builder-card-details-top h4, .track-lbl', 0.7],
    ['.sheet-header h3, #sheetCardName', 0.7],
    ['[data-adatta]', 0.6]
  ];
  const SEL = REGOLE.map(r => r[0]).join(', ');
  const minimo = el => { for (const [s, m] of REGOLE) if (el.matches(s)) return m; return 0.6; };

  const trabocca = el => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;

  function adatta(el) {
    if (!el.isConnected) return;
    el.style.fontSize = '';
    el.classList.remove('adatta-spezza');
    if (!el.clientWidth || !el.clientHeight || !trabocca(el)) return;
    const base = parseFloat(getComputedStyle(el).fontSize) || 12;
    const min = Math.max(6, base * minimo(el));
    let size = base;
    while (trabocca(el) && size > min) {
      size = Math.max(min, size - Math.max(0.5, base * 0.04));
      el.style.fontSize = size + 'px';
    }
    // una sola parola lunghissima: meglio andare a capo dentro la parola che uscire dal bordo
    if (trabocca(el)) el.classList.add('adatta-spezza');
  }

  let coda = new Set(), previsto = false;
  function pianifica(el) {
    coda.add(el);
    if (previsto) return;
    previsto = true;
    requestAnimationFrame(() => {
      previsto = false;
      const lista = [...coda]; coda = new Set();
      lista.forEach(adatta);
    });
  }

  // quando un elemento cambia dimensione (diventa visibile, cambia schermata o orientamento) si riadatta
  const visti = new WeakSet();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(voci => voci.forEach(v => {
    const el = v.target;
    const k = Math.round(v.contentRect.width) + 'x' + Math.round(v.contentRect.height);
    if (el._adattaK === k) return;
    el._adattaK = k;
    pianifica(el);
  })) : null;

  function registra(el) {
    if (visti.has(el)) { pianifica(el); return; }
    visti.add(el);
    if (ro) ro.observe(el);
    pianifica(el);
  }
  function cerca(n) {
    if (n.nodeType !== 1) { if (n.parentElement && n.parentElement.matches(SEL)) registra(n.parentElement); return; }
    if (n.matches(SEL)) registra(n);
    n.querySelectorAll(SEL).forEach(registra);
    const p = n.parentElement && n.parentElement.closest(SEL);
    if (p) registra(p);
  }

  function avvia() {
    cerca(document.body);
    new MutationObserver(muts => muts.forEach(m => {
      if (m.type === 'characterData') { const p = m.target.parentElement && m.target.parentElement.closest(SEL); if (p) pianifica(p); }
      else m.addedNodes.forEach(cerca);
    })).observe(document.body, { childList: true, subtree: true, characterData: true });
    // i caratteri del gioco arrivano dopo: si ricontrolla tutto quando sono pronti
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => document.querySelectorAll(SEL).forEach(pianifica));
  }

  window.Adatta = { adatta, tutto: () => document.querySelectorAll(SEL).forEach(pianifica) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
