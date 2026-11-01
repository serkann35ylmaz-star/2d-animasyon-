#!/usr/bin/env python3
"""Bölüm yardımcı aracı.

  python3 scripts/ep.py new <slug> "<Başlık>" [--sure 30|45|60]   Hedef süreye göre bölüm iskeleti
  python3 scripts/ep.py script <slug>              Seslendirme metnini çıkarır (voice-script.txt)
  python3 scripts/ep.py prompts <slug>             Görsel istemlerini çıkarır (prompts.md)
  python3 scripts/ep.py fit <slug> <dosya> <hedef> Bir görseli 1080x1920'ye kırpar/ölçekler ve img/ içine koyar
  python3 scripts/ep.py check <slug>               Eksik görsel/ses kontrolü + süre tahmini
  python3 scripts/ep.py voice <slug> <url|dosya>   Seslendirmeyi indirir, voice.mp3 yapar, kelime zamanlarını çıkarır
  python3 scripts/ep.py image <slug> <url|dosya> <hedef>   Görseli indirir ve 1080x1920'ye oturtur
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EPS = os.path.join(ROOT, "public", "episodes")
STYLE_FILE = os.path.join(ROOT, "docs", "style-prompt.json")


def ep_dir(slug: str) -> str:
    return os.path.join(EPS, slug)


def load(slug: str) -> dict:
    with open(os.path.join(ep_dir(slug), "episode.json"), encoding="utf-8") as f:
        return json.load(f)


sys.path.insert(0, os.path.dirname(__file__))
from align import pause_after_word, syllables  # noqa: E402

LEAD, TAIL, HOLD = 0.08, 0.14, 0.12


def estimate(ep: dict) -> tuple[float, list[float]]:
    """Ses yokken sahne sürelerini tahmin eder (src/lib/timeline.ts ile aynı mantık)."""
    sps = ep.get("syllablesPerSecond", 6.2)
    out = []
    for sc in ep["scenes"]:
        if sc.get("text"):
            words = sc["text"].split()
            spoken = sum(max(0.16, syllables(w) / sps) + pause_after_word(w) for w in words) - pause_after_word(words[-1])
            sec = max(spoken + LEAD + TAIL + sc.get("hold", HOLD), sc.get("duration", 0))
        else:
            sec = sc.get("duration", 2)
        out.append(sec)
    return sum(out), out


def actual_duration(slug: str, ep: dict) -> float | None:
    """Ses + zamanlama varsa gerçek süreyi hesaplar."""
    d = ep_dir(slug)
    tp = os.path.join(d, ep.get("timings", "timings.json"))
    if not ep.get("voice") or not os.path.exists(tp) or not os.path.exists(os.path.join(d, ep["voice"])):
        return None
    tw = json.load(open(tp, encoding="utf-8"))["words"]
    k, total, last_end = 0, 0.0, 0.0
    for sc in ep["scenes"]:
        if sc.get("text"):
            n = len(sc["text"].split())
            sl = tw[k : k + n]
            k += n
            if not sl:
                continue
            start = max(last_end, sl[0]["s"] - LEAD)
            end = sl[-1]["e"] + TAIL
            if k < len(tw):
                end = min(end, max(sl[-1]["e"], tw[k]["s"] - 0.03))
            last_end = end
            total += max(end - start + sc.get("hold", HOLD), sc.get("duration", 0))
        else:
            total += sc.get("duration", 2)
    return total


def duration_report(slug: str, ep: dict) -> None:
    est, _ = estimate(ep)
    act = actual_duration(slug, ep)
    tgt = ep.get("targetDuration")
    words = sum(len(sc["text"].split()) for sc in ep["scenes"] if sc.get("text"))
    line = f"  Süre: {'gerçek ' + format(act, '.1f') if act else 'tahmini ' + format(est, '.1f')} sn · {len(ep['scenes'])} sahne · {words} kelime"
    if tgt:
        cur = act or est
        diff = cur - tgt
        ok = abs(diff) <= tgt * 0.12
        line += f" · hedef {tgt} sn → {'✓ uygun' if ok else ('✗ ' + format(abs(diff), '.1f') + ' sn ' + ('uzun' if diff > 0 else 'kısa'))}"
        if not ok:
            per_word = (cur - 0) / max(words, 1)
            line += f" (≈ {abs(diff) / per_word:.0f} kelime {'çıkar' if diff > 0 else 'ekle'})"
    print(line)
    # Tempo kontrolü: tek bir çekim 4 sn'yi geçmesin (izleyici kaçar)
    _, per = estimate(ep)
    slow = [f"{i + 1}" for i, (sc, sec) in enumerate(zip(ep["scenes"], per)) if sc["type"] in ("image", "bait") and sec > 4.0]
    if slow and not act:
        print(f"  ⚠ Tempo: {', '.join(slow)}. sahne(ler) 4 sn'den uzun. Böl ya da metni kısalt.")


# ---- Hedef süreye göre kurgu şablonları ----
def _img(name, motion, text, note, prompt, **kw):
    return {"type": "image", "id": name, "image": f"img/{name}.png", "motion": motion, "text": text, "note": note, "prompt": prompt, **kw}


def _beats(sure: int) -> list[dict]:
    hud0 = {"a": 0, "b": 0, "risk": 0}
    intro = [
        _img("s01", "zoomIn", "Kanca cümlesi: imkânsız bir durum.", "KANCA (0-3 sn): 'sen' diye başla, imkânsız ve somut bir durum.", "Açılış sahnesi, karakter ve durumu gösteren geniş plan"),
        _img("s02", "panRight", "Durumu somutlaştır, yer ve sayı ver.", "DURUM: yer, sayı, ayrıntı. İzleyici sahneyi gözünde canlandırsın.", "Durumun ayrıntısı, orta plan"),
        _img("s03", "push", "Asıl zor kısım mı? Şimdi başlıyor.", "BÜKÜLME: beklentiyi ters çevir.", "Karakterin yüzü yakın plan, endişeli ifade"),
        {"type": "title", "image": "img/s04.png", "kicker": "BÖLÜM 1 · ALT BAŞLIK", "lines": ["SERİ", "*SLOGANI*", "BURADA"], "duration": 1.7, "note": "BAŞLIK KARTI", "prompt": "Atmosferik geniş plan, karakter arkası dönük, üst kısım boş ve karanlık"},
    ]

    def problem(n: int, img_a: str, img_b: str, hud: dict, info: dict, flash=False):
        return [
            _img(img_a, "shake", f"{['Birinci', 'İkinci', 'Üçüncü'][n - 1]} problem. Sorunu tek cümlede söyle.", f"PROBLEM {n}: sorunun adı + ilk etkisi.", f"Problem {n} anı, karakter zor durumda", tag=f"PROBLEM {n}", hud=hud, **({"transition": "flash"} if flash else {})),
            {"type": "info", "id": f"p{n}-hesap", "text": "Gerçek hesap burada, sayılarla açıklanır.", "note": f"PROBLEM {n} HESABI: gerçek, kontrol edilebilir sayılar.", "info": info},
            _img(img_b, "zoomOut", "Hesabın sonucu karakteri nasıl etkiliyor, onu söyle.", f"PROBLEM {n} SONUCU: hesabın hayattaki karşılığı.", f"Problem {n} sonucu, karakterin tepkisi", hud=hud),
        ]

    unit = {"layout": "unit", "kicker": "PROBLEM 1 · BİRİM", "unitLabel": "200", "caption": "1 birim ≈ *1 gram*"}
    grid = {"layout": "grid", "kicker": "PROBLEM 1 · ÖLÇEK", "heading": "Başlık: *vurgu*", "caption": "{n} adet", "count": {"to": 250000}, "result": "250 kg"}
    big = {"layout": "big", "kicker": "PROBLEM 2 · HESAP", "heading": "Başlık", "value": 1000, "format": "number", "caption": "Sonuç = *vurgu*"}
    comp = {"layout": "compare", "kicker": "PROBLEM 3 · KIYAS", "heading": "Kıyas başlığı", "items": [{"label": "A", "value": 100}, {"label": "B", "value": 60, "accent": True}]}

    body = []
    body += [_img("s05", "shake", "Birinci problem. Sorunu tek cümlede söyle.", "PROBLEM 1: sorunun adı.", "Problem 1 anı", tag="PROBLEM 1", hud=hud0)]
    if sure >= 45:
        body += [{"type": "info", "id": "p1-birim", "text": "Tek bir birimin ölçüsünü ver.", "note": "BİRİM: hesabın temeli.", "info": unit}]
    body += [{"type": "info", "id": "p1-olcek", "text": "Hepsini topla, ortaya çıkan rakamı söyle.", "note": "ÖLÇEK: şaşırtıcı toplam.", "info": grid}]
    body += [_img("s08", "zoomOut", "Bu sayının karakter için anlamını söyle.", "PROBLEM 1 SONUCU.", "Problem 1 sonucu", hud=hud0)]
    n_img = 9
    if sure >= 45:
        body += [_img(f"s{n_img:02d}", "push", "Ama asıl sorun bu değil.", "ARA KANCA (~%45): izleyiciyi tekrar yakala.", "Karakter bir şeyi fark ediyor, dramatik ışık", transition="flash")]
        n_img += 1
        body += problem(2, f"s{n_img:02d}", f"s{n_img + 1:02d}", {"a": 0, "b": 10, "risk": 20}, big)
        n_img += 2
    if sure >= 60:
        body += [_img(f"s{n_img:02d}", "panLeft", "Üç gün sonra. Zaman atlamasıyla durumu güncelle.", "ZAMAN ATLAMASI.", "Aynı mekân, günler sonra, dağınık", transition="whip")]
        n_img += 1
        body += problem(3, f"s{n_img:02d}", f"s{n_img + 1:02d}", {"a": 0, "b": 25, "risk": 55}, comp)
        n_img += 2
        body += [_img(f"s{n_img:02d}", "push", "Ve tam o sırada kapı çalıyor.", "SON DARBE (~%80): beklenmedik gelişme.", "Kapıda gölge, gerilim", transition="flash")]
        n_img += 1
    gun = {30: "3", 45: "5", 60: "7"}[sure]
    body += [{"type": "info", "id": "durum", "text": f"{gun}. gün. Durumun özeti.", "note": "DURUM PANOSU.", "info": {"layout": "stats", "kicker": f"{gun}. GÜN · DURUM", "rows": [{"label": "DEĞER 1", "value": 1000000, "format": "money"}, {"label": "DEĞER 2", "value": 25, "format": "number"}, {"label": "RİSK", "value": 55, "format": "percent", "accent": True, "bar": True}], "footer": "Not: **vurgu**"}}]
    body += [_img(f"s{n_img:02d}", "zoomIn", "Birinci seçeneği söyle.", "İKİLEM A.", "Karakter birinci seçeneği düşünüyor", hud={"risk": 55})]
    body += [_img(f"s{n_img + 1:02d}", "panRight", "Ya da ikinci seçeneği.", "İKİLEM B.", "Karakter ikinci seçeneğe bakıyor", hud={"risk": 55})]
    n_img += 2
    outro = [
        {"type": "bait", "image": f"img/s{n_img:02d}.png", "words": ["SEÇENEK1", "SEÇENEK2"], "duration": 2.4, "note": "YORUM TUZAĞI", "prompt": "Karakter yakın plan, eli kameraya doğru, endişeli yüz"},
        {"type": "end", "kicker": "SERİ SLOGANI", "lines": ["2. BÖLÜM", "*YARIN*"], "body": "Yorumlara **SEÇENEK1** ya da **SEÇENEK2** yaz.\nÇoğunluk 2. bölümü yazar.", "cta": "TAKİP ET · KAÇIRMA", "duration": 2.8, "note": "KAPANIŞ"},
    ]
    return intro + body + outro


def cmd_new(slug: str, title: str, sure: int = 45) -> None:
    if sure not in (30, 45, 60):
        sys.exit("--sure 30, 45 ya da 60 olmalı")
    d = ep_dir(slug)
    if os.path.exists(d):
        sys.exit(f"Zaten var: {d}")
    os.makedirs(os.path.join(d, "img"))
    tpl = json.load(open(os.path.join(ROOT, "docs", "episode-template.json"), encoding="utf-8"))
    tpl["title"] = title
    tpl["targetDuration"] = sure
    tpl["scenes"] = _beats(sure)
    json.dump(tpl, open(os.path.join(d, "episode.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"✓ {os.path.relpath(d, ROOT)}/episode.json oluşturuldu ({sure} sn şablonu)")
    duration_report(slug, tpl)
    print("  Not: yer tutucu metinler gerçek senaryoyla değiştirilince süre yeniden hesaplanır.")


def cmd_script(slug: str) -> None:
    ep = load(slug)
    lines = [s["text"] for s in ep["scenes"] if s.get("text")]
    text = "\n".join(lines)
    out = os.path.join(ep_dir(slug), "voice-script.txt")
    open(out, "w", encoding="utf-8").write(text + "\n")
    words = sum(len(l.split()) for l in lines)
    print(text)
    print(f"\n✓ {os.path.relpath(out, ROOT)} · {len(text)} karakter · {words} kelime")
    duration_report(slug, ep)


def cmd_prompts(slug: str) -> None:
    ep = load(slug)
    style = json.load(open(STYLE_FILE, encoding="utf-8"))
    out = [f"# Görsel istemleri — {ep['title']}\n", "Her görsel: **dikey 9:16 (1080x1920)**, yazısız, logosuz.\n"]
    out.append(f"**Negatif:** {style['negative']}\n")
    n = 0
    for i, s in enumerate(ep["scenes"], 1):
        img = s.get("image")
        if not img or not s.get("prompt"):
            continue
        n += 1
        has_char = s.get("character", True)
        parts = [s["prompt_en"] if s.get("prompt_en") else s["prompt"]]
        if has_char:
            parts.append(style["character"])
        parts.append(style["style"])
        if s["type"] == "title":
            parts.append("lots of empty dark space in the upper-middle for a big title")
        else:
            parts.append(style["composition"])
        out.append(f"## {i:02d} · `{img}` ({s['type']})\n")
        out.append(f"_{s['prompt']}_\n")
        out.append("```\n" + ", ".join(parts) + "\n```\n")
    path = os.path.join(ep_dir(slug), "prompts.md")
    open(path, "w", encoding="utf-8").write("\n".join(out))
    print(f"✓ {n} istem -> {os.path.relpath(path, ROOT)}")


def cmd_fit(slug: str, src: str, target: str) -> None:
    """Görseli 9:16'ya ortalayarak kırpar, 1080x1920 PNG olarak kaydeder."""
    dst = os.path.join(ep_dir(slug), target)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    vf = "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920"
    if src.lower().endswith((".mp4", ".mov", ".webm")):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", vf + ",fps=30", "-an", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", dst], check=True)
    else:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", vf, "-frames:v", "1", dst], check=True)
    print(f"✓ {os.path.relpath(dst, ROOT)}")


