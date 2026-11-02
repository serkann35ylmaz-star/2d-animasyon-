#!/usr/bin/env python3
"""Eksik sahne görsellerini ÜCRETSİZ üretir (Hugging Face — FLUX.1 Kontext, kredi yok).

Karakter tutarlılığı için bir referans görsel (karakterin bulunduğu dikey bir sahne) alır ve
"aynı karakteri koru, sahneyi değiştir" talimatıyla yeni sahneyi çizer. Çıktı 9:16 olur.

  python3 scripts/free_images.py <bölüm> [--ref img/s01.png] [--only s05,s07] [--force]

Notlar:
- Ücretsiz Hugging Face kotası sınırlıdır; dolarsa betik durur, kaldığı yerden tekrar çalıştırılabilir.
- HF_TOKEN ortam değişkeni varsa kullanıcının kendi (daha yüksek) kotası kullanılır.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SPACE = "black-forest-labs/FLUX.1-Kontext-Dev"


def era_text(ep: dict) -> str:
    era = ep.get("era")
    if not era:
        return ""
    parts = [f"Period setting: {era['setting']}." if era.get("setting") else "",
             f"People: {era['people']}." if era.get("people") else "",
             f"Period details: {era['details']}." if era.get("details") else "",
             f"Note: {era['exception']}." if era.get("exception") else "",
             "Everything else must be accurate to that period; nothing anachronistic."]
    return " ".join(x for x in parts if x)


def build_prompt(scene: dict, ep: dict, style: dict) -> str:
    outfit = scene.get("outfit") or ep.get("outfit") or style["default_outfit"]
    what = scene.get("prompt_en") or scene.get("prompt")
    keep = (
        "Keep the exact same cartoon character as in the image: perfectly round glossy white head, big black oval eyes, "
        "thick black eyebrows, no nose, bare white four-finger hands (no gloves), thin black limbs. "
        f"Outfit: {outfit}. Keep the same 2D adult-animation illustration style with thick clean ink outlines and cel shading. "
    )
    pal = scene.get("palette") or ep.get("palette") or "neon"
    light = style["palettes"].get(pal, style["palettes"]["neon"])
    if scene["type"] == "title":
        tail = f" Lighting and colors: {light}. Leave the upper-middle area dark and empty for a large title. No text, no letters, no signs with words."
    else:
        tail = f" Lighting and colors: {light}. The background must be a fully detailed, recognizable environment from that place and period, never an empty black or plain background. No text, no letters, no signs with words."
    cast = (" " + style["cast"]) if style.get("cast") else ""
    return keep + "New scene: " + what + ". " + era_text(ep) + cast + tail


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--ref", default=None, help="referans görsel (bölüm klasörüne göre), varsayılan: ilk mevcut sahne görseli")
    ap.add_argument("--only", default=None, help="virgülle ayrılmış sahne dosya adları, ör. s05,s07")
    ap.add_argument("--force", action="store_true", help="var olan görselleri de yeniden üret")
    ap.add_argument("--steps", type=int, default=28)
    args = ap.parse_args()

    from gradio_client import Client, handle_file  # pip install gradio_client

    d = os.path.join(ROOT, "public", "episodes", args.slug)
    ep = json.load(open(os.path.join(d, "episode.json"), encoding="utf-8"))
    style = json.load(open(os.path.join(ROOT, "docs", "style-prompt.json"), encoding="utf-8"))
    scenes = [s for s in ep["scenes"] if s.get("image") and (s.get("prompt_en") or s.get("prompt"))]

    ref = args.ref
    if not ref:
        ref = next((s["image"] for s in scenes if os.path.exists(os.path.join(d, s["image"]))), None)
    if not ref:
        sys.exit("Referans görsel yok: önce en az bir sahne görseli olmalı (ya da --ref verin).")
    ref_path = ref if os.path.isabs(ref) else os.path.join(d, ref)

    only = set(x.strip() for x in args.only.split(",")) if args.only else None
    todo = []
    for s in scenes:
        name = os.path.splitext(os.path.basename(s["image"]))[0]
        if only and name not in only:
            continue
        if not args.force and os.path.exists(os.path.join(d, s["image"])):
            continue
        todo.append(s)
    if not todo:
        print("✓ Eksik görsel yok.")
        return

    token = os.environ.get("HF_TOKEN")
    if not token:
        try:
            from huggingface_hub import get_token  # ~/.cache/huggingface/token
            token = get_token()
        except Exception:
            token = None
    print("• Hugging Face hesabı ile (daha yüksek ücretsiz kota)" if token else "• Hesapsız (düşük kota)")
    client = Client(SPACE, token=token, verbose=False)
    print(f"• {len(todo)} görsel üretilecek (ücretsiz, {SPACE}) · referans: {os.path.relpath(ref_path, ROOT)}")
    done = 0
    for s in todo:
        t = time.time()
        try:
            res = client.predict(handle_file(ref_path), build_prompt(s, ep, style), 0, True, 2.5, args.steps, api_name="/infer")
        except Exception as e:  # kota dolması vb.
            print(f"✗ {s['image']}: {str(e)[:300]}")
            print("  Ücretsiz kota dolmuş olabilir; biraz sonra aynı komutu tekrar çalıştırın (kaldığı yerden devam eder).")
            break
        out = res[0] if isinstance(res[0], str) else res[0]["path"]
        tmp = os.path.join(d, "img", f".tmp-{os.path.basename(out)}")
        shutil.copy(out, tmp)
        subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "ep.py"), "fit", args.slug, tmp, s["image"]], check=True, capture_output=True)
        os.remove(tmp)
        done += 1
        print(f"✓ {s['image']}  ({time.time() - t:.0f} sn)")
    print(f"• {done}/{len(todo)} tamamlandı")


if __name__ == "__main__":
    main()
