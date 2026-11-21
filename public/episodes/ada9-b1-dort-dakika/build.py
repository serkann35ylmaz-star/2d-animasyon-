# episode.json üretici — "Sabit iskelet" (8 parça) + sık kesme ritmi.
# Her cümle ayrı plan; aynı görsel farklı kadrajla (focus/motion) tekrar kullanılır.
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- Görseller (img/<ad>.png) ve istemleri ----
K = ("the main character from the first reference image: fit muscular ex special forces soldier, flat matte white round head "
     "(no gloss, no shine), simple black oval eyes, small black eyebrows, short dark buzz cut drawn with ink strokes, "
     "stitched scar over his left eye and cheek, right arm fully covered with a black tattoo sleeve, olive green t-shirt")
STYLE = ("Copy exactly the art style of the reference images: crisp hand-inked comic book illustration, bold clean black ink outlines "
         "around every shape, fine ink hatching texture, cel shading, matte flat white heads, sharp high-definition line art. "
         "Natural muted colors: deep teal-green sea drawn with ink lines (not neon, not oversaturated, not photographic), "
         "warm orange accents. No soft painterly blur, no glow, no 3D render. Vertical 9:16, no text, no letters, no logos.")
IMG = {
  "kanca":   "Over-the-shoulder view from a rocky island shore: 40 meters out a sharp black rock in the sea with an olive military backpack caught on it by its strap, a great white shark dorsal fin circling the rock. Early morning light. Main character seen from behind, no backpack on him. " + K,
  "gemi":    "Main character on the deck of a cargo ship at dusk, olive military backpack on his back, looking down at a small photo of his smiling little daughter in his hand, shipping containers behind. " + K,
  "firtina": "Night storm at sea, a cargo ship tilting and sinking into big waves, a lightning bolt, the main character in the water in the foreground holding a broken wooden plank. Dark but readable. " + K,
  "harita":  "Close-up of an old paper sea chart on a wooden table, many tiny islands, one tiny unnamed island circled with a red marker, a brass compass and a pencil. Warm lamp light.",
  "dalga":   "A white foaming wave crashing over the main character waist-deep near a rocky shore, the strap of the olive backpack on his back snapping, the backpack flying away toward a sharp black rock, shocked face, one hand reaching out. " + K,
  "canta":   "Top-down flat lay on wet sand: contents of an olive military backpack: a black handheld radio, water purification tablets, a red signal flare, a folding knife, a water bottle, and a small photo of a smiling little girl with a matte white round head.",
  "balina":  "Wide sea view at golden hour: far on the horizon a huge dead whale carcass floating with seagulls above it, ONE great white shark fin swimming away toward it. In the foreground the main character crouching on dark rocks, watching, no backpack. Only one shark. " + K,
  "saat":    "Close-up: the main character crouching behind a wet rock, pressing the button of a black military wristwatch on his tattooed arm, eyes narrowed, looking at the sea. " + K,
  "giris":   "The main character silently sliding chest-deep into calm sea from flat rocks, no splash, smooth ripples, determined face; far away the black rock with the backpack. " + K,
  "kramp":   "Split view half above and half below the water line: the main character swimming, face grimacing in pain, underwater his leg bent and cramping with small pain marks. " + K,
  "hiz":     "Low angle at water level: a huge great white shark dorsal fin cutting fast through the sea straight toward the viewer, its long body visible under the surface, spray behind the fin. Tense.",
  "aski":    "The main character at the black rock in the sea pulling hard at the olive backpack whose strap is stuck in a crack of the rock, the backpack fabric tearing open, gritted teeth. " + K,
  "foto":    "Underwater, light rays from the surface: a small rectangular paper polaroid photograph (a flat paper object, NOT a person) slowly sinking, the photo shows a smiling little girl with a matte white round head; above it a white cartoon hand on a black-tattooed arm reaching down.",
  "donus":   "Wide sea view: far away near the floating whale carcass the single great white shark fin turns around and heads back fast toward the viewer, leaving a long wake, seagulls scattering. Ominous.",
  "karar":   "The main character holding onto the black rock in the sea, the torn backpack in his other hand, looking down into the water where a small photo glints three meters below, torn worried expression, sweat drops. " + K,
  "golge":   "Underwater looking down into the deep: the small sinking polaroid photo in the foreground, and rising from the dark blue depth below a gigantic shark silhouette, far bigger than a normal great white. Terrifying scale.",
}

sc = []
def shot(img, text, caption=None, **kw):
    d = {"type": "image", "id": f"p{len(sc)+1:02d}", "image": f"img/{img}.png", "text": text}
    if caption: d["caption"] = caption
    d.update(kw); sc.append(d)

TIN = [{"name": "tin", "volume": 0.6}]

