#!/usr/bin/env python3
"""Seslendirme dosyası + senaryo metni -> kelime kelime zamanlama (timings.json).

İnternet ya da yapay zeka modeli gerektirmez:
  1) Ses dosyasındaki sessizlikler (duraklamalar) bulunur.
  2) Duraklamalar, senaryodaki noktalama işaretli kelime sınırlarına dinamik programlama ile eşlenir.
  3) Aradaki kelimeler Türkçe hece sayısına göre orantılı dağıtılır.

Kullanım:
  python3 scripts/align.py public/episodes/<slug>
  python3 scripts/align.py public/episodes/<slug> --debug
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys

import numpy as np

SR = 16000
HOP = 0.01  # 10 ms

ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]


def num_tr(n: int) -> str:
    if n == 0:
        return "sıfır"
    parts = []
    for v, name in [(10**9, "milyar"), (10**6, "milyon"), (1000, "bin")]:
        q, n = divmod(n, v)
        if q:
            if not (v == 1000 and q == 1):
                parts.append(num_tr(q))
            parts.append(name)
    h, n = divmod(n, 100)
    if h:
        if h > 1:
            parts.append(ONES[h])
        parts.append("yüz")
    if n >= 10:
        parts.append(TENS[n // 10])
    if n % 10:
        parts.append(ONES[n % 10])
    return " ".join(parts)


VOWELS = re.compile(r"[aeıioöuüâîûAEIİOÖUÜÂÎÛ]")


def syllables(word: str) -> int:
    w = word.replace("%", " yüzde ").replace("₺", " lira ")
    w = re.sub(r"\d[\d.]*", lambda m: " " + num_tr(int(m.group().replace(".", ""))) + " ", w)
    return max(1, len(VOWELS.findall(w)))


def punct_strength(word: str) -> float:
    if re.search(r"[.!?…][\"')]*$", word):
        return 1.0
    if re.search(r"[,;:—–-][\"')]*$", word):
        return 0.6
    return 0.0


def load_audio(path: str) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def speech_intervals(x: np.ndarray, min_gap: float, rel_db: float) -> list[tuple[float, float]]:
    hop = int(HOP * SR)
    n = len(x) // hop
    frames = x[: n * hop].reshape(n, hop)
    rms = np.sqrt(np.mean(frames**2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    # sessizlik eşiği: konuşmanın yüksek yüzdeliğine göre
    ref = np.percentile(db, 95)
    floor = np.percentile(db, 10)
    thr = max(ref - rel_db, floor + 6)
    voiced = db > thr
    # kısa boşlukları kapat (patlamalı ünsüzler vb.)
    min_gap_f = int(min_gap / HOP)
    out = []
    i = 0
    while i < n:
        if voiced[i]:
            j = i
            while j < n and voiced[j]:
                j += 1
            out.append([i, j])
            i = j
        else:
            i += 1
    merged: list[list[int]] = []
    for s, e in out:
        if merged and s - merged[-1][1] < min_gap_f:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    # çok kısa gürültü patlamalarını at
    merged = [m for m in merged if (m[1] - m[0]) * HOP >= 0.06]
    return [(s * HOP, e * HOP) for s, e in merged]


def align(tokens: list[str], intervals: list[tuple[float, float]]) -> list[dict]:
    N = len(tokens)
    if N == 0 or not intervals:
        raise SystemExit("Hata: metin ya da konuşma bulunamadı.")
    w = np.array([syllables(t) + 0.35 for t in tokens], dtype=float)
    cum = np.concatenate([[0], np.cumsum(w)])  # cum[j] = j. kelimeden önceki ağırlık
    total_w = cum[-1]

    # konuşma-zamanı ekseni
    seg_len = np.array([e - s for s, e in intervals])
    speech_total = seg_len.sum()
    gaps = []  # (konuşma-zamanındaki konum, gerçek başlangıç, gerçek bitiş, süre)
    acc = 0.0
    for k in range(len(intervals) - 1):
        acc += seg_len[k]
        gs, ge = intervals[k][1], intervals[k + 1][0]
        gaps.append((acc, gs, ge, ge - gs))
    G = len(gaps)
    B = N - 1  # olası sınırlar: j kelimesinden sonra (0..N-2)

    # DP: boşlukları sınırlara monoton eşle (bazı boşluklar atlanabilir)
    INF = 1e9
    exp_pos = cum[1:N] / total_w * speech_total  # sınır j'nin beklenen konuşma-zamanı konumu
    strength = np.array([punct_strength(t) for t in tokens[:-1]])

    def cost(g: int, j: int) -> float:
        pos, _, _, dur = gaps[g]
        c = abs(pos - exp_pos[j]) / max(speech_total, 1e-6) * 6.0
        c += (1.0 - strength[j]) * (0.5 if dur > 0.25 else 0.25)
        return c

    def skip_cost(g: int) -> float:
        return 0.15 + gaps[g][3] * 3.0  # uzun duraklamayı atlamak pahalı

    # dp[g][j] = ilk g boşluk işlendi, son kullanılan sınır < j
    dp = np.full((G + 1, B + 1), INF)
    choice = np.zeros((G + 1, B + 1), dtype=np.int64)  # -1 atla, yoksa kullanılan sınır
    dp[0, :] = 0.0
    for g in range(1, G + 1):
        for j in range(B + 1):
            best = dp[g - 1, j] + skip_cost(g - 1)
            ch = -1
            # boşluk g-1'i j'den küçük bir sınıra ata: dp[g-1][jj] + cost, jj <= sınır < j
            if j > 0:
                jj = j - 1
                v = dp[g - 1, jj] + cost(g - 1, jj)
                if v < best:
                    best, ch = v, jj
            dp[g, j] = best
            choice[g, j] = ch
        # dp[g, j] en iyi değeri j arttıkça monoton yap (son sınır < j koşulu)
        for j in range(1, B + 1):
            if dp[g, j - 1] < dp[g, j]:
                dp[g, j] = dp[g, j - 1]
                choice[g, j] = -2  # "j-1'den devral"
    # geri izleme
    anchors: dict[int, int] = {}  # sınır j -> boşluk g
    g, j = G, B
    while g > 0:
        ch = choice[g, j]
        if ch == -2:
            j -= 1
            continue
        if ch >= 0:
            anchors[ch] = g - 1
            j = ch
        g -= 1

    # konuşma-zamanı -> gerçek zaman eşlemesi
    starts_sp = np.concatenate([[0], np.cumsum(seg_len)])

    def sp2real(p: float) -> float:
        p = min(max(p, 0.0), speech_total)
        k = int(np.searchsorted(starts_sp, p, side="right") - 1)
        k = min(k, len(intervals) - 1)
        return intervals[k][0] + (p - starts_sp[k])

    # bölümler: çapa sınırları arasında kelimeleri ağırlığa göre dağıt
    cuts = sorted(anchors.items())  # (sınır j, boşluk g)
    words = []
    seg_start_word = 0
    seg_start_sp = 0.0
    for j, gidx in cuts + [(N - 1, None)]:
        seg_end_word = j + 1  # dahil değil
        seg_end_sp = gaps[gidx][0] if gidx is not None else speech_total
        ws = w[seg_start_word:seg_end_word]
        span = seg_end_sp - seg_start_sp
        c = np.concatenate([[0], np.cumsum(ws)]) / max(ws.sum(), 1e-6)
        for i, tok in enumerate(tokens[seg_start_word:seg_end_word]):
            a = seg_start_sp + c[i] * span
            b = seg_start_sp + c[i + 1] * span
            s = sp2real(a + 1e-4)
            e = sp2real(b - 1e-4)
            words.append({"w": tok, "s": round(s, 3), "e": round(max(e, s + 0.05), 3)})
        seg_start_word = seg_end_word
        seg_start_sp = seg_end_sp
    return words


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode_dir")
    ap.add_argument("--voice", help="ses dosyası (varsayılan: episode.json'daki 'voice')")
    ap.add_argument("--min-gap", type=float, default=0.08, help="duraklama sayılacak en kısa sessizlik (sn)")
    ap.add_argument("--rel-db", type=float, default=24.0, help="sessizlik eşiği: tepe seviyesinin kaç dB altı")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()

    ep_path = os.path.join(args.episode_dir, "episode.json")
    ep = json.load(open(ep_path, encoding="utf-8"))
    voice = args.voice or ep.get("voice")
    if not voice:
        sys.exit("episode.json içinde 'voice' alanı yok.")
    vpath = voice if os.path.isabs(voice) else os.path.join(args.episode_dir, voice)
    tokens = [t for s in ep["scenes"] if s.get("text") for t in s["text"].split()]

    x = load_audio(vpath)
    intervals = speech_intervals(x, args.min_gap, args.rel_db)
    words = align(tokens, intervals)

    out = os.path.join(args.episode_dir, ep.get("timings", "timings.json"))
    json.dump({"words": words, "source": os.path.basename(vpath), "method": "pause-dp+syllables"}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    dur = len(x) / SR
    print(f"✓ {len(words)} kelime hizalandı · {len(intervals)} konuşma parçası · ses {dur:.1f} sn -> {out}")
    if args.debug:
        for wd in words:
            print(f"  {wd['s']:7.2f} – {wd['e']:7.2f}  {wd['w']}")


if __name__ == "__main__":
    main()
