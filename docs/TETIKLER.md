# Tetik kelimeler (kullanıcı talimatı)

## "Gelecek" → Geleceği Bilen Adam formatına dön
Seri tamamlandı (1–20. bölüm, final 20. bölüm). Kullanıcı "Gelecek" yazarsa bu formatla çalış:
- Remotion, 1080x1920 dikey, @hikayeyorumda; Türkçe 2D animasyon, Selim (hardal bere, lacivert mont, kırmızı-beyaz ayakkabı) ve Cemil (yeşil ceket, ekoseli gömlek, kahverengi kıvırcık saç).
- Kafalar beyaz yumurta/top; kulak yok, burun yok; gerçek kişiler saç/sakal/boy/formayla benzetilir; marka logosu yok (çıkarsa yerelde boya).
- Akış: yorum analizi → senaryo (10/10 fikirler) → "Başla" onayı → seslendirme metni (Onur AGCNL, Eleven v4; kullanıcı üretir, kredi sınırına göre karakter say) → Canva görseller (ayakkabılı referans MAHbPiXbzbg, Cemil saçlı MAHbPprJUmA; tasarım DAHbKwFlLj4) → `ep.py voice` (Whisper senkron) → render KEEP_WAV=1 → `ses_kontrol.py` (≤5) → kapak + açıklama → commit/push → gönder.
- Kazanan yorum avatarı: `scripts/avatar.py` (elle kırpma yok).
- Ayrıntılar: docs/FORMAT.md ve her bölümün senaryo.md dosyası.
- Kullanıcı bir şey yapmamı söylemeden işe başlama; "dur" deyince dur.

## "YouTube yatay" → YouTube yatay derleme projesine dön (DURAKLATILDI)
Hedef: 1–20. bölümler tek film, tamamen yatay 16:9 (bulanık kenar YOK, her şey görünsün), dizi akışı.
- Dizi modu hazır: `node scripts/render.mjs <slug> --dizi` (soru cümlesi/soru ekranı/"yarın" kartı/yorum şeridi çıkar, başa bölüm kartı). `scripts/dizi.sh` eski bulanık-kenar sürümü — yatay yerleşim yazılınca güncellenmeli.
- Görseller: 193 dikey görselin yatay hali gerekli. En iyi ücretsiz yol: Hugging Face `multimodalart/flux-fill-outpaint` (gradio_client + HF_TOKEN, /inpaint, 1536x864, ~30 sn/görsel, sahneye özel istem; görselin aslı ortada korunur). Örnek: 1. bölüm s01 başarılı.
- Diğer denenenler: yerel LaMa (kenarlar lekeli), Canva 16:9 (sahneyi yeniden çizer, kota), Higgsfield outpaint (2 kredi/görsel, hesapta 0,5 kredi).
- Kalan iş: tüm görselleri genişlet → altyazı/HUD/kartları 16:9'a göre yerleştir → 1 bölüm dene → onay → 20 bölüm render + birleştir + zaman damgaları.

## Yeni format
Kullanıcı yeni bir format gönderecek; o formatta çalışılır. "Gelecek" yazılınca yukarıdaki formata dönülür.
