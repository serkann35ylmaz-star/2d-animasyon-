#!/usr/bin/env python3
"""ÜCRETSİZ seslendirme (kredi yok, anahtar yok): Microsoft Edge sinir ağı sesleri (edge-tts).

Her cümle ayrı seslendirilir ve sahnenin "tone" alanına göre ton verilir (sakin, dramatik, fısıltı, heyecanlı...).
Kelime zamanları doğrudan TTS motorundan alınır → altyazılar birebir senkron olur (align.py gerekmez).

  python3 scripts/tts.py <bölüm>                       # episode.json'daki "tts" ayarlarıyla
  python3 scripts/tts.py <bölüm> --voice tr-TR-AhmetNeural --rate +6% --pitch -3Hz
  python3 scripts/tts.py --list                        # Türkçe sesleri listele

episode.json:
  "tts": {"engine": "edge", "voice": "tr-TR-AhmetNeural", "rate": "+6%", "pitch": "-3Hz"}
  sahnede: "tone": "calm" | "dramatic" | "whisper" | "excited" | "tense" | "sad" | "question"
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SR = 44100

# Tonlar: temel ayarların ÜSTÜNE eklenir (hız %, perde Hz, ses %) + cümleden sonraki duraklama (sn)
TONES = {
    "neutral": (0, 0, 0, 0.0),
    "calm": (-6, -2, 0, 0.05),
    "dramatic": (-12, -6, 0, 0.12),
    "whisper": (-14, -4, -40, 0.10),
    "excited": (10, 4, 5, -0.05),
    "tense": (8, -2, 0, -0.05),
    "sad": (-14, -6, -10, 0.15),
    "question": (-2, 3, 0, 0.05),
}
# Varsayılan ton seçimi (sahnede "tone" yoksa)
DEFAULT_TONE_BY_TYPE = {"title": "dramatic", "bait": "question", "end": "calm"}

PAUSE_SENTENCE = 0.22
PAUSE_SCENE = 0.32


def pct(v: int) -> str:
    return f"{'+' if v >= 0 else ''}{v}%"


def hz(v: int) -> str:
    return f"{'+' if v >= 0 else ''}{v}Hz"


def parse_num(s: str) -> int:
    return int(re.sub(r"[^\d-]", "", s) or 0)


def split_sentences(text: str) -> list[str]:
    parts = re.findall(r"[^.!?…]+[.!?…]+[\"')]*|[^.!?…]+$", text.strip())
    return [p.strip() for p in parts if p.strip()]


def norm(w: str) -> str:
    return re.sub(r"[^\wçğıöşüâîû]", "", w.replace("İ", "i").replace("I", "ı").lower())


async def synth(text: str, voice: str, rate: str, pitch: str, volume: str, proxy: str | None):
    import edge_tts

    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume, boundary="WordBoundary", proxy=proxy)
    audio = bytearray()
    marks = []
    async for ch in com.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] in ("WordBoundary", "SentenceBoundary"):
            marks.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
    return bytes(audio), marks


def mp3_to_pcm(data: bytes):
    import numpy as np

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(data)
        path = f.name
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    os.remove(path)
    return np.frombuffer(raw, dtype=np.float32)


def map_words(tokens: list[str], marks: list, start: float, end: float) -> list[dict]:
    """TTS kelime sınırlarını senaryo kelimelerine eşler; eşleşmezse heceye göre dağıtır."""
    out = []
    j = 0
    ok = True
    for tok in tokens:
        target = norm(tok)
        if not target:
            target = tok
        acc, s0, e0 = "", None, None
        while j < len(marks) and len(acc) < len(target):
            m = marks[j]
            if s0 is None:
                s0 = m[0]
            acc += norm(m[2])
            e0 = m[1]
            j += 1
        if s0 is None:
            ok = False
            break
        out.append({"w": tok, "s": round(start + s0, 3), "e": round(start + e0, 3)})
    if ok and len(out) == len(tokens):
        return out
    # yedek: cümle süresini hece sayısına göre böl
    sys.path.insert(0, os.path.dirname(__file__))
    from align import syllables

    w = [syllables(t) + 0.35 for t in tokens]
    tot = sum(w)
    t = start
    res = []
    for tok, wi in zip(tokens, w):
        d = (end - start) * wi / tot
        res.append({"w": tok, "s": round(t, 3), "e": round(t + d, 3)})
        t += d
    return res


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--voice")
    ap.add_argument("--rate")
    ap.add_argument("--pitch")
    ap.add_argument("--list", action="store_true")
    args = ap.parse_args()

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if os.path.exists("/root/.ccr/ca-bundle.crt"):
        os.environ.setdefault("SSL_CERT_FILE", "/root/.ccr/ca-bundle.crt")

    if args.list:
        import edge_tts

        voices = asyncio.run(edge_tts.list_voices(proxy=proxy))
        for v in voices:
            if v["Locale"].startswith("tr-") or "Multilingual" in v["ShortName"]:
                print(f"{v['ShortName']:36s} {v['Gender']}")
        return
    if not args.slug:
        sys.exit(__doc__)

    import numpy as np

    d = os.path.join(ROOT, "public", "episodes", args.slug)
    ep_path = os.path.join(d, "episode.json")
    ep = json.load(open(ep_path, encoding="utf-8"))
    cfg = {"engine": "edge", "voice": "tr-TR-AhmetNeural", "rate": "+6%", "pitch": "-3Hz", **ep.get("tts", {})}
    if args.voice:
        cfg["voice"] = args.voice
    if args.rate:
        cfg["rate"] = args.rate
    if args.pitch:
        cfg["pitch"] = args.pitch
    base_rate, base_pitch = parse_num(cfg["rate"]), parse_num(cfg["pitch"])

    chunks = []
    words: list[dict] = []
    segments = []
    t = 0.0
    scenes = [s for s in ep["scenes"] if s.get("text")]
    for si, sc in enumerate(scenes):
        tone = sc.get("tone") or DEFAULT_TONE_BY_TYPE.get(sc["type"], "neutral")
        dr, dp, dv, extra = TONES.get(tone, TONES["neutral"])
        for sent in split_sentences(sc["text"]):
            # "Ya da susabilirsin." gibi fısıltı satırlarını cümle bazında da işaretleyebilmek için: "[fısıltı] ..."
            stone = tone
            m = re.match(r"^\[(\w+)\]\s*", sent)
            if m and m.group(1) in TONES:
                stone = m.group(1)
                sent = sent[m.end():]
                dr, dp, dv, extra = TONES[stone]
            audio, marks = asyncio.run(
                synth(sent, cfg["voice"], pct(base_rate + dr), hz(base_pitch + dp), pct(dv), proxy)
            )
            pcm = mp3_to_pcm(audio)
            # baş/son sessizliği kırp (TTS'in eklediği boşluklar)
            thr = 10 ** (-45 / 20)
            idx = np.where(np.abs(pcm) > thr)[0]
            a = max(0, idx[0] - int(0.02 * SR)) if len(idx) else 0
            b = min(len(pcm), idx[-1] + int(0.06 * SR)) if len(idx) else len(pcm)
            pcm = pcm[a:b]
            shift = a / SR
            marks = [(max(0.0, s0 - shift), max(0.02, e0 - shift), w) for s0, e0, w in marks]
            dur = len(pcm) / SR
            words += map_words(sent.split(), marks, t, t + dur)
            segments.append({"text": sent, "start": round(t, 3), "end": round(t + dur, 3), "tone": stone})
            chunks.append(pcm)
            t += dur
            gap = PAUSE_SENTENCE + extra
            chunks.append(np.zeros(int(gap * SR), dtype=np.float32))
            t += gap
        chunks.append(np.zeros(int((PAUSE_SCENE - PAUSE_SENTENCE) * SR), dtype=np.float32))
        t += PAUSE_SCENE - PAUSE_SENTENCE
        print(f"  ✓ {si + 1}/{len(scenes)} [{tone}] {sc['text'][:60]}")

    audio = np.concatenate(chunks)
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = audio / peak * 0.9
    voice = ep.get("voice") or "voice.mp3"
    out = os.path.join(d, voice)
    p = subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ac", "2", "-c:a", "libmp3lame", "-q:a", "2", out],
        input=audio.astype(np.float32).tobytes(),
    )
    if p.returncode:
        sys.exit("ffmpeg hatası")
    json.dump({"words": words, "source": voice, "method": f"edge-tts:{cfg['voice']}"}, open(os.path.join(d, ep.get("timings", "timings.json")), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(segments, open(os.path.join(d, "segments.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if "voice" not in ep:
        ep["voice"] = voice
        json.dump(ep, open(ep_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"✓ {os.path.relpath(out, ROOT)} · {len(audio) / SR:.1f} sn · {len(words)} kelime · ses: {cfg['voice']} (ücretsiz)")


if __name__ == "__main__":
    main()