# 1) KANCA — saat + kural
shot("kanca", "Saat altı on iki.", "Saat 06:12.", headline="TEK KURAL:\n*SUYU SIÇRATMA.*", loc="06:12 · AÇIK OKYANUS",
     hud={"mesafe": "40 m", "nabiz": 96, "canta": "KAYADA"}, motion="push", focus=[0.62, 0.42], sfx=TIN, tone="tense")
shot("kanca", "Çantan okyanusun ortasında bir kayaya takıldı. Kırk metre açıkta.", "Çantan okyanusun ortasında bir kayaya takıldı. 40 metre açıkta.",
     motion="zoomIn", focus=[0.7, 0.4], tone="tense")
shot("kanca", "Etrafında altı metrelik bir büyük beyaz dönüyor.", "Etrafında 6 metrelik bir büyük beyaz dönüyor.", motion="panRight", focus=[0.85, 0.45], tone="tense")
shot("kanca", "Tek bir kural var. Suyu sıçratmayacaksın.", motion="zoomOut", focus=[0.5, 0.5], tone="tense")

# 2) ÖZET — kim, neden burada
shot("gemi", "On iki yıl özel kuvvetlerdeydin.", "12 yıl özel kuvvetlerdeydin.", loc="EMEKLİ ÖZEL KUVVETLER · 12 YIL", motion="zoomIn", focus=[0.5, 0.3], tone="calm")
shot("gemi", "Kızının tedavi parası için bir yük gemisinde güvenlikçi oldun.", motion="push", focus=[0.55, 0.55], tone="calm")
shot("firtina", "Üç gece önce gemi fırtınada battı.", "3 gece önce gemi fırtınada battı.", loc="3 GECE ÖNCE · FIRTINA",
     fx=[{"type": "lightning", "every": 1.4}], motion="shake", tone="dramatic")
shot("harita", "Bir enkaza tutunup, haritada adı bile olmayan bir adaya çıktın.", motion="zoomIn", focus=[0.5, 0.55], tone="calm")
shot("harita", "Haritada sadece bir numara var. Dokuz.", "Haritada sadece bir numara var. 9.", loc="ADA 9 · HARİTADA ADI YOK", motion="push", focus=[0.5, 0.56], intensity=1.6, sfx=TIN, tone="dramatic")

# 3) EYLEM — çanta neden hayati, süreyi ölçmek
shot("dalga", "Kıyıya çıkarken bir dalga çantanı sırtından kopardı.", hud={"canta": "KAYIP"}, status={"label": "ÇANTA", "value": "KAYIP"},
     fx=[{"type": "flash"}], motion="shake", transition="whip", tone="tense")
shot("canta", "İçinde telsiz, su arıtma tableti, işaret fişeği ve kızının fotoğrafı var.", motion="panDown", tone="calm")
shot("canta", "Adada tatlı su yok. Telsiz olmadan seni kimse bulamaz.", status={"label": "TATLI SU", "value": "YOK"}, motion="zoomIn", focus=[0.3, 0.6], tone="calm")
shot("balina", "Sonra ufukta ölmüş dev bir balina beliriyor.", motion="zoomIn", focus=[0.55, 0.2], tone="calm")
shot("balina", "Yüzgeç ona yöneliyor.", motion="push", focus=[0.75, 0.35], tone="calm")
shot("saat", "Suya girmiyorsun. Saatine basıyorsun.", loc="ÖLÇÜYOR", motion="push", focus=[0.6, 0.6], sfx=[{"name": "tick", "volume": 0.5}], tone="tense")
shot("balina", "Dört dakika sonra geri dönüyor, bir tur atıyor, yine gidiyor.", "4 dakika sonra geri dönüyor, bir tur atıyor, yine gidiyor.", motion="panLeft", focus=[0.6, 0.3], tone="tense")
shot("saat", "Artık biliyorsun. Dört dakikan var.", "Artık biliyorsun. 4 dakikan var.", motion="zoomIn", focus=[0.5, 0.35], tone="dramatic")
shot("giris", "Kronometreye basıp sessizce suya giriyorsun.", timer=240, loc="06:20 · SUYA GİRİŞ", motion="push", sfx=[{"name": "tick", "volume": 0.5}], tone="whisper")

# 4) BİRİNCİ SORUN — gerçek bir kuraldan doğar
shot("kramp", "Birinci sorun.", timer=150, sfx=TIN, hud={"mesafe": "25 m", "nabiz": 168}, motion="zoomIn", focus=[0.5, 0.25], tone="dramatic")
shot("kramp", "Bacağına kramp giriyor.", fx=[{"type": "flash"}], motion="shake", focus=[0.5, 0.35], tone="tense")
shot("hiz", "Ve büyük beyaz, kısa bir atakta saatte otuz beş kilometreyi geçer.", "Ve büyük beyaz, kısa bir atakta saatte 35 kilometreyi geçer.", timer=135,
     card={"type": "fact", "title": "GERÇEK KURAL", "text": "Büyük beyaz köpekbalığı kısa ataklarda saatte 35 km'yi aşan hızlara çıkabilir.", "from": 0.3},
     motion="push", focus=[0.5, 0.45], tone="dramatic")
