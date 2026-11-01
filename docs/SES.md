# Seslendirme — ücretsiz ana ses ve yedekler

| Sıra | Servis | Ses | Maliyet |
|---|---|---|---|
| 1 | **Microsoft Edge sinir ağı sesi** (`edge-tts`) — **ANA SES** | **tr-TR-AhmetNeural** | **Ücretsiz, kredisiz, anahtarsız** |
| 2 | SpeechGenAI | Nihat (`sg-tr-nihat`) | Ücretli kredi (30 sn ≈ 1.170 kredi) |
| 3 | ElevenLabs v4 | Onur AGCNL (`mCTNxePO8hqCg6KFnASN`) | Ücretli kredi (30 sn ≈ 340 kredi) |

Neden Ahmet? Türkçe konuşabilen tüm ücretsiz erkek sesler aynı metinle okutulup Whisper ile geri yazdırıldı:
Ahmet (yerli) her kelimeyi doğru okuyan tek ses oldu; çok dilli sesler "Uyandın", "Birinci" gibi kelimeleri bozdu.

## Kullanım

```bash
python3 scripts/tts.py <bölüm>     # voice.mp3 + kelime kelime zamanlama (timings.json) + cümle zamanları
python3 scripts/tts.py --list      # kullanılabilir Türkçe sesler
```

`episode.json`:
```json
"tts": {"engine": "edge", "voice": "tr-TR-AhmetNeural", "rate": "+6%", "pitch": "-3Hz"}
```

## Hikâyeye göre ton

Her sahneye `"tone"` verilir; her cümle o tonla ayrı seslendirilir:

| Ton | Ne zaman | Etki |
|---|---|---|
| `dramatic` | kanca, başlık, koz | yavaş, kalın, uzun duraklama |
| `tense` | problemler, gerilim | hızlı, hafif kalın |
| `excited` | iyi haber, keşif | hızlı, ince |
| `whisper` | sır, tehlike | yavaş, kısık |
| `calm` | açıklama, kapanış | sakin |
| `sad` | kayıp, pişmanlık | çok yavaş, kalın, kısık |
| `question` | yorum sorusu | soru tonlaması |

Tek bir cümlenin tonu da değiştirilebilir: `"text": "Herkese anlatabilirsin. [whisper] Ya da susabilirsin."`

Ücretli seslere geçmek için: sesi üret → `python3 scripts/ep.py voice <bölüm> <url> [cümle-zamanları.json]`
