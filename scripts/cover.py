#!/usr/bin/env python3
"""Bölüm kapak fotoğrafı (1080x1920) — sahne görseli + seri etiketi + büyük başlık.

  python3 scripts/cover.py <bölüm> --image img/s02.png --title "1999'A|*DÜŞTÜN*" --sub "Cebinde 2026'dan bir telefon var" [--pos alt|ust]

Başlıkta | satır böler, *...* vurgu rengiyle yazılır. Yazılar TikTok profil ızgarasının
(ortadaki 3:4 alan, y 240–1680) içinde kalır. Çıktı: out/<bölüm>-kapak.jpg
"""
from __future__ import annotations

import argparse
import json
import os
import re

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FONT_DIR = "/usr/share/fonts/opentype/inter"
W, H = 1080, 1920


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


def hex2rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def gradient(pos: str, strength: float = 0.88) -> Image.Image:
    """Yazının okunması için alt ya da üstten koyulaşan geçiş."""
    g = Image.new("L", (1, H))
    for y in range(H):
        t = (y / H) if pos == "alt" else (1 - y / H)
        a = max(0.0, (t - 0.35) / 0.5)
        g.putpixel((0, y), int(255 * min(1.0, a) ** 1.4 * strength))
    return g.resize((W, H))


def draw_shadowed(base: Image.Image, xy, text, fnt, fill, shadow=18, spacing=0):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((xy[0], xy[1] + 6), text, font=fnt, fill=(0, 0, 0, 220))
    layer = layer.filter(ImageFilter.GaussianBlur(shadow))
    base.alpha_composite(layer)
    ImageDraw.Draw(base).text(xy, text, font=fnt, fill=fill)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--image", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--sub", default="")
    ap.add_argument("--pos", choices=["alt", "ust"], default="alt")
    ap.add_argument("--focus", type=float, default=0.5, help="görselin dikey odağı (0 üst – 1 alt), kırpma için")
    args = ap.parse_args()

    d = os.path.join(ROOT, "public", "episodes", args.slug)
    ep = json.load(open(os.path.join(d, "episode.json"), encoding="utf-8"))
    accent = hex2rgb(ep.get("accent", "#F5A524"))
    series = ep.get("series", {})
    m = re.search(r"Bölüm\s*(\d+)", ep.get("title", ""))
    num = m.group(1) if m else "?"
    tr_up = lambda t: t.replace("i", "İ").replace("ı", "I").upper()  # Türkçe büyük harf (i -> İ)
    show = tr_up(ep.get("title", "").split("—")[0].strip()) or tr_up(series.get("name", ""))

    img = Image.open(os.path.join(d, args.image)).convert("RGB")
    s = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    top = int((img.height - H) * args.focus)
    left = (img.width - W) // 2
    img = img.crop((left, top, left + W, top + H)).convert("RGBA")

    dark = Image.new("RGBA", (W, H), (12, 10, 12, 255))
    img = Image.composite(dark, img, gradient(args.pos))

    # Başlık satırları
    lines = [ln.strip() for ln in args.title.split("|")]
    # En geniş satır 960 px'e sığana kadar küçült
    size = 190
    while size > 60:
        big = font("Inter-Black.otf", size)
        widest = max(ImageDraw.Draw(Image.new("L", (1, 1))).textlength(ln.replace("*", ""), font=big) for ln in lines)
        if widest <= 960:
            break
        size -= 4
    lh = int(size * 1.02)
    kicker_f = font("Inter-ExtraBold.otf", 40)
    sub_f = font("Inter-Bold.otf", 50)

    block_h = 70 + lh * len(lines) + (90 if args.sub else 0)
    y0 = 1640 - block_h if args.pos == "alt" else 300

    # Seri etiketi: "GELECEĞİ BİLEN ADAM · BÖLÜM 1"
    kicker = f"{show}  ·  BÖLÜM {num}"
    dr = ImageDraw.Draw(img)
    kw = dr.textlength(kicker, font=kicker_f)
    pad = 26
    pill = (int((W - kw) / 2 - pad), y0, int((W + kw) / 2 + pad), y0 + 64)
    dr.rounded_rectangle(pill, radius=32, fill=accent + (255,))
    dr.text(((W - kw) / 2, y0 + 9), kicker, font=kicker_f, fill=(20, 18, 19))

    y = y0 + 100
    for ln in lines:
        parts = re.split(r"(\*[^*]+\*)", ln)
        total = sum(dr.textlength(p.strip("*"), font=big) for p in parts if p)
        x = (W - total) / 2
        for p in parts:
            if not p:
                continue
            col = accent + (255,) if p.startswith("*") else (244, 241, 238, 255)
            t = p.strip("*")
            draw_shadowed(img, (x, y), t, big, col)
            x += dr.textlength(t, font=big)
        y += lh
    if args.sub:
        sw = dr.textlength(args.sub, font=sub_f)
        draw_shadowed(img, ((W - sw) / 2, y + 24), args.sub, sub_f, (244, 241, 238, 235), shadow=12)

    out = os.path.join(ROOT, "out", f"{args.slug}-kapak.jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.convert("RGB").save(out, quality=93)
    print(f"✓ {os.path.relpath(out, ROOT)}")


if __name__ == "__main__":
    main()
