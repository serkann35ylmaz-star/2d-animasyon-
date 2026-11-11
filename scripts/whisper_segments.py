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
    # Whisper sayıları rakamla yazabilir ("Elli" -> "50"); sayı kelimesi rakamla da eşleşir.
    NUM = {"bir": "1", "iki": "2", "üç": "3", "dört": "4", "beş": "5", "altı": "6", "yedi": "7", "sekiz": "8",
           "dokuz": "9", "on": "1", "yirmi": "2", "otuz": "3", "kırk": "4", "elli": "5", "altmış": "6",
           "yetmiş": "7", "seksen": "8", "doksan": "9", "yüz": "1", "bin": "1"}

    from difflib import SequenceMatcher

    def hit(word: str, a: str, full: str) -> bool:
        w = norm(word)
        if w.startswith(a) or (full in NUM and w[:1].isdigit() and w.startswith(NUM[full])):
            return True
        # Whisper bazen bir harfi yanlış duyar ("Necmi'nin" -> "Necbinin"): benzer yazılışı da kabul et
        return len(full) >= 5 and SequenceMatcher(None, w, full).ratio() >= 0.72

    idx, j = [], 0
    for line in lines:
        toks = line.split()
        full = norm(toks[0])
        a = full[:4]
        k = j
        while k < len(words) and not hit(words[k]["w"], a, full):
            k += 1
        if k >= len(words) and len(toks) > 1:
            # İlk kelime bulunamazsa ikinci kelimeyle (yakın pencerede) dene
            b, full2 = norm(toks[1])[:4], norm(toks[1])
            k = j + 1
            while k < min(len(words), j + 40) and not hit(words[k]["w"], b, full2):
                k += 1
            k = k - 1 if k < min(len(words), j + 40) else len(words)
        if k >= len(words):
            sys.exit(f"✗ Sahne başı seste bulunamadı: «{line}» — segments.json yazılmadı (sessizlik yöntemi kullanılacak)")
        idx.append(k)
        # Sonraki cümle bu cümlenin içinden başlayamaz ("beş milyar … Beş milyar."): kelimelerinin ~yarısını atla
        # Ardışık sayı kelimeleri ("dört yüz elli bin") Whisper'da tek rakam olabilir: tek kelime say
        n_exp, prev_num = 0, False
        for t in toks:
            is_num = norm(t) in NUM or norm(t)[:1].isdigit()
            if not (is_num and prev_num):
                n_exp += 1
            prev_num = is_num
        j = k + max(1, n_exp - 1)

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
        last_s = words[idx[n + 1] - 1]["s"]  # bu cümlenin son kelimesinin başı
        next_e = words[idx[n + 1]]["e"]  # sonraki cümlenin ilk kelimesinin sonu
        # Sessizlik, cümlenin son kelimesiyle sonrakinin ilk kelimesi arasında olmalı (kelime kesilmesin)
        near = [g for g in gaps if abs((g[0] + g[1]) / 2 - mid) < 0.6 and g[0] >= last_s and g[1] <= next_e]
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