shot("hiz", "Kırk metre, onun için dört saniye. Çırpınırsan duyar.", "40 metre, onun için 4 saniye. Çırpınırsan duyar.", motion="zoomIn", focus=[0.5, 0.35], tone="whisper")

# 5) İKİNCİ SORUN — daha yakın, daha kişisel
shot("aski", "İkinci sorun.", timer=90, sfx=TIN, hud={"mesafe": "0 m"}, motion="zoomIn", focus=[0.5, 0.35], tone="dramatic")
shot("aski", "Kayaya ulaşıyorsun ama askı sıkışmış.", motion="push", focus=[0.6, 0.55], tone="tense")
shot("aski", "Çekiyorsun. Çanta yırtılıyor.", hud={"canta": "YIRTIK"}, fx=[{"type": "flash"}], motion="shake", focus=[0.6, 0.6], tone="tense")
shot("foto", "İçinden kızının fotoğrafı düşüp batıyor.", status={"label": "FOTOĞRAF", "value": "BATIYOR"},
     fx=[{"type": "underwater", "strength": 0.6}], motion="panDown", tone="sad")

# 6) ÜÇÜNCÜ SORUN — en büyüğü, geri dönüşü yok
shot("donus", "Üçüncü sorun.", timer=30, sfx=TIN, motion="zoomIn", focus=[0.5, 0.35], tone="dramatic")
shot("donus", "Kronometre otuz saniye. Yüzgeç balinadan ayrılıyor. Geri dönüyor.", "Kronometre 30 saniye. Yüzgeç balinadan ayrılıyor. Geri dönüyor.",
     hud={"nabiz": 184}, motion="push", focus=[0.5, 0.5], intensity=1.4, tone="tense")

# 7) "NEDEN OLMASIN?" — kahraman karanlık seçeneğe göz kırpar
shot("karar", "Fotoğraf hâlâ görünüyor. Üç metre aşağıda.", "Fotoğraf hâlâ görünüyor. 3 metre aşağıda.", timer=22, motion="zoomIn", focus=[0.5, 0.7], tone="whisper")
shot("karar", "Dalmak beş saniye. Neden olmasın?", "Dalmak 5 saniye. Neden olmasın?", motion="push", focus=[0.5, 0.35], tone="whisper")

# 8) GÖREMEDİĞİN ŞEY + OYLAMA
shot("golge", "Göremediğin şey, dipte yükselen gölge.", timer=15, status={"label": "DİPTE", "value": "GÖLGE"},
     fx=[{"type": "underwater", "strength": 0.8}, {"type": "pulse", "bpm": 96}], motion="push", focus=[0.5, 0.7], tone="whisper")
shot("golge", "Bu o değil. Bu, ondan daha büyük.", hud={"nabiz": 196}, fx=[{"type": "underwater", "strength": 0.8}, {"type": "pulse", "bpm": 110}, {"type": "flash"}],
     motion="zoomIn", focus=[0.5, 0.75], intensity=1.5, tone="dramatic")
shot("karar", "Yorumlara tek kelime yaz. Dal ya da dön. Çoğunluk hangisini yazarsa, hikâye oradan devam eder.",
     choices=["DAL", "DÖN"], choiceTag="ADA 9 · 1. BÖLÜM", hold=1.5, motion="zoomOut", focus=[0.5, 0.45], tone="question")

ep = {
  "title": "ADA 9 — Bölüm 1: Dört Dakika",
  "series": {"name": "Hikâye Yorumda", "handle": "@hikayeyorumda", "avatar": "brand/profil.png"},
  "style": "dosya", "fps": 30, "tightSilence": True, "accent": "#F39A1E",
  "music": "music/dark-pulse.wav", "musicVolume": 0.16,
  "palette": "gerilim", "targetDuration": 100,
  "progress": {"labels": ["1", "2", "3", "4", "5", "6", "Ç"], "current": 0},
  "timerLabel": "KÖPEKBALIĞI DÖNÜŞÜNE",
  "hud": [{"key": "mesafe", "label": "MESAFE", "format": "raw"},
          {"key": "nabiz", "label": "NABIZ", "format": "raw", "accent": True},
          {"key": "canta", "label": "ÇANTA", "format": "raw"}],
  "references": {"kemal": "MAHbg3gfdCA", "stil": ["MAHbfB2pquw", "MAHbfLVjsik"]},
  "images": {k: f"{v} {STYLE}" for k, v in IMG.items()},
  "scenes": sc,
}
json.dump(ep, open(os.path.join(HERE, "episode.json"), "w"), ensure_ascii=False, indent=1)
txt = "\n".join(s["text"] for s in sc)
open(os.path.join(HERE, "voice-script.txt"), "w").write(txt + "\n")
print(len(txt), "karakter,", len(txt.split()), "kelime,", len(sc), "plan,", len(IMG), "görsel")
