# Genera le musiche originali delle scene della Storia (sintesi in Python, nessun campione esterno: costo zero, nessun diritto di terzi).
# Uso: python3 strumenti/musica/genera_musica_storia.py   -> assets/audio/storia_<nome>.mp3 (loop perfetti)
# Ogni brano è un loop: tutto (note, code, riverbero) è sommato in modo circolare, quindi la fine si attacca all'inizio.
import os, subprocess, tempfile, wave
import numpy as np

SR = 44100
QUI = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(QUI, '..', '..', 'assets', 'audio')
rng = np.random.default_rng(7)

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def hz(n):
    """'D3' -> frequenza"""
    nome, ott = n[:-1], int(n[-1])
    midi = 12 * (ott + 1) + NOTE[nome]
    return 440.0 * 2 ** ((midi - 69) / 12)


class Brano:
    def __init__(self, bpm, battute, tempi=4):
        self.beat = 60.0 / bpm
        self.n = int(round(battute * tempi * self.beat * SR))
        self.bus = {}

    def b(self, nome):
        if nome not in self.bus:
            self.bus[nome] = np.zeros(self.n)
        return self.bus[nome]

    def add(self, nome, start_s, sig):
        buf = self.b(nome)
        i0 = int(start_s * SR) % self.n
        idx = (np.arange(len(sig)) + i0) % self.n
        np.add.at(buf, idx, sig)


def env(n, a, r, sustain_s=None):
    t = np.arange(n) / SR
    e = np.ones(n)
    if a > 0:
        e *= np.clip(t / a, 0, 1)
    if r > 0:
        fine = n / SR
        e *= np.clip((fine - t) / r, 0, 1)
    return e


