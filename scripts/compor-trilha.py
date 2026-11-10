"""Compõe a trilha de fundo dos vídeos (original, sem direitos de terceiros).

Piano suave em arpejos sobre um fundo de cordas (pad) e um baixo leve, numa
progressão tranquila em Dó maior, com reverberação. O trecho é contínuo em
loop: a reverberação é circular, então o fim emenda no começo sem corte.

Uso: python3 scripts/compor-trilha.py   ->  assets/musica/fundo.mp3
Requer numpy e ffmpeg.
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
BPM = 64
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)

# Progressão (2 compassos por acorde): C  Am  F  G  |  C  Em  F  Gsus-G
ACORDES = [
    [48, 55, 60, 64], [45, 52, 57, 60], [41, 53, 57, 60], [43, 50, 55, 59],
    [48, 55, 60, 64], [40, 52, 55, 59], [41, 53, 57, 60], [43, 50, 55, 60],
]
COMP_POR_ACORDE = 2
VOLTAS = 2  # a progressão inteira duas vezes (a segunda com melodia mais alta)
DUR = len(ACORDES) * COMP_POR_ACORDE * BAR * VOLTAS
N = int(DUR * SR)
t_total = np.arange(N) / SR


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def adiciona(buf, ini, sinal):
    """Soma o sinal ao buffer de forma circular (o que passa do fim volta ao começo)."""
    i = int(ini * SR) % N
    n = len(sinal)
    fim = i + n
    if fim <= N:
        buf[i:fim] += sinal
    else:
        buf[i:] += sinal[: N - i]
        buf[: fim - N] += sinal[N - i:]


def piano(freq, dur, vel):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k, (amp, dec) in enumerate([(1, 1.6), (0.45, 2.4), (0.22, 3.4), (0.12, 4.5), (0.06, 6)], start=1):
        desafina = 1 + 0.0004 * (k - 1) ** 2
        s += amp * np.sin(2 * np.pi * freq * k * desafina * t) * np.exp(-dec * t)
    ataque = np.minimum(1, t / 0.006)
    soltura = np.minimum(1, (dur - t) / 0.25)
    return vel * s * ataque * soltura


def pad(freqs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for d in (-0.12, 0.0, 0.13):  # leve coro
            ff = f * 2 ** (d / 12)
            s += np.sin(2 * np.pi * ff * t) + 0.18 * np.sin(2 * np.pi * 2 * ff * t)
    env = np.minimum(1, t / 1.8) * np.minimum(1, (dur - t) / 1.8)
    return s * env / (len(freqs) * 3)


voz_piano = np.zeros(N)
voz_pad = np.zeros(N)
voz_baixo = np.zeros(N)

# Padrão do arpejo em colcheias (índices nas notas do acorde, +12 = oitava acima).
PADRAO = [0, 1, 2, 3, 2, 1, 2, 3]
t0 = 0.0
for volta in range(VOLTAS):
    for a, ac in enumerate(ACORDES):
        dur_ac = COMP_POR_ACORDE * BAR
        # pad e baixo
        adiciona(voz_pad, t0 - 0.9, pad([hz(m + 12) for m in ac[1:]], dur_ac + 1.8))
        for c in range(COMP_POR_ACORDE):
            adiciona(voz_baixo, t0 + c * BAR, 0.9 * piano(hz(ac[0] - 12), BAR, 1.0))
        # arpejo
        for c in range(COMP_POR_ACORDE):
            for i, idx in enumerate(PADRAO):
                nota = ac[idx] + 12
                ini = t0 + c * BAR + i * BEAT / 2 + rng.normal(0, 0.008)
                vel = (0.55 if i % 4 == 0 else 0.38) * rng.uniform(0.85, 1.05)
                adiciona(voz_piano, ini, piano(hz(nota), 2.6, vel))
        # melodia simples na segunda volta: nota do topo do acorde, uma por compasso
        if volta == 1:
            for c in range(COMP_POR_ACORDE):
                nota = ac[3] + 24 - (2 if c == 1 and a % 2 else 0)
                adiciona(voz_piano, t0 + c * BAR + rng.normal(0, 0.01), piano(hz(nota), 3.6, 0.42))
        t0 += dur_ac

mix = 0.95 * voz_piano + 0.55 * voz_pad + 0.35 * voz_baixo
mix -= mix.mean()

# Reverberação circular: ruído com decaimento exponencial, abafado.
dur_rev = 3.2
nr = int(dur_rev * SR)
ir = rng.normal(0, 1, nr) * np.exp(-np.arange(nr) / SR * (6.9 / dur_rev))
ir = np.convolve(ir, np.ones(24) / 24, mode='same')  # tira o brilho
ir /= np.sqrt((ir ** 2).sum())
ir_full = np.zeros(N)
ir_full[:nr] = ir
molhado = np.fft.irfft(np.fft.rfft(mix) * np.fft.rfft(ir_full), n=N)
saida = 0.72 * mix + 0.55 * molhado / (np.abs(molhado).max() / np.abs(mix).max())

# Filtro passa-baixa suave (média móvel) e normalização.
saida = np.convolve(saida, np.ones(5) / 5, mode='same')
saida = saida / np.abs(saida).max() * 0.6
estereo = np.stack([saida, np.roll(saida, int(0.011 * SR))], axis=1)
pcm = (estereo * 32767).astype(np.int16)

os.makedirs('assets/musica', exist_ok=True)
wav = 'assets/musica/fundo.wav'
with wave.open(wav, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '160k', 'assets/musica/fundo.mp3'], check=True)
os.remove(wav)
print(f'assets/musica/fundo.mp3: {DUR:.1f} s em loop contínuo')
