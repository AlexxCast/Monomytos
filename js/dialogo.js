// Finestre di conferma e avviso nello stile del gioco, al posto dei popup del sistema
// (che sul telefono hanno la grafica di Android e non si traducono bene).
// Dialogo.conferma(testo) restituisce una Promise<boolean>; Dialogo.avviso(testo) una Promise.
(function () {
  const T = (s) => (window.I18N ? window.I18N.t(s) : s);
  let coda = Promise.resolve();

  function apri(testo, { ok = 'OK', annulla = null, titolo = null, pericolo = false } = {}) {
    // una finestra alla volta: le altre aspettano il loro turno
    const p = coda.then(() => new Promise(fine => {
      const ov = document.createElement('div');
      ov.className = 'dlg-overlay';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = `<div class="dlg-box">
          ${titolo ? '<div class="dlg-titolo"></div>' : ''}
          <div class="dlg-testo"></div>
          <div class="dlg-azioni">
            ${annulla ? '<button type="button" class="btn btn-subtle dlg-no"></button>' : ''}
            <button type="button" class="btn btn-primary dlg-si${pericolo ? ' dlg-pericolo' : ''}"></button>
          </div>
        </div>`;
      if (titolo) ov.querySelector('.dlg-titolo').textContent = T(titolo);
      ov.querySelector('.dlg-testo').textContent = T(testo);
      ov.querySelector('.dlg-si').textContent = T(ok);
      if (annulla) ov.querySelector('.dlg-no').textContent = T(annulla);
      const chiudi = (v) => {
        document.removeEventListener('keydown', tasti, true);
        ov.classList.add('via');
        setTimeout(() => ov.remove(), 160);
        fine(v);
      };
      const tasti = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); chiudi(false); }
        else if (e.key === 'Enter') { e.preventDefault(); chiudi(true); }
      };
      ov.querySelector('.dlg-si').onclick = (e) => { e.stopPropagation(); chiudi(true); };
      if (annulla) ov.querySelector('.dlg-no').onclick = (e) => { e.stopPropagation(); chiudi(false); };
      ov.onclick = (e) => { if (e.target === ov) chiudi(!annulla); };
      document.addEventListener('keydown', tasti, true);
      document.body.appendChild(ov);
      try { window.AudioEngine && window.AudioEngine.playSfx && window.AudioEngine.playSfx('tap'); } catch (e) {}
      setTimeout(() => { const b = ov.querySelector('.dlg-si'); if (b) b.focus(); }, 30);
    }));
    coda = p.catch(() => {});
    return p;
  }

  window.Dialogo = {
    conferma(testo, opz = {}) { return apri(testo, { ok: opz.ok || 'Conferma', annulla: opz.annulla || 'Annulla', titolo: opz.titolo, pericolo: opz.pericolo }); },
    avviso(testo, opz = {}) { return apri(testo, { ok: opz.ok || 'OK', titolo: opz.titolo }); }
  };

  // Crediti guadagnati a fine partita: un riquadro grande con il numero che sale
  // e poi il nuovo saldo, così si vede bene quanto si è guadagnato
  window.Premio = {
    html(guadagno, totale) {
      if (!(guadagno > 0)) return '';
      return `<div class="premio-cr" data-gu="${guadagno}" data-tot="${totale}">
          <div class="premio-cr-riga"><span class="premio-cr-moneta">CR</span><b class="premio-cr-num" data-no-i18n>+0</b></div>
          <div class="premio-cr-label">${T('Crediti guadagnati')}</div>
          <div class="premio-cr-saldo"><span>${T('Saldo')}</span> <b data-no-i18n>${Math.max(0, totale - guadagno)}</b> CR</div>
        </div>`;
    },
    anima(root) {
      const box = root && root.querySelector('.premio-cr');
      if (!box) return;
      const gu = +box.dataset.gu || 0, tot = +box.dataset.tot || 0, da = Math.max(0, tot - gu);
      const num = box.querySelector('.premio-cr-num'), saldo = box.querySelector('.premio-cr-saldo b');
      const durata = Math.min(1600, 500 + gu * 4), t0 = performance.now() + 350;
      try { window.AudioEngine && window.AudioEngine.playSfx && window.AudioEngine.playSfx('heal'); } catch (e) {}
      const passo = (ora) => {
        const k = Math.max(0, Math.min(1, (ora - t0) / durata)), e = 1 - Math.pow(1 - k, 3);
        num.textContent = '+' + Math.round(gu * e);
        saldo.textContent = Math.round(da + gu * e);
        if (k < 1) requestAnimationFrame(passo);
        else { box.classList.add('fatto'); document.querySelectorAll('.creditsDisplay').forEach(el => { el.textContent = tot; }); }
      };
      requestAnimationFrame(passo);
    }
  };

  // Anche gli alert rimasti nel codice usano la finestra del gioco
  window.alert = (m) => { window.Dialogo.avviso(String(m == null ? '' : m)); };
})();