def saw(f, dur, det=0.0, vib=0.0, vibf=5.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ff = f * 2 ** (det / 1200) * (1 + vib * np.sin(2 * np.pi * vibf * t + rng.random() * 6))
    ph = np.cumsum(ff) / SR + rng.random()
    return 2 * (ph % 1.0) - 1


def sine(f, dur, ph0=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t + ph0)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def filtro(x, fc_low=None, fc_high=None, picchi=None, ordine=4):
    """Filtro nel dominio delle frequenze (circolare: va bene per i bus del loop)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if fc_low:
        g *= 1 / (1 + (f / fc_low) ** ordine)
    if fc_high:
        g *= 1 / (1 + (fc_high / np.maximum(f, 1)) ** ordine)
    if picchi:
        gp = np.zeros_like(f)
        for fc, bw, amp in picchi:
            gp += amp * np.exp(-0.5 * ((f - fc) / bw) ** 2)
        g *= gp
    return np.fft.irfft(X * g, len(x))


def riverbero(x, decay=2.5, scuro=4000, seme=0):
    """Riverbero a convoluzione circolare (rumore che decade), restituisce L, R."""
    r = np.random.default_rng(seme)
    n = len(x)
    lung = min(n, int(decay * 2.2 * SR))
    t = np.arange(lung) / SR
    out = []
    for c in range(2):
        ir = r.standard_normal(lung) * np.exp(-t * 6.9 / decay)
        ir[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        irf = np.zeros(n)
        irf[:lung] = ir
        irf = filtro(irf, fc_low=scuro, ordine=2)
        irf /= np.sqrt(np.sum(irf ** 2)) + 1e-9
        out.append(np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(irf), n))
    return out


# ---------------- strumenti ----------------
def pad(br, bus, note, start, dur, vol=0.12, a=1.2, r=1.6, vib=0.002):
    for nn in note:
        f = hz(nn)
        s = sum(saw(f, dur + r, det=d, vib=vib) for d in (-8, 0, 7))
        br.add(bus, start, s * env(len(s), a, r) * vol)


def coro(br, bus, note, start, dur, vol=0.1, a=1.5, r=2.0):
    for nn in note:
        f = hz(nn)
        s = sum(saw(f, dur + r, det=d, vib=0.006, vibf=4.6) for d in (-10, 0, 9))
        br.add(bus, start, s * env(len(s), a, r) * vol)


def pluck(br, bus, nota, start, vol=0.18, dec=0.7):
    f = hz(nota)
    d = dec * 3
    t = np.arange(int(d * SR)) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)) * np.exp(-t / dec)
    s[:80] *= np.linspace(0, 1, 80)
    br.add(bus, start, s * vol)


def campana(br, bus, nota, start, vol=0.12, dec=2.2):
    f = hz(nota)
    d = dec * 3
    t = np.arange(int(d * SR)) / SR
    s = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (dec / m ** 0.5)) for m, a in ((1, 1), (2.76, .45), (5.4, .25), (8.93, .12)))
    s[:60] *= np.linspace(0, 1, 60)
    br.add(bus, start, s * vol)


def basso(br, bus, nota, start, dur, vol=0.32, saturo=0.0):
    f = hz(nota)
    t = np.arange(int((dur + 0.05) * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * saw(f, dur + 0.05)[:len(t)]
    if saturo:
        s = np.tanh(s * (1 + saturo * 4))
    br.add(bus, start, s * env(len(s), 0.008, 0.06) * vol)


def ottoni(br, bus, note, start, dur, vol=0.1):
    for nn in note:
        f = hz(nn)
        s = sum(saw(f, dur + 0.4, det=d, vib=0.003) for d in (-5, 5))
        e = env(len(s), 0.09, 0.4)
        br.add(bus, start, s * e * vol)


def cassa(br, bus, start, vol=0.9, f0=120, f1=42, dec=0.32):
    d = dec * 2.5
    t = np.arange(int(d * SR)) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.045)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec)
    br.add(bus, start, s * vol)


def rullante(br, bus, start, vol=0.35):
    d = 0.4
    t = np.arange(int(d * SR)) / SR
    n = filtro(noise(d), fc_low=6000, fc_high=900, ordine=2) * np.exp(-t / 0.09)
    s = n * 1.6 + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    br.add(bus, start, s * vol)


def charleston(br, bus, start, vol=0.1, dec=0.035):
    d = 0.2
    t = np.arange(int(d * SR)) / SR
    br.add(bus, start, filtro(noise(d), fc_high=7000) * np.exp(-t / dec) * vol)


def timpano(br, bus, nota, start, vol=0.7):
    f = hz(nota)
    d = 2.2
    t = np.arange(int(d * SR)) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t / 0.6)
    s += filtro(noise(d), fc_low=900, ordine=2) * np.exp(-t / 0.08) * 0.6
    br.add(bus, start, s * vol)


def drone(br, bus, nota, vol=0.12, lfo=0.07):
    f = hz(nota)
    dur = br.n / SR
    t = np.arange(br.n) / SR
    # frequenze arrotondate così il loop si chiude senza scatti
    cicli = lambda fr: round(fr * dur) / dur
    s = sum(np.sin(2 * np.pi * cicli(f * m) * t) * a for m, a in ((1, 1), (2, .5), (3, .25), (4, .15), (5, .08)))
    s *= 0.75 + 0.25 * np.sin(2 * np.pi * cicli(lfo) * t)
    br.b(bus)[:] += s * vol


def soffio(br, bus, start, dur, vol=0.12, fc=2500):
    """crescendo di rumore (tensione)"""
    n = noise(dur)
    t = np.arange(len(n)) / SR
    br.add(bus, start, filtro(n, fc_low=fc, fc_high=300, ordine=2) * (t / dur) ** 2 * vol)


def mix(br, buses, out_nome, master=0.9):
    """buses: nome -> (fc_low, fc_high, mandata_riverbero, decay, guadagno)"""
    L = np.zeros(br.n); R = np.zeros(br.n)
    rev_in = {}
    for nome, (lo, hi, send, dec, g) in buses.items():
        if nome not in br.bus:
            continue
        x = filtro(br.bus[nome], fc_low=lo, fc_high=hi, ordine=2) * g
        L += x; R += x
        if send > 0:
            rev_in.setdefault(dec, np.zeros(br.n))
            rev_in[dec] += x * send
    for k, (dec, x) in enumerate(rev_in.items()):
        rl, rr = riverbero(x, decay=dec, seme=k)
        L += rl; R += rr
    st = np.stack([L, R], 1)
    st /= np.max(np.abs(st)) + 1e-9
    st = np.tanh(st * 1.2) / np.tanh(1.2) * master
    path = os.path.join(OUT, out_nome)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        w = wave.open(tmp.name, 'wb')
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype('<i2').tobytes())
        w.close()
        # stesso volume percepito per tutti i brani (-18 LUFS): guadagno fisso, così il loop resta intatto
        mis = subprocess.run(['ffmpeg', '-hide_banner', '-i', tmp.name, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], capture_output=True, text=True).stderr
        lufs = float([r for r in mis.splitlines() if r.strip().startswith('I:')][-1].split()[1])
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-af', f'volume={-18 - lufs:.2f}dB,alimiter=limit=0.95',
                        '-c:a', 'libmp3lame', '-b:a', '112k', path], check=True)
    os.remove(tmp.name)
    print(out_nome, round(br.n / SR, 1), 's', f'{lufs:.1f} LUFS -> -18')


# ---------------- brani ----------------
def calma():
    """La città di notte, prima della Stella: pad caldi, arpeggio leggero (Re maggiore)."""
    br = Brano(72, 16)
    B = br.beat
    acc = [(['D3', 'A3', 'C#4', 'F#4', 'E5'], 'D2'), (['B2', 'F#3', 'A3', 'D4', 'C#5'], 'B1'),
           (['G2', 'D3', 'F#3', 'B3', 'A4'], 'G1'), (['A2', 'E3', 'G3', 'B3', 'D4'], 'A1')]
    for bar in range(16):
        note, bs = acc[(bar // 2) % 4]
        t0 = bar * 4 * B
        if bar % 2 == 0:
            pad(br, 'pad', note, t0, 8 * B, vol=0.05)
            basso(br, 'basso', bs, t0, 3.5 * B, vol=0.25)
            basso(br, 'basso', bs, t0 + 4 * B, 3.5 * B, vol=0.2)
        arp = [n[:-1] + str(int(n[-1]) + 1) for n in note[1:4]] + [note[-1]]
        for k in range(8):
            if bar < 4 and k % 2:
                continue
            pluck(br, 'arp', arp[(k * 3 + bar) % len(arp)], t0 + k * B / 2, vol=0.08 + 0.03 * (k == 0))
        if bar % 4 == 3:
            campana(br, 'bell', note[-1][:-1] + '6', t0 + 3 * B, vol=0.05)
    mix(br, {'pad': (1800, 80, .5, 3.5, 1.0), 'basso': (400, 30, .1, 2, 1.0), 'arp': (5000, 200, .6, 3.5, 1.0), 'bell': (9000, 300, .8, 4, 1.0)},
        'storia_calma.mp3', 0.8)


def tensione():
    """Qualcosa non va: battito basso ostinato, dissonanze, charleston nervoso (Re minore)."""
    br = Brano(96, 16)
    B = br.beat
    drone(br, 'drone', 'D1', vol=0.18)
    acc = [['D3', 'F3', 'A3', 'E4'], ['Bb2', 'F3', 'A3', 'E4'], ['G2', 'D3', 'Bb3', 'A4'], ['A2', 'C#3', 'G3', 'Bb3']]
    for bar in range(16):
        t0 = bar * 4 * B
        if bar % 2 == 0:
            pad(br, 'pad', acc[(bar // 2) % 4], t0, 8 * B, vol=0.045, a=2.0, r=2.0)
        rad = ['D2', 'Bb1', 'G1', 'A1'][(bar // 2) % 4]
        for k in range(8):
            if k in (0, 3, 4, 7):
                basso(br, 'basso', rad, t0 + k * B / 2, B * 0.3, vol=0.28 if k in (0, 4) else 0.16, saturo=0.3)
        for k in range(16):
            if bar >= 4:
                charleston(br, 'hat', t0 + k * B / 4, vol=0.05 + 0.04 * (k % 4 == 2))
        if bar % 4 == 0:
            timpano(br, 'perc', 'D2', t0, vol=0.5)
        if bar >= 8 and bar % 2 == 1:
            campana(br, 'bell', ['A5', 'Bb5'][bar % 4 == 3], t0 + 2 * B, vol=0.035)
    soffio(br, 'soffio', 14 * 4 * B, 8 * B, vol=0.08)
    mix(br, {'drone': (500, 30, .2, 3, 1), 'pad': (1500, 100, .5, 3, 1), 'basso': (500, 35, .1, 2, 1), 'hat': (14000, 6000, .2, 2, 1),
             'perc': (3000, 30, .3, 3, 1), 'bell': (8000, 400, .8, 4, 1), 'soffio': (5000, 300, .3, 3, 1)}, 'storia_tensione.mp3', 0.8)


def stella():
    """La Stella della Follia: coro inquietante, battito che pulsa, vetri sospesi (Re minore)."""
    br = Brano(60, 16)
    B = br.beat
    drone(br, 'drone', 'D1', vol=0.16, lfo=0.05)
    acc = [['D3', 'A3', 'F4'], ['Bb2', 'F3', 'D4'], ['G2', 'D3', 'Bb3'], ['A2', 'E3', 'C#4']]
    for bar in range(16):
        t0 = bar * 4 * B
        if bar % 2 == 0:
            coro(br, 'coro', acc[(bar // 2) % 4], t0, 8 * B, vol=0.05)
        # battito: TUM-tum
        cassa(br, 'battito', t0, vol=0.55, f0=90, f1=38, dec=0.25)
        cassa(br, 'battito', t0 + 0.32, vol=0.32, f0=80, f1=36, dec=0.2)
        cassa(br, 'battito', t0 + 2 * B, vol=0.45, f0=90, f1=38, dec=0.25)
        cassa(br, 'battito', t0 + 2 * B + 0.32, vol=0.25, f0=80, f1=36, dec=0.2)
        scala = ['D6', 'F6', 'G6', 'A6', 'C7', 'E6', 'Bb5']
        for k in range(2):
            if rng.random() < 0.7:
                campana(br, 'vetro', scala[rng.integers(len(scala))], t0 + (k * 2 + rng.random() * 1.5) * B, vol=0.03, dec=3)
    mix(br, {'drone': (400, 25, .3, 4, 1), 'coro': (2600, 150, .6, 4.5, 1), 'battito': (300, 25, .15, 2, 1), 'vetro': (10000, 600, .9, 5, 1)},
        'storia_stella.mp3', 0.82)


def azione():
    """Scontro: tamburi, basso ostinato, colpi di ottoni (Re minore, 132 bpm)."""
    br = Brano(132, 16)
    B = br.beat
    acc = [(['D3', 'F3', 'A3'], 'D'), (['Bb2', 'D3', 'F3'], 'Bb'), (['C3', 'E3', 'G3'], 'C'), (['A2', 'C#3', 'E3'], 'A')]
    for bar in range(16):
        t0 = bar * 4 * B
        note, r = acc[bar % 4]
        for k in (0, 1.5, 2, 3.5) if bar % 4 == 3 else (0, 1.5, 2):
            cassa(br, 'batt', t0 + k * B, vol=0.85)
        rullante(br, 'batt', t0 + B, vol=0.35)
        rullante(br, 'batt', t0 + 3 * B, vol=0.35)
        if bar % 4 == 3:
            for k in range(4):
                rullante(br, 'batt', t0 + 3 * B + k * B / 4, vol=0.12 + 0.05 * k)
        for k in range(8):
            charleston(br, 'hat', t0 + k * B / 2, vol=0.07 if k % 2 else 0.04)
        ost = [r + '2', r + '2', r + '3', r + '2', r + '2', r + '3', r + '2', r + '3']
        for k, nn in enumerate(ost * 2):
            basso(br, 'basso', nn, t0 + k * B / 4, B / 4 * 0.7, vol=0.2, saturo=0.5)
        if bar >= 4:
            for k in (0, 2.5):
                ottoni(br, 'ottoni', [n[:-1] + str(int(n[-1]) + 1) for n in note], t0 + k * B, B * 0.45, vol=0.05)
        if bar >= 8 and bar % 2 == 0:
            pad(br, 'pad', note, t0, 8 * B, vol=0.035, a=0.5, r=1.0)
        if bar % 8 == 0:
            timpano(br, 'batt', 'D2', t0, vol=0.5)
    mix(br, {'batt': (9000, 30, .15, 1.5, 1), 'hat': (15000, 6000, .1, 1.5, 1), 'basso': (900, 35, .05, 1.5, 1), 'ottoni': (3000, 150, .3, 2.5, 1),
             'pad': (2000, 100, .4, 2.5, 1)}, 'storia_azione.mp3', 0.85)


def alba():
    """Speranza: ottoni ampi, timpani, melodia di campane (Re maggiore)."""
    br = Brano(80, 16)
    B = br.beat
    acc = [(['D3', 'A3', 'D4', 'F#4'], 'D2'), (['C#3', 'A3', 'E4'], 'A1'), (['B2', 'F#3', 'D4'], 'B1'), (['G2', 'D3', 'B3'], 'G1'),
           (['F#2', 'D3', 'A3'], 'D2'), (['G2', 'B3', 'D4'], 'G1'), (['A2', 'E3', 'C#4'], 'A1'), (['A2', 'D3', 'E4'], 'A1')]
    mel = ['F#5', 'E5', 'D5', 'B4', 'A4', 'B4', 'C#5', 'E5']
    for bar in range(16):
        t0 = bar * 4 * B
        note, bs = acc[bar % 8]
        pad(br, 'archi', note, t0, 4 * B, vol=0.04, a=0.8, r=1.2)
        basso(br, 'basso', bs, t0, 3.6 * B, vol=0.25)
        if bar >= 8:
            ottoni(br, 'ottoni', note[1:], t0, 3.4 * B, vol=0.035)
            campana(br, 'bell', mel[bar % 8], t0, vol=0.08)
            campana(br, 'bell', mel[(bar + 3) % 8], t0 + 2 * B, vol=0.05)
        else:
            pluck(br, 'arp', note[-1][:-1] + '5', t0, vol=0.08)
            pluck(br, 'arp', note[-2][:-1] + '5', t0 + 2 * B, vol=0.06)
        if bar % 4 == 0:
            timpano(br, 'timp', 'D2' if bar % 8 == 0 else 'A1', t0, vol=0.55)
    mix(br, {'archi': (2200, 80, .5, 3.5, 1), 'basso': (400, 30, .1, 2, 1), 'ottoni': (2600, 150, .4, 3, 1), 'bell': (9000, 300, .7, 4, 1),
             'arp': (6000, 200, .6, 3.5, 1), 'timp': (3000, 30, .4, 3, 1)}, 'storia_alba.mp3', 0.82)


def velo():
    """Il Percorso del Velo: coro basso, basso distorto, colpi pesanti, Re frigio."""
    br = Brano(66, 16)
    B = br.beat
    drone(br, 'drone', 'D1', vol=0.2, lfo=0.09)
    acc = [(['D3', 'A3', 'F4'], 'D1'), (['Eb3', 'Bb3', 'G4'], 'Eb1'), (['D3', 'A3', 'F4'], 'D1'), (['C3', 'G3', 'Eb4'], 'C1')]
    for bar in range(16):
        t0 = bar * 4 * B
        note, bs = acc[bar % 4]
        coro(br, 'coro', note, t0, 4 * B, vol=0.05, a=1.0, r=1.6)
        basso(br, 'basso', bs.replace('1', '2'), t0, 1.8 * B, vol=0.3, saturo=1.0)
        basso(br, 'basso', bs.replace('1', '2'), t0 + 2.5 * B, 1.2 * B, vol=0.22, saturo=1.0)
        cassa(br, 'colpi', t0, vol=0.9, f0=110, f1=35, dec=0.45)
        timpano(br, 'colpi', 'D2', t0, vol=0.45)
        if bar % 2 == 1:
            cassa(br, 'colpi', t0 + 2.5 * B, vol=0.5, f0=100, f1=35, dec=0.3)
        if bar >= 8:
            campana(br, 'vetro', ['D6', 'Eb6'][bar % 2], t0 + B, vol=0.03, dec=3)
        if bar % 8 == 7:
            soffio(br, 'soffio', t0, 4 * B, vol=0.1, fc=1800)
    mix(br, {'drone': (350, 25, .3, 4, 1), 'coro': (2000, 120, .6, 4.5, 1), 'basso': (700, 30, .1, 2, 1), 'colpi': (2500, 25, .3, 3, 1),
             'vetro': (9000, 500, .9, 5, 1), 'soffio': (3000, 200, .4, 3, 1)}, 'storia_velo.mp3', 0.85)


if __name__ == '__main__':
    for f in (calma, tensione, stella, azione, alba, velo):
        f()
