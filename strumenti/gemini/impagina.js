// Impagina le carte come appaiono nel gioco (cornice, fumetto del titolo, riquadro dell'effetto)
// per controllare che il soggetto sia ben centrato e non coperto.
// Uso: node strumenti/gemini/impagina.js out.png [id ...]   (id = t_xxx, c_xxx, eroe_xxx; vuoto = tutte le Minacce)
// Le righe gialle segnano la finestra libera dell'illustrazione.
const { chromium } = require('playwright');
const R = require('path').resolve(__dirname, '..', '..');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1700, height: 1000 } });
  await p.goto('file://' + R + '/index.html');
  await p.waitForTimeout(1500);
  const out = process.argv[2], ids = process.argv.slice(3);
  await p.evaluate((ids) => {
    const D = window.MONOMYTHOS_DATA, tutte = [], vis = new Set();
    (function walk(o) {
      if (!o || typeof o !== 'object') return;
      const img = o.img || '';
      if ((o.nome || o.name) && /\/gen\/[a-z0-9_]+\.webp$/.test(img) && !vis.has(img)) { vis.add(img); tutte.push(o); }
      Object.values(o).forEach(walk);
    })(D);
    const id = o => o.img.match(/gen\/([a-z0-9_]+)\.webp$/)[1];
    const sel = ids.length ? ids.map(i => tutte.find(o => id(o) === i)).filter(Boolean) : tutte.filter(o => id(o).startsWith('t_'));
    document.body.innerHTML = '<div id="g" style="display:flex;flex-wrap:wrap;gap:10px;padding:10px;background:#111;width:1660px"></div>';
    const g = document.getElementById('g');
    sel.forEach(o => {
      const d = document.createElement('div');
      d.style.cssText = 'width:230px;position:relative;color:#fff;font:12px sans-serif';
      if (id(o).startsWith('t_')) {
        d.innerHTML = UI.threatPeekDOM(o).replace(' is-printed', '').replace(/<div class="peek-info">[\s\S]*$/, '');
        d.firstElementChild.style.width = '230px';
      } else {
        const c = o.nome ? o : { nome: o.name, img: o.img, tag: o.role, effetto: o.testo, cat: o.role };
        d.innerHTML = UI.getCardDOM(c, true);
        d.firstElementChild.style.width = '230px';
      }
      d.insertAdjacentHTML('beforeend', '<div>' + id(o) + '</div>');
      g.appendChild(d);
    });
  }, ids);
  await p.waitForTimeout(2000);
  await (await p.$('#g')).screenshot({ path: out });
  await b.close();
})();
