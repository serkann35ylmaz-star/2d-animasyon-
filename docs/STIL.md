# Stil Rehberi — Referans Video Analizi

Referans: 21 saniyelik dikey (9:16) TikTok bölümü. Yapay zeka ile üretilmiş durağan illüstrasyonlar,
kamera hareketi, kelime kelime altyazı, Türkçe erkek anlatıcı, bilgi grafikleri ve "2. bölüm yarın" kapanışı.

## 1. Kurgu iskeleti (referans: 21 sn, 12 çekim)

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

## 1b. Hedef süreler: 30 / 45 / 60 / 75 sn

**Seri standardı (Geleceği Bilen Adam): her bölüm 75 sn.** (≈ 1.400 ElevenLabs kredisi / bölüm; anlatım ≈ 2,25 kelime/sn)

Referans 21 sn; bizim videolarımız **30, 45, 60 ya da 75 sn**. Uzadıkça izleyiciyi tutmak için
yapıya **ek problemler, ara kancalar ve zaman atlamaları** eklenir. Tempo değişmez: çekim başına 1,5–2,5 sn.

| | **30 sn** | **45 sn** | **60 sn** | **75 sn** (standart) |
|---|---|---|---|---|
| Kelime (anlatım) | ~50–70 | ~80–105 | ~110–140 | ~150–165 |
| Çekim sayısı | 12–16 | 16–24 | 22–32 | 28–36 |
| Problem sayısı | 1 | 2 | 3 | 3 |
| Ara kanca | — | ~%45'te ("Ama asıl sorun bu değil.") | ~%35 ve ~%65'te | ~%35, ~%55 ve ~%70'te |
| Zaman atlaması | durum panosunda ("3. GÜN") | durum panosunda ("5. GÜN") | ayrı sahne + pano ("7. GÜN") | ayrı sahne + pano |
| Son darbe (ters köşe) | — | isteğe bağlı | ~%80'de ("Ve tam o sırada kapı çalıyor.") | ~%80'de |

**60 sn akışı:** Kanca → Durum → Bükülme → Başlık kartı → Problem 1 (+birim, +ölçek grafiği, +sonuç) →
Ara kanca → Problem 2 (+hesap, +sonuç) → Zaman atlaması → Problem 3 (+kıyas, +sonuç) → Son darbe →
Durum panosu → İkilem A → İkilem B → Yorum tuzağı → Kapanış.

`python3 scripts/ep.py new <slug> "<Başlık>" [--sure 30|45|60|75]` bu iskeleti hazır kurar (varsayılan 75).
`ep.py check` süreyi hedefle karşılaştırır ("≈ 7 kelime çıkar" gibi) ve 4 sn'yi geçen çekimleri uyarır.

Kurallar:
- Her çekim **1,2–2,5 sn**, en fazla 4 sn. Bir cümle = bir çekim. Uzun cümleyi böl.
- Anlatım hep **ikinci tekil şahıs** ("çaldın", "bıktın") — izleyici hikâyenin kahramanı.
- Sayılar **gerçek ve hesaplanabilir** olmalı (inandırıcılık buradan gelir).
- Bitiş her zaman **iki seçenekli** bir soru: yorum sayısını ve 2. bölüm beklentisini artırır.

## 2. Görsel dil

- **Karakter**: her sahnede aynı maskot. Yuvarlak beyaz kafa, basit siyah gözler, burunsuz, eldivensiz beyaz çizgi film elleri,
  sokak giyimi. (`docs/style-prompt.json` → `character`) Tutarlılık için ilk iyi görsel **referans görsel** olarak kullanılır.
- **Çizim**: modern yetişkin animasyon dizisi; kalın temiz kontur, cel-shading, detaylı ve yaşanmış Türk mekânları
  (çay bardağı, eski otel, Tofaş tipi araba, yağmurlu sokak).
- **Işık**: karanlık, sinematik; **neon magenta/pembe** + sıcak tungsten.
- **Kamera**: durağan görsele yavaş yakınlaşma/kaydırma; gerilimde hızlı "push" ya da hafif titreme.

## 2a. Dönem doğruluğu

Her bölümde `"era"` alanı vardır ve her görsel istemine otomatik eklenir:
- `setting`: yer ve zaman (ör. "Istanbul, autumn 1999")
- `people`: figüranların o döneme ait kıyafet, saç, aksesuarları
- `details`: arabalar, telefonlar, televizyonlar, dükkânlar, eşyalar
- `exception`: dönem dışı kalması gereken tek şey (ör. zamanda yolculuk yapan ana karakterin kıyafeti)

Ana karakterin kimliği (kafa, yüz, eller) hiç değişmez; kıyafeti hikâyeye ve döneme göre `"outfit"` ile değişir.

## 2b. Renk paletleri (sahneye göre)

Referansın çizim dili korunur ama her sahne mor-siyah olmaz; sahnenin duygusuna göre palet seçilir
(`"palette"` alanı — sahnede ya da bölümde). Palet hem görsel istemine ışık tarifi olarak girer hem de
videoda görselin üstüne renk tonu olarak uygulanır.

| Palet | Ne zaman |
|---|---|
| `neon` | gece, şehir, gizem (referans) |
| `sabah` | uyanış, umut, yeni başlangıç |
| `nostalji` | geçmiş, 90'lar, anı |
| `gerilim` | sorun, panik, sıkışmışlık (yeşil floresan) |
| `soguk` | yalnızlık, yağmur, gece düşünceleri (mavi) |
| `gunbatimi` | dönüm noktası, veda |
| `tehlike` | kriz, karar anı (kırmızı) |
| `gunduz` | sıradan hayat, kalabalık |
| `kahve` | ev, kahvehane, sıcak iç mekân (amber) |

Arayüz vurgu rengi de bölüme göre değişebilir: `"accent": "#F5A524"` (varsayılan referans pembesi `#E8257F`).

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

- Ana ses: **ElevenLabs v4 — Onur**; sahne tonları v4 etiketleriyle (`[dramatic]`, `[whispers]`…). Ayrıntı: `docs/SES.md`.
- Altında düşük seviyede karanlık lo-fi müzik (konuşurken otomatik kısılır).
- Efektler: başlık kartında darbe (`impact`), bilgi grafiğinde `whoosh` + para sayma (`cash`),
  HUD değişiminde `tick`, yorum tuzağında `pop`, kapanışta `ding`.
- Son çıktı **-14 LUFS** (TikTok/Reels standardı).

## 5. Güvenli alanlar (1080×1920)

- Üst 0–180 px: TikTok üst menüsü → HUD 200 px'ten başlar.
- Sağ 960+ px, 1000–1600 px arası: beğeni/yorum butonları → altyazı yatayda 90–990 px.
- Alt 1600+ px: kullanıcı adı/açıklama → önemli hiçbir şey koyma.

## Kazanan yorum kartı (her bölümün başı)

Bölümün başında, kanalın **sabitlediği** izleyici yorumu gösterilir (en çok beğenilen değil):
`{"type":"info","info":{"layout":"comment","kicker":"N. BÖLÜMÜN KAZANAN YORUMU","badge":"KAZANAN YORUM","user":"kullaniciadi","text":"…","likes":12,"caption":"Yorumların kararı: *SEÇİM* · X oy"}}`
Küfür/hakaret içeren yorum videoya yazılmaz; kanal sahibine sorulur (başka yorum sabitlemesi ya da yıldızlı sansür).
