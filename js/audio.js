// Monomythos Audio Engine - Advanced Music Mixer & Web Audio Card SFX
class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmAudio = null;
    this.currentTrackName = 'm1_selezione.mp3';
    this.hasUserInteracted = false;
    this.pendingTrack = 'm1_selezione.mp3';

    // Separate volumes & mutes from localStorage
    this.masterMuted = localStorage.getItem('mm_master_muted') === 'true';
    this.musicMuted = localStorage.getItem('mm_music_muted') === 'true';
    this.sfxMuted = localStorage.getItem('mm_sfx_muted') === 'true';

    this.masterVolume = parseFloat(localStorage.getItem('mm_master_vol') || '1.0');
    this.musicVolume = parseFloat(localStorage.getItem('mm_music_vol') || '0.75');
    this.sfxVolume = parseFloat(localStorage.getItem('mm_sfx_vol') || '0.85');

    // Register user interaction listeners to reliably unlock and start audio
    const unlockAudio = () => {
      if (this.isAppBackgrounded) return;
      this.hasUserInteracted = true;
      this.initContext();
      const track = this.pendingTrack || this.currentTrackName || 'm1_selezione.mp3';
      const audio = this.getAudioElement();
      if (audio && (audio.paused || audio.src === '')) {
        this.playMusic(track);
      }
    };

    ['click', 'touchstart', 'touchend', 'pointerdown'].forEach(evt => {
      window.addEventListener(evt, unlockAudio, { passive: true });
    });

    // Automatic background/minimize detection: mute immediately to prevent crackling/stuttering
    this.isAppBackgrounded = false;
    this._wasPlayingBeforeBackground = false;

    const handleVisibility = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        this.onAppBackground();
      } else {
        this.onAppForeground();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', () => this.onAppBackground());
    window.addEventListener('pageshow', () => this.onAppForeground());
    window.addEventListener('blur', () => {
      if (document.hidden) this.onAppBackground();
    });
  }

  // Called when app is minimized, tab hidden, or backgrounded in Android
  onAppBackground() {
    this.isAppBackgrounded = true;
    try {
      const audio = this.getAudioElement();
      if (audio) {
        if (!audio.paused) {
          this._wasPlayingBeforeBackground = true;
          audio.pause();
        }
      }
      document.querySelectorAll('audio, video').forEach(el => {
        try { el.pause(); } catch (e) {}
      });
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } catch (e) {}
  }

  // Called when app returns to foreground
  onAppForeground() {
    this.isAppBackgrounded = false;
    try {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const audio = this.getAudioElement();
      if (audio && (this._wasPlayingBeforeBackground || this.pendingTrack)) {
        this._wasPlayingBeforeBackground = false;
        audio.volume = this.getEffectiveMusicVolume();
        const p = audio.play();
        if (p) p.catch(() => {});
      }
    } catch (e) {}
  }

  getAudioElement() {
    if (!this.bgmAudio) {
      this.bgmAudio = document.getElementById('bgmAudioPlayer');
      if (!this.bgmAudio) {
        this.bgmAudio = new Audio();
        this.bgmAudio.id = 'bgmAudioPlayer';
        this.bgmAudio.loop = true;
        this.bgmAudio.preload = 'auto';
        if (document.body) document.body.appendChild(this.bgmAudio);
      }
    }
    return this.bgmAudio;
  }

  initContext() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  getEffectiveMusicVolume() {
    if (this.masterMuted || this.musicMuted) return 0;
    return Math.max(0, Math.min(1, this.masterVolume * this.musicVolume));
  }

  getEffectiveSfxVolume() {
    if (this.masterMuted || this.sfxMuted) return 0;
    return Math.max(0, Math.min(1, this.masterVolume * this.sfxVolume));
  }

  playMusic(trackName) {
    try {
      if (!trackName) return;
      this.currentTrackName = trackName;
      this.pendingTrack = trackName;
      const vol = this.getEffectiveMusicVolume();
      const path = `assets/audio/${trackName}`;
      const audio = this.getAudioElement();
      if (!audio) return;

      audio.loop = true;
      audio.volume = vol;

      // Only change src if different to avoid restarting already playing track
      const targetSrcEnd = `assets/audio/${trackName}`;
      if (!audio.src || !audio.src.endsWith(targetSrcEnd)) {
        audio.src = path;
        audio.load();
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.pendingTrack = null;
          this.hasUserInteracted = true;
        }).catch(err => {
          // Still waiting for gesture or permission
          this.pendingTrack = trackName;
        });
      }
    } catch (err) {
      console.warn('playMusic error:', err);
    }
  }

  updateMusicVolume() {
    try {
      const audio = this.getAudioElement();
      if (audio) {
        audio.volume = this.getEffectiveMusicVolume();
      }
    } catch (e) {}
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, parseFloat(val)));
    localStorage.setItem('mm_master_vol', this.masterVolume);
    this.updateMusicVolume();
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, parseFloat(val)));
    localStorage.setItem('mm_music_vol', this.musicVolume);
    this.updateMusicVolume();
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, parseFloat(val)));
    localStorage.setItem('mm_sfx_vol', this.sfxVolume);
  }

  toggleMasterMute() {
    this.masterMuted = !this.masterMuted;
    localStorage.setItem('mm_master_muted', this.masterMuted);
    this.updateMusicVolume();
    return this.masterMuted;
  }

  toggleMusicMute() {
    this.musicMuted = !this.musicMuted;
    localStorage.setItem('mm_music_muted', this.musicMuted);
    this.updateMusicVolume();
    return this.musicMuted;
  }

  toggleSfxMute() {
    this.sfxMuted = !this.sfxMuted;
    localStorage.setItem('mm_sfx_muted', this.sfxMuted);
    return this.sfxMuted;
  }

  // Backwards compatibility
  toggleMute() {
    return this.toggleMasterMute();
  }

  // ==========================================
  // PROCEDURAL WEB AUDIO SFX FOR CARDS & GAME
  // ==========================================
  playSfx(type) {
    if (this.isAppBackgrounded) return;
    try {
      const vol = this.getEffectiveSfxVolume();
      if (vol <= 0) return;

      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const ctx = this.ctx;

      // Safe node teardown helper to prevent audio buffer underruns
      const cleanup = (nodes) => {
        setTimeout(() => {
          nodes.forEach(n => {
            try { n.disconnect(); } catch (e) {}
          });
        }, 800);
      };

    switch (type) {
      // 1. Drawing a card (Swoosh + Snap)
      case 'card_draw':
      case 'draw': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.14);
        gain.gain.setValueAtTime(vol * 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }

      // 2. Tapping / Hovering a card (Tactile Tick)
      case 'card_tap':
      case 'tap': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);
        gain.gain.setValueAtTime(vol * 0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.045);
        break;
      }

      // 3. Playing an Attack Card (Kinetic Blast & Sub-bass Thump)
      case 'card_attack':
      case 'hit': {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(220, t);
        osc1.frequency.exponentialRampToValueAtTime(45, t + 0.22);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(80, t);
        osc2.frequency.linearRampToValueAtTime(30, t + 0.25);

        gain.gain.setValueAtTime(vol * 0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.26);
        osc2.stop(t + 0.26);
        break;
      }

      // 4. Playing a Defense Card (Metallic Resonant Shield)
      case 'card_defense':
      case 'shield': {
        const freqs = [620, 830, 1240];
        freqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.35);
          gain.gain.setValueAtTime(vol * (0.28 / (idx + 1)), t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.36);
        });
        break;
      }

      // 5. Playing an Ability Card (Tech / Magia - Futuristic Synth Sweep)
      case 'card_tech':
      case 'card_ability': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.12);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.28);
        gain.gain.setValueAtTime(vol * 0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.29);
        break;
      }

      // 6. Playing a Deus Ex Machina Card (Celestial Chord Shimmer)
      case 'card_deus': {
        const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        chord.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.05);
          gain.gain.setValueAtTime(vol * 0.22, t + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.55);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + idx * 0.05);
          osc.stop(t + idx * 0.05 + 0.56);
        });
        break;
      }

      // 7. Playing a Dark Card (Ominous Distortion & Trauma Rumble)
      case 'card_dark':
      case 'fracture': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.35);
        gain.gain.setValueAtTime(vol * 0.42, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.36);
        break;
      }

      // 8. Card Tactical Sacrifice (Phase-shift Dissipation Sweep)
      case 'card_sacrifice':
      case 'sacrifice': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.22);
        gain.gain.setValueAtTime(vol * 0.32, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.23);
        break;
      }

      // Standard card sound
      case 'card': {
        this.playSfx('card_draw');
        break;
      }

      // Healing Chime
      case 'heal': {
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.06);
          gain.gain.setValueAtTime(vol * 0.25, t + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.28);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.06);
          osc.stop(t + i * 0.06 + 0.29);
        });
        break;
      }

      // Detonation
      case 'detonate': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.linearRampToValueAtTime(40, t + 0.45);
        gain.gain.setValueAtTime(vol * 0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.46);
        break;
      }

      // Victory Fanfare
      case 'victory': {
        const chord = [392, 523.25, 659.25, 783.99];
        chord.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.08);
          gain.gain.setValueAtTime(vol * 0.3, t + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.65);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + idx * 0.08);
          osc.stop(t + idx * 0.08 + 0.67);
        });
        break;
      }
    }
  } catch (e) {
    console.warn('SFX Error:', e);
  }
}
}

window.AudioEngine = new AudioManager();