def _fetch(src: str, suffix: str) -> str:
    """URL ise indirir (geçici dosya), yerel dosyaysa yolunu döndürür."""
    if not src.startswith("http"):
        return src
    import tempfile
    fd, tmp = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    subprocess.run(["curl", "-sSfL", "--retry", "3", "-m", "180", "-o", tmp, src], check=True)
    return tmp


def cmd_voice(slug: str, src: str) -> None:
    ep = load(slug)
    d = ep_dir(slug)
    voice = ep.get("voice") or "voice.mp3"
    path = _fetch(src, ".audio")
    dst = os.path.join(d, voice)
    # 44.1 kHz stereo MP3; baştaki/sondaki sessizlik korunur (hizalama için önemli)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-q:a", "2", dst], check=True)
    print(f"✓ {os.path.relpath(dst, ROOT)}")
    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "align.py"), d], check=True)
    duration_report(slug, load(slug))


def cmd_image(slug: str, src: str, target: str) -> None:
    cmd_fit(slug, _fetch(src, ".img"), target)


def cmd_check(slug: str) -> None:
    ep = load(slug)
    d = ep_dir(slug)
    ok = True

    def exists(p: str) -> bool:
        return os.path.exists(os.path.join(d, p)) or os.path.exists(os.path.join(ROOT, "public", p))

    for i, s in enumerate(ep["scenes"], 1):
        for k in ("image", "video"):
            if s.get(k) and not exists(s[k]):
                print(f"  ✗ Sahne {i:02d}: {k} eksik -> {s[k]}")
                ok = False
    if ep.get("voice"):
        if not exists(ep["voice"]):
            print(f"  ✗ Ses eksik -> {ep['voice']} (tahmini zamanlama ile önizleme yapılır)")
            ok = False
        elif not exists(ep.get("timings", "timings.json")):
            print("  ✗ Zamanlama yok -> python3 scripts/align.py " + os.path.relpath(d, ROOT))
            ok = False
    if ep.get("series", {}).get("avatar") and not exists(ep["series"]["avatar"]):
        print(f"  • Avatar yok ({ep['series']['avatar']}) — baş harfler gösterilecek")
    duration_report(slug, ep)
    print("✓ Her şey hazır" if ok else "— eksikler var")


def main() -> None:
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    c = a[0]
    if c == "new" and len(a) >= 3:
        sure = int(a[a.index("--sure") + 1]) if "--sure" in a else 45
        cmd_new(a[1], a[2], sure)
    elif c == "script" and len(a) >= 2:
        cmd_script(a[1])
    elif c == "prompts" and len(a) >= 2:
        cmd_prompts(a[1])
    elif c == "fit" and len(a) >= 4:
        cmd_fit(a[1], a[2], a[3])
    elif c == "voice" and len(a) >= 3:
        cmd_voice(a[1], a[2])
    elif c == "image" and len(a) >= 4:
        cmd_image(a[1], a[2], a[3])
    elif c == "check" and len(a) >= 2:
        cmd_check(a[1])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
