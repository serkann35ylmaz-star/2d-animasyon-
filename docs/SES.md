# Seslendirme — ana kaynak ve yedekler

Sıra: önce 1, olmazsa 2, o da olmazsa 3.

| Sıra | Servis | Ses | Durum |
|---|---|---|---|
| 1 | **ElevenLabs v4** (`eleven_v4`) | Onur AGCNL (`mCTNxePO8hqCg6KFnASN`) | Çalışıyor. 30 sn bölüm ≈ 340 kredi. |
| 2 | **ElevenLabs — başka hesap** | Aynı ses (kütüphane sesi, her hesapta var) | Ayarlar → Bağlayıcılar'dan ElevenLabs bağlantısını diğer hesapla yeniden bağla. |
| 3 | **SpeechGenAI** (Türkçe yerli sesler) | **Nihat** (`sg-tr-nihat`, seçildi) — ölçülü belgesel anlatıcısı | Ses dosyaları `media.speechgenai.com` adresinden iniyor; bu adres ortamın ağ ayarlarında izinli olmalı. 30 sn ≈ 400 (hızlı) / 600 (kaliteli) kredi. |

Ses hangi servisten gelirse gelsin akış aynı:

```bash
python3 scripts/ep.py voice <bölüm> <ses-url>   # indir → voice.mp3 → kelime kelime zamanlama
```

Notlar:
- ElevenLabs v4 satır içi yönlendirme etiketlerini anlar: `[whispers] Ya da susabilirsin.`
- SpeechGenAI etiketleri: `[whispering]`, `[short pause]`, `[long pause]` ve okuma tarzı için `direction` alanı.
- Ücretsiz ElevenLabs kuyruğu bazen "meşgul" döner; kredi düşmez, birkaç dakika sonra yeniden denenir.
