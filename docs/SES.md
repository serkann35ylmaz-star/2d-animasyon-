# Seslendirme

| Sıra | Servis | Ses | Not |
|---|---|---|---|
| 1 | **ElevenLabs v4** (`eleven_v4`) — **ANA SES** | **Onur AGCNL** (`mCTNxePO8hqCg6KFnASN`) | 30 sn bölüm ≈ 340 kredi. Kredi biterse kullanıcı uyarılır, diğer ElevenLabs hesabına geçilir (Ayarlar → Bağlayıcılar → ElevenLabs → bağlantıyı kes / yeniden bağlan). Onur kütüphane sesi olduğu için her hesapta aynıdır. |
| 2 | Microsoft Edge (ücretsiz) | tr-TR-AhmetNeural | Acil yedek: `python3 scripts/tts.py <bölüm>` |
| 3 | SpeechGenAI | Nihat | Ücretli yedek |

## Akış (ElevenLabs v4)

1. `python3 scripts/ep.py script <bölüm>` → `voice-script-v4.txt` (sahne tonları v4 etiketi olarak: `[dramatic]`, `[tense]`, `[whispers]`, `[excited]`…)
2. Bu metin ElevenLabs v4 + Onur ile seslendirilir (Claude yapar).
3. `python3 scripts/ep.py voice <bölüm> <ses-url>` → indir + `voice.mp3` + kelime kelime zamanlama

Sahne tonları `episode.json` içinde `"tone"` alanıyla verilir: dramatic, tense, excited, whisper, calm, sad, question.
