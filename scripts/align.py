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


def pause_after_word(word: str) -> float:
    """Kelimeden sonraki doğal duraklama (sn) — src/lib/text.ts pauseAfter ile aynı"""
    if re.search(r"[.!?…][\"')]*$", word):
        return 0.38
    if re.search(r"[,;:—–-][\"')]*$", word):
        return 0.18
    return 0.02


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


# ---- Whisper kelime zamanlarıyla iyileştirme (ses-metin senkronu) ----
def _key(word: str) -> str:
    w = word.replace("İ", "i").replace("I", "ı").lower().replace("i̇", "i")
    return re.sub(r"[^0-9a-zçğıöşüâîû]", "", w)


def _expand(word: str) -> list[str]:
    """Whisper'ın rakamla yazdığı kelimeyi Türkçe okunuşuna açar: "2014'te" -> iki bin on dörtte"""
    w = word.replace("%", " yüzde ")
    w = re.sub(r"(\d)[.,](?=\d{3}\b)", r"\1", w)
    w = re.sub(r"\d+", lambda m: " " + num_tr(int(m.group())) + "", w)
    parts = [_key(x) for x in w.split()]
    return [x for x in parts if x] or [_key(word)]


def refine_with_whisper(words: list[dict], wpath: str) -> tuple[list[dict], float]:
    ww = json.load(open(wpath, encoding="utf-8"))
    sub = []  # (anahtar, s, e) — açılmış Whisper kelimeleri
    for w in ww:
        parts = _expand(w["w"])
        syl = [max(1, len(VOWELS.findall(x))) for x in parts]
        tot, t = sum(syl), float(w["s"])
        span = max(0.05, float(w["e"]) - float(w["s"]))
        for x, k in zip(parts, syl):
            d = span * k / tot
            sub.append((x, t, t + d))
            t += d
    from difflib import SequenceMatcher
    a = [_key(w["w"]) for w in words]
    b = [x[0] for x in sub]
    anchor: dict[int, tuple[float, float]] = {}
    for blk in SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for o in range(blk.size):
            anchor[blk.a + o] = (sub[blk.b + o][1], sub[blk.b + o][2])
    ratio = len(anchor) / max(1, len(words))
    if ratio < 0.6:
        return words, ratio
    out = [dict(w) for w in words]
    for i, (s0, e0) in anchor.items():
        out[i]["s"], out[i]["e"] = round(s0, 3), round(max(e0, s0 + 0.05), 3)
    # Eşleşmeyen kelimeler: komşu çapalar arasındaki boşluğa hece sayısıyla dağıt
    i, n = 0, len(out)
    while i < n:
        if i in anchor:
            i += 1
            continue
        j = i
        while j < n and j not in anchor:
            j += 1
        lo = out[i - 1]["e"] if i > 0 else min(words[i]["s"], out[j]["s"] if j < n else words[i]["s"])
        hi = out[j]["s"] if j < n else max(words[j - 1]["e"], lo + 0.2 * (j - i))
        if hi <= lo:
            hi = lo + 0.05 * (j - i)
        syl = [syllables(out[k]["w"]) for k in range(i, j)]
        tot, t = sum(syl), lo
        for k, sy in zip(range(i, j), syl):
            d = (hi - lo) * sy / tot
            out[k]["s"], out[k]["e"] = round(t, 3), round(max(t + d, t + 0.05), 3)
            t += d
        i = j
    # Monotonluk güvencesi
    for k in range(1, n):
        if out[k]["s"] < out[k - 1]["s"]:
            out[k]["s"] = out[k - 1]["s"]
        if out[k]["e"] < out[k]["s"] + 0.05:
            out[k]["e"] = round(out[k]["s"] + 0.05, 3)
    return out, ratio


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode_dir")
    ap.add_argument("--voice", help="ses dosyası (varsayılan: episode.json'daki 'voice')")
    ap.add_argument("--min-gap", type=float, default=0.08, help="duraklama sayılacak en kısa sessizlik (sn)")
    ap.add_argument("--rel-db", type=float, default=24.0, help="sessizlik eşiği: tepe seviyesinin kaç dB altı")
    ap.add_argument("--segments", help="TTS servisinin verdiği cümle zamanları (JSON: [{text,start,end}]); varsa cümle sınırları buradan alınır")
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
    seg_path = args.segments or os.path.join(args.episode_dir, "segments.json")
    method = "pause-dp+syllables"
    if os.path.exists(seg_path):
        # Cümle sınırları TTS'ten kesin olarak bilinir; her cümlenin içi ayrıca hizalanır
        segs = json.load(open(seg_path, encoding="utf-8"))
        segs = segs.get("segments", segs) if isinstance(segs, dict) else segs
        words, k = [], 0
        for sg in segs:
            n = len(re.sub(r"<[^>]+>", "", sg["text"]).split())
            toks = tokens[k : k + n]
            k += n
            a, b = float(sg["start"]), float(sg["end"])
            inner = [(max(s0, a), min(e0, b)) for s0, e0 in intervals if e0 > a and s0 < b]
            inner = [iv for iv in inner if iv[1] - iv[0] > 0.02] or [(a, b)]
            words += align(toks, inner) if len(toks) > 1 else [{"w": toks[0], "s": round(a, 3), "e": round(b, 3)}]
        if k != len(tokens):
            print(f"⚠ Cümle zamanlarındaki kelime sayısı ({k}) senaryoyla ({len(tokens)}) uyuşmuyor — sessizlik yöntemine dönülüyor")
            words = align(tokens, intervals)
        else:
            method = "tts-segments+pause-dp"
    else:
        words = align(tokens, intervals)

    wpath = os.path.join(args.episode_dir, "whisper_words.json")
    if os.path.exists(wpath):
        words, ratio = refine_with_whisper(words, wpath)
        if ratio >= 0.6:
            method += "+whisper-words"
            print(f"✓ Kelimeler Whisper zamanlarına oturtuldu (eşleşme %{ratio * 100:.0f})")
        else:
            print(f"⚠ Whisper eşleşmesi düşük (%{ratio * 100:.0f}) — sessizlik tahmini kullanıldı")

    out = os.path.join(args.episode_dir, ep.get("timings", "timings.json"))
    json.dump({"words": words, "source": os.path.basename(vpath), "method": method}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    dur = len(x) / SR
    print(f"✓ {len(words)} kelime hizalandı · {len(intervals)} konuşma parçası · ses {dur:.1f} sn -> {out}")
    if args.debug:
        for wd in words:
            print(f"  {wd['s']:7.2f} – {wd['e']:7.2f}  {wd['w']}")


if __name__ == "__main__":
    main()
