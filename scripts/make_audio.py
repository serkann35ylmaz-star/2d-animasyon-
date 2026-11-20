#!/usr/bin/env python3
"""Telifsiz ses efektleri (public/sfx/*.wav) ve arka plan müziği (public/music/*.wav) üretir.

Hepsi matematiksel olarak sentezlenir, dışarıdan dosya indirilmez.
Kullanım:  python3 scripts/make_audio.py
"""
from __future__ import annotations

import os
import wave

import numpy as np
from scipy import signal

SR = 44100
ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
rng = np.random.default_rng(7)


def write(path: str, x: np.ndarray, peak: float = 0.89) -> None:
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    m = np.max(np.abs(x)) or 1.0
    x = x / m * peak
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    print(f"  ✓ {os.path.relpath(path, ROOT)}  {len(x) / SR:.2f}s")


def t(d: float) -> np.ndarray:
    return np.arange(int(d * SR)) / SR


def env(n: int, a: float, d: float, curve: float = 3.0) -> np.ndarray:
    """a: atak (sn), d: toplam süre (sn) — üstel sönüm"""
    tt = np.arange(n) / SR
    att = np.clip(tt / max(a, 1e-4), 0, 1)
    dec = np.exp(-curve * np.clip(tt - a, 0, None) / max(d - a, 1e-3))
    return att * dec


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    sos = signal.butter(order, f, btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def hp(x, f, order=2):
    sos = signal.butter(order, f, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def reverb(x: np.ndarray, length=1.2, mix=0.25) -> np.ndarray:
    n = int(length * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 5.0)
    ir = lp(ir, 6000)
    wet = np.pad(signal.fftconvolve(x, ir), (0, 1))[: len(x) + n]
    dry = np.concatenate([x, np.zeros(n)])
    wet = wet / (np.max(np.abs(wet)) or 1) * np.max(np.abs(x))
    return dry * (1 - mix) + wet * mix


def stereo_pan(x: np.ndarray, pan: np.ndarray) -> np.ndarray:
    l = x * np.cos((pan + 1) * np.pi / 4)
    r = x * np.sin((pan + 1) * np.pi / 4)
    return np.stack([l, r], axis=1)


# ---------------- SFX ----------------

def whoosh():
    d = 0.55
    n = int(d * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    # zamanla değişen bant geçiren: bloklar halinde
    blocks = 40
    centers = np.geomspace(500, 3200, blocks // 2).tolist() + np.geomspace(3200, 700, blocks - blocks // 2).tolist()
    size = n // blocks
    for i, c in enumerate(centers):
        seg = slice(max(0, i * size - 256), min(n, (i + 1) * size + 256))
        y = bp(noise[seg], c * 0.6, min(c * 1.6, SR / 2 - 100))
        out[seg][: len(y)] += y * np.hanning(len(y))
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    x = out * e
    return stereo_pan(x, np.linspace(-0.7, 0.7, n))


def impact():
    d = 1.6
    tt = t(d)
    f = 30 + 70 * np.exp(-tt * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.003, d, 4.5)
    crack = hp(rng.standard_normal(len(tt)), 1200) * env(len(tt), 0.001, 0.25, 6)
    body = lp(rng.standard_normal(len(tt)), 400) * env(len(tt), 0.002, 0.6, 5) * 0.8
    x = sub * 1.2 + crack * 0.35 + body
    x = np.tanh(x * 1.8)
    return reverb(x, 1.4, 0.22)


def pop():
    d = 0.16
    tt = t(d)
    f = 900 * np.exp(-tt * 25) + 260
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.002, d, 7)
    x += hp(rng.standard_normal(len(tt)), 3000) * env(len(tt), 0.0005, 0.02, 8) * 0.3
    return x


def tick():
    d = 0.06
    tt = t(d)
    x = np.sin(2 * np.pi * 2300 * tt) * env(len(tt), 0.0005, d, 10)
    x += np.sin(2 * np.pi * 4100 * tt) * env(len(tt), 0.0005, d * 0.5, 12) * 0.4
    return x


def riser():
    d = 1.4
    tt = t(d)
    f = np.geomspace(180, 1400, len(tt))
    tone = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.25
    tone = lp(tone, 3000)
    noise = hp(rng.standard_normal(len(tt)), 2000) * 0.3
    e = (tt / d) ** 2.2
    x = (tone + noise) * e
    x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return stereo_pan(x, np.sin(tt * 9) * 0.4)


def cash():
    """Para sayma makinesi 'brrrt' sesi"""
    d = 0.9
    n = int(d * SR)
    x = np.zeros(n)
    k = 0.0
    while k < d - 0.03:
        i = int(k * SR)
        m = int(0.018 * SR)
        burst = bp(rng.standard_normal(m), 1800, 7000) * env(m, 0.0008, 0.018, 7)
        x[i : i + m] += burst * rng.uniform(0.6, 1.0)
        k += rng.uniform(0.022, 0.03)
    x += lp(rng.standard_normal(n), 300) * 0.15
    x *= np.minimum(1, np.linspace(0, 6, n)) * np.minimum(1, np.linspace(6, 0, n))
    return x


def glitch():
    d = 0.35
    n = int(d * SR)
    x = np.zeros(n)
    pos = 0
    while pos < n:
        m = int(rng.uniform(0.01, 0.05) * SR)
        f = rng.choice([110, 220, 440, 880, 1760])
        seg = signal.square(2 * np.pi * f * np.arange(m) / SR) * rng.uniform(0.3, 1)
        if rng.random() < 0.4:
            seg = rng.standard_normal(m) * 0.6
        x[pos : pos + m] = seg[: max(0, min(m, n - pos))]
        pos += m
    x = np.round(x * 6) / 6
    return x * env(n, 0.001, d, 2)


def ding():
    d = 1.6
    tt = t(d)
    x = np.zeros(len(tt))
    for f, a, dec in [(1046.5, 1.0, 3), (2093, 0.4, 5), (2637, 0.25, 6), (3520, 0.12, 8), (523.25, 0.3, 2.5)]:
        x += np.sin(2 * np.pi * f * tt) * a * np.exp(-tt * dec)
    x *= env(len(tt), 0.002, d, 0.01)
    return reverb(x, 1.0, 0.2)


# ---------------- MÜZİK ----------------

def note(m: int) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def dark_pulse(bpm=88, bars=16):
    """Karanlık, gerilimli lo-fi altlık: pad + sub bas + yumuşak davul + plak cızırtısı. Kusursuz döngü."""
    beat = 60 / bpm
    bar = beat * 4
    dur = bar * bars
    n = int(dur * SR)
    tt = np.arange(n) / SR
    mix = np.zeros((n, 2))

    # Akor dizisi (La minör): Am - F - Dm - E  (her biri 1 ölçü)
    chords = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]]
    roots = [45, 41, 38, 40]
    for b in range(bars):
        c = chords[b % 4]
        s = int(b * bar * SR)
        e_ = int((b + 1) * bar * SR)
        seg_t = np.arange(e_ - s) / SR
        pad = np.zeros(e_ - s)
        for m in c:
            for det in (-0.12, 0.0, 0.11):
                pad += signal.sawtooth(2 * np.pi * note(m + det) * seg_t + rng.uniform(0, 6.28))
        pad = lp(pad, 900) * 0.05
        fade = np.minimum(1, np.minimum(seg_t / 0.35, (bar - seg_t) / 0.35))
        pad *= fade
        mix[s:e_, 0] += pad * 0.9
        mix[s:e_, 1] += np.roll(pad, 300) * 0.9
        # sub bas: kök nota, sekizlik nabız
        r = note(roots[b % 4] - 12)
        for k in range(8):
            ps = s + int(k * beat / 2 * SR)
            pl = int(beat / 2 * SR * 0.9)
            pt = np.arange(pl) / SR
            tone = np.sin(2 * np.pi * r * pt) + 0.25 * np.sin(2 * np.pi * r * 2 * pt)
            tone *= env(pl, 0.01, beat / 2 * 0.9, 3.0) * (1.0 if k % 2 == 0 else 0.6)
            mix[ps : ps + pl, :] += (tone * 0.22)[:, None]
    # davul
    for k in range(int(bars * 4)):
        s = int(k * beat * SR)
        if k % 2 == 0:  # kick
            kl = int(0.35 * SR)
            kt = np.arange(kl) / SR
            f = 45 + 90 * np.exp(-kt * 30)
            kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(kl, 0.002, 0.35, 5)
            mix[s : s + kl, :] += (kick * 0.5)[:, None]
        else:  # rim/snare yumuşak
            sl = int(0.18 * SR)
            sn = bp(rng.standard_normal(sl), 1500, 6000) * env(sl, 0.001, 0.18, 7) * 0.12
            mix[s : s + sl, 0] += sn
            mix[s : s + sl, 1] += sn * 0.8
        # off-beat hi-hat
        hs = s + int(beat / 2 * SR)
        hl = int(0.05 * SR)
        if hs + hl < n:
            hh = hp(rng.standard_normal(hl), 7000) * env(hl, 0.0005, 0.05, 8) * 0.05
            mix[hs : hs + hl, 0] += hh * 0.7
            mix[hs : hs + hl, 1] += hh
    # plak cızırtısı
    crackle = np.zeros(n)
    idx = rng.integers(0, n, size=int(dur * 14))
    crackle[idx] = rng.uniform(-1, 1, size=len(idx))
    crackle = hp(crackle, 2500) * 0.18 + lp(rng.standard_normal(n), 2000) * 0.004
    mix[:, 0] += crackle
    mix[:, 1] += np.roll(crackle, 1200)
    # yumuşak bus sıkıştırma
    mix = np.tanh(mix * 1.4) / 1.4
    return mix


def main():
    print("SFX üretiliyor…")
    for name, fn in [
        ("whoosh", whoosh),
        ("impact", impact),
        ("pop", pop),
        ("tick", tick),
        ("riser", riser),
        ("cash", cash),
        ("glitch", glitch),
        ("ding", ding),
    ]:
        write(os.path.join(ROOT, "sfx", f"{name}.wav"), fn())
    print("Müzik üretiliyor…")
    write(os.path.join(ROOT, "music", "dark-pulse.wav"), dark_pulse(), peak=0.7)


if __name__ == "__main__":
    main()
