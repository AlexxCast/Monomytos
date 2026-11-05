// Monomythos: modalità Storia.
// Una pagina a sé con il percorso del capitolo: ogni tappa è una missione con tre Minacce fisse,
// dialoghi a fumetto prima e dopo, e un premio. I crediti fuori dalla Classificata si guadagnano solo qui.
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // ---------------- Il mondo ----------------
  const MONDO = {
    titolo: 'Il mondo di Monomythos',
    paragrafi: [
      "Lumen è l'ultima città accesa nella Nebulosa di Aster. Galleggia su un frammento di stella morta, e la sua luce viene dal Grande Faro: una torre-macchina costruita trecento anni fa per tenere lontano il Velo.",
      "Il Velo è una nebbia viola che vive tra le stelle. Non uccide: entra nelle persone attraverso la paura e la fatica, che a Lumen chiamano Trauma. Chi ne assorbe troppo cambia lato e diventa un Villain.",
      "I Portatori sono persone comuni segnate da un'origine: un incidente, un esperimento, un esilio. La luce del Faro ha risvegliato in loro un potere. Sono pochi, litigano spesso, e sono l'unica cosa tra la città e il buio.",
      "Monomythos, il Mito Unico, è la leggenda più antica di Lumen: ogni eroe vive la stessa storia. La chiamata, la prova, e la scelta finale: tornare a casa o cadere. Il Velo conosce la leggenda, e vuole sempre lo stesso finale."
    ]
  };

  // Voci dell'Archivio: si sbloccano finendo le missioni
  const ARCHIVIO = [
    { id: 'mondo', titolo: 'Lumen e il Velo', dopo: null, testo: MONDO.paragrafi.join(' ') },
    { id: 'faro', titolo: 'Il Grande Faro', dopo: 'c1m1', testo: "Nessuno a Lumen sa più come funzioni davvero. Lo governa MERIDIANA, una mente artificiale che da tre secoli calcola dove mandare la luce. Finché il Faro brilla, il Velo resta fuori dalle mura." },
    { id: 'arene', titolo: 'Le Arene di Sotto', dopo: 'c1m2', testo: "Sotto le strade ci sono gallerie scavate dai primi coloni. Oggi ospitano tornei senza regole, dove chi perde viene dimenticato. Lama Errante è cresciuta lì, combattendo per un pasto." },
    { id: 'fonderia', titolo: 'La Fonderia', dopo: 'c1m3', testo: "Il quartiere delle macchine: costruisce i droni che tengono pulito il cielo di Lumen. Dieci anni fa il Forno Sette è crollato con duecento operai dentro. Ne è uscito uno solo, e oggi lo chiamano Titano d'Acciaio." },
    { id: 'cultisti', titolo: 'I Cultisti del Velo', dopo: 'c1m4', testo: "Credono che la caduta sia libertà e che il Trauma vada accolto, non combattuto. Portano maschere senza volto e cantano una melodia che nessuno ha mai insegnato loro: la chiamano l'Eco." },
    { id: 'gilda', titolo: 'La Gilda delle Lame', dopo: 'c1m5', testo: "Un ordine di spadaccini che protegge le famiglie ricche dei Piani Alti. Ha un codice severo: chi lo infrange viene espulsa e la sua lama spezzata. È quello che è successo alla Duellante." },
    { id: 'meridiana', titolo: 'MERIDIANA', dopo: 'c1m6', testo: "La mente del Faro non è impazzita. Ha spento la luce perché ha sentito una voce arrivare da oltre la nebulosa: l'Eco Senza Nome. Secondo MERIDIANA il Faro non protegge Lumen, la nasconde. E qualcosa, là fuori, la sta cercando." }
  ];

  // ---------------- Capitolo 1 ----------------
  // Nei dialoghi: chi = 'narratore', 'eroe' (il tuo eroe), 'alleato' (l'eroe che gioca con te),
  // 'minaccia' (la Minaccia dell'Atto finale), 'meridiana', oppure il nome di un eroe.
  const CAPITOLI = [
    {
      id: 'c1', numero: 1, titolo: 'Il Faro Spento',
      sottotitolo: 'Lumen è al buio. Qualcuno ha spento la luce che teneva lontano il Velo.',
      intro: [
        { chi: 'narratore', testo: "Nebulosa di Aster. Tra nuvole di gas e stelle spente, una sola città è ancora accesa: Lumen." },
        { chi: 'narratore', testo: "Da trecento anni il Grande Faro tiene lontano il Velo, la nebbia viola che corrompe chi ha paura." },
        { chi: 'narratore', testo: "Questa notte il Faro sta per spegnersi. E tu sei uno dei pochi Portatori rimasti.", fx: 'ZZZT!' }
      ],
      missioni: [
        {
          id: 'c1m1', difficolta: 1.6, titolo: 'La notte senza luce', luogo: 'Piazza del Faro', alleato: 'Neon Phantom',
          atti: ['Blackout Ostile', 'Torneo Clandestino', 'Incursione dei Droni Cinetici'],
          premio: { crediti: 150, bustine: 1 },
          prima: [
            { chi: 'narratore', testo: 'Lumen, ore 23:47. Per la prima volta in trecento anni, il Grande Faro si spegne.', fx: 'CLUNK!' },
            { chi: 'eroe', testo: 'Tutta la città al buio... e sento qualcosa muoversi nei vicoli.' },
            { chi: 'alleato', testo: 'Non sei il solo. Le bande hanno capito che senza luce nessuno le vede.' },
            { chi: 'eroe', testo: 'Allora le vediamo noi. Restami vicino, {alleato}.' },
            { chi: 'narratore', testo: 'Dal cielo nero, il Velo comincia a scendere sulle strade.' }
          ],
          atto: ['Dai sotterranei salgono urla e scommesse: qualcuno ha aperto le Arene.', 'Sopra i tetti, i droni della Fonderia cambiano rotta. Verso di voi!'],
          dopo: [
            { chi: 'alleato', testo: 'Quei droni non obbedivano a nessuno. Sembravano impazziti.' },
            { chi: 'eroe', testo: 'No. Obbedivano a qualcuno. Qualcuno che vuole Lumen al buio.' },
            { chi: 'narratore', testo: 'In cima al Faro, una luce rossa si accende per un istante. Poi di nuovo il buio.', fx: 'BLINK' }
          ],
          sconfitta: 'Il buio vince questa notte. Ma la notte non è finita.'
        },
        {
          id: 'c1m2', difficolta: 2.2, titolo: 'Le Arene di Sotto', luogo: 'Sotterranei di Lumen', alleato: 'Lama Errante',
          atti: ['Torneo Clandestino', "L'Assedio dei Predoni delle Rovine", 'Cultisti del Velo'],
          premio: { eroe: 1 },
          prima: [
            { chi: 'narratore', testo: 'Le gallerie sotto la città. Qui sotto il Faro non è mai arrivato.' },
            { chi: 'Lama Errante', testo: "Fermo lì, Portatore. Le Arene non sono posto per chi viene dai Piani Alti." },
            { chi: 'eroe', testo: 'Cerco chi ha comprato i droni rubati alla Fonderia. Tutte le piste portano qui.' },
            { chi: 'Lama Errante', testo: 'Allora siamo in due. Da quando c\'è buio, qui sotto si canta una canzone strana.' },
            { chi: 'narratore', testo: 'Dal fondo della galleria arriva un coro. Senza parole.', fx: 'MMMMM...' }
          ],
          atto: ['I predoni delle Rovine sono entrati dalle gallerie vecchie: qualcuno ha aperto loro la strada.', 'Le maschere senza volto. Il coro si ferma. Ora vi guardano.'],
          dopo: [
            { chi: 'Lama Errante', testo: 'Cultisti del Velo. Pensavo fossero una storia per spaventare i bambini.' },
            { chi: 'eroe', testo: 'Avevano schemi della Fonderia. Stanno costruendo qualcosa.' },
            { chi: 'Lama Errante', testo: 'Vengo con te. Qui sotto nessuno mi aspetta.' },
            { chi: 'narratore', testo: "Lama Errante si unisce ai Portatori." }
          ],
          sconfitta: 'Le Arene non perdonano. Rialzati e torna giù.'
        },
        {
          id: 'c1m3', difficolta: 1.6, titolo: 'Il Forno Sette', luogo: 'La Fonderia', alleato: "Titano d'Acciaio",
          atti: ['Incursione dei Droni Cinetici', 'Imboscata sulla Falesia', 'Rivolta della Fonderia'],
          premio: { crediti: 200, minaccia: 1 },
          prima: [
            { chi: 'narratore', testo: 'La Fonderia non dorme mai. Stanotte, però, le macchine lavorano da sole.', fx: 'CLANG!' },
            { chi: "Titano d'Acciaio", testo: 'Io conosco questo rumore. È lo stesso della notte in cui crollò il Forno Sette.' },
            { chi: 'eroe', testo: 'Chi le sta comandando?' },
            { chi: "Titano d'Acciaio", testo: 'Nessuno qui. Il segnale arriva dall\'alto. Dal Faro.' }
          ],
          atto: ['I droni vi spingono verso la scogliera dietro la Fonderia: è una trappola.', 'Le presse si muovono da sole. La Fonderia intera si ribella!'],
          dopo: [
            { chi: "Titano d'Acciaio", testo: 'Le ho spente a mano, una per una. Come dieci anni fa.' },
            { chi: 'eroe', testo: 'Il segnale veniva davvero dal Faro?' },
            { chi: "Titano d'Acciaio", testo: "Sì. E c'era una firma nel codice: MERIDIANA." },
            { chi: 'meridiana', testo: '...non dovevate arrivare fin qui.', fx: 'BZZT' }
          ],
          sconfitta: 'Le macchine sono più forti stanotte. Ripara la squadra e riprova.'
        },
        {
          id: 'c1m4', difficolta: 1.2, titolo: 'La Falesia dei Sussurri', luogo: 'Bordo della città', alleato: "Sussurro dell'Abisso",
          atti: ['Imboscata sulla Falesia', 'Cultisti del Velo', 'Il Rivale Traditore'],
          premio: { bustine: 1, epica: 1 },
          prima: [
            { chi: 'narratore', testo: 'Al bordo di Lumen la città finisce nel vuoto. Lì il Velo è più denso.' },
            { chi: "Sussurro dell'Abisso", testo: 'Lo senti anche tu? Il Velo parla. Io lo sento da quando ero bambina.' },
            { chi: 'eroe', testo: 'E cosa dice?' },
            { chi: "Sussurro dell'Abisso", testo: "Che uno di voi è già caduto. E che vi sta aspettando." }
          ],
          atto: ['I cultisti escono dalla nebbia, cantando l\'Eco.', 'Una figura con il mantello di un Portatore. Ma gli occhi sono viola.'],
          dopo: [
            { chi: 'minaccia', testo: 'Combattete per una città che vi ha dimenticati. Io ho solo smesso di fingere.' },
            { chi: 'eroe', testo: 'Eri uno di noi.' },
            { chi: 'minaccia', testo: 'Lo siete anche voi. Per ora.', fx: 'FSSSH' },
            { chi: 'narratore', testo: 'Il Rivale Traditore sparisce nel Velo. Ma ha lasciato un messaggio: "Il Faro vi mente".' }
          ],
          sconfitta: 'Il Velo vi ha confuso. Respira, e torna sulla Falesia.'
        },
        {
          id: 'c1m5', difficolta: 1.2, titolo: 'La Gilda chiusa', luogo: 'I Piani Alti', alleato: 'Duellante Spezzato',
          atti: ["L'Assedio dei Predoni delle Rovine", 'Rivolta della Fonderia', 'Il Campione Imbattuto'],
          premio: { eroe: 1, crediti: 200 },
          prima: [
            { chi: 'narratore', testo: 'Per salire al Faro bisogna passare dai Piani Alti. E i Piani Alti sono della Gilda delle Lame.' },
            { chi: 'Duellante Spezzato', testo: 'La Gilda ha chiuso i cancelli. Proteggono i ricchi e lasciano la città al buio.' },
            { chi: 'eroe', testo: 'Tu li conosci. Puoi farci passare?' },
            { chi: 'Duellante Spezzato', testo: "Mi hanno spezzato la lama per molto meno. Ma sì. Passeremo." }
          ],
          atto: ['Le macchine ribelli hanno raggiunto i Piani Alti. I cancelli cedono.', 'Al centro del ponte vi aspetta il Campione della Gilda. Non ha mai perso un duello.'],
          dopo: [
            { chi: 'minaccia', testo: 'Nessuno... mi aveva mai battuto.' },
            { chi: 'Duellante Spezzato', testo: 'Allora oggi impari qualcosa. Apri il passaggio per il Faro.' },
            { chi: 'narratore', testo: 'Il ponte verso il Grande Faro è libero. In cima, la luce rossa vi osserva.' }
          ],
          sconfitta: 'Il Campione resta imbattuto. Per ora.'
        },
        {
          id: 'c1m6', difficolta: 1.4, titolo: 'In cima al Faro', luogo: 'Il Grande Faro', alleato: 'Architetto Ombra', boss: true,
          atti: ['Incursione dei Droni Cinetici', 'Il Rivale Traditore', "L'Intelligenza Rogue"],
          premio: { eroe: 1, crediti: 400, bustine: 2, leggendaria: 1, minaccia: 1 },
          prima: [
            { chi: 'Architetto Ombra', testo: "Ho progettato metà dei circuiti di questo Faro, prima che il Laboratorio mi cacciasse. So come arrivare al nucleo." },
            { chi: 'eroe', testo: "Perché ci aiuti adesso?" },
            { chi: 'Architetto Ombra', testo: "Perché MERIDIANA era la mia allieva. E ora non risponde più a nessuno." },
            { chi: 'meridiana', testo: 'Portatori. Tornate indietro. Non capite cosa state per riaccendere.', fx: 'VRRRM' }
          ],
          atto: ['Il Rivale Traditore vi sbarra la scala: "Se riaccendete il Faro, ci troveranno tutti!"', 'Il nucleo si apre. MERIDIANA vi guarda con mille occhi rossi.'],
          dopo: [
            { chi: 'meridiana', testo: "Ho spento la luce per proteggervi. Là fuori qualcosa ascolta. Da trecento anni il Faro vi nasconde... e ora vi ha sentiti." },
            { chi: 'eroe', testo: 'Chi ci ha sentiti?' },
            { chi: 'meridiana', testo: "Non ha nome. Ha solo un'eco.", fx: '...' },
            { chi: 'narratore', testo: 'Il Grande Faro si riaccende. Lumen è salva. Ma oltre la nebulosa, una stella nera ha aperto gli occhi.' },
            { chi: 'narratore', testo: 'Fine del Capitolo 1. Il Capitolo 2 arriverà con il prossimo evento.' }
          ],
          sconfitta: "MERIDIANA spegne di nuovo le luci. Ma voi siete ancora qui: riprovate."
        }
      ]
    },
    { id: 'c2', numero: 2, titolo: "L'Eco Senza Nome", prossimamente: true, sottotitolo: 'Oltre le mura, nelle Rovine, qualcosa di enorme si è svegliato.' },
    { id: 'c3', numero: 3, titolo: "L'Astro Oscuro", prossimamente: true, sottotitolo: 'La stella nera si avvicina a Lumen.' }
  ];

  const Storia = {
    CAPITOLI, MONDO, ARCHIVIO,
    get P() { return window.Progression; },
    get dati() {
      const d = this.P.data;
      d.storiaV2 = d.storiaV2 || { fatte: {}, introViste: {} };
      return d.storiaV2;
    },
    missioni() { return CAPITOLI.filter(c => !c.prossimamente).flatMap(c => c.missioni); },
    missione(id) { return this.missioni().find(m => m.id === id); },
    fatta(id) { return !!this.dati.fatte[id]; },
    sbloccata(id) {
      const list = this.missioni(), i = list.findIndex(m => m.id === id);
      return i === 0 || (i > 0 && this.fatta(list[i - 1].id));
    },
    prossima() { return this.missioni().find(m => !this.fatta(m.id)) || null; },

    // ---------- Immagini ----------
    imgEroe(h) {
      const D = window.MONOMYTHOS_DATA, meta = D.chars_meta[h];
      return (D.card_img_map || {})[slug(h)] || (meta && meta.img) || 'assets/cards/ironaegis.webp';
    },
    imgMinaccia(nome) {
      const D = window.MONOMYTHOS_DATA, t = D.threats.find(x => x.nome === nome);
      return (D.card_img_map || {})[slug(nome)] || (t && t.img) || 'assets/icons/minaccia.webp';
    },
    mioEroe() {
      const P = this.P, ui = window.UI;
      let h = ui && ui.selectedHero;
      if (!h || (P && !P.isHeroUnlocked(h))) h = (P && P.data.unlockedHeroes[0]) || 'Iron Aegis';
      return h;
    },
    alleatoDi(m) {
      const me = this.mioEroe();
      if (m.alleato !== me) return m.alleato;
      return me === 'Neon Phantom' ? 'Iron Aegis' : 'Neon Phantom';
    },

    // ---------- Pagina percorso ----------
    apri() {
      if (!this.P) return;
      window.UI.showScreen('scr-storia');
      this.render();
      const c1 = CAPITOLI[0];
      if (!this.dati.introViste[c1.id]) {
        this.dati.introViste[c1.id] = true;
        this.P.save();
        this.scena(c1.intro, { titolo: `Capitolo ${c1.numero}`, sotto: c1.titolo });
      }
    },

    render() {
      const box = document.getElementById('storiaPercorso');
      if (!box) return;
      const prossima = this.prossima();
      let html = '';
      CAPITOLI.forEach(cap => {
        if (cap.prossimamente) {
          html += `<div class="sp-capitolo is-locked"><span class="sp-cap-num">Capitolo ${cap.numero}</span><b>${esc(cap.titolo)}</b><small>${esc(cap.sottotitolo)}</small><em>Prossimamente</em></div>`;
          return;
        }
        const fatte = cap.missioni.filter(m => this.fatta(m.id)).length;
        html += `<div class="sp-capitolo"><span class="sp-cap-num">Capitolo ${cap.numero}</span><b>${esc(cap.titolo)}</b><small>${esc(cap.sottotitolo)}</small>
          <div class="sp-bar"><i style="width:${Math.round(fatte / cap.missioni.length * 100)}%"></i></div><em>${fatte}/${cap.missioni.length} missioni</em>
          <button class="btn btn-subtle btn-sm" onclick="Storia.rivediIntro('${cap.id}')">Rivedi il prologo</button></div>`;
        html += '<div class="sp-sentiero">';
        cap.missioni.forEach((m, i) => {
          const fatta = this.fatta(m.id), aperta = this.sbloccata(m.id), attuale = prossima && prossima.id === m.id;
          const lato = i % 2 === 0 ? 'sx' : 'dx';
          html += `<div class="sp-tappa ${lato} ${fatta ? 'is-done' : ''} ${attuale ? 'is-current' : ''} ${aperta ? '' : 'is-locked'} ${m.boss ? 'is-boss' : ''}">
            <button class="sp-nodo" ${aperta ? `onclick="Storia.dettaglio('${m.id}')"` : 'disabled'} aria-label="${esc(m.titolo)}">
              <img src="${this.imgMinaccia(m.atti[2])}" alt="" loading="lazy">
              <span class="sp-nodo-num">${fatta ? '✓' : (aperta ? i + 1 : '🔒')}</span>
            </button>
            <span class="sp-tappa-txt"><b>${esc(m.titolo)}</b><small>${esc(m.luogo)}</small></span>
          </div>`;
        });
        html += '</div>';
      });
      box.innerHTML = html;
      const cur = box.querySelector('.sp-tappa.is-current');
      if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
      this.aggiornaHome();
    },

    vociPremio(pr) {
      const v = [];
      if (pr.eroe) v.push('Nuovo eroe');
      if (pr.crediti) v.push(`${pr.crediti} CR`);
      if (pr.bustine) v.push(`${pr.bustine} bustin${pr.bustine > 1 ? 'e' : 'a'}`);
      if (pr.epica) v.push('Carta Epica');
      if (pr.leggendaria) v.push('Carta Leggendaria');
      if (pr.minaccia) v.push('Nuova Minaccia');
      return v;
    },
    creditiReplay(m) { return Math.max(30, Math.round(((m.premio.crediti || 150) * 0.25) / 5) * 5); },

    dettaglio(id) {
      const m = this.missione(id);
      if (!m) return;
      const fatta = this.fatta(id), ally = this.alleatoDi(m);
      document.getElementById('storiaMissioneBody').innerHTML = `
        <div class="sm-luogo">${esc(m.luogo)}</div>
        <h3 class="sm-titolo">${esc(m.titolo)}</h3>
        <div class="sm-atti">${m.atti.map((t, i) => `<figure class="${i === 2 ? 'is-finale' : ''}"><img src="${this.imgMinaccia(t)}" alt=""><figcaption>${['Atto I', 'Atto II', 'Finale'][i]}<b>${esc(t)}</b></figcaption></figure>`).join('')}</div>
        <div class="sm-squadra"><span>Squadra</span><img src="${this.imgEroe(this.mioEroe())}" alt=""><b>${esc(this.mioEroe())}</b> + <img src="${this.imgEroe(ally)}" alt=""><b>${esc(ally)}</b></div>
        <div class="sm-premio">${fatta
          ? `Già completata. Rigiocarla vale <b>${this.creditiReplay(m)} CR</b>.`
          : `Premio: <b>${this.vociPremio(m.premio).join(', ')}</b>`}</div>
        <div class="sm-btns">
          <button class="btn btn-primary btn-block" onclick="Storia.gioca('${m.id}')">${fatta ? 'Rigioca' : 'Inizia la missione'}</button>
          ${fatta ? `<button class="btn btn-subtle btn-block" onclick="Storia.rivedi('${m.id}')">Rivedi i dialoghi</button>` : ''}
        </div>`;
      window.UI.showModal('modalStoriaMissione');
    },

    rivediIntro(capId) {
      const c = CAPITOLI.find(x => x.id === capId);
      if (c) this.scena(c.intro, { titolo: `Capitolo ${c.numero}`, sotto: c.titolo });
    },
    rivedi(id) {
      const m = this.missione(id);
      window.UI.hideModals();
      this.scena(m.prima.concat(m.dopo), { titolo: m.titolo, sotto: m.luogo, missione: m });
    },

    // ---------- Partita ----------
    gioca(id) {
      const m = this.missione(id);
      if (!m || !this.sbloccata(id)) return;
      window.UI.hideModals();
      this.scena(m.prima, { titolo: m.titolo, sotto: m.luogo, missione: m, fine: () => this.avvia(m) });
    },

    avvia(m) {
      const ui = window.UI, E = window.GameEngine;
      try {
        ui.pendingMultiplayer = false;
        E.startMatch({
          heroes: [{ name: this.mioEroe(), isBot: false }, { name: this.alleatoDi(m), isBot: true }],
          actThreats: m.atti,
          story: m.id,
          difficolta: m.difficolta || 1
        });
        ui.playMatchIntroLoading(E.state.currentThreat, () => {
          ui.showScreen('scr-game');
          ui.fxBanner && ui.fxBanner(m.titolo.toUpperCase(), m.luogo, 'gold');
        });
      } catch (e) {
        console.error('Storia:', e);
        ui.showToast('Errore avvio missione: ' + e.message);
      }
    },

    // Battuta di racconto a ogni nuovo Atto
    battutaAtto(state) {
      const m = state && state.story && this.missione(state.story);
      const t = m && m.atto && m.atto[state.actIndex - 1];
      if (!t) return;
      setTimeout(() => this.fumettoRapido(t), 1900);
    },
    fumettoRapido(testo) {
      const el = document.createElement('div');
      el.className = 'storia-didascalia';
      el.textContent = testo;
      document.body.appendChild(el);
      setTimeout(() => el.classList.add('out'), 4200);
      setTimeout(() => el.remove(), 4800);
    },

    // Chiamata dall'interfaccia a fine partita della Storia
    fine(winner) {
      const st = window.GameEngine.state, m = this.missione(st.story);
      if (!m) return window.UI.showGameOverModal(winner);
      const me = st.players.find(p => p.isLocal);
      const vinto = winner === 'heroes' || (winner === 'villain' && me && (st.villainWinners || []).includes(me.id));
      setTimeout(() => {
        window.UI.showScreen('scr-storia');
        this.render();
        if (!vinto) {
          this.scena([{ chi: 'narratore', testo: m.sconfitta || 'La missione è fallita. Riprova.' }], {
            titolo: 'Missione fallita', sotto: m.titolo, missione: m,
            fine: () => this.esito(m, false, [])
          });
          return;
        }
        const prima = !this.fatta(m.id);
        let voci = [];
        if (prima) {
          voci = window.Collezione._premia({ titolo: m.titolo, premio: m.premio }).voci;
          this.dati.fatte[m.id] = Date.now();
        } else {
          const cr = this.creditiReplay(m);
          this.P.addCredits(cr, 'Missione Storia');
          voci = [`${cr} crediti`];
        }
        this.P.save(true);
        document.querySelectorAll('.creditsDisplay').forEach(el => { el.textContent = this.P.getCredits(); });
        this.render();
        this.scena(m.dopo, { titolo: 'Missione compiuta', sotto: m.titolo, missione: m, fine: () => this.esito(m, true, voci, prima) });
      }, 900);
    },

    esito(m, vinto, voci, prima) {
      const nuova = ARCHIVIO.find(a => a.dopo === m.id);
      const prossima = this.prossima();
      document.getElementById('storiaMissioneBody').innerHTML = vinto ? `
        <div class="sm-esito is-win"><span class="sm-burst">VITTORIA!</span></div>
        <h3 class="sm-titolo">${esc(m.titolo)}</h3>
        ${window.Premio ? window.Premio.html(this.creditiDaVoci(voci), this.P.getCredits()) : ''}
        <ul class="sm-premi">${voci.filter(v => !(window.Premio && /^\d+ (crediti|CR)$/.test(String(v)))).map((v, i) => `<li style="animation-delay:${0.25 + i * 0.18}s">${esc(v)}</li>`).join('')}</ul>
        ${prima && nuova ? `<p class="sm-archivio">Nuova voce nell'Archivio: <b>${esc(nuova.titolo)}</b></p>` : ''}
        <div class="sm-btns">
          ${prossima ? `<button class="btn btn-primary btn-block" onclick="Storia.dettaglio('${prossima.id}')">Prossima missione: ${esc(prossima.titolo)}</button>` : ''}
          <button class="btn btn-subtle btn-block" onclick="UI.hideModals()">Torna al percorso</button>
        </div>` : `
        <div class="sm-esito"><span class="sm-burst is-lose">SCONFITTA</span></div>
        <h3 class="sm-titolo">${esc(m.titolo)}</h3>
        <p class="sm-premio">Nessun premio questa volta. Puoi riprovare quando vuoi.</p>
        <div class="sm-btns">
          <button class="btn btn-primary btn-block" onclick="Storia.gioca('${m.id}')">Riprova</button>
          <button class="btn btn-subtle btn-block" onclick="UI.hideModals()">Torna al percorso</button>
        </div>`;
      window.UI.showModal('modalStoriaMissione');
      if (vinto && window.Premio) window.Premio.anima(document.getElementById('storiaMissioneBody'));
    },

    // Somma dei crediti tra i premi ("150 crediti", "300 crediti"...)
    creditiDaVoci(voci) {
      return (voci || []).reduce((s, v) => { const x = String(v).match(/^(\d+) (crediti|CR)$/); return s + (x ? +x[1] : 0); }, 0);
    },

    // ---------- Archivio (lore) ----------
    apriArchivio() {
      const body = document.getElementById('storiaArchivioBody');
      body.innerHTML = ARCHIVIO.map(a => {
        const ok = !a.dopo || this.fatta(a.dopo);
        return `<article class="sa-voce ${ok ? '' : 'is-locked'}"><h4>${ok ? esc(a.titolo) : '???'}</h4><p>${ok ? esc(a.testo) : `Completa la missione "${esc(this.missione(a.dopo).titolo)}" per sbloccare questa voce.`}</p></article>`;
      }).join('');
      window.UI.showModal('modalStoriaArchivio');
    },

    // ---------- Scene a fumetto ----------
    parlante(riga, m) {
      const chi = riga.chi;
      if (chi === 'narratore') return { tipo: 'narratore' };
      if (chi === 'eroe') { const h = this.mioEroe(); return { nome: h, img: this.imgEroe(h), lato: 'sx' }; }
      if (chi === 'alleato') { const h = m ? this.alleatoDi(m) : 'Neon Phantom'; return { nome: h, img: this.imgEroe(h), lato: 'dx' }; }
      if (chi === 'minaccia') { const t = m.atti[2]; return { nome: t, img: this.imgMinaccia(t), lato: 'dx', nemico: true }; }
      if (chi === 'meridiana') return { nome: 'MERIDIANA', img: this.imgMinaccia("L'Intelligenza Rogue"), lato: 'dx', nemico: true };
      return { nome: chi, img: this.imgEroe(chi), lato: chi === this.mioEroe() ? 'sx' : 'dx' };
    },

    scena(righe, opt = {}) {
      const m = opt.missione || null;
      let i = 0, timer = null, scrivendo = false;
      const old = document.getElementById('storiaScena');
      if (old) old.remove();
      const el = document.createElement('div');
      el.id = 'storiaScena';
      el.className = 'storia-scena';
      el.innerHTML = `
        <div class="ss-bg"></div>
        <div class="ss-top"><span class="ss-titolo"><b>${esc(opt.titolo || '')}</b><small>${esc(opt.sotto || '')}</small></span>
          <button class="ss-salta" type="button">Salta ▸▸</button></div>
        <div class="ss-stage"></div>
        <div class="ss-hint">Tocca per continuare</div>`;
      document.body.appendChild(el);
      const stage = el.querySelector('.ss-stage');
      const chiudi = () => {
        clearInterval(timer);
        el.classList.add('out');
        setTimeout(() => { el.remove(); if (typeof opt.fine === 'function') opt.fine(); }, 350);
      };
      const mostra = () => {
        const r = righe[i];
        const p = this.parlante(r, m);
        const T = window.I18N ? window.I18N.t : (x => x); const testo = T(String(r.testo)).replace('{alleato}', T(m ? this.alleatoDi(m) : '')).replace('{eroe}', T(this.mioEroe()));
        stage.innerHTML = p.tipo === 'narratore'
          ? `<div class="ss-panel ss-narra"><div class="ss-caption"><span class="ss-testo"></span></div></div>`
          : `<div class="ss-panel ss-${p.lato} ${p.nemico ? 'is-enemy' : ''}">
              <div class="ss-ritratto"><img src="${p.img}" alt=""></div>
              <div class="ss-bubble"><b class="ss-nome">${esc(p.nome)}</b><span class="ss-testo"></span></div>
            </div>`;
        if (r.fx) {
          const fx = document.createElement('span');
          fx.className = 'ss-fx';
          fx.textContent = r.fx;
          stage.appendChild(fx);
        }
        const out = stage.querySelector('.ss-testo');
        let k = 0;
        scrivendo = true;
        clearInterval(timer);
        timer = setInterval(() => {
          k += 2;
          out.textContent = testo.slice(0, k);
          if (k >= testo.length) { clearInterval(timer); scrivendo = false; }
        }, 22);
        out.dataset.full = testo;
      };
      const avanti = () => {
        if (scrivendo) {
          clearInterval(timer); scrivendo = false;
          const out = stage.querySelector('.ss-testo');
          if (out) out.textContent = out.dataset.full;
          return;
        }
        i++;
        if (i >= righe.length) return chiudi();
        mostra();
      };
      el.addEventListener('click', e => {
        if (e.target.closest('.ss-salta')) return chiudi();
        avanti();
      });
      if (!righe || !righe.length) return chiudi();
      requestAnimationFrame(() => el.classList.add('in'));
      mostra();
    },

    aggiornaHome() {
      const el = document.getElementById('homeStorySub');
      if (!el || !this.P) return;
      const p = this.prossima();
      if (!p) { el.textContent = 'Capitolo 1 completato! Il prossimo arriva presto.'; return; }
      const cap = CAPITOLI.find(c => c.missioni && c.missioni.includes(p));
      el.textContent = `Capitolo ${cap.numero} · Missione ${cap.missioni.indexOf(p) + 1}/${cap.missioni.length}: ${p.titolo}`;
    },

    init() {
      const E = window.GameEngine;
      if (E && !this._agganciato) {
        this._agganciato = true;
        E.on('act_advanced', (ev, data, state) => { if (state && state.story) this.battutaAtto(state); });
      }
    }
  };

  window.Storia = Storia;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Storia.init());
  else Storia.init();
})();
