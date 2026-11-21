# Denizdeki sert beyaz köpük/parıltıları bastırır; karakter kafaları (yuvarlak, dolgun beyaz alanlar) korunur.
import cv2, numpy as np, sys
def soften(im, strength=1.0):
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[...,0].astype(int), hsv[...,1].astype(int), hsv[...,2].astype(int)
    water = ((H >= 65) & (H <= 112) & (S > 30) & (V > 30)).astype(np.uint8)
    water = cv2.morphologyEx(water, cv2.MORPH_CLOSE, np.ones((35,35),np.uint8))
    water = cv2.dilate(water, np.ones((41,41),np.uint8))
    bright = ((V > 120) & (S < 120)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(bright, 8)
    keep = np.zeros_like(bright)
    for i in range(1, n):
        x, y, w, h, a = st[i]
        extent = a / float(w*h); asp = w / float(h)
        if a > 15000 and extent > 0.55 and 0.6 < asp < 1.7:  # yuvarlak dolgun alan = kafa / el
            keep[lab == i] = 1
    keep = cv2.dilate(keep, np.ones((21,21),np.uint8))
    m = (bright & water & (1 - keep)).astype(np.float32)
    m = np.clip(cv2.GaussianBlur(m, (0,0), 4)*1.3, 0, 1)[...,None] * strength
    # köpük yerine: çevredeki suyun rengi + biraz açık ton (beyaz değil)
    wcol = cv2.medianBlur(im, 41).astype(np.float32)
    target = wcol * 0.82 + np.array([140,150,130],np.float32) * 0.18
    out = im.astype(np.float32) * (1 - m) + target * m
    return np.clip(out, 0, 255).astype(np.uint8)
if __name__ == '__main__':
    for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
        cv2.imwrite(dst, soften(cv2.imread(src)))
