# Seslendirme — ana ses ve yedekler

Sıra: önce 1, olmazsa 2, o da olmazsa 3.

| Sıra | Servis | Ses | Durum |
|---|---|---|---|
| 1 | **SpeechGenAI** (Türkçe yerli ses) — **ANA SES** | **Nihat** (`sg-tr-nihat`) — ölçülü, bilgili belgesel anlatıcısı | Ses dosyaları `media.speechgenai.com` adresinden iniyor; bu adres ortamın ağ ayarlarında izinli olmalı. 30 sn ≈ 400 (hızlı) / 600 (kaliteli) kredi. |
| 2 | **ElevenLabs v4** (`eleven_v4`) | Onur AGCNL (`mCTNxePO8hqCg6KFnASN`) | Çalışıyor. 30 sn bölüm ≈ 340 kredi. |
| 3 | **ElevenLabs — başka hesap** | Aynı ses (kütüphane sesi, her hesapta var) | Ayarlar → Bağlayıcılar'dan ElevenLabs bağlantısını diğer hesapla yeniden bağla. |

Ses hangi servisten gelirse gelsin akış aynı:

```bash
python3 scripts/ep.py voice <bölüm> <ses-url>   # indir → voice.mp3 → kelime kelime zamanlama
```

Notlar:
- SpeechGenAI etiketleri: `[whispering]`, `[short pause]`, `[long pause]`; okuma tarzı için `direction` alanı.
- ElevenLabs v4 satır içi yönlendirme etiketlerini anlar: `[whispers] Ya da susabilirsin.`
- Ücretsiz ElevenLabs kuyruğu bazen "meşgul" döner; kredi düşmez, birkaç dakika sonra yeniden denenir.
