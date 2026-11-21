# episode.json üretici (elle düzenlemek yerine buradan)
import json
K = ("Kemal: the same character as the reference image — fit muscular ex special forces soldier, glossy white round ball head, "
     "short dark buzz cut, stitched war scar over his left eye and cheek, right arm fully covered with a black tattoo sleeve, "
     "wet olive green t-shirt, NOT wearing a backpack")
S = ("Same art style as the reference images: bright clean comic illustration, glossy white round ball heads with simple black eyes, "
     "thick black ink outlines, white cartoon hands, detailed hand-drawn background, warm orange and teal cinematic light, not too dark. "
     "Vertical 9:16, no text, no letters, no logos.")
sc = []
def a(id, text, prompt, **kw):
    d = {"type": "image", "id": id, "image": f"img/{id}.png", "text": text, "prompt": f"{prompt} {S}"}
    d.update(kw); sc.append(d)

a("s01", "Bu çantayı alamazsa adada ölecek. Aradaki tek engel, altı metrelik bir büyük beyaz.",
  "A sharp black rock sticking out of turquoise ocean water 40 meters from a tropical island shore, an olive military backpack hanging caught by its strap on the rock, a huge great white shark dorsal fin circling around the rock. Seen from the shore over Kemal's shoulder. " + K,
  headline="TEK KURAL:\n*SUYU SIÇRATMA.*", loc="06:12 · AÇIK OKYANUS", hud={"mesafe": "40 m", "nabiz": 96, "canta": "KAYADA"},
  motion="push", focus=[0.5, 0.45], tone="tense")
a("s02", "Adı Kemal. On iki yıl özel kuvvetlerde görev yaptı. Emekli olunca, kızının tedavi parası için bir yük gemisinde güvenlikçi oldu.",
  "Kemal standing on the deck of a big cargo ship at sea in the evening, looking down at a small photo of his little daughter in his hand, containers behind him, an olive military backpack on his back. " + K,
  loc="KEMAL · 41 · EMEKLİ ÖZEL KUVVETLER", motion="zoomIn", focus=[0.5, 0.4], tone="calm")
a("s03", "Üç gece önce, gemi fırtınada battı.",
  "Night storm at sea, a huge cargo ship tilted and sinking into giant black waves, lightning in the sky, tiny figure of Kemal in the water holding a broken wooden plank. Wide dramatic shot. Darker storm scene but characters still readable.",
  loc="3 GECE ÖNCE · FIRTINA", fx=[{"type": "lightning", "every": 1.6}], motion="shake", tone="dramatic")
a("s04", "Kemal bir enkaza tutunup, haritada adı bile olmayan bir adaya ulaştı. Haritadaki adı sadece bir numara: dokuz.",
  "Close-up of an old paper nautical sea chart on a wooden table, blue ocean with many tiny islands, one tiny unnamed island circled in red marker. Comic illustration, warm light.",
  caption="Kemal bir enkaza tutunup, haritada adı bile olmayan bir adaya ulaştı. Haritadaki adı sadece bir numara: 9.",
  loc="ADA 9 · HARİTADA ADI YOK", motion="zoomIn", focus=[0.5, 0.5], tone="calm")
a("s05", "Ama kıyıya çıkarken bir dalga çantayı sırtından kopardı. Çanta, kırk metre açıktaki bir kayaya takıldı.",
  "A big wave crashing over Kemal near a rocky shore, the strap of the olive military backpack on his back snapping and the backpack flying away from his back into the sea toward a black rock. Dynamic action shot. " + K,
  caption="Ama kıyıya çıkarken bir dalga çantayı sırtından kopardı. Çanta, 40 metre açıktaki bir kayaya takıldı.",
  hud={"canta": "KAYIP"}, status={"label": "ÇANTA", "value": "KAYIP"}, motion="shake", transition="whip", tone="tense")
a("s06", "İçinde telsiz, su arıtma tableti, işaret fişeği ve kızının fotoğrafı var. Adada tatlı su yok. Telsiz olmadan onu kimse bulamaz.",
  "Top-down flat lay of the contents of an olive military backpack on wet sand: a handheld radio, water purification tablets, a red signal flare, a knife, and a small photo of a smiling little girl. Comic illustration, warm light.",
  status={"label": "TATLI SU", "value": "YOK"}, motion="panDown", tone="calm")
a("s07", "Ve kayanın etrafında bir yüzgeç dönüyor.",
  "Low angle at water level: a giant great white shark dorsal fin cutting through turquoise water toward the viewer, the rock with the hanging backpack behind it. Tense.",
  hud={"nabiz": 142}, motion="push", focus=[0.5, 0.55], tone="whisper")
a("s08", "Sonra ufukta, ölmüş dev bir balina beliriyor. Köpekbalığı ona gidiyor.",
  "Wide ocean view at golden hour: far on the horizon a huge dead whale carcass floating with seagulls above it, the great white shark fin swimming away toward it. Kemal crouched on the rocky shore watching in the foreground. " + K,
  motion="panRight", tone="calm")
