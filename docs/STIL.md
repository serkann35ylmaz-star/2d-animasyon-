# Stil Rehberi — Referans Video Analizi

Referans: 21 saniyelik dikey (9:16) TikTok bölümü. Yapay zeka ile üretilmiş durağan illüstrasyonlar,
kamera hareketi, kelime kelime altyazı, Türkçe erkek anlatıcı, bilgi grafikleri ve "2. bölüm yarın" kapanışı.

## 1. Kurgu iskeleti (≈20–30 sn, 10–13 çekim)

| Zaman | Bölüm | Örnek (referans) | Motor sahnesi |
|---|---|---|---|
| 0–2 sn | **Kanca**: "sen" diye başlayan, imkânsız bir durum | "Az önce 50 milyon lira çaldın." | `image` + `zoomIn` |
| 2–5 sn | Durumu somutlaştır | "Şimdi bir otel yatağında 10 spor çantasının içinde duruyor." | `image` |
| 5–7 sn | **Bükülme** | "Asıl zor kısım mı? Şimdi başlıyor." | `image` + `push` |
| 7–8 sn | **Başlık kartı** (seri sloganı + bölüm adı) | "HER LİRA İZ BIRAKIR" | `title` |
| 8–10 sn | **Problem 1** + HUD (durum çubuğu) belirir | "Birinci problem. Taşıyamıyorsun bile." | `image` + `tag` + `hud` |
| 10–15 sn | **Gerçek hesap**: bilgi grafiği | 200 ₺ × 250.000 = 250 kg | `info` (`unit`, `grid`) |
| 15–16 sn | **Durum panosu** (zaman atlama) | "3. GÜN · DURUM" | `info` (`stats`) |
| 16–19 sn | **İkilem** | "Saklayabilirsin. Ya da harcayabilirsin." | `image` |
| 19–20 sn | **Yorum tuzağı**: tek kelime | SAKLA / HARCA | `bait` |
| 20–21 sn | **Kapanış kartı** | "2. BÖLÜM YARIN" + takip butonu | `end` |

Kurallar:
- Her çekim **1,2–2,5 sn**. Bir cümle = bir çekim. Uzun cümleyi böl.
- Anlatım hep **ikinci tekil şahıs** ("çaldın", "bıktın") — izleyici hikâyenin kahramanı.
- Sayılar **gerçek ve hesaplanabilir** olmalı (inandırıcılık buradan gelir).
- Bitiş her zaman **iki seçenekli** bir soru: yorum sayısını ve 2. bölüm beklentisini artırır.

## 2. Görsel dil

- **Karakter**: her sahnede aynı maskot. Yuvarlak beyaz kafa, basit siyah gözler, burunsuz, beyaz çizgi film eldivenleri,
  sokak giyimi. (`docs/style-prompt.json` → `character`) Tutarlılık için ilk iyi görsel **referans görsel** olarak kullanılır.
- **Çizim**: modern yetişkin animasyon dizisi; kalın temiz kontur, cel-shading, detaylı ve yaşanmış Türk mekânları
  (çay bardağı, eski otel, Tofaş tipi araba, yağmurlu sokak).
- **Işık**: karanlık, sinematik; **neon magenta/pembe** + sıcak tungsten.
- **Kamera**: durağan görsele yavaş yakınlaşma/kaydırma; gerilimde hızlı "push" ya da hafif titreme.

## 3. Tipografi ve renk

| Öğe | Font | Renk |
|---|---|---|
| Altyazı | Inter 800, ~70 px, gölgeli | söylenen kelime beyaz, sıradakiler %42 beyaz |
| Başlık kartı | Inter 900, ~166 px, BÜYÜK HARF | kırık beyaz `#F4F1EE`, vurgu pembe `#E8257F` |
| Küçük etiketler | JetBrains Mono, geniş harf aralığı | gri `#8E887C` / beyaz |
| Bilgi grafiği zemini | — | bej `#E9E4D8`, koyu yazı `#1C1A19`, banknot moru `#C6A4EA` |
| Kapanış zemini | — | `#141213` |

Altyazı 1–3 kelimelik parçalar halinde, ekranın ~%67'sinde (TikTok arayüzünün üstünde) durur.

## 4. Ses

- Türkçe erkek anlatıcı, sakin ama hızlı (≈ 3 kelime/sn), cümle aralarında kısa duraklama.
- Altında düşük seviyede karanlık lo-fi müzik (konuşurken otomatik kısılır).
- Efektler: başlık kartında darbe (`impact`), bilgi grafiğinde `whoosh` + para sayma (`cash`),
  HUD değişiminde `tick`, yorum tuzağında `pop`, kapanışta `ding`.
- Son çıktı **-14 LUFS** (TikTok/Reels standardı).

## 5. Güvenli alanlar (1080×1920)

- Üst 0–180 px: TikTok üst menüsü → HUD 200 px'ten başlar.
- Sağ 960+ px, 1000–1600 px arası: beğeni/yorum butonları → altyazı yatayda 90–990 px.
- Alt 1600+ px: kullanıcı adı/açıklama → önemli hiçbir şey koyma.
