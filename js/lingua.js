// Lingua del gioco: italiano (testi originali) o inglese.
// I testi restano in italiano nel codice e nei dati; in inglese vengono tradotti mentre appaiono a schermo,
// frase per frase, usando il dizionario di js/lingua_en.js. I numeri dentro le frasi sono scritti come {n}.
(function () {
  const CHIAVE = 'monomythos_lingua';
  let lang = 'it', scelta = false;
  try {
    scelta = !!localStorage.getItem(CHIAVE);
    lang = localStorage.getItem(CHIAVE) || ((navigator.language || 'it').toLowerCase().startsWith('it') ? 'it' : 'en');
  } catch (e) { scelta = true; }

  const SPLIT = /(?<=[.!?;])\s+(?=[\[A-ZÀ-Ù0-9+«"(])/;
  const dict = () => window.MONOMYTHOS_EN || {};

  function cerca(s) {
    const D = dict();
    if (D[s] !== undefined) return D[s];
    if (!/\d/.test(s)) return null;
    const nums = s.match(/\d+/g);
    const k = s.replace(/\d+/g, '{n}');
    const v = D[k];
    if (v === undefined) return null;
    let i = 0;
    return v.replace(/\{n\}/g, () => (i < nums.length ? nums[i++] : ''));
  }

  let _regole = null;
  function regole(core) {
    if (!_regole) _regole = (window.MONOMYTHOS_EN_REGOLE || []).map(([re, out]) => [new RegExp(re), out]);
    for (const [re, out] of _regole) {
      const m = core.match(re);
      if (m) return out.replace(/\$(\d)/g, (x, k) => { const g = m[+k]; return g == null ? '' : t(g); });
    }
    return null;
  }

  function una(core, senzaRegole) {
    let r = cerca(core);
    if (r != null) return r;
    const q = core.match(/^\[([^\]]+)\]$/);
    if (q) { const x = cerca(q[1]); if (x != null) return '[' + x + ']'; }
    // frase senza il punto finale (es. versione breve dell'effetto sulla carta)
    const x = cerca(core + '.');
    if (x != null) return x.replace(/\.$/, '');
    const y = brevi().get(core);
    if (y) return y;
    return senzaRegole ? null : regole(core);
  }

  // Versione breve degli effetti (prima frase senza punteggiatura finale), in tutte e due le lingue
  let _brevi = null;
  function brevi() {
    if (_brevi) return _brevi;
    _brevi = new Map();
    const D = dict();
    Object.keys(D).forEach(k => {
      const a = k.match(/^(.{6,}?)[.;:!](\s|$)/), b = String(D[k]).match(/^(.{4,}?)[.;:!](\s|$)/);
      if (a && b && !_brevi.has(a[1])) _brevi.set(a[1], b[1]);
    });
    return _brevi;
  }

  // Traduce una frase o un paragrafo; ciò che non è nel dizionario resta com'è
  function t(testo) {
    if (lang !== 'en' || testo == null) return testo;
    const s = String(testo);
    const core = s.replace(/\s+/g, ' ').trim();
    if (!core || !/[A-Za-zÀ-ÿ]/.test(core)) return s;
    const spezzabile = SPLIT.test(core);
    let r = una(core, spezzabile);
    // una frase con nomi variabili può contenere un "!" o un "." nel mezzo: prima prova le regole sull'intera frase
    if (r == null && spezzabile) r = regole(core);
    if (r == null && spezzabile) {
      const parti = core.split(SPLIT);
      let cambiato = false;
      r = parti.map(p => { const x = una(p); if (x != null) { cambiato = true; return x; } return p; }).join(' ');
      if (!cambiato) r = null;
    }
    if (r == null) return s;
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    return lead + r + trail;
  }

  const SALTA = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE)$/;
  const ATTR = ['placeholder', 'title', 'aria-label'];
  function traduciNodo(n) {
    if (n.nodeType === 3) {
      const p = n.parentNode;
      if (!p || SALTA.test(p.nodeName) || (p.closest && p.closest('.ss-testo, [data-no-i18n]'))) return;
      const v = n.nodeValue;
      if (!v || v.length > 600 || !/[A-Za-zÀ-ÿ]{2}/.test(v)) return;
      const r = t(v);
      if (r !== v) n.nodeValue = r;
      return;
    }
    if (n.nodeType !== 1 || SALTA.test(n.nodeName) || n.hasAttribute('data-no-i18n')) return;
    ATTR.forEach(a => { const v = n.getAttribute(a); if (v) { const r = t(v); if (r !== v) n.setAttribute(a, r); } });
    if (n.nodeName === 'INPUT' && (n.type === 'button' || n.type === 'submit') && n.value) { const r = t(n.value); if (r !== n.value) n.value = r; }
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let x = w.nextNode();
    while (x) {
      if (x.nodeType === 3) traduciNodo(x);
      else ATTR.forEach(a => { const v = x.getAttribute && x.getAttribute(a); if (v) { const r = t(v); if (r !== v) x.setAttribute(a, r); } });
      x = w.nextNode();
    }
  }

  // Al primissimo avvio si sceglie la lingua, prima dell'accesso e del tutorial
  function mostraScelta() {
    if (scelta || navigator.webdriver || document.getElementById('sceltaLingua')) return;
    const el = document.createElement('div');
    el.id = 'sceltaLingua';
    el.className = 'scelta-lingua';
    el.setAttribute('data-no-i18n', '');
    el.innerHTML = `<div class="scelta-lingua-box">
        <img src="assets/icons/logo_titolo.webp" alt="Monomythos" class="scelta-lingua-logo">
        <div class="scelta-lingua-titolo">Scegli la lingua<br><small>Choose your language</small></div>
        <button type="button" class="btn btn-primary" data-l="it">ITALIANO</button>
        <button type="button" class="btn btn-primary" data-l="en">ENGLISH</button>
        <div class="scelta-lingua-nota">Puoi cambiarla quando vuoi dal menu · You can change it anytime from the menu</div>
      </div>`;
    el.querySelectorAll('button').forEach(b => b.onclick = () => {
      const l = b.dataset.l;
      try { localStorage.setItem(CHIAVE, l); } catch (e) {}
      scelta = true;
      if (l !== lang) { location.reload(); return; }
      el.classList.add('via');
      setTimeout(() => el.remove(), 250);
    });
    document.body.appendChild(el);
  }

  function avvia() {
    document.documentElement.lang = lang;
    aggiornaPulsante();
    mostraScelta();
    if (lang !== 'en') return;
    document.title = t(document.title);
    traduciNodo(document.body);
    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'characterData') traduciNodo(m.target);
        else if (m.type === 'attributes') { const v = m.target.getAttribute(m.attributeName); if (v) { const r = t(v); if (r !== v) m.target.setAttribute(m.attributeName, r); } }
        else m.addedNodes.forEach(traduciNodo);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
    // finestre di sistema
    const a = window.alert, c = window.confirm, p = window.prompt;
    window.alert = m => a.call(window, t(m));
    window.confirm = m => c.call(window, t(m));
    window.prompt = (m, d) => p.call(window, t(m), d);
  }

  function aggiornaPulsante() {
    document.querySelectorAll('.btn-lingua').forEach(b => { b.textContent = lang === 'en' ? 'ITALIANO' : 'ENGLISH'; });
  }

  window.I18N = {
    get lang() { return lang; },
    get scelta() { return scelta; },
    t,
    imposta(l) {
      lang = l === 'en' ? 'en' : 'it';
      try { localStorage.setItem(CHIAVE, lang); } catch (e) {}
      location.reload();
    },
    cambia() { this.imposta(lang === 'en' ? 'it' : 'en'); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
