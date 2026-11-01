# 2D Animasyon Video Motoru

Dikey (9:16) hikâye videoları üretir: yapay zeka illüstrasyonları + kamera hareketi + kelime kelime altyazı +
durum çubuğu (HUD) + bilgi grafikleri + başlık/kapanış kartları + müzik ve efektler.
Bir bölüm tek bir `episode.json` dosyasıyla tanımlanır. Stil analizi: [`docs/STIL.md`](docs/STIL.md).

## Kurulum

```bash
npm install                     # Remotion + fontlar
pip install numpy scipy         # ses üretimi ve hizalama
python3 scripts/make_audio.py   # efektleri ve müziği üretir (public/sfx, public/music)
```
Gereken: Node 18+, Python 3.10+, ffmpeg.

## Bir bölüm üretme

```bash
python3 scripts/ep.py new bolum1 "Bölüm Başlığı" --sure 45   # 1) 30/45/60 sn iskelet
#   episode.json'u düzenle: sahneler, metinler, HUD değerleri, bilgi grafikleri
python3 scripts/ep.py prompts bolum1               # 2) görsel istemleri -> prompts.md
#   görselleri üret, ardından her birini 1080x1920'ye oturt:
python3 scripts/ep.py fit bolum1 ~/indir/a.png img/s01.png
python3 scripts/ep.py script bolum1                # 3) seslendirme metni -> voice-script.txt
#   sesi üret (TTS) ve public/episodes/bolum1/voice.mp3 olarak koy
python3 scripts/align.py public/episodes/bolum1    # 4) kelime kelime zamanlama -> timings.json
python3 scripts/ep.py check bolum1                 # 5) eksik + süre/tempo kontrolü
node scripts/render.mjs bolum1 --stills            # 6) storyboard -> out/bolum1-storyboard.jpg
node scripts/render.mjs bolum1                     # 7) final -> out/bolum1.mp4
```
Videolar **30, 45 ya da 60 sn** hedeflenir (`targetDuration`). Süre sesten otomatik hesaplanır;
hedefin ±%12 dışına çıkarsa render ve `check` uyarır. Ayrıntı: `docs/STIL.md` → "Hedef süreler".

Görseller ya da ses henüz yoksa da render alınır: yer tutucu görseller ve tahmini zamanlama kullanılır.
Canlı önizleme: `npm run studio`.

## Sahne türleri (`episode.json`)

| `type` | Ne yapar | Önemli alanlar |
|---|---|---|
| `image` | İllüstrasyon + kamera hareketi + altyazı | `image`, `video`, `motion` (`zoomIn`, `zoomOut`, `panLeft`, `panRight`, `panUp`, `panDown`, `push`, `shake`, `still`), `focus`, `tag`, `hud`, `transition` (`flash`, `whip`) |
| `title` | Büyük başlık kartı | `kicker`, `lines` (`*pembe*`), `image`, `duration` |
| `info` | Bej zeminli bilgi grafiği | `info.layout`: `unit`, `grid`, `stats`, `big`, `compare`, `list` |
| `bait` | "Yoruma tek kelime yaz" + değişen kelime | `words`, `image` |
| `end` | Kapanış kartı | `lines`, `body` (`**kalın**`), `cta` |

Ortak alanlar: `text` (anlatım; süreyi sesten alır), `duration` (metinsiz sahne süresi), `hold`, `captions`,
`sfx` (`[{ "name": "impact", "at": 0.2 }]`), `prompt` (görsel istemi).

HUD: bölümde `hud` tanımları (`money`, `percent`, `number`, `kg`); sahnelerde `"hud": {"anahtar": değer}`.
Değer değişince sayı sayar ve parlar.

Metin işaretleme: `*vurgu*` → pembe, `**kalın**` → kalın. Bilgi grafiği `grid` başlığında `{n}` sayaçtır.

## Klasörler

```
src/                 Remotion bileşenleri (sahneler, altyazı, HUD, zaman çizelgesi)
public/episodes/     Her bölüm: episode.json, img/, voice.mp3, timings.json
public/sfx, music/   Üretilmiş telifsiz efektler ve müzik
public/brand/        avatar.png (kapanış kartı)
scripts/             render.mjs, align.py, ep.py, make_audio.py
docs/                Stil rehberi, görsel stil istemi, bölüm şablonu
```
