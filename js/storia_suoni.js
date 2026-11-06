// Suoni delle scene della Storia: musica dedicata per ogni vignetta e effetti sonori sintetizzati (Web Audio, nessun file).
// - Musica: assets/audio/storia_<umore>.mp3 (generati da strumenti/musica/genera_musica_storia.py), in dissolvenza tra le vignette;
//   la musica del gioco si ferma durante la scena e riparte alla chiusura.
// - Ambiente: suoni continui legati agli effetti della vignetta (pioggia, folla, fuoco, disturbo TV, battito della Stella...).
// - Colpi: suoni brevi all'arrivo della vignetta (laser, esplosione, blackout) e per le scritte a fumetto (BZZT, KRRRAK, TUM...).
(function () {
  'use strict';
  const AE = () => window.AudioEngine;

  // effetto della vignetta -> suono ambiente
  const DA_STRATO = {
    stella: 'battito', nebbia: 'vento', scintille: 'scintille', pioggia: 'energia', glitch: 'statico', tv: 'statico',
    acqua: 'pioggia', laser: 'laser', torce: 'fuoco', occhi: 'folla', lampi: 'lampi', buio: 'vento'
  };
  const COLPO_DA_STRATO = { blackout: 'spegnimento', scuoti: 'esplosione' };

  const S = {
    musicaAttuale: null,
    _audio: null,
    _amb: {},
    _attivo: false,

    get ctx() { const ae = AE(); if (!ae) return null; ae.initContext(); return ae.ctx; },
    volSfx() { const ae = AE(); return ae ? ae.getEffectiveSfxVolume() : 0; },
    volMusica() { const ae = AE(); return ae ? ae.getEffectiveMusicVolume() : 0; },

    // ---------- inizio e fine della scena ----------
    apri() {
      this._attivo = true;
      const ae = AE();
      if (ae) {
        ae.musicaSospesa = true;
        const bgm = ae.getAudioElement();
        if (bgm && !bgm.paused) this._sfuma(bgm, 0, 600, () => bgm.pause());
      }
    },
    chiudi() {
      this._attivo = false;
      this.fermaAmbiente();
      // se subito dopo si apre un'altra scena (prologo -> missione) la musica continua senza interruzioni
      setTimeout(() => {
        if (this._attivo) return;
        const a = this._audio;
        if (a) this._sfuma(a, 0, 700, () => { if (!this._attivo) a.pause(); });
        this._audio = null;
        this.musicaAttuale = null;
        const ae = AE();
        if (!ae) return;
        ae.musicaSospesa = false;
        const bgm = ae.getAudioElement();
        if (bgm) bgm.volume = 0;
        ae.playMusic(ae.currentTrackName || 'm1_selezione.mp3');
        if (bgm) this._sfuma(bgm, ae.getEffectiveMusicVolume(), 900);
      }, 450);
    },

    // ---------- musica ----------
    musica(nome) {
      if (!nome || nome === this.musicaAttuale) return;
      this.musicaAttuale = nome;
      const vecchio = this._audio;
      if (vecchio) this._sfuma(vecchio, 0, 900, () => vecchio.pause());
      const a = new Audio(`assets/audio/storia_${nome}.mp3`);
      a.loop = true;
      a.volume = 0;
      this._audio = a;
      const p = a.play();
      if (p) p.catch(() => {});
      // musica di sottofondo: bassa, sotto voci ed effetti
      this._sfuma(a, this.volMusica() * 0.4, 1200);
    },
    _sfuma(el, verso, ms, poi) {
      clearInterval(el._sfumaT);
      const da = el.volume, passi = Math.max(1, Math.round(ms / 40));
      let k = 0;
      el._sfumaT = setInterval(() => {
        k++;
        try { el.volume = Math.max(0, Math.min(1, da + (verso - da) * (k / passi))); } catch (e) {}
        if (k >= passi) { clearInterval(el._sfumaT); if (poi) poi(); }
      }, 40);
    },
    // app in background: la musica della scena si ferma e riparte al ritorno
    pausa(si) {
      const a = this._audio;
      if (!a || !this._attivo) return;
      if (si) a.pause(); else { const p = a.play(); if (p) p.catch(() => {}); }
    },

    // ---------- vignetta: musica + ambiente + colpi ----------
    vignetta(def, opt = {}) {
      if (!this._attivo) return;
      this.musica(opt.velo && def.musica !== 'alba' ? 'velo' : (def.musica || 'stella'));
      const strati = def.strati || [];
      const amb = new Set(def.suoni || strati.map(x => DA_STRATO[x]).filter(Boolean));
      Object.keys(this._amb).forEach(k => { if (!amb.has(k)) this.fermaAmbiente(k); });
      amb.forEach(k => { if (!this._amb[k]) this._amb[k] = this.ambiente(k); });
      strati.forEach(x => { if (COLPO_DA_STRATO[x]) this.colpo(COLPO_DA_STRATO[x]); });
      (def.colpi || []).forEach(x => this.colpo(x));
    },
    fermaAmbiente(k) {
      const chiavi = k ? [k] : Object.keys(this._amb);
      chiavi.forEach(c => { try { this._amb[c] && this._amb[c](); } catch (e) {} delete this._amb[c]; });
    },

    // scritta a fumetto -> suono
    fx(testo) {
      const t = String(testo || '').toUpperCase();
      if (/BZZ|ZAP|FZZ/.test(t)) return this.colpo('laser');
      if (/KRR|CRASH|BOOM|KABOOM|CRACK|SBAM|BAM/.test(t)) return this.colpo('esplosione');
      if (/TUM|THUM|DUM/.test(t)) return this.colpo('battito');
      if (/BIP|BEEP|BLIP/.test(t)) return this.colpo('bip');
      if (/VRR|WHIRR|RRR/.test(t)) return this.colpo('motore');
      if (/FSS|SWOO|WHOO|SHH/.test(t)) return this.colpo('soffio');
      if (/~/.test(t)) return this.colpo('eco');
      return this.colpo('impatto');
    },

    // ---------- sintesi ----------
    _rumore(ctx, secondi) {
      const n = Math.floor(ctx.sampleRate * secondi), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      return b;
    },
    // uscita comune degli effetti: compressore + guadagno, così si sentono anche dalle casse del telefono
    _bus(ctx) {
      if (!this._busNodo || this._busCtx !== ctx) {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 6; comp.ratio.value = 12; comp.attack.value = 0.003; comp.release.value = 0.2;
        const g = ctx.createGain();
        g.gain.value = 1.25;
        comp.connect(g); g.connect(ctx.destination);
        this._busNodo = comp; this._busCtx = ctx;
      }
      return this._busNodo;
    },

    // suoni continui: restituiscono la funzione che li ferma (in dissolvenza)
    ambiente(tipo) {
      const ctx = this.ctx, v = this.volSfx();
      if (!ctx || v <= 0) return () => {};
      const out = ctx.createGain();
      out.gain.setValueAtTime(0, ctx.currentTime);
      out.connect(this._bus(ctx));
      const nodi = [], timers = [];
      const target = { pioggia: .14, vento: .12, folla: .38, fuoco: .45, statico: .16, energia: .25 }[tipo] ?? .6;
      out.gain.linearRampToValueAtTime(v * target, ctx.currentTime + 1.2);
      const loopRumore = (filtroTipo, freq, q) => {
        const src = ctx.createBufferSource();
        src.buffer = this._rumore(ctx, 3); src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = filtroTipo; f.frequency.value = freq; if (q) f.Q.value = q;
        src.connect(f); src.start();
        nodi.push(src, f);
        return f;
      };
      const lfo = (param, freq, quanto) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = freq; g.gain.value = quanto;
        o.connect(g); g.connect(param); o.start();
        nodi.push(o, g);
      };
      switch (tipo) {
        case 'pioggia': { loopRumore('highpass', 1800).connect(out); const f = loopRumore('lowpass', 500); const g = ctx.createGain(); g.gain.value = .5; f.connect(g); g.connect(out); nodi.push(g); break; }
        case 'vento': { const f = loopRumore('bandpass', 420, 0.8); lfo(f.frequency, 0.13, 220); f.connect(out); break; }
        case 'folla': {
          // brusio: rumore filtrato sulle frequenze della voce, che si alza e si abbassa
          const g = ctx.createGain(); g.gain.value = .7;
          [380, 720, 1150].forEach((fr, i) => { const f = loopRumore('bandpass', fr, 3); lfo(f.frequency, 0.4 + i * 0.27, fr * 0.18); f.connect(g); });
          lfo(g.gain, 0.21, .3); g.connect(out); nodi.push(g); break;
        }
        case 'fuoco': {
          loopRumore('lowpass', 380).connect(out);
          const crepita = () => { this.colpo('crepitio', .5); timers.push(setTimeout(crepita, 60 + Math.random() * 380)); };
          crepita(); break;
        }
        case 'statico': { const f = loopRumore('highpass', 3200); const g = ctx.createGain(); lfo(g.gain, 7.3, .6); f.connect(g); g.connect(out); nodi.push(g); break; }
        case 'energia': {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
          const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; lfo(f.frequency, 0.3, 160);
          const g = ctx.createGain(); g.gain.value = .5;
          o.connect(f); f.connect(g); g.connect(out); o.start(); nodi.push(o, f, g);
          loopRumore('bandpass', 2400, 1.5).connect(out); break;
        }
        case 'battito': { const tick = () => { this.colpo('battito', .35); timers.push(setTimeout(tick, 1700)); }; tick(); break; }
        case 'laser': { const z = () => { this.colpo('laser', .7); timers.push(setTimeout(z, 500 + Math.random() * 900)); }; timers.push(setTimeout(z, 300)); break; }
        case 'lampi': { const z = () => { this.colpo('scarica', .8); timers.push(setTimeout(z, 1800 + Math.random() * 2400)); }; timers.push(setTimeout(z, 250)); break; }
        case 'scintille': { const z = () => { this.colpo('scintilla', .5); timers.push(setTimeout(z, 300 + Math.random() * 1200)); }; z(); break; }
      }
      return () => {
        timers.forEach(clearTimeout);
        const t = ctx.currentTime;
        try { out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 0.6); } catch (e) {}
        setTimeout(() => { nodi.forEach(n => { try { n.stop && n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); try { out.disconnect(); } catch (e) {} }, 800);
      };
    },

    // ---------- voci: un borbottio a sillabe mentre il fumetto si scrive ----------
    // chi = { tipo: 'narratore' } oppure il parlante della scena (nome, nemico); ogni personaggio ha la sua altezza di voce.
    sillaba(p) {
      const ctx = this.ctx, v = this.volSfx();
      if (!ctx || v <= 0 || !this._attivo) return;
      const t = ctx.currentTime, out = this._bus(ctx), fine = [];
      if (!p || p.tipo === 'narratore') {
        // narratore: bisbiglio (soffio sulle frequenze delle consonanti)
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = this._rumore(ctx, 0.12);
        f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 2200; f.Q.value = 2.5;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 1.1, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + 0.12);
        fine.push(s, f, g);
      } else {
        // personaggi: "bla" sintetico con formanti di una vocale a caso; altezza fissa per ogni nome
        const nome = String(p.nome || '');
        let h = 0; for (const c of nome) h = (h * 31 + c.charCodeAt(0)) % 997;
        const base = p.nemico ? 95 + (h % 50) : 150 + (h % 130);
        const vocali = [[730, 1090], [530, 1840], [400, 2000], [570, 840], [300, 870]];
        const [f1, f2] = vocali[Math.floor(Math.random() * vocali.length)];
        const dur = 0.07 + Math.random() * 0.04;
        const o = ctx.createOscillator();
        o.type = p.nemico ? 'sawtooth' : 'square';
        o.frequency.setValueAtTime(base * (0.92 + Math.random() * 0.2), t);
        o.frequency.linearRampToValueAtTime(base * (0.85 + Math.random() * 0.25), t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * (p.nemico ? 1.4 : 1.1), t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        [f1, f2].forEach((fr, i) => {
          const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fr; f.Q.value = 6;
          const gf = ctx.createGain(); gf.gain.value = i ? .6 : 1;
          o.connect(f); f.connect(gf); gf.connect(g); fine.push(f, gf);
        });
        g.connect(out); o.start(t); o.stop(t + dur + 0.02);
        fine.push(o, g);
      }
      setTimeout(() => fine.forEach(n => { try { n.disconnect(); } catch (e) {} }), 400);
    },

    // suoni brevi
    colpo(tipo, forza = 1) {
      const ctx = this.ctx, v = this.volSfx() * forza;
      if (!ctx || v <= 0 || !this._attivo) return;
      const t = ctx.currentTime;
      // lo stesso colpo due volte nello stesso istante (vignetta che trema + scritta KRRRAK) si sente una volta sola
      this._ultimi = this._ultimi || {};
      if (this._ultimi[tipo] != null && Math.abs(t - this._ultimi[tipo]) < 0.25) return;
      this._ultimi[tipo] = t;
      const fine = [];
      const osc = (tipoOnda, f0, f1, durata, vol, dopo = 0) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = tipoOnda;
        o.frequency.setValueAtTime(f0, t + dopo);
        if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dopo + durata);
        g.gain.setValueAtTime(0.0001, t + dopo);
        g.gain.exponentialRampToValueAtTime(vol, t + dopo + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dopo + durata);
        o.connect(g); g.connect(this._bus(ctx));
        o.start(t + dopo); o.stop(t + dopo + durata + 0.05);
        fine.push(o, g);
      };
      const rum = (filtroTipo, freq, durata, vol, dopo = 0, q = 1, freq1) => {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = this._rumore(ctx, durata + 0.05);
        f.type = filtroTipo; f.frequency.setValueAtTime(freq, t + dopo); f.Q.value = q;
        if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + dopo + durata);
        g.gain.setValueAtTime(vol, t + dopo);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dopo + durata);
        s.connect(f); f.connect(g); g.connect(this._bus(ctx));
        s.start(t + dopo); s.stop(t + dopo + durata + 0.05);
        fine.push(s, f, g);
      };
      // rumore "sporco" da fumetto: filtro che scende e distorsione (KA-BOOM, CRASH)
      const sporco = (f0, f1, durata, vol, dopo = 0, quanto = 30) => {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), w = ctx.createWaveShaper(), g = ctx.createGain();
        s.buffer = this._rumore(ctx, durata + 0.05);
        f.type = 'lowpass'; f.Q.value = 4;
        f.frequency.setValueAtTime(f0, t + dopo); f.frequency.exponentialRampToValueAtTime(f1, t + dopo + durata);
        const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * quanto) * 0.8; }
        w.curve = c;
        g.gain.setValueAtTime(vol, t + dopo); g.gain.setValueAtTime(vol, t + dopo + durata * 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dopo + durata);
        s.connect(f); f.connect(w); w.connect(g); g.connect(this._bus(ctx));
        s.start(t + dopo); s.stop(t + dopo + durata + 0.05);
        fine.push(s, f, w, g);
      };
      switch (tipo) {
        case 'battito': osc('sine', 85, 40, 0.28, v * .7); osc('triangle', 190, 90, 0.16, v * .5); rum('lowpass', 900, 0.05, v * .5); osc('sine', 75, 38, 0.22, v * .4, 0.3); osc('triangle', 170, 85, 0.13, v * .35, 0.3); break;
        // PEW! (sparo laser da cartone: fischio che scende di colpo)
        case 'laser': { const f = 1500 + Math.random() * 500; osc('square', f, 180, 0.17, v * .3); osc('triangle', f * 2, 300, 0.12, v * .14); break; }
        // KA-BOOM! (schiocco, poi boato sporco che si spegne)
        case 'esplosione': rum('highpass', 2500, 0.05, v * 1.1); osc('square', 420, 120, 0.06, v * .3);
          sporco(5000, 70, 1.3, v * .7, 0.05); osc('square', 150, 32, 0.9, v * .32, 0.05); osc('sine', 80, 28, 1.0, v * .9, 0.05); break;
        // POW! / BAM!
        case 'impatto': osc('square', 560, 90, 0.16, v * .38); sporco(6000, 300, 0.28, v * .6); osc('sine', 150, 45, 0.3, v * .8); break;
        case 'spegnimento': osc('square', 620, 38, 1.3, v * .28); rum('lowpass', 3000, 0.25, v * .4, 1.3, .8); osc('sine', 60, 30, 0.5, v * .5, 1.3); break;
        // ZZZAP! (ronzio elettrico che crepita)
        case 'scarica': osc('sawtooth', 110, 95, 0.35, v * .35); osc('square', 2600, 400, 0.3, v * .12); rum('highpass', 1800, 0.06, v * .8); rum('bandpass', 3000, 0.09, v * .6, 0.12, 1.2); sporco(3000, 400, 0.4, v * .35, 0.02, 60); break;
        case 'scintilla': rum('highpass', 4000, 0.03 + Math.random() * 0.04, v * .7); break;
        case 'crepitio': rum('bandpass', 1500 + Math.random() * 2500, 0.015 + Math.random() * 0.03, v * .9, 0, 3); break;
        case 'bip': osc('square', 1320, 0, 0.09, v * .2); osc('square', 1320, 0, 0.09, v * .2, 0.16); break;
        // VRRRM!
        case 'motore': osc('sawtooth', 90, 300, 0.9, v * .3); osc('square', 45, 150, 0.9, v * .15); sporco(700, 2500, 0.9, v * .3, 0, 40); break;
        case 'soffio': rum('bandpass', 600, 0.8, v * 1.0, 0, 1.2, 3500); break;
        case 'eco': [0, .25, .5, .75].forEach((d, i) => osc('triangle', 660, 330, 0.5, v * .4 / (i + 1), d)); break;
      }
      setTimeout(() => fine.forEach(n => { try { n.disconnect(); } catch (e) {} }), 2500);
    }
  };

  document.addEventListener('visibilitychange', () => S.pausa(document.hidden));
  window.StoriaSuoni = S;
})();
