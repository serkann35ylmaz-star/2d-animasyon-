#!/usr/bin/env python3
"""Bölüm yardımcı aracı.

  python3 scripts/ep.py new <slug> "<Başlık>"      Yeni bölüm iskeleti oluşturur
  python3 scripts/ep.py script <slug>              Seslendirme metnini çıkarır (voice-script.txt)
  python3 scripts/ep.py prompts <slug>             Görsel istemlerini çıkarır (prompts.md)
  python3 scripts/ep.py fit <slug> <dosya> <hedef> Bir görseli 1080x1920'ye kırpar/ölçekler ve img/ içine koyar
  python3 scripts/ep.py check <slug>               Eksik görsel/ses/zamanlama kontrolü
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


def cmd_new(slug: str, title: str) -> None:
    d = ep_dir(slug)
    if os.path.exists(d):
        sys.exit(f"Zaten var: {d}")
    os.makedirs(os.path.join(d, "img"))
    tpl = json.load(open(os.path.join(ROOT, "docs", "episode-template.json"), encoding="utf-8"))
    tpl["title"] = title
    json.dump(tpl, open(os.path.join(d, "episode.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"✓ {os.path.relpath(d, ROOT)}/episode.json oluşturuldu")


def cmd_script(slug: str) -> None:
    ep = load(slug)
    lines = [s["text"] for s in ep["scenes"] if s.get("text")]
    text = "\n".join(lines)
    out = os.path.join(ep_dir(slug), "voice-script.txt")
    open(out, "w", encoding="utf-8").write(text + "\n")
    words = sum(len(l.split()) for l in lines)
    print(text)
    print(f"\n✓ {os.path.relpath(out, ROOT)} · {len(text)} karakter · {words} kelime · ~{words / 2.9:.0f} sn")


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
    print("✓ Her şey hazır" if ok else "— eksikler var")


def main() -> None:
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    c = a[0]
    if c == "new" and len(a) >= 3:
        cmd_new(a[1], a[2])
    elif c == "script" and len(a) >= 2:
        cmd_script(a[1])
    elif c == "prompts" and len(a) >= 2:
        cmd_prompts(a[1])
    elif c == "fit" and len(a) >= 4:
        cmd_fit(a[1], a[2], a[3])
    elif c == "check" and len(a) >= 2:
        cmd_check(a[1])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
