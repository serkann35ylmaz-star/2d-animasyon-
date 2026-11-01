# Görsel üretimi — kaynaklar ve sıra

Karakter tutarlılığı için her üretimde **karakter sayfası** (`public/brand/karakter-sayfasi.png`) ya da karakterin
bulunduğu bir sahne referans olarak verilir. Dönem (`era`), kıyafet (`outfit`) ve renk paleti (`palette`) her isteme eklenir.

| Sıra | Kaynak | Model | Maliyet / sınır |
|---|---|---|---|
| 1 | **Hugging Face** (`scripts/free_images.py`) | FLUX.1 Kontext | Ücretsiz. HF hesabıyla ≈ 8 görsel/gün |
| 2 | **Higgsfield** | Google Nano Banana 2 (2K) | ≈ 2 kredi/görsel (ücretsiz planda kredi sınırlı) |
| 3 | **ElevenLabs Flows** | Google Nano Banana 2 / Pro | Ücretsiz planda günlük sınır + "meşgul" kuyruğu |

Google Flow doğrudan kullanılamıyor (Google hesabına şifreyle giriş gerektirir, otomatik arayüzü yok);
Flow'un kullandığı model (Nano Banana) yukarıdaki 2. ve 3. yollarla kullanılır.

Üretilen görsel: `python3 scripts/ep.py image <bölüm> <url> img/sXX.png` ile 1080x1920'ye oturtulur.
Kontrol: karakter aynı mı, eldiven yok mu, figüranlar döneme uygun mu, görselde anlamsız yazı var mı.