a("s09", "Kemal suya girmiyor. Saatine basıyor. Köpekbalığı dört dakika sonra geri dönüyor, bir tur atıyor ve yeniden balinaya gidiyor. Artık biliyor: dört dakikası var.",
  "Close-up of Kemal crouching behind a rock, pressing the button of a black military wristwatch on his tattooed arm, eyes narrowed watching the sea. " + K,
  caption="Kemal suya girmiyor. Saatine basıyor. Köpekbalığı 4 dakika sonra geri dönüyor, bir tur atıyor ve yeniden balinaya gidiyor. Artık biliyor: 4 dakikası var.",
  loc="ÖLÇÜYOR · 03:58", motion="zoomIn", focus=[0.5, 0.45], tone="tense")
a("s10", "Kronometreye basıyor ve suya giriyor. Sıçratmadan.",
  "Kemal slowly and silently sliding into calm turquoise water from the rocks, no splash, determined face, backpack-less. " + K,
  timer=240, loc="06:20 · SUYA GİRİŞ", motion="push", sfx=[{"name": "tick", "volume": 0.5}], tone="whisper")
a("s11", "Kırk metre. Yirmi beş. Bacağına kramp giriyor. İki dakika kaldı.",
  "Kemal swimming in the ocean, face grimacing in pain, one leg cramping, the rock with the backpack still ahead of him. Split view slightly above and below the water line. " + K,
  caption="40 metre. 25. Bacağına kramp giriyor. 2 dakika kaldı.",
  timer=120, hud={"mesafe": "25 m", "nabiz": 168}, motion="shake", tone="tense")
a("s12", "Ama bir balina leşi tek bir köpekbalığını değil, hepsini çağırır.",
  "Far away on the horizon the dead whale carcass surrounded by dozens of shark fins in bloody water, seagulls circling. Ominous.",
  timer=95, card={"type": "fact", "title": "GERÇEK KURAL", "text": "Tek bir balina leşinin başında aynı anda 40'a yakın büyük beyaz köpekbalığı görüldü.", "from": 0.3},
  motion="zoomIn", tone="dramatic")
a("s13", "Kayaya ulaşıyor ama askı sıkışmış. Çekiyor, çanta yırtılıyor ve içinden bir şey düşüp batıyor: kızının fotoğrafı.",
  "Underwater view: a small photo of a smiling little girl slowly sinking down through turquoise water with light rays, above it Kemal's tattooed hand reaching down, the torn backpack on the rock at the surface. " + K,
  timer=60, hud={"mesafe": "0 m", "canta": "YIRTIK"}, status={"label": "FOTOĞRAF", "value": "BATIYOR"},
  fx=[{"type": "underwater", "strength": 0.7}], motion="panDown", tone="sad")
a("s14", "Otuz saniye kaldı. Dipte bir gölge yükseliyor. Bu o değil. Bu ondan daha büyük.",
  "Underwater view looking down into the deep: the tiny sinking photo in the foreground, and from the dark blue depths below a gigantic shark silhouette rising up, much bigger than a normal great white. Terrifying scale.",
  caption="30 saniye kaldı. Dipte bir gölge yükseliyor. Bu o değil. Bu ondan daha büyük.",
  timer=30, hud={"nabiz": 190}, status={"label": "DİPTE", "value": "GÖLGE"},
  fx=[{"type": "underwater", "strength": 0.8}, {"type": "pulse", "bpm": 96}], motion="push", focus=[0.5, 0.65], tone="whisper")
a("s15", "Fotoğraf için dalsın mı, yoksa çantayla dönsün mü? Yorumlara tek kelime yaz: dal ya da dön.",
  "Kemal holding onto the black rock in the sea with the torn backpack, looking down into the dark water, then back toward the island. Decision moment. " + K,
  choices=["DAL", "DÖN"], choiceTag="ADA 9 · 1. BÖLÜM", hold=1.5, motion="zoomIn", focus=[0.5, 0.45], tone="question")

ep = {
  "title": "ADA 9 — Bölüm 1: Dört Dakika",
  "series": {"name": "Hikâye Yorumda", "handle": "@hikayeyorumda", "avatar": "brand/profil.png"},
  "style": "dosya", "fps": 30, "accent": "#F39A1E",
  "music": "music/dark-pulse.wav", "musicVolume": 0.18,
  "palette": "gerilim", "targetDuration": 95,
  "tts": {"engine": "elevenlabs", "model": "eleven_v4", "voice_id": "mCTNxePO8hqCg6KFnASN", "voice_name": "Onur AGCNL"},
  "progress": {"labels": ["1", "2", "3", "4", "5", "6", "Ç"], "current": 0},
  "timerLabel": "KÖPEKBALIĞI DÖNÜŞÜNE",
  "hud": [{"key": "mesafe", "label": "MESAFE", "format": "raw"},
          {"key": "nabiz", "label": "NABIZ", "format": "raw", "accent": True},
          {"key": "canta", "label": "ÇANTA", "format": "raw"}],
  "references": {"kemal": "MAHbfFvokfA", "stil": "MAHbfLVjsik"},
  "scenes": sc,
}
json.dump(ep, open(__file__.replace("build.py", "episode.json"), "w"), ensure_ascii=False, indent=1)
txt = "\n\n".join(s["text"] for s in sc)
open(__file__.replace("build.py", "voice-script.txt"), "w").write(txt + "\n")
print(len(txt), "karakter")
