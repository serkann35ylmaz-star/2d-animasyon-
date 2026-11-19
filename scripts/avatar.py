#!/usr/bin/env python3
"""Instagram profil fotoğrafı ekran görüntüsünden avatarı kırpar (daireyi otomatik bulur).

  python3 scripts/avatar.py <ekran_görüntüsü> public/episodes/<bölüm>/avatar.png

Elle koordinat TAHMİN ETME: sohbette görünen resim küçültülmüş olabilir (ör. 921x2000 görünür, gerçeği
1320x2868) ve kırpma kayar (bölüm 18 hatası). Bu betik gerçek çözünürlükte, kenar gücü en yüksek daireyi
arar, dairenin biraz içinden kare kırpar ve kontrol için <avatar>.onizleme.png yazar — teslimden önce bak.
"""
import sys

import numpy as np
from PIL import Image, ImageDraw


def find_circle(img: Image.Image) -> tuple[float, float, float]:
    W, H = img.size
    s = 300 / W
    g = np.asarray(img.convert("L").resize((300, int(H * s))), dtype=np.float32)
    gy, gx = np.gradient(g)
    mag = np.hypot(gx, gy)
    h, w = mag.shape
    th = np.linspace(0, 2 * np.pi, 180, endpoint=False)
    best = (0.0, w / 2, h / 2, w / 4)
    ct, st = np.cos(th), np.sin(th)

    def ring(cx, cy, r):
        xs = (cx + r * ct).astype(int)
        ys = (cy + r * st).astype(int)
        return mag[ys, xs]

    for cx in np.arange(w * 0.44, w * 0.56 + 1, 1):  # Instagram fotoğrafı yatayda ortalar
        for cy in np.arange(h * 0.15, h * 0.85, 2):
            for r in np.arange(w * 0.15, w * 0.47, 1.5):
                if cx - r - 8 < 1 or cy - r - 8 < 1 or cx + r + 8 >= w - 1 or cy + r + 8 >= h - 1:
                    continue
                # Kenar her yönde güçlü (alt yüzdelik) VE hemen dışı bulanık arka plan (düşük kenar): fotoğraf içi sahte daireleri eler
                edge = np.maximum(ring(cx, cy, r), np.maximum(ring(cx, cy, r - 1), ring(cx, cy, r + 1)))
                out = (ring(cx, cy, r + 4) + ring(cx, cy, r + 7)) / 2
                sc = float(np.percentile(edge, 25) - np.mean(out))
                if sc > best[0]:
                    best = (sc, cx, cy, r)
    _, cx, cy, r = best
    return cx / s, cy / s, r / s


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    img = Image.open(src).convert("RGB")
    cx, cy, r = find_circle(img)
    ri = r * 0.97  # kenardaki arka plan halkası girmesin
    box = (round(cx - ri), round(cy - ri), round(cx + ri), round(cy + ri))
    av = img.crop(box).resize((400, 400), Image.LANCZOS)
    av.save(dst)
    prev = img.copy()
    d = ImageDraw.Draw(prev)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 0, 0), width=6)
    prev.thumbnail((500, 1000))
    canvas = Image.new("RGB", (prev.width + 420, max(prev.height, 420)), (17, 17, 17))
    canvas.paste(prev, (0, 0))
    m = Image.new("L", (400, 400), 0)
    ImageDraw.Draw(m).ellipse((0, 0, 399, 399), fill=255)
    canvas.paste(av, (prev.width + 10, 10), m)
    canvas.save(dst.rsplit(".", 1)[0] + ".onizleme.png")
    print(f"✓ daire: merkez ({cx:.0f}, {cy:.0f}) yarıçap {r:.0f} · görüntü {img.size[0]}x{img.size[1]} -> {dst}")


if __name__ == "__main__":
    main()
