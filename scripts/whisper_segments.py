#!/usr/bin/env python3
"""Ses dosyasından her sahnenin cümle zamanlarını (segments.json) çıkarır — ses/görüntü kaymasını önler.

Sessizlik tabanlı hizalama, cümle içindeki uzun duraklamalarda (fısıltı, vurgu) sahne sınırını
yanlış yere koyabiliyor. Bu betik sesi Whisper ile yazıya döker, her sahnenin ilk kelimesini sesteki
yerinde bulur ve sınırları en yakın gerçek sessizliğe oturtur. align.py bu dosyayı otomatik kullanır.

  python3 scripts/whisper_segments.py public/episodes/<bölüm>
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import align as A  # noqa: E402


def norm(w: str) -> str:
    return w.lower().replace("i̇", "i").strip(".,:;?!'\"…-–")


def main() -> None:
    d = sys.argv[1]
    ep = json.load(open(os.path.join(d, "episode.json"), encoding="utf-8"))
    vpath = os.path.join(d, ep.get("voice") or "voice.mp3")
    lines = [s["text"] for s in ep["scenes"] if s.get("text")]

    import numpy as np
    from faster_whisper import WhisperModel

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", vpath, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, np.float32)
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(audio, language="tr", word_timestamps=True, beam_size=5)
    words = [{"w": w.word.strip(), "s": w.start, "e": w.end} for s in segs for w in s.words]
    if not words:
        sys.exit("✗ Whisper hiç kelime bulamadı")

    # Her sahnenin ilk kelimesini sırayla bul (ilk 4 harf yeterli: "Şarj" ~ "Şarjda")
    idx, j = [], 0
    for line in lines:
        a = norm(line.split()[0])[:4]
        k = j
        while k < len(words) and not norm(words[k]["w"]).startswith(a):
            k += 1
        if k >= len(words):
            sys.exit(f"✗ Sahne başı seste bulunamadı: «{line}» — segments.json yazılmadı (sessizlik yöntemi kullanılacak)")
        idx.append(k)
        j = k + 1

    out = []
    for n, line in enumerate(lines):
        end_i = (idx[n + 1] if n + 1 < len(lines) else len(words)) - 1
        out.append({"text": line, "start": round(words[idx[n]]["s"], 3), "end": round(words[end_i]["e"], 3)})

    # Sınırları en yakın gerçek sessizliğe oturt (Whisper kelime sonları ±0,3 sn şaşabilir)
    x = A.load_audio(vpath)
    iv = A.speech_intervals(x, 0.08, 24)
    gaps = [(p[1], q[0]) for p, q in zip(iv, iv[1:])]
    for n in range(len(out) - 1):
        mid = (out[n]["end"] + out[n + 1]["start"]) / 2
        near = [g for g in gaps if abs((g[0] + g[1]) / 2 - mid) < 0.6]
        if near:
            g = min(near, key=lambda g: abs((g[0] + g[1]) / 2 - mid))
            out[n]["end"], out[n + 1]["start"] = round(g[0], 3), round(g[1], 3)
    out[0]["start"] = round(min(out[0]["start"], iv[0][0]), 3)
    out[-1]["end"] = round(max(out[-1]["end"], iv[-1][1]), 3)

    json.dump(out, open(os.path.join(d, "segments.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for s in out:
        print(f"  {s['start']:6.2f} – {s['end']:6.2f}  {s['text']}")
    print(f"✓ {len(out)} sahnenin cümle zamanı sesten ölçüldü -> segments.json")


if __name__ == "__main__":
    main()
