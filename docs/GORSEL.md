# Görsel üretimi — kaynaklar ve sıra

Karakter tutarlılığı için her üretimde **karakter sayfası** (`public/brand/karakter-sayfasi.png`) ya da karakterin
bulunduğu bir sahne referans olarak verilir. Dönem (`era`), kıyafet (`outfit`) ve renk paleti (`palette`) her isteme eklenir.

| Sıra | Kaynak | Model | Maliyet / sınır |
|---|---|---|---|
| 1 | **Hugging Face** (`scripts/free_images.py`) | FLUX.1 Kontext | Ücretsiz. HF hesabıyla ≈ 8 görsel/gün |
| 2 | **Higgsfield** | Google Nano Banana 2 (2K) | ≈ 2 kredi/görsel (ücretsiz planda kredi sınırlı) |
| 3 | **Canva** (generate-image) | Canva AI | Kredi yok, hesap kotası var (2. bölümde 5 görselden sonra doldu). 944x1680 üretir |
| 4 | **ElevenLabs Flows** | Google Nano Banana 2 / Pro / 2 Lite | 9:16 1K Lite ≈ 310 kredi, NB2 2K ≈ 920 kredi |

**Canva akışı** (karakter tutarlılığı çok iyi):
1. Karakter sayfası `upload-asset-from-url` ile Canva'ya yüklenir (media id `MAHZuUQjGaI`), `generate-image` çağrısına `imageReferences` olarak verilir, oran `PORTRAIT_9_16`.
2. Sonuç sadece küçük önizleme döner. Tam boyut için: bir tasarım aç (`create-design`), her görsel için 944x1680 sayfa ekle,
   `insert_fill` ile tam sayfa yerleştir, kaydet, `export-design` (png, sayfa numaraları) → indirme linkleri.
3. `python3 scripts/ep.py fit <bölüm> <dosya> img/sXX.png` ile 1080x1920'ye oturtulur.

Google Flow doğrudan kullanılamıyor (Google hesabına şifreyle giriş gerektirir, otomatik arayüzü yok);
Flow'un kullandığı model (Nano Banana) yukarıdaki 2. ve 3. yollarla kullanılır.

Üretilen görsel: `python3 scripts/ep.py image <bölüm> <url> img/sXX.png` ile 1080x1920'ye oturtulur.
Kontrol listesi (her görselde, tam boyutta bakılır):
- Ana karakter aynı mı, eldiven yok mu?
- Tüm figüranlar ana karakterle aynı tür mü (yuvarlak beyaz kafa, burunsuz)? Kadın/erkek net mi? Hiçbiri birbirine benzemiyor mu?
- Yazılar anlaşılır mı? Tabela, neon, poster, ekran, plaka, kasa ekranı, kitap sırtı… Yazı olabilir ama yalnızca
  doğru yazılmış, anlamlı, döneme uygun Türkçe (BAKKAL, KEBAP, TAKSİ, OTEL…). Anlamsız, uydurma, yanlış yazılmış
  ya da yarım kesilmiş kelime varsa görsel kabul edilmez, düzeltilir. Yazı yerine/yanında görsel de kullanılabilir.
- Arka plan dolu ve döneme uygun mu?
- Kenara yakın yazı/tabela var mı? Kamera hareketi (zoom/pan %4–17 kırpar) onu yarım bırakmasın:
  `focus` ile o kenara sabitle (ör. sol tabela → `"focus": [0, 0.5]`) ya da `"motion": "none"` kullan.
  Görselin kendisinde kenardan kesik kelime varsa (ör. "İSTANBU") kelimeyi temizle. Son kontrol: `render.mjs --stills`.
