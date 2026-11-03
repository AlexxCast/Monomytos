// Monomythos: fumo e scintille animati sul campo di battaglia durante la partita.
// Colori presi dagli sfondi: Eroe = verde acqua, oro e grigio-azzurro; Villain = magenta, viola e rosso.
(function () {
  const PALETTE = {
    eroe: {
      scintille: ['255,196,92', '255,226,150', '94,240,220', '140,255,236'],
      fumo: ['120,160,170', '90,130,140', '150,175,170']
    },
    villain: {
      scintille: ['255,70,120', '230,90,255', '255,120,80', '190,60,255'],
      fumo: ['110,60,90', '90,45,80', '130,70,100']
    }
  };
  const ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cv, ctx, W = 0, H = 0, dpr = 1, raf = null, last = 0;
  const scintille = [], fumo = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const tema = () => (document.documentElement.classList.contains('theme-villain') || document.body.classList.contains('theme-villain')) ? 'villain' : 'eroe';

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function nuovaScintilla(t, ovunque) {
    const p = PALETTE[t];
    return {
      x: rnd(0, W), y: ovunque ? rnd(H * 0.2, H) : H + rnd(0, 40),
      vx: rnd(-12, 12), vy: rnd(-70, -25), r: rnd(0.8, 2.4),
      vita: 0, durata: rnd(3, 7), c: pick(p.scintille), fase: rnd(0, 6.28), t
    };
  }
  function nuovoFumo(t, ovunque) {
    const p = PALETTE[t];
    return {
      x: rnd(-W * 0.1, W * 1.1), y: ovunque ? rnd(H * 0.3, H) : H + rnd(40, 160),
      vx: rnd(-6, 6), vy: rnd(-18, -8), r: rnd(60, 140), cresce: rnd(6, 14),
      vita: 0, durata: rnd(14, 24), c: pick(p.fumo), a: rnd(0.08, 0.16), t
    };
  }

  function popola() {
    const t = tema();
    const nS = Math.round(Math.min(70, W / 10)), nF = Math.round(Math.min(12, W / 90));
    scintille.length = 0; fumo.length = 0;
    for (let i = 0; i < nS; i++) scintille.push(nuovaScintilla(t, true));
    for (let i = 0; i < nF; i++) fumo.push(nuovoFumo(t, true));
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!document.body.classList.contains('in-match') || document.hidden) { last = ts; return; }
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    const t = tema();
    ctx.clearRect(0, 0, W, H);

    // Fumo: grandi sbuffi morbidi che salgono lenti
    ctx.globalCompositeOperation = 'source-over';
    fumo.forEach((f, i) => {
      f.vita += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.cresce * dt;
      const k = f.vita / f.durata;
      if (k >= 1 || f.y + f.r < 0) { fumo[i] = nuovoFumo(t, false); return; }
      const a = f.a * Math.sin(Math.PI * k);
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, `rgba(${f.c},${a})`);
      g.addColorStop(1, `rgba(${f.c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
    });

    // Scintille: braci luminose che salgono ondeggiando e tremolano
    ctx.globalCompositeOperation = 'lighter';
    scintille.forEach((s, i) => {
      s.vita += dt; s.fase += dt * 3;
      s.x += (s.vx + Math.sin(s.fase) * 14) * dt; s.y += s.vy * dt;
      const k = s.vita / s.durata;
      if (k >= 1 || s.y < -10) { scintille[i] = nuovaScintilla(t, false); return; }
      const a = Math.sin(Math.PI * k) * (0.6 + 0.4 * Math.sin(s.fase * 2.7));
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      g.addColorStop(0, `rgba(${s.c},${a})`);
      g.addColorStop(0.35, `rgba(${s.c},${a * 0.45})`);
      g.addColorStop(1, `rgba(${s.c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4, 0, 6.283); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function avvia() {
    if (ridotto || cv) return;
    cv = document.createElement('canvas');
    cv.id = 'campoParticelle';
    cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    ctx = cv.getContext('2d');
    resize(); popola();
    window.addEventListener('resize', () => { resize(); popola(); });
    // Quando si passa da Eroe a Villain (o viceversa) i colori cambiano subito
    let ultimo = tema();
    new MutationObserver(() => { const t = tema(); if (t !== ultimo) { ultimo = t; popola(); } })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    raf = requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
