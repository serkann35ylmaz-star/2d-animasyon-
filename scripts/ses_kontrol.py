#!/usr/bin/env python3
"""Teslim öncesi çıtırtı kontrolü (taşma/tepe ölçümü çıtırtıyı yakalamaz!).

  KEEP_WAV=1 node scripts/render.mjs <slug>          # ham karışımı (out/<slug>.master.wav) saklar
  python3 scripts/ses_kontrol.py out/<slug>.mp4 out/<slug>.master.wav

Yöntem: final videonun sesinde, ham karışıma (aynı seviyeye getirilmiş) göre YENİ oluşan sivri yüksek-frekans
olaylarını sayar. Kabul: <= 5 olay. Daha fazlaysa teslim etme; render.mjs zincirine (adeclick/yumuşak kırpma) bak.
"""
import subprocess, sys, tempfile, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SOS = butter(4, 5000, 'hp', fs=44100, output='sos')

def load(src, gain_db=0.0):
    f = tempfile.mktemp(suffix='.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-af', f'volume={gain_db}dB', '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', f], check=True)
    sr, x = wavfile.read(f); os.remove(f)
    return x.astype(np.float32) / 32768

def lufs(src):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    import re
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])

def events(x):
    h = np.abs(sosfilt(SOS, x)); loc = np.sqrt(np.convolve(h ** 2, np.ones(4410) / 4410, 'same')) + 1e-5
    idx = np.where(((h / loc) > 9) & (h > 0.02))[0]; ev = []; last = -9999
    for i in idx:
        if i - last > 1500: ev.append(i / 44100)
        last = i
    return ev

video, master = sys.argv[1], sys.argv[2]
ref = events(load(master, lufs(video) - lufs(master)))
fin = events(load(video))
new = [round(e, 1) for e in fin if not any(abs(e - b) < 0.05 for b in ref)]
print(f'Yeni çıtırtı olayı: {len(new)}  {new[:15]}')
print('SONUÇ:', 'TEMİZ ✓' if len(new) <= 5 else 'ÇITIRTI VAR ✗ — teslim etme')
sys.exit(0 if len(new) <= 5 else 1)
