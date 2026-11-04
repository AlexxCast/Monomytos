// Monomythos Mobile UI Controller - Tactile Touch Controls & Animations
class UIController {
  constructor() {
    this.selectedHero = 'Iron Aegis';
    this.selectedCard = null;
    this.localPlayerId = 'p_0';
    this.activeScreen = 'scr-lobby';
    this.squadSize = 2;
  }

  init() {
    try { this.restorePlayerProfileFromNative(); } catch (e) { console.error('restorePlayerProfile error:', e); }
    try { this.bindEvents(); } catch (e) { console.error('bindEvents error:', e); }
    try { this.updateHomeAudioButton(); } catch (e) { console.error('updateHomeAudioButton error:', e); }
    try { this.renderHeroSelectionCarousel(); } catch (e) { console.error('renderHeroSelectionCarousel error:', e); }
    try { this.renderCustomHeroOptions(); } catch (e) { console.error('renderCustomHeroOptions error:', e); }
    try { this.showScreen('scr-lobby'); } catch (e) { console.error('showScreen error:', e); }
    try { this.startHomeShowcase(); } catch (e) { console.error('startHomeShowcase error:', e); }
    try { this._tipIdx = Math.floor(Math.random() * 8) - 1; this.nextHomeTip(); } catch (e) {}
    try { window.AudioEngine?.playMusic('m1_selezione.mp3'); } catch (e) {}

    // App Launch Intro Cinematic Animation
    this.initAppSplashAnimation();

    // Check URL parameters for direct room join
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        const inp = document.getElementById('joinRoomInput');
        if (inp) inp.value = roomParam;
        // Si entra dopo l'accesso all'account (vedi Online.dopoAccesso)
        if (window.Online) window.Online._pendingJoin = { code: roomParam };
      }
    } catch (e) {}
  }

  // App launch intro splash animation: 3D vertical spin from Player card back to Threat card back
  initAppSplashAnimation() {
    const splash = document.getElementById('appLaunchSplashOverlay');
    const flipper = document.getElementById('splashCardFlipper');
    const bar = document.querySelector('.splash-loader-progress');
    const txt = document.getElementById('splashLoadingText');
    const sub = document.getElementById('splashSubText');
    if (!splash) return;

    splash.classList.add('active');
    splash.style.display = 'flex';
    splash.style.opacity = '1';
    splash.style.pointerEvents = 'auto';

    if (flipper) flipper.classList.remove('is-flipped');
    if (txt) txt.textContent = 'IL DESTINO COSMICO DEGLI EROI';
    if (sub) sub.textContent = 'TACTICAL CARD GAME';

    try { window.AudioEngine?.playSfx('card_tap'); } catch (e) {}

    let progress = 0;
    this._splashInterval = setInterval(() => {
      progress += 4;
      if (bar) bar.style.width = Math.min(100, progress) + '%';

      // Trigger 3D vertical spin around 30%
      if (progress >= 30 && flipper && !flipper.classList.contains('is-flipped')) {
        flipper.classList.add('is-flipped');
        try { window.AudioEngine?.playSfx('card'); } catch (e) {}
      }

      // Threat card back revealed around 65%
      if (progress >= 60 && progress < 85) {
        if (txt) txt.textContent = 'LA MINACCIA EMERGE...';
        if (sub) sub.textContent = 'CALAMITÀ IMMINENTE';
      } else if (progress >= 85) {
        if (txt) txt.textContent = 'PRONTO PER LA BATTAGLIA!';
      }

      if (progress >= 100) {
        clearInterval(this._splashInterval);
        this._splashInterval = null;
        setTimeout(() => {
          this.dismissAppSplash();
        }, 350);
      }
    }, 70);
  }

  dismissAppSplash() {
    if (this._splashInterval) {
      clearInterval(this._splashInterval);
      this._splashInterval = null;
    }
    const splash = document.getElementById('appLaunchSplashOverlay');
    if (!splash || !splash.classList.contains('active')) return;

    // Immediately release pointer events so the lobby is interactive without delay
    splash.style.pointerEvents = 'none';
    splash.style.opacity = '0';
    splash.style.transform = 'scale(1.05)';
    try { window.AudioEngine?.playSfx('card_tap'); } catch (e) {}

    setTimeout(() => {
      splash.classList.remove('active');
      splash.style.display = 'none';
    }, 500);
  }

  // Consigli nella Home (fumetto dell'eroe)
  nextHomeTip() {
    const tips = [
      'Pesca meno carte quando il mazzo sta finendo: restare senza carte costa 10 Trauma!',
      'Guarda le etichette sopra i nemici: ti dicono chi attaccheranno e con che Forza.',
      'Se non giochi nessuna carta nel round prendi +1 Trauma. Muoviti sempre!',
      'Il Sacrificio Tattico accetta solo carte della Categoria del binario.',
      'A 5 Trauma l\'eroe diventa Villain: da lì gioca per i suoi Punti Vittoria.',
      'Travolgere: il danno oltre la tua Resistenza passa anche se pari.',
      'Nella Crisi Composita la seconda minaccia rinforza ma non attacca.',
      'Il Potere Base si usa una volta per turno ed è gratis: non dimenticarlo!'
    ];
    this._tipIdx = ((this._tipIdx ?? -1) + 1) % tips.length;
    const el = document.getElementById('homeTipText');
    if (el) {
      el.classList.remove('pop-in'); void el.offsetWidth;
      el.textContent = tips[this._tipIdx];
      el.classList.add('pop-in');
    }
  }

  // Barra di navigazione in basso
  navTo(screenId) {
    if (screenId === 'scr-hero-pick') return this.startQuickMissionSelection();
    if (screenId === 'scr-deckbuilder') return this.openDeckBuilder();
    if (screenId === 'scr-shop') return this.openShop();
    this.showScreen(screenId);
  }

  // Vetrina della Home: gli eroi scorrono uno alla volta
  startHomeShowcase() {
    const meta = window.MONOMYTHOS_DATA?.chars_meta || {};
    const heroes = Object.values(meta).filter(h => h && h.img);
    if (!heroes.length) return;
    const dots = document.getElementById('homeShowcaseDots');
    if (dots) dots.innerHTML = heroes.map(() => '<i></i>').join('');
    let idx = 0;
    const statLabel = { str: 'POT', spd: 'AGI', tech: 'INT', end: 'VIG' };
    const show = () => {
      const h = heroes[idx % heroes.length];
      const art = document.getElementById('homeShowcaseArt');
      if (!art) return;
      art.classList.remove('in');
      setTimeout(() => {
        art.src = h.img;
        document.getElementById('homeShowcaseName').textContent = h.name;
        document.getElementById('homeShowcaseArch').textContent = h.archetipo || '';
        document.getElementById('homeShowcaseStats').innerHTML = Object.keys(statLabel)
          .map(k => `<span class="stat-${k}"><b>${Math.min(5, 1 + (h[k] || 0))}</b>${statLabel[k]}</span>`).join('') +
          `<span class="stat-hp"><b>${h.vita}</b>VITA</span>`;
        if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === idx % heroes.length));
        const cnt = document.getElementById('homeShowcaseCount');
        if (cnt) cnt.innerHTML = `EROE<br>${(idx % heroes.length) + 1}/${heroes.length}`;
        const av = document.getElementById('homeTipAvatar');
        if (av) av.src = h.img;
        art.classList.add('in');
      }, 250);
    };
    show();
    clearInterval(this._showcaseTimer);
    this._showcaseTimer = setInterval(() => {
      if (this.activeScreen !== 'scr-lobby' || document.hidden) return;
      idx++; show();
    }, 4500);
  }

  toggleBattleLog(force) {
    const wrap = document.getElementById('battleLogWrap');
    if (!wrap) return;
    const open = typeof force === 'boolean' ? force : !wrap.classList.contains('open');
    wrap.classList.toggle('open', open);
    const box = document.getElementById('battleLog');
    if (open && box) box.scrollTop = box.scrollHeight;
  }

  toggleHeaderMenu(force) {
    const header = document.querySelector('header.main-header');
    if (!header) return;
    const open = typeof force === 'boolean' ? force : !header.classList.contains('menu-open');
    header.classList.toggle('menu-open', open);
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      this.activeScreen = screenId;
    }
    document.body.classList.toggle('in-match', screenId === 'scr-game');
    document.documentElement.classList.toggle('in-match', screenId === 'scr-game');
    document.querySelectorAll('#bottomNav .nav-item').forEach(b => b.classList.toggle('active', b.dataset.screen === screenId));
    document.body.dataset.screen = screenId;
    this.toggleHeaderMenu(false);

    if (screenId !== 'scr-game') {
      document.documentElement.classList.remove('theme-villain');
      document.body.classList.remove('theme-villain');
    }

    if (screenId === 'scr-hero-pick') {
      try { this.renderHeroSelectionCarousel(); } catch (e) { console.error('renderHeroSelectionCarousel error:', e); }
    }

    // Push state for Android / browser hardware back button
    try {
      if (window.history && window.history.pushState) {
        window.history.pushState({ screen: screenId }, '', '#' + screenId);
      }
    } catch (e) {}

    // Switch music based on screen
    try {
      if (screenId === 'scr-game') {
        window.AudioEngine?.playMusic('m2_combat.mp3');
      } else {
        window.AudioEngine?.playMusic('m1_selezione.mp3');
      }
    } catch (e) {}
  }

  // Hardware Back Button & In-App Navigation Controller
  handleBackNavigation() {
    // 1. If any modal is active, close it
    const activeModals = document.querySelectorAll('.modal-overlay.active');
    if (activeModals.length > 0) {
      this.hideModals();
      return 'HANDLED';
    }

    // 2. If in combat, prompt user before abandoning
    if (this.activeScreen === 'scr-game') {
      this.promptExitGame();
      return 'HANDLED';
    }

    // 3. If in any sub-screen, return to lobby
    if (this.activeScreen && this.activeScreen !== 'scr-lobby') {
      this.showScreen('scr-lobby');
      return 'HANDLED';
    }

    // 4. In lobby and no modals: allow Android system to exit
    return 'EXIT';
  }

  promptExitGame() {
    window.Dialogo.conferma('Vuoi abbandonare la missione e tornare al Menu Principale?', { ok: 'Esci', pericolo: true }).then(si => {
      if (si) this.showScreen('scr-lobby');
    });
  }

  startQuickMissionSelection() {
    this.pendingMultiplayer = false;
    this.renderHeroSelectionCarousel();
    this.showScreen('scr-hero-pick');
  }

  bindEvents() {
    // Audio Mixer Modal toggle
    const mixerBtn = document.getElementById('btnAudioMixer');
    if (mixerBtn) {
      mixerBtn.addEventListener('click', () => {
        this.openAudioMixer();
      });
    }

    // Engine Event Listeners
    // Carte "Guarda il Mazzo Minaccia": mostra al giocatore le prossime Minacce
    window.GameEngine.on('scry_performed', (ev, data) => {
      if (!data || !data.source || !data.source.isLocal) return;
      const st = window.GameEngine.state;
      const next = (st.actThreats || []).slice(st.actIndex + 1).map(t => t.nome);
      this.fxBanner('ANALISI', next.length ? 'Prossime Minacce: ' + next.join(' → ') : 'Questa è l\'ultima Minaccia', 'gold');
      this.showToast(next.length ? `Prossime Minacce: ${next.join(' → ')}` : 'Nessuna altra Minaccia dopo questa.');
    });
    window.GameEngine.on('match_started', (ev, data, state) => {
      this.renderGameView(state);
      this.triggerThreatDrawAnimation(state.currentThreat);
    });
    window.GameEngine.on('round_started', (ev, data, state) => {
      this.renderGameView(state);
      this.fxBanner(`ROUND ${state.round}`, state.currentThreat ? state.currentThreat.nome : '');
    });
    window.GameEngine.on('turn_changed', (ev, data, state) => this.renderGameView(state));
    window.GameEngine.on('card_played', (ev, data, state) => {
      window.AudioEngine?.playSfx('card');
      this.renderGameView(state);
    });
    window.GameEngine.on('defense_window_opened', (ev, data) => {
      this.openDefenseWindow(data);
    });
    window.GameEngine.on('sacrifice_made', (ev, data, state) => {
      window.AudioEngine?.playSfx('shield');
      this.renderGameView(state);
    });
    window.GameEngine.on('damage_taken', (ev, data, state) => {
      window.AudioEngine?.playSfx('hit');
      this.renderGameView(state);
      const idx = state.players.indexOf(data.target);
      const anchor = idx === 0 ? document.querySelector('.player-dock-top')
        : document.querySelectorAll('#battlefieldAlliesRow .companion-battlefield-card')[idx - 1];
      this.spawnFloatingNumber(data.dmg, 'dmg', anchor);
      if (data.dmg > 0) {
        this.fxHit(anchor);
        if (idx === 0) this.fxHit(document.getElementById('scr-game'), 'fx-shake');
      }
    });
    window.GameEngine.on('base_power_used', (ev, data, state) => {
      window.AudioEngine?.playSfx('heal');
      this.renderGameView(state);
    });
    window.GameEngine.on('player_corrupted', (ev, player, state) => {
      window.AudioEngine?.playSfx('fracture');
      this.fxBanner('VILLAIN', `${player.name} cede al Trauma`, 'violet');
      this.renderGameView(state);
    });
    window.GameEngine.on('act_advanced', (ev, data, state) => {
      window.AudioEngine?.playSfx('victory');
      this.fxBanner(`ATTO ${['I', 'II', 'III'][state.actIndex] || state.actIndex + 1}`, 'Minaccia sconfitta: si avanza', 'gold');
      this.renderGameView(state);
      this.triggerThreatDrawAnimation(state.currentThreat);
    });
    window.GameEngine.on('game_over', (ev, data, state) => {
      if (data.winner === 'heroes') {
        window.AudioEngine?.playSfx('victory');
      } else {
        window.AudioEngine?.playSfx('fracture');
      }
      if (state && state.story && window.Storia) return window.Storia.fine(data.winner);
      this.showGameOverModal(data.winner);
    });
  }

  // Render Hero Carousel in Selection Screen using Official Silver Layout
  renderHeroSelectionCarousel() {
    const data = window.MONOMYTHOS_DATA;
    if (!data || !data.chars_meta) return;

    const container = document.getElementById('heroCarousel');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'flex';

    const heroKeys = Object.keys(data.chars_meta).filter(k => k !== 'Custom Hero');
    if (window.Progression) heroKeys.sort((x, y) => window.Progression.isHeroUnlocked(y) - window.Progression.isHeroUnlocked(x));
    if (!this.selectedHero || !data.chars_meta[this.selectedHero] || this.selectedHero === 'Custom Hero') {
      this.selectedHero = heroKeys[0] || 'Iron Aegis';
    }
    if (window.Progression && !window.Progression.isHeroUnlocked(this.selectedHero)) {
      this.selectedHero = heroKeys.find(k => window.Progression.isHeroUnlocked(k)) || this.selectedHero;
    }

    heroKeys.forEach((key, idx) => {
      const meta = data.chars_meta[key];
      const slide = document.createElement('div');
      slide.setAttribute('data-hero', key);
      const locked = window.Progression && !window.Progression.isHeroUnlocked(key);
      slide.className = `hero-slide ${key === this.selectedHero ? 'selected' : ''} ${locked ? 'locked' : ''}`;
      slide.onclick = () => {
        try { window.AudioEngine?.playSfx('card_tap'); } catch (e) {}
        if (this.selectedHero === key) {
          this.confirmHero(key);
        } else {
          this.selectHero(key);
        }
      };

      // Hero image or layout fallback
      let imgUrl = meta.img || 'assets/cards/ironaegis.webp';
      if (data.card_img_map && data.card_img_map[key.toLowerCase().replace(/[^a-z0-9]/g, '')]) {
        imgUrl = data.card_img_map[key.toLowerCase().replace(/[^a-z0-9]/g, '')];
      }

      // Determine highest stat icon for circle badge
      let primaryStatIcon = 'assets/icons/vigore.png';
      if (meta.str >= meta.spd && meta.str >= meta.tech && meta.str >= meta.end) primaryStatIcon = 'assets/icons/potenza.png';
      else if (meta.spd >= meta.str && meta.spd >= meta.tech && meta.spd >= meta.end) primaryStatIcon = 'assets/icons/agilita.png';
      else if (meta.tech >= meta.str && meta.tech >= meta.spd && meta.tech >= meta.end) primaryStatIcon = 'assets/icons/inteligenza.png';

      slide.innerHTML = `
        <!-- Official Silver Personaggio Card Layout -->
        <div class="hero-silver-frame-wrap">
          <img class="hero-bg-img" src="${imgUrl}" alt="${key}" onerror="this.src='assets/cards/ironaegis.webp'">
          <img class="hero-frame-img" src="assets/layouts/layout_silver.webp" alt="Frame Argento">

          <!-- Vignette Title & Archetype Tag -->
          <div class="hero-vignette-bubble">
            <div class="hero-card-title">${key}</div>
            <div class="hero-card-tag">[${meta.archetipo || 'Eroe'}]</div>
          </div>

          <!-- Bottom Central Box: Base Power -->
          <div class="hero-card-desc-box">
            <div class="hero-card-pb-title">${meta.pb_name || 'Potere Base'}</div>
            <div class="hero-card-pb-text">${meta.pb_desc || 'Abilità eroe'}</div>
          </div>

          <!-- Bottom Left Circle: Base Health -->
          <div class="hero-card-val-circle">${meta.vita}</div>

          <!-- Bottom Right Circle: Primary Stat Icon -->
          <div class="hero-card-icon-circle">
            <img src="${primaryStatIcon}" alt="Stat">
          </div>
        </div>

        <!-- Live Stats Matrix -->
        <div class="stats-matrix" style="width:100%; margin-bottom:10px;">
          <div class="stat-chip str"><span class="val">${Math.min(5, 1 + (meta.str || 0))}</span><span class="lbl">Pot</span></div>
          <div class="stat-chip spd"><span class="val">${Math.min(5, 1 + (meta.spd || 0))}</span><span class="lbl">Agi</span></div>
          <div class="stat-chip tech"><span class="val">${Math.min(5, 1 + (meta.tech || 0))}</span><span class="lbl">Int</span></div>
          <div class="stat-chip end"><span class="val">${Math.min(5, 1 + (meta.end || 0))}</span><span class="lbl">Vig</span></div>
        </div>
      `;

      // Button attached via JS event listener to avoid escaping issues with apostrophes
      const chooseBtn = document.createElement('button');
      chooseBtn.className = 'btn btn-primary btn-block';
      chooseBtn.textContent = locked ? 'Bloccato' : `Scegli ${key}`;
      if (locked) slide.insertAdjacentHTML('beforeend', '<div class="hero-lock-badge">🔒 Sbloccalo nella Storia o nel Negozio</div>');
      chooseBtn.onclick = (e) => {
        e.stopPropagation();
        try { window.AudioEngine?.playSfx('card_tap'); } catch (err) {}
        this.confirmHero(key);
      };
      slide.appendChild(chooseBtn);

      container.appendChild(slide);
    });
  }

  setSquadSize(size) {
    this.squadSize = Math.max(1, Math.min(4, size));
    [1, 2, 3, 4].forEach(n => {
      const pill = document.getElementById(`squadPill${n}`);
      if (pill) pill.classList.toggle('active', n === this.squadSize);
    });
    const label = this.squadSize === 1 ? '1 Eroe (Solo 1v1)' : `${this.squadSize} Eroi (Tu + ${this.squadSize - 1} Bot)`;
    this.showToast(`Formato Partita: ${label}`);
  }

  selectHero(name) {
    this.selectedHero = name;
    document.querySelectorAll('.hero-slide').forEach(s => {
      const titleEl = s.querySelector('.hero-card-title');
      const isMatch = s.getAttribute('data-hero') === name || (titleEl && titleEl.textContent.trim() === name);
      s.classList.toggle('selected', isMatch);
    });
  }

  confirmHero(name) {
    if (window.Progression && !window.Progression.isHeroUnlocked(name)) {
      return this.showToast(`${name} è bloccato: lo sblocchi avanzando nella Storia o nel Negozio.`);
    }
    this.selectHero(name);
    if (this.pendingMultiplayer) {
      this.openMultiplayerModal(true);
    } else {
      this.startSoloGame(name);
    }
  }

  // Point 4: 3D Spin-Flip Loading Intro Screen
  playMatchIntroLoading(threat, onComplete) {
    const overlay = document.getElementById('matchIntroLoadingOverlay');
    const flipper = document.getElementById('introCardFlipper');
    if (!overlay || !flipper) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const data = window.MONOMYTHOS_DATA;
    const th = threat || { nome: 'Minaccia Sconosciuta', livello: 1, eff_desc: 'Preparati allo scontro' };

    // Threat Image
    let imgUrl = th.img || 'assets/icons/minaccia.webp';
    if (data?.card_img_map && th.nome) {
      const slug = th.nome.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (data.card_img_map[slug]) {
        imgUrl = data.card_img_map[slug];
      }
    }

    const artEl = document.getElementById('introThreatArt');
    const titleEl = document.getElementById('introThreatTitle');
    const actEl = document.getElementById('introThreatAct');
    const effTitleEl = document.getElementById('introThreatEffectTitle');
    const effTextEl = document.getElementById('introThreatEffectText');
    const lvlEl = document.getElementById('introThreatLvlBadge');
    const stageBadge = document.getElementById('introStageBadge');
    const loadingTitle = document.getElementById('introLoadingTitle');
    const loadingSub = document.getElementById('introLoadingSub');

    if (artEl) {
      artEl.src = imgUrl;
      artEl.onerror = () => { artEl.src = 'assets/icons/minaccia.webp'; };
      // Vecchia scansione con cornice e testi già stampati: niente seconda cornice né testi sopra
      const wrap = artEl.closest('.intro-threat-frame-wrap');
      if (wrap) wrap.classList.toggle('is-printed', /^assets\/cards\/[^/]+\.webp$/.test(imgUrl));
    }
    if (titleEl) titleEl.textContent = th.nome || 'Minaccia';
    if (actEl) actEl.textContent = th.isBoss ? 'BOSS FINALE' : (th.isRogueHero ? 'BOSS CORROTTO' : 'ATTO I');
    if (effTitleEl) effTitleEl.textContent = th.eff_nome || (th.pericoloso ? 'Tratto Pericoloso' : 'Calamità Cosmica');
    if (effTextEl) effTextEl.textContent = th.pericoloso || th.eff_desc || th.cosmico || 'Affronta la Calamità con la tua squadra!';
    if (lvlEl) lvlEl.textContent = `Liv. ${th.livello || 1}`;
    if (stageBadge) stageBadge.textContent = th.isRogueHero ? 'DUELLO BOSS CORROTTO' : (th.isBoss ? 'BOSS FINALE' : 'ESTRAZIONE MINACCIA');
    if (loadingTitle) loadingTitle.textContent = 'ESTRAZIONE MINACCIA...';
    if (loadingSub) loadingSub.textContent = 'Il mazzo del Fato sta per rivelare il tuo destino...';

    this._crInizio = window.Progression ? window.Progression.getCredits() : 0;
    // Reset flipper to 0deg (showing card back)
    flipper.classList.remove('is-flipped');
    overlay.classList.add('active');

    // Trigger spin-flip at 400ms
    setTimeout(() => {
      flipper.classList.add('is-flipped');
      try {
        window.AudioEngine?.playSfx('fracture');
      } catch (e) {}

      if (loadingTitle) loadingTitle.textContent = `${(th.nome || 'CALAMITÀ').toUpperCase()}`;
      if (loadingSub) loadingSub.textContent = 'Minaccia Rivelata! Preparati al combattimento!';
    }, 400);

    // Fade out and transition to game at 2400ms
    setTimeout(() => {
      overlay.classList.remove('active');
      setTimeout(() => {
        if (typeof onComplete === 'function') onComplete();
      }, 400);
    }, 2400);
  }

  // Solo / Bot Match supporting 1 to 4 players
  startSoloGame(heroName) {
    try {
      this.pendingMultiplayer = false;
      const allHeroes = [
        'Iron Aegis', 'Neon Phantom', 'Guardiana di Confine', 'Lama Errante',
        "Titano d'Acciaio", 'Architetto Ombra', "Sussurro dell'Abisso", 'Duellante Spezzato'
      ];
      // Pick companions distinct from local hero
      const companions = allHeroes.filter(h => h !== heroName);
      const heroesConfig = [{ name: heroName, isBot: false }];

      const count = this.squadSize || 2;
      for (let i = 0; i < count - 1; i++) {
        heroesConfig.push({
          name: companions[i % companions.length],
          isBot: true
        });
      }

      window.GameEngine.startMatch({
        heroes: heroesConfig,
        threatPool: window.Collezione ? window.Collezione.mazzoMinacce() : null
      });
      const threat = window.GameEngine.state.currentThreat;
      this.playMatchIntroLoading(threat, () => {
        this.showScreen('scr-game');
        this.showToast(`Partita avviata con ${heroName}!`);
      });
    } catch (err) {
      console.error('startSoloGame error:', err);
      this.showToast('Errore avvio partita: ' + err.message);
    }
  }

  // Multiplayer Lobby
  openMultiplayerModal(isHost = true) {
    this.pendingMultiplayer = isHost;
    if (isHost) {
      if (window.Progression && !window.Progression.isHeroUnlocked(this.selectedHero)) {
        this.selectedHero = window.Progression.data.unlockedHeroes[0] || this.selectedHero;
      }
      document.getElementById('createdRoomCode').textContent = '....';
      this.showScreen('scr-room-wait');
      window.Online.setCerca('');
      const bb = document.getElementById('btnPlayBots'); if (bb) bb.style.display = 'none';
      window.Online.creaStanza(this.selectedHero).then(code => {
        if (!code) return this.showScreen('scr-lobby');
        window.Online.renderLobby();
      });
    } else {
      this.showModal('modalJoinRoom');
    }
  }

  joinMultiplayerRoom(code) {
    const c = code || document.getElementById('joinRoomInput').value;
    if (!c) return alert('Inserisci un codice stanza valido!');
    this.hideModals();
    window.Online.entra(c, this.selectedHero);
  }

  startMultiplayerMatch() {
    if (window.Online) return window.Online.avviaPartita();
    try {
      window.NetEngine?.broadcast('GAME_START', {
        heroes: [
          { name: this.selectedHero, isBot: false },
          { name: 'Neon Phantom', isBot: false }
        ]
      });
    } catch (e) {}
    window.GameEngine.startMatch({
      heroes: [
        { name: this.selectedHero, isBot: false },
        { name: 'Neon Phantom', isBot: false }
      ]
    });
    const threat = window.GameEngine.state.currentThreat;
    this.playMatchIntroLoading(threat, () => {
      this.showScreen('scr-game');
    });
  }

  // Render Full Combat View
  renderGameView(state) {
    if (!state || !state.currentThreat) return;
    const th = state.currentThreat;
    const localPlayer = state.players[0]; // Player 1 is local on mobile
    if (localPlayer) {
      const isVillain = localPlayer.state === 'villain' || localPlayer.isVillain;
      if (isVillain) {
        document.documentElement.classList.add('theme-villain');
        document.body.classList.add('theme-villain');
      } else {
        document.documentElement.classList.remove('theme-villain');
        document.body.classList.remove('theme-villain');
      }
    }

    // 1. Mission / Act Progress
    document.getElementById('missionActLabel').textContent = `ATTO ${state.actIndex === 0 ? 'I' : (state.actIndex === 1 ? 'II' : 'FINALE')}`;
    const pips = document.querySelectorAll('.act-pip');
    pips.forEach((p, idx) => {
      p.className = 'act-pip' + (idx === state.actIndex ? ' active' : (idx < state.actIndex ? ' done' : ''));
    })    // 2. Threat Card & Metrics (Point 7: Central Threat in Battlefield Nexus)
    const thNameEl = document.getElementById('threatName');
    if (thNameEl) thNameEl.textContent = th.nome;
    const thBadge = document.getElementById('threatTypeBadge');
    if (thBadge) thBadge.textContent = th.nome;
    const thLvlBadge = document.getElementById('threatLevelBadge');
    if (thLvlBadge) thLvlBadge.textContent = `Liv. ${th.livello || 1}`;
    const thCircle = document.getElementById('threatLvlCircle');
    if (thCircle) thCircle.textContent = th.livello || 1;
    // il livello si ripete anche nel cerchio in basso a destra della cornice
    const thCardLiv = document.getElementById('threatCentralCard');
    if (thCardLiv) thCardLiv.dataset.liv = th.livello || 1;
    const thEffTitle = document.getElementById('threatEffectTitle');
    if (thEffTitle) thEffTitle.textContent = th.isBoss ? 'Tratto Boss Corrotto' : 'Tratto Calamità';
    const thEffText = document.getElementById('threatEffectText');
    if (thEffText) thEffText.textContent = th.pericoloso || th.cosmico || th.logica || 'Avanzamento minaccia in corso';

    const thImg = document.getElementById('threatThumbImg');
    if (thImg) {
      thImg.src = th.img || 'assets/icons/minaccia.webp';
    }
    // Le carte Minaccia stampate hanno già cornice, titolo, testo e livello: niente doppioni sopra
    const thCard = document.getElementById('threatCentralCard');
    if (thCard) thCard.classList.toggle('is-printed', !th.isRogueHero && /^assets\/cards\/[^/]+\.webp$/.test(th.img || ''));

    // Threat HP bar
    const hpRatio = Math.max(0, Math.min(1, th.hp / th.maxHp));
    const fillHpEl = document.getElementById('fillThreatHp');
    if (fillHpEl) fillHpEl.style.width = `${hpRatio * 100}%`;
    const valHpEl = document.getElementById('valThreatHp');
    if (valHpEl) valHpEl.textContent = `${th.hp}/${th.maxHp}`;
    if (this._lastThreat === th && this._lastThreatHp != null && th.hp < this._lastThreatHp) {
      const card = document.getElementById('threatCentralCard');
      this.spawnFloatingNumber(this._lastThreatHp - th.hp, 'dmg', card);
      this.fxHit(card);
    }
    this._lastThreat = th;
    this._lastThreatHp = th.hp;

    // Timer pips
    const timerBox = document.getElementById('threatTimerPips');
    if (timerBox) {
      timerBox.innerHTML = '';
      for (let i = 0; i < th.timerMax; i++) {
        const dot = document.createElement('div');
        dot.className = `timer-dot ${i < th.timer ? 'on' : ''}`;
        timerBox.appendChild(dot);
      }
    }

    // Multi-Path bars
    const primRatio = Math.min(1, th.primarioProgress / th.primarioMax);
    const fillPrim = document.getElementById('fillPrimario');
    if (fillPrim) fillPrim.style.width = `${primRatio * 100}%`;
    const lblPrim = document.getElementById('lblPrimario');
    if (lblPrim) lblPrim.textContent = `${th.primario.cat}`;
    const valPrim = document.getElementById('valPrimario');
    if (valPrim) valPrim.textContent = `${th.primarioProgress}/${th.primarioMax}`;

    const brutRatio = Math.min(1, th.brutoProgress / th.brutoMax);
    const fillBrut = document.getElementById('fillBruto');
    if (fillBrut) fillBrut.style.width = `${brutRatio * 100}%`;
    const lblBrut = document.getElementById('lblBruto');
    if (lblBrut) lblBrut.textContent = `${th.bruto.cat}`;
    const valBrut = document.getElementById('valBruto');
    if (valBrut) valBrut.textContent = `${th.brutoProgress}/${th.brutoMax}`;

    // Mook chips
    const mookBox = document.getElementById('mooksContainer');
    if (mookBox) {
      mookBox.innerHTML = '';
      if (th.mooks) {
        const intents = (window.GameEngine.getEnemyIntents && window.GameEngine.getEnemyIntents()) || {};
        const intentHTML = (it) => {
          if (!it) return '';
          if (it.kind === 'attack') return `<i class="mook-intent attack" title="Alla prossima Fase Minaccia attacca ${it.target} con Forza ${it.dmg}">⚔ ${it.dmg} → ${it.target.split(' ')[0]}</i>`;
          if (it.kind === 'stunned') return `<i class="mook-intent stunned" title="Stordito: salta il prossimo attacco">✶ stordito</i>`;
          return `<i class="mook-intent support" title="Minaccia sussidiaria: rinforza ma non attacca">⛨ supporto</i>`;
        };
        th.mooks.forEach((m, i) => {
          const chip = document.createElement('div');
          chip.className = `mook-chip ${m.isDead ? 'dead' : ''}`;
          chip.innerHTML = `${m.isDead ? '' : intentHTML(intents[i])}<span>${m.name}</span> <b class="mono">${m.isDead ? '0' : m.hp} HP</b>`;
          mookBox.appendChild(chip);
        });
        if (intents.__boss) {
          const chip = document.createElement('div');
          chip.className = 'mook-chip boss-intent';
          chip.innerHTML = `${intentHTML(intents.__boss)}<span>${th.nome}</span>`;
          mookBox.appendChild(chip);
        }
      }
    }

    // 3. Battlefield Allies & Other Players Strip (Point 7: Top Row & Corners, Face-down Hand, Hero Blue/Green vs Villain Purple/Red)
    const alliesContainer = document.getElementById('battlefieldAlliesRow') || document.getElementById('partyStrip');
    if (alliesContainer) {
      alliesContainer.innerHTML = '';
      state.players.forEach((p, idx) => {
        if (idx === 0) return; // Skip local player (shown in bottom command deck)
        const isTurn = state.turnIndex === idx;
        const isVillain = (p.state === 'villain');
        const card = document.createElement('div');
        card.className = `companion-battlefield-card ${isVillain ? 'is-villain' : 'is-hero'} ${p.isDead ? 'dead' : ''} ${isTurn ? 'active-turn' : ''}`;
        
        const pRatio = Math.max(0, Math.min(1, p.vita / p.vitaMax));
        const meta = window.MONOMYTHOS_DATA?.chars_meta[p.name];
        const avatarArt = meta?.img || 'assets/cards/ironaegis.webp';

        // Face-down fanned hand (Point 7: only card backs visible)
        const handCount = p.hand ? p.hand.length : 0;
        let handHtml = '';
        for (let i = 0; i < Math.min(handCount, 6); i++) {
          handHtml += `<img class="companion-card-back-mini" src="assets/cards/retrocartamazzo.webp" alt="Carta Coperta">`;
        }

        // Active effects / cards in play (Card thumbnail, title, and selectable effect)
        let effectsHtml = '';
        if (p.activeEffects && p.activeEffects.length > 0) {
          p.activeEffects.forEach(eff => {
            const effImg = eff.img || avatarArt;
            const effDescClean = (eff.desc || eff.text || '').replace(/'/g, "\\'");
            effectsHtml += `
              <div class="companion-effect-chip" onclick="UI.inspectEffect('${eff.name || 'Effetto'}', '${effDescClean}', '${effImg}')" title="Tocca per dettagli: ${eff.name}">
                <img src="${effImg}" class="effect-chip-thumb" alt="" onerror="this.src='assets/cards/ironaegis.webp'">
                <span class="effect-chip-txt">${eff.name || 'Effetto'}</span>
              </div>`;
          });
        } else {
          effectsHtml = `<span style="font-size:9px; color:var(--muto); opacity:0.7;">Nessun effetto attivo</span>`;
        }

        // Trauma track pips (0 to 5) with danger glow
        let trmPipsHtml = '';
        for (let t = 0; t < 5; t++) {
          trmPipsHtml += `<div class="companion-trm-pip ${t < p.trm ? 'active' : ''} ${p.trm >= 3 ? 'critical' : ''}"></div>`;
        }

        card.innerHTML = `
          <div class="companion-header-bar">
            <div class="companion-title-box">
              <img class="companion-avatar-mini" src="${avatarArt}" alt="${p.name}">
              <span class="companion-name-txt">${p.name} ${p.isBot ? '(Bot)' : ''}</span>
            </div>
            <div class="companion-hp-track">
              <span class="companion-hp-num">${p.isDead ? '0' : p.vita}/${p.vitaMax} HP</span>
            </div>
          </div>
          <div class="companion-hp-bar">
            <div class="companion-hp-fill" style="width: ${pRatio * 100}%"></div>
          </div>
          <div class="companion-fanned-hand" title="Carte in mano (coperte): ${handCount}">
            ${handHtml}
            <span style="font-size:9px; color:var(--oro-soft); margin-left:6px; font-weight:700;">${handCount}</span>
          </div>
          <div class="companion-active-effects-row">
            ${effectsHtml}
          </div>
          <div class="companion-trauma-row">
            <span class="companion-trauma-lbl">Trauma ${p.trm}/5</span>
            <div class="companion-trauma-pips">${trmPipsHtml}</div>
          </div>
        `;
        alliesContainer.appendChild(card);
      });
    }

    // 4. Table center zone (Recently played cards) & Decks counters
    const threatDeckCount = document.getElementById('threatDeckCount');
    if (threatDeckCount) {
      threatDeckCount.textContent = `Atto ${state.actIndex === 0 ? 'I' : (state.actIndex === 1 ? 'II' : 'FINALE')} / III`;
    }
    const playerDeckCount = document.getElementById('playerDeckCount');
    if (playerDeckCount && localPlayer) {
      playerDeckCount.textContent = `${localPlayer.deck.length} carte`;
    }

    const tableZone = document.getElementById('tableZone');
    if (tableZone) {
      tableZone.innerHTML = '';
      if (!state.playedCardsThisRound || state.playedCardsThisRound.length === 0) {
        tableZone.innerHTML = '<div class="table-play-placeholder">Trascina o tocca carte dalla mano per giocare sul campo...</div>';
      } else {
        state.playedCardsThisRound.slice(-5).forEach(item => {
          const el = document.createElement('div');
          el.className = 'played-card-item';
          el.innerHTML = this.getCardDOM(item.card, false);
          const tagEl = document.createElement('div');
          tagEl.className = 'played-card-tag';
          tagEl.textContent = `${item.player}: ${item.card.nome}`;
          el.appendChild(tagEl);
          tableZone.appendChild(el);
        });
      }
    }

    // 5. Combat Log
    const logBox = document.getElementById('battleLog');
    if (logBox) {
      logBox.innerHTML = '';
      state.log.slice(-15).forEach(l => {
        const p = document.createElement('p');
        p.className = `log-${l.type}`;
        p.innerHTML = `<span class="mono" style="opacity:0.6">[${l.time}]</span> ${l.text}`;
        logBox.appendChild(p);
      });
      logBox.scrollTop = logBox.scrollHeight;
      const last = state.log[state.log.length - 1];
      const ticker = document.getElementById('battleLogLast');
      if (ticker && last) ticker.innerHTML = last.text;
    }

    // 6. Local Player Dock
    if (localPlayer) {
      document.getElementById('playerDockName').textContent = localPlayer.name;
      document.getElementById('playerDockHp').textContent = `${localPlayer.vita}/${localPlayer.vitaMax}`;
      
      // Update Player Profile Avatar with active hero artwork
      const avatarImg = document.getElementById('playerDockAvatarImg');
      if (avatarImg) {
        const meta = window.MONOMYTHOS_DATA?.chars_meta[localPlayer.name];
        avatarImg.src = meta?.img || 'assets/cards/ironaegis.webp';
      }

      const myHpRatio = Math.max(0, Math.min(1, localPlayer.vita / localPlayer.vitaMax));
      const fillBar = document.getElementById('playerDockHpFill');
      if (fillBar) {
        fillBar.style.width = `${myHpRatio * 100}%`;
        fillBar.classList.toggle('critical', myHpRatio < 0.3);
      }

      // Trauma Track
      const trmBox = document.getElementById('playerDockTrauma');
      if (trmBox) {
        trmBox.innerHTML = '';
        for (let i = 0; i < 5; i++) {
          const pip = document.createElement('div');
          pip.className = `trauma-pip ${i < localPlayer.trm ? 'active' : ''}`;
          trmBox.appendChild(pip);
        }
      }

      // Screen fracture effect if TRM >= 3
      const fracture = document.getElementById('screenFractureOverlay');
      if (fracture) {
        fracture.classList.toggle('on', localPlayer.trm >= 3);
      }

      // Resource Slots (Point 4: Numbers with stat icons, safe normalized retrieval)
      const elPot = document.getElementById('slotPotenza');
      if (elPot) elPot.textContent = window.GameEngine.getPlayerSlot ? window.GameEngine.getPlayerSlot(localPlayer, 'Potenza') : (localPlayer.slots.potenza || localPlayer.slots.Potenza || 0);

      const elAgi = document.getElementById('slotAgilita') || document.getElementById('slotAgilità');
      if (elAgi) elAgi.textContent = window.GameEngine.getPlayerSlot ? window.GameEngine.getPlayerSlot(localPlayer, 'Agilità') : (localPlayer.slots.agilita || localPlayer.slots.Agilità || 0);

      const elTech = document.getElementById('slotTech');
      if (elTech) elTech.textContent = window.GameEngine.getPlayerSlot ? window.GameEngine.getPlayerSlot(localPlayer, 'Intelligenza') : (localPlayer.slots.intelligenza || localPlayer.slots.Intelligenza || 0);

      const elEnd = document.getElementById('slotVigore');
      if (elEnd) elEnd.textContent = window.GameEngine.getPlayerSlot ? window.GameEngine.getPlayerSlot(localPlayer, 'Vigore') : (localPlayer.slots.vigore || localPlayer.slots.Vigore || 0);

      // Base Power button status
      const btnPb = document.getElementById('btnPbDock');
      btnPb.disabled = localPlayer.pbUsedThisTurn || localPlayer.isDead;
      btnPb.textContent = localPlayer.pbName || 'Potere Base';

      // End Turn button status
      const isMyTurn = state.turnIndex === 0 && !localPlayer.isDead && state.phase === 'action';
      const btnEnd = document.getElementById('btnEndTurnDock');
      btnEnd.disabled = !isMyTurn;
      btnEnd.classList.toggle('my-turn', isMyTurn);
      btnEnd.textContent = isMyTurn ? 'Fine Turno' : 'Attendi Turno...';

      // Draw choice label (§8.5)
      const drawLbl = document.getElementById('drawChoiceLabel');
      if (drawLbl) {
        const maxDraw = window.GameEngine.getMaxDraw(localPlayer);
        const choice = localPlayer.drawChoice == null ? maxDraw : Math.min(localPlayer.drawChoice, maxDraw);
        drawLbl.textContent = `Pesca ${choice}/${maxDraw}`;
      }

      // 7. Cards Hand Carousel using Official 5-Layout System
      const handBox = document.getElementById('playerHandCarousel');
      handBox.innerHTML = '';
      const n = localPlayer.hand.length;
      // Sul telefono, nel tuo turno, la mano si apre in fila (carte grandi, scorri di lato) per sceglierle bene;
      // fuori turno resta a ventaglio
      const spread = state.turnIndex === 0 && !localPlayer.isDead && state.phase === 'action' && window.innerWidth < 900;
      handBox.classList.toggle('hand-spread', spread);
      // Ventaglio: sovrapposizione calcolata per far stare tutte le carte nella larghezza dello schermo
      const cardW = parseFloat(getComputedStyle(handBox).getPropertyValue('--hand-card-w')) || 100;
      const avail = Math.max(200, (handBox.clientWidth || window.innerWidth) - 30);
      const overlap = spread ? 0 : (n > 1 ? Math.max(0, Math.min(cardW * 0.62, (cardW * n - avail) / (n - 1))) : 0);
      localPlayer.hand.forEach((c, i) => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = this.getCardDOM(c, false);
        const cardEl = wrapper.firstElementChild;
        cardEl.onclick = () => this.openCardActionSheet(c);
        // Nel tuo turno si vede subito quali carte puoi giocare adesso (hai abbastanza slot della loro Categoria)
        if (spread || (state.turnIndex === 0 && state.phase === 'action' && !localPlayer.isDead)) {
          const slot = window.GameEngine.getPlayerSlot ? window.GameEngine.getPlayerSlot(localPlayer, c.cat) : ((localPlayer.slots && localPlayer.slots[c.cat]) || 0);
          cardEl.classList.add(slot >= (c.valore || 0) ? 'giocabile' : 'non-giocabile');
        }
        if (this._arriving && this._arriving.has(c.uid || c.id)) cardEl.classList.add('is-arriving');
        cardEl.style.setProperty('--d', (i - (n - 1) / 2).toFixed(2));
        cardEl.style.setProperty('--z', i + 1);
        cardEl.style.setProperty('--overlap', overlap.toFixed(1) + 'px');
        handBox.appendChild(cardEl);
      });
      this.animaPesca(localPlayer, handBox);
    }
    this.posizionaMazzi();
  }

  // Computer: i mazzi vanno nella colonna a sinistra; telefono: restano accanto al tavolo
  posizionaMazzi() {
    const flank = document.querySelector('.table-decks-flank');
    const side = document.getElementById('sideDecks');
    if (!flank || !side) return;
    if (!this._flankHome) this._flankHome = flank.parentElement;
    const desk = window.innerWidth >= 1000;
    if (desk && flank.parentElement !== side) side.appendChild(flank);
    else if (!desk && flank.parentElement !== this._flankHome) this._flankHome.appendChild(flank);
  }

  // Le carte nuove in mano arrivano dal mazzo: escono coperte, si girano e volano al loro posto
  animaPesca(player, handBox) {
    const uids = player.hand.map(c => c.uid || c.id);
    const prev = this._handUids;
    const st = window.GameEngine.state;
    const key = (st.players || []).map(p => p.name).join('|') + '#' + (st.actThreats || []).map(t => t && t.nome).join('|') + '#' + (st.startedAt || '');
    const sameMatch = this._handMatch === key;
    this._handUids = new Set(uids);
    this._handMatch = key;
    this._arriving = this._arriving || new Set();
    if (!prev || !sameMatch) return;
    const nuove = uids.filter(u => !prev.has(u)).slice(0, 7);
    if (!nuove.length || nuove.length === uids.length && uids.length > 7) return;
    const deck = document.querySelector('#playerDeckStack .deck-card-1');
    const dr = deck && deck.getBoundingClientRect();
    const from = dr && dr.width ? dr : { left: window.innerWidth - 90, top: window.innerHeight - 260, width: 70, height: 103 };
    const phone = window.innerWidth < 1000;
    const step = phone ? 520 : 160;
    nuove.forEach((uid, k) => {
      const target = handBox.querySelector(`.monomyth-card[data-uid="${uid}"]`);
      const card = player.hand.find(c => (c.uid || c.id) === uid);
      if (!target || !card) return;
      target.classList.add('is-arriving');
      this._arriving.add(uid);
      const qs = () => handBox.querySelector(`.monomyth-card[data-uid="${uid}"]`);
      setTimeout(() => {
        const fly = document.createElement('div');
        fly.className = 'draw-fly';
        Object.assign(fly.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
        fly.innerHTML = `<div class="draw-fly-inner"><div class="draw-fly-back"><img src="assets/cards/retrocartamazzo.webp" alt=""></div><div class="draw-fly-front">${this.getCardDOM(card, false)}</div></div>`;
        document.body.appendChild(fly);
        try { window.AudioEngine?.playSfx('card_draw'); } catch (e) {}
        const toHand = () => {
          const el = qs() || target;
          const scorre = handBox.scrollWidth > handBox.clientWidth + 4;
          // Nella mano in fila la carta nuova può essere fuori schermo: si scorre fino a lei
          if (scorre) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          setTimeout(() => {
            const tr = (qs() || target).getBoundingClientRect();
            Object.assign(fly.style, { left: tr.left + 'px', top: tr.top + 'px', width: tr.width + 'px', height: tr.height + 'px' });
            setTimeout(() => { this._arriving.delete(uid); const e2 = qs(); if (e2) e2.classList.remove('is-arriving'); fly.remove(); }, 600);
          }, scorre ? 220 : 0);
        };
        requestAnimationFrame(() => requestAnimationFrame(() => {
          fly.classList.add('is-flipped');
          if (phone) {
            // Prima al centro, grande, per vederla bene; poi in mano
            const w = Math.min(190, window.innerWidth * 0.5), h = w * 1.475;
            Object.assign(fly.style, { left: (window.innerWidth - w) / 2 + 'px', top: (window.innerHeight - h) / 2 - 40 + 'px', width: w + 'px', height: h + 'px' });
            setTimeout(toHand, 750);
          } else {
            toHand();
          }
        }));
      }, k * step);
    });
  }

  // Deterministic Card Layout & Category Color System per User Rules:
  // - Verde (layout_green.webp): Abilità (magia, tech / Intelligenza / poteri speciali)
  // - Rossa (layout_red.webp): Minacce (Calamità, Boss, nemici)
  // - Argento (layout_silver.webp): Carte Personaggio (Eroi)
  // - Blu (layout_blue.webp): Deus Ex Machina (Salvezza, reazioni critiche)
  // - Viola (layout_purple.webp): Carte Oscure (Trauma, Corruzione, osc:1)
  // - Oro (layout_gold.webp): Azione (Attacco, Difesa, manovre)
  getCardLayout(card, isHero = false, isThreat = false) {
    if (window.CARD_LAYOUT_CONFIG && typeof window.CARD_LAYOUT_CONFIG.getLayout === 'function') {
      return window.CARD_LAYOUT_CONFIG.getLayout(card, isHero, isThreat);
    }
    if (isThreat) {
      return { frame: 'assets/layouts/layout_red.webp', icon: 'assets/icons/minaccia.webp', type: 'red' };
    }
    if (isHero || card?.isHero || card?.role === 'personaggio') {
      return { frame: 'assets/layouts/layout_silver.webp', icon: 'assets/icons/vigore.png', type: 'silver' };
    }
    if (card?.osc || card?.cat === 'Oscuro') {
      return { frame: 'assets/layouts/layout_purple.webp', icon: 'assets/icons/oscuro.webp', type: 'purple' };
    }
    if (card?.deus || card?.tipo === 'deus' || card?.nome?.includes('Defibrillazione')) {
      return { frame: 'assets/layouts/layout_blue.webp', icon: 'assets/icons/latout_deus ex machina.webp', type: 'blue' };
    }
    if (card?.cat === 'Intelligenza' || card?.tipo === 'abilita' || card?.tag?.includes('Tech') || card?.tag?.includes('Magia')) {
      return { frame: 'assets/layouts/layout_green.webp', icon: 'assets/icons/inteligenza.png', type: 'green' };
    }
    let icon = 'assets/icons/potenza.png';
    if (card?.cat === 'Agilità') icon = 'assets/icons/agilita.png';
    else if (card?.cat === 'Vigore') icon = 'assets/icons/vigore.png';
    return { frame: 'assets/layouts/layout_gold.webp', icon: icon, type: 'gold' };
  }

  // Official Monomythos Calibrated Card DOM Generator
  getCardDOM(card, isLarge = false) {
    if (!card) return '';
    const layout = this.getCardLayout(card);
    const layoutImg = layout.frame;
    const iconImg = layout.icon;

    const tagText = card.tag ? `[${card.tag}]` : (card.cat ? `[${card.cat}]` : '[Azione]');
    const valText = card.valore !== undefined ? card.valore : 1;
    const bgArt = card.img || 'assets/cards/retrocartamazzo.webp';
    const effectText = card.effetto || card.desc || '';
    // Versione breve per la mano: la prima frase (o parola chiave) dell'effetto
    const plainText = String(effectText).replace(/<[^>]*>/g, '').trim();
    const shortText = (plainText.split(/(?<=[.!:;])\s/)[0] || '').replace(/[.:;]$/, '');

    return `
      <div class="monomyth-card card-${layout.type} ${card.osc ? 'card-osc' : ''} ${card.deus ? 'card-deus' : ''} ${isLarge ? 'card-large' : ''}" data-uid="${card.uid || card.id}">
        <!-- Layer 1: Art Illustration BEHIND frame -->
        <img class="card-bg-art" src="${bgArt}" alt="${card.nome}" onerror="this.src='assets/cards/retrocartamazzo.webp'">

        <!-- Layer 2: Official Comic Frame with transparent window -->
        <img class="card-frame-overlay" src="${layoutImg}" alt="Frame">

        <!-- Layer 3: Comic speech bubble vignette at top with Title & [Tag] -->
        <div class="card-vignette-bubble">
          <div class="card-vignette-title">${card.nome}</div>
          <div class="card-vignette-tag">${tagText}</div>
        </div>

        <!-- Layer 4: Lower Central Transparent Box with Effect Description -->
        <div class="card-desc-box">
          <div class="card-desc-text">${effectText}</div>
          <div class="card-desc-short">${shortText}</div>
        </div>

        <!-- Layer 5: Bottom Left Circle with Card Value -->
        <div class="card-circle-val">${valText}</div>

        <!-- Layer 6: Bottom Right Circle with Category Icon -->
        <div class="card-circle-icon">
          <img src="${iconImg}" alt="${card.cat || 'Icona'}" onerror="this.src='assets/icons/potenza.png'">
        </div>
      </div>
    `;
  }

  // 3D Perspective Threat Draw Animation
  triggerThreatDrawAnimation(th) {
    if (!th) return;
    const overlay = document.getElementById('threatEntryAnimOverlay');
    const frontImg = document.getElementById('threatDrawFrontImg');
    const frontName = document.getElementById('threatDrawFrontName');
    if (!overlay) return;

    if (frontImg) frontImg.src = th.img || 'assets/icons/minaccia.webp';
    if (frontName) frontName.textContent = th.nome || 'Minaccia';

    window.AudioEngine?.playSfx('fracture');
    overlay.classList.add('active');

    setTimeout(() => {
      overlay.classList.remove('active');
    }, 1500);
  }

  // Card Play Fly Animation with specific Sound Effects
  animateCardPlay(card, onComplete) {
    // Sound effect mapped directly to card category / archetype
    if (card.osc) {
      window.AudioEngine?.playSfx('card_dark');
    } else if (card.deus || card.tipo === 'deus' || card.nome?.includes('Defibrillazione')) {
      window.AudioEngine?.playSfx('card_deus');
    } else if (card.cat === 'Intelligenza' || card.tag?.includes('Tech') || card.tag?.includes('Magia')) {
      window.AudioEngine?.playSfx('card_tech');
    } else if (card.fx?.shield) {
      window.AudioEngine?.playSfx('card_defense');
    } else if (card.fx?.dmg) {
      window.AudioEngine?.playSfx('card_attack');
    } else {
      window.AudioEngine?.playSfx('card_draw');
    }

    const sourceEl = document.querySelector(`.monomyth-card[data-uid="${card.uid}"]`);
    const tableZone = document.getElementById('tableZone');

    if (sourceEl && tableZone) {
      const rect = sourceEl.getBoundingClientRect();
      const clone = sourceEl.cloneNode(true);
      clone.classList.add('card-playing-flying');
      clone.style.top = `${rect.top}px`;
      clone.style.left = `${rect.left}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      document.body.appendChild(clone);

      setTimeout(() => {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
        const sw = document.createElement('div');
        sw.className = 'table-shockwave';
        tableZone.appendChild(sw);
        setTimeout(() => sw.remove(), 600);
        if (onComplete) onComplete();
      }, 550);
    } else {
      if (onComplete) onComplete();
    }
  }

  // Open Bottom Action Sheet on Card Tap
  openCardActionSheet(card) {
    this.selectedCard = card;
    const localPlayer = window.GameEngine.state.players[0];
    const th = window.GameEngine.state.currentThreat;

    const sheetArtContainer = document.querySelector('.sheet-card-art');
    if (sheetArtContainer) {
      sheetArtContainer.innerHTML = this.getCardDOM(card, true);
    }

    document.getElementById('sheetCardName').textContent = card.nome;
    document.getElementById('sheetCardCategory').textContent = `${card.cat} • Valore ${card.valore}`;
    document.getElementById('sheetCardEffect').textContent = card.effetto;

    // Check Opzione A Slot Cost (using resilient normalized slot checker)
    const availableSlots = window.GameEngine.getPlayerSlot ? window.GameEngine.getPlayerSlot(localPlayer, card.cat) : ((localPlayer.slots && localPlayer.slots[card.cat]) || 0);
    const isReactionCard = (card.effetto && card.effetto.toLowerCase().includes('reazione')) || (card.fx_list && card.fx_list.some(f => f.timing === 'reaction'));
    const canPlay = availableSlots >= card.valore && (window.GameEngine.state.turnIndex === 0 || isReactionCard);
    const optA = document.getElementById('btnOptionPlayEffect');
    optA.style.opacity = canPlay ? '1' : '0.5';
    optA.querySelector('.cost-badge').textContent = `${card.valore} ${card.cat}`;
    // se non si può giocare, si spiega perché
    const optAp = optA.querySelector('p');
    if (optAp) {
      if (!optAp.dataset.base) optAp.dataset.base = optAp.textContent;
      optAp.textContent = canPlay ? optAp.dataset.base
        : (window.GameEngine.state.turnIndex !== 0 && !isReactionCard ? 'Non è il tuo turno'
          : `Ti servono ${card.valore} slot ${card.cat}: ne hai ${availableSlots}. Puoi usarla come Sacrificio Tattico.`);
    }

    // Opzione B Tactical Sacrifice contribution calculation
    const canSacrifice = localPlayer.sacrificesThisRound < 2 && window.GameEngine.state.turnIndex === 0;
    // §5: nessuna conversione tra categorie, la carta vale solo sul binario della sua Categoria
    const eng = window.GameEngine;
    const used = `${localPlayer.sacrificesThisRound}/2 usati`;
    [['primario', 'btnOptionSacrifice', 'Primario'], ['bruto', 'btnOptionSacrificeBruto', 'Bruto']].forEach(([track, id, label]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const reqCat = th[track].cat;
      const ok = eng.normalizeCategory(card.cat) === eng.normalizeCategory(reqCat);
      el.style.opacity = canSacrifice && ok ? '1' : '0.5';
      el.querySelector('p').textContent = ok
        ? `+${card.valore} sul binario ${label} [${reqCat}] (${used})`
        : `Il binario ${label} accetta solo carte ${reqCat}`;
    });

    this.showModal('modalCardActionSheet');
  }

  confirmPlayCard() {
    if (!this.selectedCard) return;
    const card = this.selectedCard;
    this.hideModals();

    const targetInfo = window.GameEngine.getValidTargetsForCard(this.idLocale(), card);
    const targets = targetInfo.candidates || targetInfo.targets || [];
    const validTargets = targets.filter(t => t.isValid);

    if (targetInfo.requiresTarget && validTargets.length > 1) {
      this.openTargetSelectionModal(card, validTargets);
      return;
    }

    const defaultTargetId = validTargets.length === 1 ? validTargets[0].id : (targets[0]?.id || 'threat_boss');

    this.animateCardPlay(card, () => {
      const res = window.GameEngine.playCardEffect(this.idLocale(), card.uid, defaultTargetId);
      if (!res.ok) {
        this.showToast(res.msg);
      }
    });
  }

  // ==========================================
  // TARGET SELECTION CONTROLLER (Point 7)
  // ==========================================
  openTargetSelectionModal(card, targets) {
    this.pendingTargetCard = card;
    this.selectedTargetId = targets[0]?.id || null;

    const list = document.getElementById('targetCandidatesList');
    if (!list) return;
    list.innerHTML = '';

    targets.forEach((t, idx) => {
      const item = document.createElement('div');
      item.className = `target-candidate-item ${idx === 0 ? 'selected' : ''}`;
      item.dataset.targetId = t.id;

      let badgeClass = 'badge-threat';
      let badgeLabel = 'Minaccia';
      if (t.type === 'mook') {
        badgeClass = 'badge-mook';
        badgeLabel = 'Sgherro';
      } else if (t.type === 'player') {
        badgeClass = t.role === 'villain' ? 'badge-villain' : 'badge-ally';
        badgeLabel = t.role === 'villain' ? 'Villain' : 'Eroe';
      }

      const hpVal = t.hp !== undefined ? t.hp : (t.health !== undefined ? t.health : 0);
      item.innerHTML = `
        <div class="target-cand-info">
          <div class="target-cand-name">${t.name}</div>
          <div class="target-cand-sub">HP: ${hpVal}</div>
        </div>
        <span class="target-cand-badge ${badgeClass}">${badgeLabel}</span>
      `;

      item.onclick = () => {
        document.querySelectorAll('.target-candidate-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        this.selectedTargetId = t.id;
        const confirmBtn = document.getElementById('btnConfirmTarget');
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = `Conferma: ${t.name}`; }
      };

      list.appendChild(item);
    });

    const confirmBtn = document.getElementById('btnConfirmTarget');
    if (confirmBtn) {
      confirmBtn.disabled = targets.length === 0;
      confirmBtn.textContent = targets[0] ? `Conferma: ${targets[0].name}` : 'Conferma Bersaglio';
    }

    this.showModal('modalTargetSelect');
  }

  executeTargetSelection() {
    if (!this.selectedTargetId || !this.pendingTargetCard) return;
    const card = this.pendingTargetCard;
    const targetId = this.selectedTargetId;
    this.pendingTargetCard = null;
    this.selectedTargetId = null;
    this.hideModals();

    this.animateCardPlay(card, () => {
      const res = window.GameEngine.playCardEffect(this.idLocale(), card.uid, targetId);
      if (!res.ok) {
        this.showToast(res.msg);
      }
    });
  }

  cancelTargetSelection() {
    this.pendingTargetCard = null;
    this.selectedTargetId = null;
    this.hideModals();
  }

  // ==========================================
  // DEFENSE & REACTION WINDOW (Dynamic Parry & Out-of-turn Reaction)
  // ==========================================
  openDefenseWindow(data) {
    const enemyNameEl = document.getElementById('defenseEnemyName');
    const dmgAmountEl = document.getElementById('defenseDmgAmount');
    const absorbedNoticeEl = document.getElementById('defenseAbsorbedNotice');
    const trampleEl = document.getElementById('defenseTrampleNotice');
    const list = document.getElementById('defenseOptionsList');
    const parryGrid = document.getElementById('parryCardsSelectionGrid');
    const btnConfirm = document.getElementById('btnConfirmParry');
    if (!list) return;

    this.currentDefenseData = data;
    this.selectedParryCards = new Set();
    const rawDmg = data.mitigable != null ? data.mitigable : (data.rawDmg || 1);
    const localPlayer = window.GameEngine.state.players.find(p => p.isLocal || p.id === this.localPlayerId) || window.GameEngine.state.players[0];
    const isDirectAttack = data.target ? (data.target.id === localPlayer?.id) : true;

    if (enemyNameEl) {
      if (isDirectAttack) {
        enemyNameEl.textContent = `🚨 SEI SOTTO ATTACCO da: ${data.enemy?.nome || 'Minaccia Nemica'}`;
      } else {
        enemyNameEl.textContent = `🛡️ COMPAGNO ${data.target?.name || 'Alleato'} SOTTO ATTACCO da: ${data.enemy?.nome || 'Minaccia'}`;
      }
    }
    if (dmgAmountEl) dmgAmountEl.textContent = data.isTrample
      ? `Danno dichiarato: ${data.rawDmg} (${data.rawDmg - rawDmg} imparabili per Travolgere, ${rawDmg} parabili)`
      : `Danno dichiarato: ${rawDmg}`;
    if (absorbedNoticeEl) absorbedNoticeEl.textContent = `Assorbito: 0 / ${rawDmg} Danni`;
    if (trampleEl) {
      trampleEl.textContent = data.enemy?.pericoloso
        ? `Effetto Pericoloso: ${data.enemy.pericoloso}`
        : (data.isTrample ? `⚠️ TRAVOLGERE: la parte oltre la Resistenza (${data.effectiveEnd}) va sempre a segno` : (isDirectAttack ? '' : '💡 Puoi scartare carte per parare il colpo e proteggere il tuo compagno!'));
    }
    if (btnConfirm) {
      btnConfirm.textContent = isDirectAttack ? `Incassa Senza Parare` : `Lascia difendere al compagno`;
    }

    // 1. Dynamic Parry Hand Cards Selection (Point 5: 1 carta = 1 danno assorbito)
    if (parryGrid) {
      parryGrid.innerHTML = '';
      const hand = data.parryCards || (localPlayer ? localPlayer.hand : []);

      if (hand.length === 0) {
        parryGrid.innerHTML = '<div style="font-size:11px; color:var(--muto); padding:4px 0;">Nessuna carta disponibile in mano da scartare.</div>';
      } else {
        hand.forEach(c => {
          const item = document.createElement('div');
          item.className = 'parry-card-item';
          item.dataset.uid = c.uid;
          item.onclick = () => this.toggleParryCard(c.uid);

          item.innerHTML = `
            <img src="${c.img || 'assets/cards/retrocartamazzo.webp'}" alt="${c.nome}" onerror="this.src='assets/cards/retrocartamazzo.webp'">
            <div class="parry-check-badge">✓</div>
            <div class="parry-card-title">${c.nome}</div>
          `;
          parryGrid.appendChild(item);
        });
      }
    }

    // 2. Fast Reaction Cards in Hand (Instant out-of-turn play)
    list.innerHTML = '';
    const hand = data.reactionCards || (localPlayer ? localPlayer.hand.filter(c => (c.effetto && c.effetto.toLowerCase().includes('reazione')) || (c.fx_list && c.fx_list.some(f => f.timing === 'reaction'))) : []);
    const reactCards = hand.filter(c => (c.effetto && c.effetto.toLowerCase().includes('reazione')) || (c.fx_list && c.fx_list.some(f => f.timing === 'reaction')));

    if (reactCards.length > 0) {
      reactCards.forEach(c => {
        const row = document.createElement('div');
        row.className = 'defense-opt-card';
        row.innerHTML = `
          <div style="flex:1;">
            <div style="font-weight:700; color:#50b06b; font-size:13px;">⚡ Reazione: ${c.nome}</div>
            <div style="font-size:11px; color:var(--bone); opacity:0.85; margin-top:2px;">${c.effetto || 'Contromisura difensiva'}</div>
          </div>
          <button class="btn btn-primary" style="padding:6px 12px; font-size:11px;">ATTIVA REAZIONE</button>
        `;
        row.onclick = () => this.chooseReactionCard(c.uid);
        list.appendChild(row);
      });
    } else {
      list.innerHTML = `<div style="font-size:11px; color:var(--muto); padding:4px 0;">${isDirectAttack ? 'Nessuna carta con abilità Reazione in mano. Seleziona le carte in alto per la Parata Dinamica!' : 'Nessuna reazione rapida. Seleziona carte in alto per parare a favore del compagno o lascialo difendersi.'}</div>`;
    }

    // 3. Reaction Timer Countdown
    if (this._defenseCountdownInterval) {
      clearInterval(this._defenseCountdownInterval);
    }
    let secondsLeft = 8;
    const timerSecEl = document.getElementById('defenseTimerSeconds');
    const timerFillEl = document.getElementById('defenseTimerFill');
    const timerWrap = document.querySelector('#modalDefenseWindow .defense-timer-wrap');
    if (timerSecEl) timerSecEl.textContent = `${secondsLeft}s`;
    if (timerFillEl) timerFillEl.style.width = '100%';
    // Nel tutorial non c'è fretta: niente conto alla rovescia, si legge con calma e si sceglie
    const T = window.Tutorial;
    const inTutorial = !!(T && T.inPartita);
    if (timerWrap) timerWrap.classList.toggle('senza-limite', inTutorial);
    if (inTutorial) {
      if (timerSecEl) timerSecEl.textContent = window.I18N ? window.I18N.t('Nessun limite') : 'Nessun limite';
      this.showModal('modalDefenseWindow');
      return;
    }
    // Un secondo e mezzo di respiro prima che il tempo cominci a scendere
    let respiro = 1.5;

    this._defenseCountdownInterval = setInterval(() => {
      // il tempo si ferma mentre è aperto un consiglio del tutorial o una finestra di conferma
      if (document.querySelector('.tutorial-bolla, .dlg-overlay') || document.hidden) return;
      if (respiro > 0) { respiro -= 0.1; return; }
      secondsLeft -= 0.1;
      const pct = Math.max(0, (secondsLeft / 8) * 100);
      if (timerFillEl) timerFillEl.style.width = `${pct}%`;
      if (timerSecEl) timerSecEl.textContent = `${Math.ceil(Math.max(0, secondsLeft))}s`;
      if (secondsLeft <= 0) {
        clearInterval(this._defenseCountdownInterval);
        this._defenseCountdownInterval = null;
        if (this.selectedParryCards && this.selectedParryCards.size > 0) {
          this.executeDynamicParry();
        } else {
          this.confirmDefenseTakeHit();
        }
      }
    }, 100);

    this.showModal('modalDefenseWindow');
  }

  toggleParryCard(cardUid) {
    if (!this.selectedParryCards) this.selectedParryCards = new Set();
    if (this.selectedParryCards.has(cardUid)) {
      this.selectedParryCards.delete(cardUid);
    } else {
      this.selectedParryCards.add(cardUid);
    }

    // Update visuals in parry grid
    document.querySelectorAll('.parry-card-item').forEach(el => {
      const isSel = this.selectedParryCards.has(el.dataset.uid);
      el.classList.toggle('selected', isSel);
    });

    const count = this.selectedParryCards.size;
    const dd = this.currentDefenseData || {};
    const rawDmg = dd.mitigable != null ? dd.mitigable : (dd.rawDmg || 1);
    // §3.3: assorbimento = ⌊somma dei Valori scartati ÷ tasso⌋, limitato alla parte parabile
    const allCards = window.GameEngine.state.players.flatMap(p => p.hand);
    const valueSum = [...this.selectedParryCards].reduce((sum, uid) => sum + ((allCards.find(c => c.uid === uid) || {}).valore || 0), 0);
    const absorbed = Math.min(rawDmg, Math.floor(valueSum / window.GameEngine.getParryRate()));

    const absorbedNoticeEl = document.getElementById('defenseAbsorbedNotice');
    if (absorbedNoticeEl) absorbedNoticeEl.textContent = `Assorbito: ${absorbed} / ${rawDmg} Danni`;

    const btnConfirm = document.getElementById('btnConfirmParry');
    if (btnConfirm) {
      btnConfirm.textContent = count > 0 ? `Conferma Parata Dinamica (Scarta ${count} ${count === 1 ? 'carta' : 'carte'}, Blocca ${absorbed} Danni)` : `Conferma Parata Dinamica (Scarta 0 carte)`;
    }
  }

  executeDynamicParry() {
    if (this._defenseCountdownInterval) {
      clearInterval(this._defenseCountdownInterval);
      this._defenseCountdownInterval = null;
    }
    const uids = this.selectedParryCards ? Array.from(this.selectedParryCards) : [];
    this.hideModals();
    if (uids.length > 0) {
      try { window.AudioEngine?.playSfx('shield'); } catch (e) {}
      window.GameEngine.respondToDefense({ type: 'parry_cards', cardUids: uids });
      this.showToast(`Parata Dinamica: ${uids.length} carte scartate per bloccare i danni!`);
    } else {
      window.GameEngine.respondToDefense({ type: 'none' });
    }
  }

  chooseReactionCard(cardUid) {
    if (this._defenseCountdownInterval) {
      clearInterval(this._defenseCountdownInterval);
      this._defenseCountdownInterval = null;
    }
    this.hideModals();
    try { window.AudioEngine?.playSfx('shield'); } catch (e) {}
    window.GameEngine.respondToDefense({ type: 'reaction_card', cardUid });
  }

  chooseParryCard(cardUid) {
    if (this._defenseCountdownInterval) {
      clearInterval(this._defenseCountdownInterval);
      this._defenseCountdownInterval = null;
    }
    this.hideModals();
    try { window.AudioEngine?.playSfx('shield'); } catch (e) {}
    window.GameEngine.respondToDefense({ type: 'parry_cards', cardUids: [cardUid] });
  }

  confirmDefenseTakeHit() {
    if (this._defenseCountdownInterval) {
      clearInterval(this._defenseCountdownInterval);
      this._defenseCountdownInterval = null;
    }
    const isAllyDefense = this.currentDefenseData?.isAllyDefense;
    this.hideModals();
    window.GameEngine.respondToDefense({ type: isAllyDefense ? 'bot_fallback' : 'none' });
  }

  confirmSacrifice(track) {
    if (!this.selectedCard) return;
    const card = this.selectedCard;
    this.hideModals();
    this.animateCardPlay(card, () => {
      const res = window.GameEngine.tacticalSacrifice(this.idLocale(), card.uid, track);
      if (!res.ok) {
        this.showToast(res.msg);
      }
    });
  }

  openBasePowerSheet() {
    const localPlayer = window.GameEngine.state.players[0];
    if (localPlayer.pbUsedThisTurn) return this.showToast('Potere Base già utilizzato in questo turno!');

    document.getElementById('pbSheetTitle').textContent = localPlayer.pbName || 'Potere Base';
    document.getElementById('pbSheetDesc').textContent = localPlayer.pbDesc || 'Attiva un effetto speciale';
    this.showModal('modalBasePowerSheet');
  }

  confirmBasePower(optIndex) {
    const res = window.GameEngine.activateBasePower(this.idLocale(), optIndex);
    if (!res.ok) {
      this.showToast(res.msg);
    } else {
      this.hideModals();
    }
  }

  // Id del giocatore su questo dispositivo: online non è sempre p_0 (l'host è p_0, gli altri p_1, p_2...)
  idLocale() {
    const st = window.GameEngine && window.GameEngine.state;
    const me = st && (st.players.find(p => p.isLocal) || st.players[0]);
    return me ? me.id : 'p_0';
  }

  changeDrawChoice(delta) {
    const engine = window.GameEngine;
    const p = engine.state?.players.find(x => x.isLocal) || engine.state?.players[0];
    if (!p) return;
    const maxDraw = engine.getMaxDraw(p);
    const current = p.drawChoice == null ? maxDraw : p.drawChoice;
    engine.setDrawChoice(p.id, current + delta);
    const drawLbl = document.getElementById('drawChoiceLabel');
    if (drawLbl) drawLbl.textContent = `Pesca ${p.drawChoice}/${maxDraw}`;
  }

  confirmEndTurn() {
    const engine = window.GameEngine;
    const p = engine.state?.players.find(x => x.isLocal) || engine.state?.players[0];
    // Penalità per Passività e Scarto di Sopravvivenza (§3)
    if (p && !p.isDead && !p.actedThisRound) {
      if (engine.hasLegalMove(p)) {
        window.Dialogo.conferma('Non hai fatto nessuna azione: a fine round subirai 1 Punto Trauma. Terminare comunque il turno?', { ok: 'Termina turno', annulla: 'Continua a giocare' })
          .then(si => { if (si && engine.state && engine.state.phase === 'action' && engine.state.players[engine.state.turnIndex] === p) engine.endTurn(); });
        return;
      } else if (p.hand.length > 0) {
        engine.survivalDiscard(p.id);
        this.showToast('Nessuna mossa possibile: Scarto di Sopravvivenza della carta di valore più basso');
      }
    }
    engine.endTurn();
  }

  inspectCard(card) {
    const c = card || this.selectedCard;
    if (!c) return;
    document.getElementById('inspectCardImg').src = c.img || 'assets/icons/azione.webp';
    document.getElementById('inspectCardTitle').textContent = c.nome;
    document.getElementById('inspectCardDesc').textContent = c.effetto;
    this.showModal('modalInspect');
  }

  inspectCurrentThreat() {
    const th = window.GameEngine.state ? window.GameEngine.state.currentThreat : null;
    if (!th) return;
    // La finestra può contenere una carta ispezionata prima: si ricostruisce ogni volta
    const wrap = document.querySelector('.full-card-inspect-wrap');
    const esc = t => String(t == null ? '' : t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    if (wrap) wrap.innerHTML = `
      <img src="${th.img || 'assets/icons/minaccia.webp'}" alt="${esc(th.nome)}" style="width:min(320px, 80vw); border-radius:12px; display:block; margin:0 auto 10px; box-shadow:4px 4px 0 #000;">
      <h3 style="font-size:18px; color:var(--oro-soft)">${esc(th.nome)}</h3>
      <p style="font-size:12px; color:var(--bone); text-align:center; max-width:320px;">Pericoloso: ${esc(th.pericoloso)}<br>Cosmico: ${esc(th.cosmico || 'Nessuno')}</p>`;
    this.showModal('modalInspect');
  }

  // Custom Hero Creator Form setup
  renderCustomHeroOptions() {
    const data = window.MONOMYTHOS_DATA;
    if (!data) return;

    const fillSelect = (id, role) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '';
      const cards = data.creation_cards.filter(c => c.role === role && this.creationCardOwned(c));
      cards.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.name} (${c.char})`;
        el.appendChild(opt);
      });
    };

    fillSelect('selCustomOrigine', 'origine');
    fillSelect('selCustomArchetipo', 'archetipo');
    fillSelect('selCustomCostume', 'costume');
    fillSelect('selCustomPb', 'pb');
  }

  recalculateCustomHero() {
    const data = window.MONOMYTHOS_DATA;
    const oName = document.getElementById('selCustomOrigine').value;
    const aName = document.getElementById('selCustomArchetipo').value;
    const cName = document.getElementById('selCustomCostume').value;
    const pName = document.getElementById('selCustomPb').value;

    const oCard = data.creation_cards.find(c => c.name === oName) || {};
    const cCard = data.creation_cards.find(c => c.name === cName) || {};

    const str = Math.min(5, (oCard.str || 0) + (cCard.str || 0));
    const spd = Math.min(5, (oCard.spd || 0) + (cCard.spd || 0));
    const tech = Math.min(5, (oCard.tech || 0) + (cCard.tech || 0));
    const end = Math.min(5, (oCard.end || 0) + (cCard.end || 0));
    const vita = oCard.vita || 25;

    document.getElementById('custValStr').textContent = str;
    document.getElementById('custValSpd').textContent = spd;
    document.getElementById('custValTech').textContent = tech;
    document.getElementById('custValEnd').textContent = end;
    document.getElementById('custValVita').textContent = vita;
  }

  confirmCustomHero() {
    const oName = document.getElementById('selCustomOrigine').value;
    const aName = document.getElementById('selCustomArchetipo').value;
    const cName = document.getElementById('selCustomCostume').value;
    const pName = document.getElementById('selCustomPb').value;

    const data = window.MONOMYTHOS_DATA;
    const oCard = data.creation_cards.find(c => c.name === oName) || {};
    const cCard = data.creation_cards.find(c => c.name === cName) || {};
    const pCard = data.creation_cards.find(c => c.name === pName) || {};

    const customKey = 'Custom Hero';
    data.chars_meta[customKey] = {
      name: customKey,
      str: Math.min(5, (oCard.str || 0) + (cCard.str || 0)),
      spd: Math.min(5, (oCard.spd || 0) + (cCard.spd || 0)),
      tech: Math.min(5, (oCard.tech || 0) + (cCard.tech || 0)),
      end: Math.min(5, (oCard.end || 0) + (cCard.end || 0)),
      vita: oCard.vita || 25,
      pb_name: pName,
      pb_desc: pCard.testo || '',
      archetipo: aName,
      img: 'assets/icons/peronaggio.webp'
    };

    data.action_cards[customKey] = data.action_cards['Iron Aegis']; // Preset deck

    this.hideModals();
    this.startSoloGame(customKey);
  }

  // Floating combat number animation
  spawnFloatingNumber(num, type, anchorEl) {
    if (num <= 0) return;
    const el = document.createElement('div');
    el.className = `floating-num ${type}`;
    el.textContent = type === 'dmg' ? `-${num}` : `+${num}`;
    if (anchorEl && anchorEl.getBoundingClientRect) {
      const r = anchorEl.getBoundingClientRect();
      el.style.position = 'fixed';
      el.style.left = `${r.left + r.width / 2}px`;
      el.style.top = `${r.top + r.height * 0.35}px`;
    } else {
      el.style.left = '50%';
      el.style.top = '40%';
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // Effetti: colpo su un elemento (lampo + scossa)
  fxHit(el, cls = 'fx-hit') {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 650);
  }

  // Effetti: striscione a tutto schermo (inizio round, nuovo Atto, vittoria)
  fxBanner(title, sub = '', tone = 'gold') {
    const b = document.createElement('div');
    b.className = `fx-banner tone-${tone}`;
    b.innerHTML = `<div class="fx-banner-band"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1700);
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }

  showGameOverModal(winner) {
    document.getElementById('gameOverTitle').textContent = winner === 'heroes' ? 'VITTORIA COSMICA!' : 'SCONFITTA';
    document.getElementById('gameOverSubtitle').textContent = winner === 'heroes' ? 'La Crisi Cosmica è stata disinnescata!' : 'Tutti gli eroi sono caduti o la detonazione ha distrutto la squadra.';
    this.showModal('modalGameOver');
  }

  // ==========================================
  // DECK BUILDER CONTROLLER (Point 5)
  // ==========================================
  populateDeckCreationDropdowns() {
    const data = window.MONOMYTHOS_DATA;
    if (!data || !data.creation_cards) return;

    const fill = (selectId, role) => {
      const el = document.getElementById(selectId);
      if (!el) return;
      el.innerHTML = '';
      const cards = data.creation_cards.filter(c => c.role === role && this.creationCardOwned(c));
      cards.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.name} [${c.char}]`;
        el.appendChild(opt);
      });
    };

    fill('deckSelOrigine', 'origine');
    fill('deckSelArchetipo', 'archetipo');
    fill('deckSelCostume', 'costume');
    fill('deckSelPb', 'pb');
  }

  openDeckBuilder() {
    this.populateDeckCreationDropdowns();

    this.currentDeckBuilding = {
      name: 'Mazzo Personalizzato',
      hero: 'Custom Hero',
      creation: {
        origine: 'Ex-Geniere',
        archetipo: 'Avanguardia Pesante',
        costume: 'Armatura Exo-K',
        pb: 'Sovraccarico Cinetico'
      },
      cards: {} // cardId -> count
    };

    // Load active deck if exists
    const activeName = window.Progression.data.activeDeckName;
    const existing = window.Progression.getCustomDeck(activeName);
    if (existing) {
      this.currentDeckBuilding = JSON.parse(JSON.stringify(existing));
      this.currentDeckBuilding.name = activeName;
      if (!this.currentDeckBuilding.creation) {
        this.currentDeckBuilding.creation = {
          origine: 'Ex-Geniere',
          archetipo: 'Avanguardia Pesante',
          costume: 'Armatura Exo-K',
          pb: 'Sovraccarico Cinetico'
        };
      }
    }

    // Le carte creazione devono essere di eroi che possiedi
    {
      const cc = (window.MONOMYTHOS_DATA.creation_cards || []);
      const crd = this.currentDeckBuilding.creation;
      ['origine', 'archetipo', 'costume', 'pb'].forEach(role => {
        const cur = cc.find(c => c.role === role && c.name === crd[role]);
        if (!cur || !this.creationCardOwned(cur)) {
          const alt = cc.find(c => c.role === role && this.creationCardOwned(c));
          if (alt) crd[role] = alt.name;
        }
      });
    }

    const cr = this.currentDeckBuilding.creation;
    const selO = document.getElementById('deckSelOrigine');
    const selA = document.getElementById('deckSelArchetipo');
    const selC = document.getElementById('deckSelCostume');
    const selP = document.getElementById('deckSelPb');
    const nameInp = document.getElementById('deckNameInput');

    if (selO && cr.origine) selO.value = cr.origine;
    if (selA && cr.archetipo) selA.value = cr.archetipo;
    if (selC && cr.costume) selC.value = cr.costume;
    if (selP && cr.pb) selP.value = cr.pb;
    if (nameInp) nameInp.value = this.currentDeckBuilding.name;

    this.onDeckCreationChanged();
    this.renderDeckCreationSlots();
    this.showScreen('scr-deckbuilder');
  }

  onDeckCreationChanged() {
    const data = window.MONOMYTHOS_DATA;
    if (!data) return;

    const selO = document.getElementById('deckSelOrigine');
    const selA = document.getElementById('deckSelArchetipo');
    const selC = document.getElementById('deckSelCostume');
    const selP = document.getElementById('deckSelPb');

    const oName = selO ? selO.value : '';
    const aName = selA ? selA.value : '';
    const cName = selC ? selC.value : '';
    const pName = selP ? selP.value : '';

    const oCard = data.creation_cards.find(c => c.name === oName) || {};
    const aCard = data.creation_cards.find(c => c.name === aName) || {};
    const cCard = data.creation_cards.find(c => c.name === cName) || {};
    const pCard = data.creation_cards.find(c => c.name === pName) || {};

    // 1. Calculate live stats & HP
    const str = Math.min(5, (oCard.str || 0) + (cCard.str || 0));
    const spd = Math.min(5, (oCard.spd || 0) + (cCard.spd || 0));
    const tech = Math.min(5, (oCard.tech || 0) + (cCard.tech || 0));
    const end = Math.min(5, (oCard.end || 0) + (cCard.end || 0));
    const vita = oCard.vita || 25;

    const strEl = document.getElementById('deckHeroStr');
    const spdEl = document.getElementById('deckHeroSpd');
    const techEl = document.getElementById('deckHeroTech');
    const endEl = document.getElementById('deckHeroEnd');
    const hpEl = document.getElementById('deckHeroHp');

    if (strEl) strEl.textContent = str;
    if (spdEl) spdEl.textContent = spd;
    if (techEl) techEl.textContent = tech;
    if (endEl) endEl.textContent = end;
    if (hpEl) hpEl.textContent = vita;

    // 2. Extract allowed tags from Archetype (e.g. "Tag Autorizzati: Attacco Fisico, Abilità Tech, Gadget")
    let allowedTags = ['Untagged'];
    const archText = aCard.testo || '';
    const tagMatch = archText.match(/Tag\s*Autorizzati\s*:\s*([^.]+)/i);
    if (tagMatch) {
      const rawTags = tagMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      allowedTags = [...new Set([...allowedTags, ...rawTags])];
    } else {
      allowedTags = ['Attacco Fisico', 'Abilità Tech', 'Gadget', 'Difesa', 'Burst', 'Untagged'];
    }

    // Display Allowed Tags Pills
    const tagPillsBox = document.getElementById('deckAllowedTagsPills');
    if (tagPillsBox) {
      tagPillsBox.innerHTML = allowedTags.map(t => `<span class="builder-tag-pill">${t}</span>`).join('');
    }

    // Display Base Power
    const pbTitleEl = document.getElementById('deckPbNameDisplay');
    const pbDescEl = document.getElementById('deckPbTextDisplay');
    if (pbTitleEl) pbTitleEl.textContent = pName || 'Potere Base';
    if (pbDescEl) pbDescEl.textContent = pCard.testo || 'Abilità eroe';

    // Update currentDeckBuilding creation state
    this.currentDeckBuilding.creation = {
      origine: oName,
      archetipo: aName,
      costume: cName,
      pb: pName,
      str, spd, tech, end, vita,
      allowedTags,
      pb_desc: pCard.testo || ''
    };

    // Keep chars_meta['Custom Hero'] updated
    data.chars_meta['Custom Hero'] = {
      name: 'Custom Hero',
      str, spd, tech, end, vita,
      pb_name: pName,
      pb_desc: pCard.testo || '',
      archetipo: aName,
      arch_desc: aCard.testo || '',
      origine: oName,
      costume: cName,
      img: oCard.img || 'assets/cards/ironaegis.webp'
    };

    // Filter and render action cards based on allowed tags
    this.renderDeckBuilderCards(allowedTags);
    this.updateDeckBuilderCounts();
    this.renderDeckCreationSlots();
  }

  // Point 2: Visual Creation Cards Image Resolver
  getCreationCardImage(card) {
    if (!card) return 'assets/cards/ironaegis.webp';
    if (card.img) return card.img;
    const slug = (card.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const manualMap = {
      'tutafotonica': 'assets/cards/tuttafotonica.webp',
      'sentinelladifrontiera': 'assets/cards/sentinelladifrontiera.webp',
      'sentinellaadattiva': 'assets/cards/sentinellaadattiva.webp',
      'scudomodulare': 'assets/cards/scudomodulare.webp',
      'duellanteitinerante': 'assets/cards/duellanteitinerante.webp',
      'sopravvissutoallafonderia': 'assets/cards/sopravvissutoallafonderia.webp',
      'piastrerubate': 'assets/cards/piastrerubate.webp',
      'spettrocinetico': 'assets/cards/spettrocinetico.webp',
      'scattoquantistico': 'assets/cards/scattoquantistico.webp',
      'sovraccaricocinetico': 'assets/cards/sovraccaricocinetico.webp',
      'foderoleggero': 'assets/cards/foderoleggero.webp',
      'armaturaexok': 'assets/cards/armaturaexok.webp',
      'avanguardiapesante': 'assets/cards/avanguardiapesante.webp',
      'exgeniere': 'assets/cards/exgeniere.webp',
      'lamasenzacasa': 'assets/cards/lamasenzacasa.webp',
      'caviaalpha': 'assets/cards/caviaalpha.webp'
    };
    if (manualMap[slug]) return manualMap[slug];
    if (card.char && window.MONOMYTHOS_DATA?.chars_meta[card.char]?.img) {
      return window.MONOMYTHOS_DATA.chars_meta[card.char].img;
    }
    return 'assets/cards/ironaegis.webp';
  }

  creationCardOwned(card) {
    const P = window.Progression;
    return !P || !card.char || P.isHeroUnlocked(card.char);
  }

  // Point 2: Render 4 Visual Creation Card Slots in Deck Builder
  renderDeckCreationSlots() {
    const container = document.getElementById('deckCreationCardSlots');
    if (!container) return;
    const data = window.MONOMYTHOS_DATA;
    if (!data || !data.creation_cards) return;

    const cr = this.currentDeckBuilding?.creation || {
      origine: 'Ex-Geniere',
      archetipo: 'Avanguardia Pesante',
      costume: 'Armatura Exo-K',
      pb: 'Sovraccarico Cinetico'
    };

    const rolesConfig = [
      { key: 'origine', label: '1. Origine', desc: 'Vita Base & Stats Primarie', badgeClass: 'role-origine', currentName: cr.origine },
      { key: 'archetipo', label: '2. Archetipo', desc: 'Tag Ammessi nel Mazzo', badgeClass: 'role-archetipo', currentName: cr.archetipo },
      { key: 'costume', label: '3. Costume', desc: 'Statistiche & Passiva', badgeClass: 'role-costume', currentName: cr.costume },
      { key: 'pb', label: '4. Potere Base', desc: 'Abilità Tattica Inclusa', badgeClass: 'role-pb', currentName: cr.pb }
    ];

    container.innerHTML = '';

    rolesConfig.forEach(cfg => {
      const card = data.creation_cards.find(c => c.role === cfg.key && c.name === cfg.currentName)
        || data.creation_cards.find(c => c.role === cfg.key)
        || {};

      const art = this.getCreationCardImage(card);

      let statInfo = '';
      if (cfg.key === 'origine') {
        statInfo = `<span style="color:#00cec9; font-weight:700;">${card.vita || 25} HP</span> • Str ${card.str || 0} Spd ${card.spd || 0} Tech ${card.tech || 0} End ${card.end || 0}`;
      } else if (cfg.key === 'archetipo') {
        const tMatch = (card.testo || '').match(/Tag\s*Autorizzati\s*:\s*([^.]+)/i);
        statInfo = tMatch ? `Tag: ${tMatch[1].split(/,\s*/).map(x => (window.I18N ? window.I18N.t(x) : x)).join(', ')}` : (card.testo || 'Tutti i tag');
      } else if (cfg.key === 'costume') {
        statInfo = `Str +${card.str || 0} Spd +${card.spd || 0} Tech +${card.tech || 0} End +${card.end || 0} • Passiva`;
      } else if (cfg.key === 'pb') {
        statInfo = `${card.name}: Azione gratuita 1/turno`;
      }

      const slot = document.createElement('div');
      slot.className = 'creation-card-slot';
      slot.onclick = () => this.openCreationCardPicker(cfg.key);

      slot.innerHTML = `
        <div class="creation-slot-header">
          <span class="creation-slot-badge ${cfg.badgeClass}">${cfg.label}</span>
          <span style="font-size:10px; color:var(--muto);">${cfg.desc}</span>
        </div>
        <div class="creation-slot-body">
          <div class="creation-slot-thumb">
            <img src="${art}" alt="${card.name || cfg.label}" onerror="this.src='assets/cards/ironaegis.webp'">
          </div>
          <div class="creation-slot-info">
            <div class="creation-slot-title">${card.name || 'Seleziona'}</div>
            <div class="creation-slot-char">[Eroe: ${card.char || 'Generico'}]</div>
            <div class="creation-slot-stats" style="font-size:11px; color:#c7d1df; line-height:1.3;">${statInfo}</div>
          </div>
        </div>
        <div class="creation-slot-btn">
          <span>Tocca per cambiare (${data.creation_cards.filter(c => c.role === cfg.key && this.creationCardOwned(c)).length} possedute) ➔</span>
        </div>
      `;

      container.appendChild(slot);
    });
  }

  // Point 2: Visual Creation Card Picker Modal with 8 Visual Cards
  openCreationCardPicker(role) {
    const data = window.MONOMYTHOS_DATA;
    if (!data || !data.creation_cards) return;

    // Solo le carte creazione degli eroi che possiedi
    const cards = data.creation_cards.filter(c => c.role === role && this.creationCardOwned(c));
    const list = document.getElementById('creationPickerList');
    const titleEl = document.getElementById('creationPickerTitle');
    const subEl = document.getElementById('creationPickerSubtitle');

    if (!list) return;
    list.innerHTML = '';

    const roleTitles = {
      origine: { title: 'Scegli Carta: Origine', sub: 'Determina la Vita Base (HP) e le statistiche di partenza del tuo Eroe' },
      archetipo: { title: 'Scegli Carta: Archetipo', sub: 'Determina i Tag di carte ammessi nel tuo Mazzo da 30 carte' },
      costume: { title: 'Scegli Carta: Costume & Armatura', sub: 'Conferisce bonus alle statistiche e una potente abilità Passiva Permanente' },
      pb: { title: 'Scegli Carta: Potere Base', sub: 'L’Azione Tattica gratuita usabile 1 volta per round dal tuo Eroe' }
    };

    const metaInfo = roleTitles[role] || { title: 'Scegli Carta Creazione', sub: 'Tocca una carta per equipaggiarla' };
    if (titleEl) titleEl.textContent = `${metaInfo.title} (${cards.length} ${cards.length === 1 ? 'opzione' : 'opzioni'})`;
    if (subEl) subEl.textContent = metaInfo.sub;

    const currentSelName = this.currentDeckBuilding?.creation ? this.currentDeckBuilding.creation[role] : '';

    cards.forEach(card => {
      const isSelected = card.name === currentSelName;
      const art = this.getCreationCardImage(card);

      const cardEl = document.createElement('div');
      cardEl.className = `creation-picker-card ${isSelected ? 'is-active' : ''}`;
      cardEl.onclick = () => this.selectCreationCard(role, card.name);

      let statsChips = '';
      if (role === 'origine') {
        statsChips = `
          <div class="stats-matrix" style="margin:4px 0;">
            <div class="stat-chip str"><span class="val">${card.str}</span><span class="lbl">Str</span></div>
            <div class="stat-chip spd"><span class="val">${card.spd}</span><span class="lbl">Spd</span></div>
            <div class="stat-chip tech"><span class="val">${card.tech}</span><span class="lbl">Tech</span></div>
            <div class="stat-chip end"><span class="val">${card.end}</span><span class="lbl">End</span></div>
          </div>
          <div style="font-size:12px; font-weight:700; color:#00cec9; margin-top:2px;">Vita Base: ${card.vita} HP</div>
        `;
      } else if (role === 'costume') {
        statsChips = `
          <div class="stats-matrix" style="margin:4px 0;">
            <div class="stat-chip str"><span class="val">+${card.str}</span><span class="lbl">Str</span></div>
            <div class="stat-chip spd"><span class="val">+${card.spd}</span><span class="lbl">Spd</span></div>
            <div class="stat-chip tech"><span class="val">+${card.tech}</span><span class="lbl">Tech</span></div>
            <div class="stat-chip end"><span class="val">+${card.end}</span><span class="lbl">End</span></div>
          </div>
        `;
      }

      cardEl.innerHTML = `
        <div class="creation-picker-card-top">
          <div class="creation-picker-card-art">
            <img src="${art}" alt="${card.name}" onerror="this.src='assets/cards/ironaegis.webp'">
          </div>
          <div class="creation-picker-card-details">
            <div class="creation-picker-card-name">${card.name}</div>
            <div class="creation-picker-card-hero">[Eroe: ${card.char}]</div>
            <div class="creation-picker-card-type">${card.type || ''}</div>
            ${statsChips}
          </div>
        </div>
        <div class="creation-picker-card-text">
          ${card.testo && card.testo !== '—' ? card.testo : 'Nessun testo addizionale'}
        </div>
        <div class="creation-picker-card-select-btn">
          <button class="btn btn-block ${isSelected ? 'btn-primary' : 'btn-subtle'}">
            ${isSelected ? 'EQUIPAGGIATA ✓' : 'EQUIPAGGIA QUESTA CARTA'}
          </button>
        </div>
      `;

      list.appendChild(cardEl);
    });

    this.showModal('modalPickCreationCard');
  }

  selectCreationCard(role, cardName) {
    try { window.AudioEngine?.playSfx('card_tap'); } catch (e) {}

    const selectMap = {
      origine: 'deckSelOrigine',
      archetipo: 'deckSelArchetipo',
      costume: 'deckSelCostume',
      pb: 'deckSelPb'
    };

    const selId = selectMap[role];
    if (selId) {
      const selEl = document.getElementById(selId);
      if (selEl) selEl.value = cardName;
    }

    if (this.currentDeckBuilding?.creation) {
      this.currentDeckBuilding.creation[role] = cardName;
    }

    this.onDeckCreationChanged();
    this.renderDeckCreationSlots();
    this.hideModals();
    this.showToast(`Carta equipaggiata: ${cardName}`);
  }

  inspectCardById(cardId) {
    const data = window.MONOMYTHOS_DATA;
    if (!data) return;
    const allCards = Object.values(data.action_cards).flat();
    const found = allCards.find(c => c.id === cardId);
    if (found) {
      this.inspectCard(found);
    }
  }

  inspectEffect(name, desc, img) {
    this.showToast(`[Effetto Attivo] ${name}: ${desc}`);
  }

  filterDeckCards(category, tabBtn) {
    if (tabBtn) {
      document.querySelectorAll('.deck-filter-tab').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
    }
    this.currentDeckFilter = category;
    const allowedTags = this.currentDeckBuilding?.creation?.allowedTags || [];
    this.renderDeckBuilderCards(allowedTags, category);
  }

  renderDeckBuilderCards(allowedTags, category = 'all') {
    const data = window.MONOMYTHOS_DATA;
    const container = document.getElementById('deckCardsList');
    if (!container || !data) return;
    container.innerHTML = '';

    // Collect all action cards across all heroes
    const allCards = Object.values(data.action_cards).flat();
    const uniqueCards = [];
    const seenIds = new Set();
    allCards.forEach(c => {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        uniqueCards.push(c);
      }
    });

    // Filter available pool by allowed tags
    const normalizedAllowed = (allowedTags || []).map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
    let filteredCards = uniqueCards.filter(c => {
      if (!normalizedAllowed || normalizedAllowed.length === 0) return true;
      const cTagNorm = (c.tag || 'Untagged').toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedAllowed.some(at => at === cTagNorm || cTagNorm.includes(at) || at.includes(cTagNorm));
    });

    // Filter by selected category tab
    if (category && category !== 'all') {
      if (category === 'Oscura') {
        filteredCards = filteredCards.filter(c => !!c.osc);
      } else {
        const catNorm = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        filteredCards = filteredCards.filter(c => {
          const cCatNorm = (c.cat || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return cCatNorm.includes(catNorm) || catNorm.includes(cCatNorm);
        });
      }
    }

    // Collezione: nel mazzo vanno solo le carte che possiedi
    const totaleFiltro = filteredCards.length;
    filteredCards = filteredCards.filter(c => window.Progression.getCardOwnedCount(c.id) > 0);
    if (window.Collezione) {
      filteredCards.sort((a, b) => window.Collezione.infoRarita(b).ordine - window.Collezione.infoRarita(a).ordine);
    }
    const nascoste = totaleFiltro - filteredCards.length;
    if (nascoste > 0) {
      const info = document.createElement('div');
      info.className = 'deck-locked-info';
      info.innerHTML = `Hai <b>${filteredCards.length}</b> di ${totaleFiltro} carte di questo filtro. Le altre ${nascoste} si trovano nelle <a href="#" onclick="UI.openShop(); return false;">bustine</a> e nella Storia.`;
      container.appendChild(info);
    }

    if (filteredCards.length === 0) {
      container.insertAdjacentHTML('beforeend', '<div style="font-size:12px; color:var(--muto); padding:20px; text-align:center;">Nessuna carta posseduta con questi filtri.</div>');
      return;
    }

    filteredCards.forEach(c => {
      const owned = window.Progression.getCardOwnedCount(c.id);
      const inDeck = this.currentDeckBuilding.cards[c.id] || 0;
      const layout = this.getCardLayout(c);
      const bgArt = c.img || 'assets/cards/retrocartamazzo.webp';
      const valText = c.valore !== undefined ? c.valore : 1;
      const effectText = c.effetto || c.desc || 'Azione standard';

      // Build tag badges
      let tagHtml = (window.Collezione ? window.Collezione.badge(c) : '') + `<span class="builder-tag-badge tag-${layout.type}">${c.tag || c.cat}</span>`;
      if (c.osc) tagHtml += `<span class="builder-tag-badge tag-purple">Oscura</span>`;
      if (c.deus || c.nome?.includes('Defibrillazione')) tagHtml += `<span class="builder-tag-badge tag-blue">Deus Ex</span>`;
      if (c.fx?.dmg) tagHtml += `<span class="builder-tag-badge tag-red">Danno +${c.fx.dmg}</span>`;
      if (c.fx?.shield) tagHtml += `<span class="builder-tag-badge tag-gold">Scudo +${c.fx.shield}</span>`;
      if (c.fx?.heal) tagHtml += `<span class="builder-tag-badge tag-green">Cura +${c.fx.heal}</span>`;

      const row = document.createElement('div');
      row.className = `builder-card-row ${c.osc ? 'osc' : ''}`;
      row.innerHTML = `
        <div class="builder-card-thumb-wrap" onclick="UI.inspectCardById('${c.id}')" title="Visualizza carta">
          <img class="b-art" src="${bgArt}" alt="${c.nome}" onerror="this.src='assets/cards/retrocartamazzo.webp'">
          <img class="b-frame" src="${layout.frame}" alt="Frame">
          <div class="b-val">${valText}</div>
          <div class="b-icon"><img src="${layout.icon}" alt="${c.cat}"></div>
        </div>
        <div class="builder-card-details" onclick="UI.inspectCardById('${c.id}')">
          <div class="builder-card-details-top">
            <h4>${c.nome}</h4>
            <span class="builder-card-meta-line">Possedute: ${owned}${owned > 2 ? ` · ${owned - 2} da scambiare` : ''}</span>
          </div>
          <div class="builder-card-tags-row">${tagHtml}</div>
          <div class="builder-card-effect-text">${effectText}</div>
        </div>
        <div class="stepper-ctrl">
          <button class="stepper-btn" onclick="UI.changeCardDeckCount('${c.id}', -1)">-</button>
          <span class="stepper-val" id="cnt_${c.id}">${inDeck}</span>
          <button class="stepper-btn" onclick="UI.changeCardDeckCount('${c.id}', 1)">+</button>
        </div>
      `;
      container.appendChild(row);
    });
  }

  // ==========================================
  // HOME AUDIO TOGGLE (Point 2)
  // ==========================================
  toggleHomeAudio() {
    if (!window.AudioEngine) return;
    window.AudioEngine?.toggleMasterMute();
    this.updateHomeAudioButton();
    this.updateMixerUI();
    const isMuted = window.AudioEngine?.masterMuted;
    if (!isMuted) {
      window.AudioEngine?.playMusic(this.activeScreen === 'scr-game' ? 'm2_combat.mp3' : 'm1_selezione.mp3');
      this.showToast('Audio Attivato');
    } else {
      this.showToast('Audio Silenziato');
    }
  }

  toggleAudioFromHome() {
    this.toggleHomeAudio();
  }

  updateHomeAudioButton() {
    const btn = document.getElementById('homeAudioToggleBtn') || document.getElementById('homeAudioBtn');
    if (!btn) return;
    const isMuted = window.AudioEngine ? (window.AudioEngine?.masterMuted || window.AudioEngine?.musicMuted || window.AudioEngine?.getEffectiveMusicVolume() === 0) : false;
    const svgOn = btn.querySelector('.audio-svg-on');
    const svgOff = btn.querySelector('.audio-svg-off');
    if (svgOn && svgOff) {
      svgOn.style.display = isMuted ? 'none' : 'block';
      svgOff.style.display = isMuted ? 'block' : 'none';
    }
    btn.classList.toggle('muted', isMuted);
    btn.title = isMuted ? 'Riattiva Audio' : 'Silenzia Audio';
  }

  // ==========================================
  // AUDIO & MUSIC MIXER CONTROLLER
  // ==========================================
  openAudioMixer() {
    this.updateMixerUI();
    this.showModal('modalAudioMixer');
  }

  updateMixerUI() {
    const ae = window.AudioEngine;
    if (!ae) return;

    const masterSlider = document.getElementById('sliderMasterVol');
    const musicSlider = document.getElementById('sliderMusicVol');
    const sfxSlider = document.getElementById('sliderSfxVol');

    if (masterSlider) masterSlider.value = Math.round(ae.masterVolume * 100);
    if (musicSlider) musicSlider.value = Math.round(ae.musicVolume * 100);
    if (sfxSlider) sfxSlider.value = Math.round(ae.sfxVolume * 100);

    const valMaster = document.getElementById('valMasterVol');
    const valMusic = document.getElementById('valMusicVol');
    const valSfx = document.getElementById('valSfxVol');

    if (valMaster) valMaster.textContent = ae.masterMuted ? 'Muto' : `${Math.round(ae.masterVolume * 100)}%`;
    if (valMusic) valMusic.textContent = ae.musicMuted ? 'Muto' : `${Math.round(ae.musicVolume * 100)}%`;
    if (valSfx) valSfx.textContent = ae.sfxMuted ? 'Muto' : `${Math.round(ae.sfxVolume * 100)}%`;

    const btnMaster = document.getElementById('btnMasterMute');
    const btnMusic = document.getElementById('btnMusicMute');
    const btnSfx = document.getElementById('btnSfxMute');

    if (btnMaster) {
      btnMaster.textContent = ae.masterMuted ? 'Smuta' : 'Mute';
      btnMaster.classList.toggle('muted', ae.masterMuted);
    }
    if (btnMusic) {
      btnMusic.textContent = ae.musicMuted ? 'Smuta' : 'Mute';
      btnMusic.classList.toggle('muted', ae.musicMuted);
    }
    if (btnSfx) {
      btnSfx.textContent = ae.sfxMuted ? 'Smuta' : 'Mute';
      btnSfx.classList.toggle('muted', ae.sfxMuted);
    }

    const btnLobby = document.getElementById('btnTrackLobby');
    const btnCombat = document.getElementById('btnTrackCombat');
    if (btnLobby && btnCombat) {
      btnLobby.classList.toggle('active', ae.currentTrackName === 'm1_selezione.mp3');
      btnCombat.classList.toggle('active', ae.currentTrackName === 'm2_combat.mp3');
    }

    this.updateHomeAudioButton();
  }

  onMasterVolChange(val) {
    window.AudioEngine?.setMasterVolume(val / 100);
    const label = document.getElementById('valMasterVol');
    if (label) label.textContent = `${val}%`;
  }

  onMusicVolChange(val) {
    window.AudioEngine?.setMusicVolume(val / 100);
    const label = document.getElementById('valMusicVol');
    if (label) label.textContent = `${val}%`;
  }

  onSfxVolChange(val) {
    window.AudioEngine?.setSfxVolume(val / 100);
    const label = document.getElementById('valSfxVol');
    if (label) label.textContent = `${val}%`;
  }

  toggleMasterMute() {
    window.AudioEngine?.toggleMasterMute();
    this.updateMixerUI();
  }

  toggleMusicMute() {
    window.AudioEngine?.toggleMusicMute();
    this.updateMixerUI();
  }

  toggleSfxMute() {
    window.AudioEngine?.toggleSfxMute();
    this.updateMixerUI();
  }

  switchMusicTrack(trackName) {
    window.AudioEngine?.playMusic(trackName);
    this.updateMixerUI();
  }

  changeCardDeckCount(cardId, delta) {
    const current = this.currentDeckBuilding.cards[cardId] || 0;
    const owned = window.Progression.getCardOwnedCount(cardId);
    const R = window.Collezione ? window.Collezione.REGOLE_MAZZO : { copieMax: 2 };
    const maxAllowed = Math.min(R.copieMax, owned); // massimo 2 copie, e non più di quelle possedute

    let next = current + delta;
    if (next < 0) next = 0;
    if (next > maxAllowed) {
      return this.showToast(owned < R.copieMax ? `Ne possiedi solo ${owned}: non puoi metterne di più.` : `Massimo ${R.copieMax} copie per carta nel mazzo.`);
    }

    if (next === 0) {
      delete this.currentDeckBuilding.cards[cardId];
    } else {
      this.currentDeckBuilding.cards[cardId] = next;
    }

    const valEl = document.getElementById(`cnt_${cardId}`);
    if (valEl) valEl.textContent = next;

    this.updateDeckBuilderCounts();
  }

  updateDeckBuilderCounts() {
    if (!this.currentDeckBuilding || !this.currentDeckBuilding.cards) return;
    const data = window.MONOMYTHOS_DATA;
    const allCards = data ? Object.values(data.action_cards).flat() : [];
    let total = 0;
    let dark = 0;
    Object.entries(this.currentDeckBuilding.cards).forEach(([cid, count]) => {
      total += count;
      const card = allCards.find(c => c.id === cid);
      if (card && card.osc) dark += count;
    });

    const totEl = document.getElementById('deckTotalCount');
    const darkEl = document.getElementById('deckDarkCount');
    const statusEl = document.getElementById('deckValidationStatus');
    if (totEl) totEl.textContent = total;
    if (darkEl) darkEl.textContent = dark;
    const R = window.Collezione ? window.Collezione.REGOLE_MAZZO : { carteMin: 60, carteMax: 60, oscureMax: 24 };
    const sizeLbl = R.carteMin === R.carteMax ? `${R.carteMin}` : `${R.carteMin}-${R.carteMax}`;
    document.querySelectorAll('.deckSizeLabel').forEach(el => { el.textContent = sizeLbl; });
    document.querySelectorAll('.deckDarkMaxLabel').forEach(el => { el.textContent = R.oscureMax; });
    this._deckValid = total >= R.carteMin && total <= R.carteMax && dark <= R.oscureMax;
    if (statusEl) {
      statusEl.classList.toggle('valid', this._deckValid);
      if (this._deckValid) {
        statusEl.textContent = `Mazzo valido (${total} carte)! Pronto per il salvataggio.`;
      } else if (total > R.carteMax) {
        statusEl.textContent = `Troppe carte nel mazzo (${total}/${sizeLbl}). Rimuovi ${total - R.carteMax} carte.`;
      } else if (dark > R.oscureMax) {
        statusEl.textContent = `Troppe Carte Oscure (${dark}/${R.oscureMax} max). Riduci le carte oscure.`;
      } else {
        statusEl.textContent = `Componi ${sizeLbl} carte per completare il mazzo (${total}/${sizeLbl}).`;
      }
    }
  }

  saveCurrentDeck() {
    const nameInput = document.getElementById('deckNameInput');
    const name = (nameInput && nameInput.value.trim()) || 'Mazzo Personalizzato';
    const hero = this.currentDeckBuilding.hero || 'Custom Hero';
    this.updateDeckBuilderCounts();
    if (!this._deckValid) return this.showToast('Il mazzo non è ancora valido: guarda il messaggio sopra i filtri.');

    // Si salva anche la creazione dell'eroe (Origine, Archetipo, Costume, Potere): senza, in partita si perdeva
    window.Progression.saveCustomDeck(name, hero, this.currentDeckBuilding.cards, this.currentDeckBuilding.creation);
    this.showToast(`Mazzo "${name}" salvato con successo!`);
    this.showScreen('scr-lobby');
  }

  // ==========================================
  // SHOP & PROGRESSION CONTROLLER
  // ==========================================
  openShop() {
    this.renderShopView();
    this.showScreen('scr-shop');
  }

  renderShopView() {
    document.querySelectorAll('.creditsDisplay').forEach(el => {
      el.textContent = window.Progression.getCredits();
    });

    // Render Heroes Shop
    const heroesContainer = document.getElementById('shopHeroesGrid');
    if (heroesContainer) {
      heroesContainer.innerHTML = '';
      const meta = (window.MONOMYTHOS_DATA || {}).chars_meta || {};
      const imgMap = (window.MONOMYTHOS_DATA || {}).card_img_map || {};
      const costo = window.Collezione ? window.Collezione.COSTO_EROE : 600;
      const heroList = Object.keys(meta).filter(k => k !== 'Custom Hero').map(name => ({
        name, cost: costo, desc: (meta[name].archetipo || '') + (meta[name].pb_name ? ' · ' + meta[name].pb_name : ''),
        img: imgMap[name.toLowerCase().replace(/[^a-z0-9]/g, '')] || meta[name].img || 'assets/icons/peronaggio.webp'
      }));
      const free = document.getElementById('shopFreePack');
      if (free) {
        const n = window.Progression.data.bustineGratis || 0;
        free.innerHTML = n > 0 ? `<button class="btn btn-primary btn-free-pack" onclick="UI.buyBoosterPack('standard', 0)">APRI BUSTINA IN REGALO (${n})</button>` : '';
      }

      heroList.forEach(h => {
        const isUnlocked = window.Progression.isHeroUnlocked(h.name);
        const card = document.createElement('div');
        card.className = `shop-item-card ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
          <div class="shop-item-thumb">
            <img src="${h.img}" alt="${h.name}" onerror="this.src='assets/icons/peronaggio.webp'">
          </div>
          <h4>${h.name}</h4>
          <p>${h.desc}</p>
          ${isUnlocked ? '<span class="shop-unlocked">SBLOCCATO</span>' : `<button class="btn btn-primary btn-buy-hero" style="padding:6px 12px; font-size:12px;">${h.cost} CR</button>`}
        `;
        const buy = card.querySelector('.btn-buy-hero');
        if (buy) buy.onclick = () => this.buyHero(h.name, h.cost);
        heroesContainer.appendChild(card);
      });
    }
  }

  buyHero(heroName, cost) {
    const res = window.Progression.unlockHero(heroName, cost);
    if (!res.ok) {
      this.showToast(res.msg);
    } else {
      window.AudioEngine?.playSfx('victory');
      this.showToast(`Congratulazioni! Hai sbloccato ${heroName}!`);
      this.renderShopView();
      this.renderHeroSelectionCarousel();
    }
  }

  buyBoosterPack(packType, cost) {
    const res = window.Progression.openBoosterPack(packType, cost);
    this._lastPackDetails = res.dettagli || [];
    if (!res.ok) {
      this.showToast(res.msg);
    } else {
      window.AudioEngine?.playSfx('victory');
      this.renderPackRevealModal(res.cards);
      this.renderShopView();
    }
  }

  renderPackRevealModal(cards) {
    const stage = document.getElementById('packRevealStage');
    stage.innerHTML = '';

    const dettagli = this._lastPackDetails || [];
    cards.forEach((c, idx) => {
      const el = document.createElement('div');
      const d = dettagli[idx] || {};
      const r = window.Collezione ? window.Collezione.infoRarita(c) : null;
      el.className = 'pack-card-reveal' + (r ? ' rar-' + window.Collezione.rarita(c) : '');
      el.style.animationDelay = `${idx * 0.2}s`;
      el.innerHTML = this.getCardDOM(c, false) +
        (r ? `<div class="pack-card-label" style="--rar:${r.colore}">${r.nome}${d.nuova ? ' · NUOVA' : ''}${d.crediti ? ` · +${d.crediti} CR` : ''}</div>` : '');
      stage.appendChild(el);
    });

    this.showModal('modalPackReveal');
  }

  // Full Card Inspect Modal
  inspectCard(card) {
    const target = card || this.selectedCard;
    if (!target) return;
    const inspectWrap = document.querySelector('.full-card-inspect-wrap');
    if (inspectWrap) {
      inspectWrap.innerHTML = `
        <div style="display:flex; justify-content:center; margin-bottom:12px;">
          ${this.getCardDOM(target, true)}
        </div>
        <h3 style="font-size:18px; color:var(--oro-soft)">${target.nome}</h3>
        <p style="font-size:12px; color:var(--bone); text-align:center; max-width:320px;">${target.effetto || target.desc || ''}</p>
      `;
    }
    this.showModal('modalInspect');
  }

  // Open Rogue Boss NPC Picker (Point 4)
  openRogueBossPicker() {
    const list = document.getElementById('rogueBossList');
    if (!list) return;
    list.innerHTML = '';
    const data = window.MONOMYTHOS_DATA;
    if (!data || !data.chars_meta) return;

    Object.keys(data.chars_meta).forEach(name => {
      if (name === 'Custom Hero') return;
      const meta = data.chars_meta[name];
      const card = document.createElement('div');
      card.className = 'rogue-boss-card';
      card.onclick = () => {
        this.hideModals();
        this.startRogueHeroBossMatch(name);
      };

      let img = meta.img || 'assets/cards/blackoutostile.webp';
      if (data.card_img_map) {
        const cleanK = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (data.card_img_map[cleanK]) {
          img = data.card_img_map[cleanK];
        }
      }

      card.innerHTML = `
        <div class="rogue-boss-thumb-wrap">
          <img src="${img}" alt="${name}" onerror="this.src='assets/cards/blackoutostile.webp'">
        </div>
        <div class="rogue-boss-name" title="${name}">${name}</div>
        <div class="rogue-boss-sub">${meta.archetipo || 'Boss Corrotto'}</div>
        <button class="rogue-boss-btn">Sfida Boss</button>
      `;
      list.appendChild(card);
    });

    this.showModal('modalPickRogueBoss');
  }

  // Rogue Hero NPC Boss mode
  startRogueHeroBossMatch(bossHeroName = "Titano d'Acciaio") {
    try {
      this.pendingMultiplayer = false;
      const companion = bossHeroName === 'Neon Phantom' ? 'Iron Aegis' : 'Neon Phantom';
      window.GameEngine.startMatch({
        heroes: [
          { name: this.selectedHero || 'Iron Aegis', isBot: false },
          { name: companion, isBot: true }
        ],
        isRogueHeroBoss: true,
        bossHeroName: bossHeroName
      });
      const threat = window.GameEngine.state.currentThreat;
      this.playMatchIntroLoading(threat, () => {
        this.showScreen('scr-game');
        this.showToast(`Inizia la sfida contro ${bossHeroName} Corrotto!`);
      });
    } catch (err) {
      console.error('startRogueHeroBossMatch error:', err);
      this.showToast('Errore avvio sfida boss: ' + err.message);
    }
  }

  showGameOverModal(winner) {
    const title = document.getElementById('gameOverTitle');
    const sub = document.getElementById('gameOverSubtitle');
    const currentCr = window.Progression ? window.Progression.getCredits() : 0;
    const st = window.GameEngine && window.GameEngine.state;
    const me = st && st.players.find(p => p.isLocal);
    const guadagno = Math.max(0, currentCr - (this._crInizio == null ? currentCr : this._crInizio));
    // crediti guadagnati: riquadro grande e animato; senza guadagno resta solo il saldo
    const premio = guadagno && window.Premio ? window.Premio.html(guadagno, currentCr) : '<br>';
    const totale = guadagno ? '' : `<br><span style="font-size:12px; opacity:0.8;">Crediti Totali: ${currentCr} CR</span>`;
    const nota = st && st.ranked ? '' : '<br><span style="font-size:12px; opacity:0.85;">Le partite libere non danno crediti: si guadagnano in Classificata e nella Storia.</span>';
    if (winner === 'villain') {
      const won = me && (st.villainWinners || []).includes(me.id);
      title.textContent = won ? 'VITTORIA DEL VILLAIN!' : 'IL VILLAIN HA VINTO';
      title.style.color = won ? '#d94cff' : '#ff4444';
      const names = (st.players || []).filter(p => (st.villainWinners || []).includes(p.id)).map(p => p.name).join(' e ');
      sub.innerHTML = won
        ? `Tutti gli altri sono caduti: resti solo tu.${premio}${nota}${totale}`
        : `${names} è rimasto l'unico in piedi e vince come Villain.<br><br><span style="font-size:12px; opacity:0.8;">Crediti Totali: ${currentCr} CR</span>`;
    } else if (winner === 'heroes') {
      title.textContent = 'VITTORIA COSMICA!';
      title.style.color = 'var(--oro-soft)';
      sub.innerHTML = `Avete trionfato sulla Calamità!${premio}${nota}${totale}`;
    } else {
      title.textContent = 'SCONFITTA COSMICA!';
      title.style.color = '#ff4444';
      sub.innerHTML = `Il Cosmo è caduto nel Caos e nel Trauma.${premio}${totale}<br><br>Potenzia il tuo mazzo nel Deckbuilder e riprova!`;
    }
    this.showModal('modalGameOver');
    if (window.Premio) window.Premio.anima(sub);
  }

  showModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  hideModals() {
    if (this._defenseCountdownInterval) {
      clearInterval(this._defenseCountdownInterval);
      this._defenseCountdownInterval = null;
      if (window.GameEngine && window.GameEngine.pendingDefense) {
        const isAllyDefense = this.currentDefenseData?.isAllyDefense;
        window.GameEngine.respondToDefense({ type: isAllyDefense ? 'bot_fallback' : 'none' });
      }
    }
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  // ==========================================
  // SERVER SETTINGS & PERSISTENT PLAYER DATA (Point 3 & Server Architecture)
  // ==========================================
  restorePlayerProfileFromNative() {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.getPlayerProfile === 'function') {
        const raw = window.AndroidBridge.getPlayerProfile();
        if (raw && raw.trim().length > 0) {
          const profile = JSON.parse(raw);
          if (profile.selectedHero) {
            this.selectedHero = profile.selectedHero;
          }
          if (profile.credits !== undefined && window.Progression) {
            window.Progression.setCredits(profile.credits);
          }
          if (profile.unlockedCards && window.Progression) {
            window.Progression.saveUnlockedCards(profile.unlockedCards);
          }
          if (profile.customDecks) {
            localStorage.setItem('monomythos_custom_decks', JSON.stringify(profile.customDecks));
          }
        }
      }
    } catch (e) {
      console.warn('restorePlayerProfileFromNative error:', e);
    }
  }

  savePlayerProfileToNative() {
    try {
      const profile = {
        playerId: this.localPlayerId || 'p_0',
        selectedHero: this.selectedHero,
        credits: window.Progression ? window.Progression.getCredits() : 500,
        unlockedCards: window.Progression ? window.Progression.getUnlockedCards() : [],
        customDecks: JSON.parse(localStorage.getItem('monomythos_custom_decks') || '{}'),
        timestamp: Date.now()
      };
      if (window.AndroidBridge && typeof window.AndroidBridge.savePlayerProfile === 'function') {
        window.AndroidBridge.savePlayerProfile(JSON.stringify(profile));
      }
      return profile;
    } catch (e) {
      console.warn('savePlayerProfileToNative error:', e);
      return null;
    }
  }

  openServerSettings() {
    let currentServer = window.location.origin;
    if (window.AndroidBridge && typeof window.AndroidBridge.getServerUrl === 'function') {
      currentServer = window.AndroidBridge.getServerUrl() || currentServer;
    } else if (localStorage.getItem('monomythos_server_url')) {
      currentServer = localStorage.getItem('monomythos_server_url');
    }

    const input = document.getElementById('serverAddressInput');
    if (input) input.value = currentServer;

    const pidEl = document.getElementById('serverPlayerId');
    if (pidEl) pidEl.textContent = this.localPlayerId || 'p_0';

    const crEl = document.getElementById('serverPlayerCredits');
    if (crEl) crEl.textContent = `${window.Progression ? window.Progression.getCredits() : 500} CR`;

    const heroEl = document.getElementById('serverPlayerHero');
    if (heroEl) heroEl.textContent = this.selectedHero || 'Iron Aegis';

    const badge = document.getElementById('serverConnectionBadge');
    if (badge) {
      badge.textContent = 'Verifica in corso...';
      badge.style.color = '#f1c40f';
      badge.style.background = 'rgba(241,196,15,0.18)';
    }

    // Ping server
    // Ping server
    const targetUrl = (input && input.value.trim()) ? input.value.trim().replace(/\/$/, '') : window.location.origin;
    fetch(`${targetUrl}/api/status`, { mode: 'cors' })
      .catch(() => fetch(`${targetUrl}/manifest.json`, { mode: 'cors' }))
      .then(res => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then(data => {
        if (badge) {
          badge.textContent = `🟢 Server Attivo (v${data.version || '1.0.1'}) — Dinamiche & Grafica Live!`;
          badge.style.color = '#50b06b';
          badge.style.background = 'rgba(80,176,107,0.18)';
        }
      })
      .catch(() => {
        if (badge) {
          if (window.location.protocol === 'file:') {
            badge.textContent = `🟡 Asset Fissi Locali (APK)`;
            badge.style.color = '#e67e22';
            badge.style.background = 'rgba(230,126,34,0.18)';
          } else {
            badge.textContent = `🔴 Server Non Raggiungibile`;
            badge.style.color = '#e74c3c';
            badge.style.background = 'rgba(231,76,60,0.18)';
          }
        }
      });

    this.showModal('modalServerSettings');
  }

  async testAndSaveServerUrl() {
    const input = document.getElementById('serverAddressInput');
    if (!input || !input.value.trim()) return alert('Inserisci un indirizzo server valido (es: https://timely-gnome-a87041.netlify.app)');

    let raw = input.value.trim().replace(/\/$/, '');
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      raw = (raw.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(raw)) ? `http://${raw}` : `https://${raw}`;
    }
    const url = raw;
    input.value = url;
    this.showToast('Test connessione remota in corso...');
    try {
      let isOk = false;
      let ver = '1.0.1';
      try {
        const res = await fetch(`${url}/api/status`, { mode: 'cors' });
        if (res.ok) {
          const data = await res.json();
          isOk = true;
          ver = data.version || ver;
        }
      } catch(e) {}

      if (!isOk) {
        const res2 = await fetch(`${url}/manifest.json`, { mode: 'cors' });
        if (res2.ok) isOk = true;
      }

      if (isOk) {
        localStorage.setItem('monomythos_server_url', url);
        if (window.AndroidBridge && typeof window.AndroidBridge.setServerUrl === 'function') {
          window.AndroidBridge.setServerUrl(url);
        }
        this.showToast(`Connesso con successo al Server Remoto v${ver}!`);
        this.openServerSettings();
      } else {
        alert('Il server non ha risposto. Assicurati che il sito sia pubblico o privo di password.');
      }
    } catch (e) {
      alert(`Impossibile raggiungere il server a ${url}.\nVerifica che il sito sia online e accessibile.`);
    }
  }

  async syncPlayerProfileToServer() {
    const profile = this.savePlayerProfileToNative();
    let targetUrl = window.location.origin;
    if (window.AndroidBridge && typeof window.AndroidBridge.getServerUrl === 'function') {
      targetUrl = window.AndroidBridge.getServerUrl();
    } else if (localStorage.getItem('monomythos_server_url')) {
      targetUrl = localStorage.getItem('monomythos_server_url');
    }

    try {
      this.showToast('Salvataggio profilo sul Server...');
      const res = await fetch(`${targetUrl}/api/player_sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile || { playerId: this.localPlayerId, selectedHero: this.selectedHero }),
        mode: 'cors'
      });
      const data = await res.json();
      if (data.ok) {
        this.showToast('✅ Profilo giocatore salvato con successo sul Server!');
      } else {
        this.showToast('Profilo salvato in locale.');
      }
    } catch (e) {
      this.showToast('Profilo salvato sul dispositivo (offline).');
    }
  }

  reloadAppFromServer() {
    this.savePlayerProfileToNative();
    if (window.AndroidBridge && typeof window.AndroidBridge.reloadApp === 'function') {
      window.AndroidBridge.reloadApp();
    } else {
      window.location.reload();
    }
  }
}

window.UI = new UIController();
window.addEventListener('resize', () => { try { window.UI.posizionaMazzi(); } catch (e) {} });

