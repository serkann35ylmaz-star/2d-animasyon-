// Bölüm (episode) dosyasının şeması: public/episodes/<slug>/episode.json

export type ValueFormat = 'money' | 'tl' | 'usd' | 'percent' | 'number' | 'kg' | 'sn' | 'raw';

export type Motion =
  | 'zoomIn'
  | 'zoomOut'
  | 'panLeft'
  | 'panRight'
  | 'panUp'
  | 'panDown'
  | 'push' // hızlı içeri itme (gerilim)
  | 'shake' // hafif kamera titremesi
  | 'still'
  | 'none'; // hiç kırpma yok — kenarlarında yazı/tabela olan görseller için

export type SfxName =
  | 'whoosh'
  | 'impact'
  | 'pop'
  | 'tick'
  | 'riser'
  | 'cash'
  | 'glitch'
  | 'ding';

export interface SfxCue {
  name: SfxName | string; // string: public/sfx/<ad>.wav
  at?: number; // sahne başından saniye (varsayılan 0)
  volume?: number;
}

export interface HudItemDef {
  key: string;
  label: string; // ör. "NAKİT"
  format: ValueFormat;
  accent?: boolean; // pembe renkli değer
}

interface SceneBase {
  id?: string;
  /** Anlatıcının bu sahnede söyleyeceği metin. Seslendirme bu metinlerin birleşimidir. */
  text?: string;
  /** Metin yoksa sahne süresi (sn). Metin varsa en az bu kadar sürer. */
  duration?: number;
  /** Konuşma bittikten sonra sahnede kalma süresi (sn) */
  hold?: number;
  /** Altyazı gösterilsin mi (image sahnelerinde varsayılan: evet) */
  captions?: boolean;
  /** Üst bilgi çubuğu (HUD) değerleri — önceki sahneden devralınır ve birleştirilir */
  hud?: Record<string, number>;
  /** HUD bu sahnede görünsün mü */
  showHud?: boolean;
  /** Sol üstte pembe etiket, ör. "PROBLEM 1" */
  tag?: string;
  sfx?: SfxCue[];
  /** Sahne girişi: kesme (varsayılan), flaş, ya da hızlı kaydırma */
  transition?: 'cut' | 'flash' | 'whip';
  /** Renk paleti: neon, sabah, nostalji, gerilim, soguk, gunbatimi, tehlike, gunduz, kahve */
  palette?: string;
  /** Seslendirme tonu: calm, dramatic, whisper, excited, tense, sad, question */
  tone?: string;
  /** Görsel üretimi için istem (render'da kullanılmaz, scripts/prompts ile dışa aktarılır) */
  prompt?: string;
  /** Küçük üst şerit: bölüm adı + kazanan yorum (ör. 3. saniyeden sonra belirir) */
  note?: {kicker?: string; user?: string; text?: string; likes?: number; from?: number; avatar?: string};
  /** Kalıcı KASA şeridi (her bölüm sonunda aynı yerde): "💰 KASA: X $ → HEDEF: 1 MİLYAR $" */
  kadro?: {filled: number; total?: number; top?: number};
  kasa?: {value: number; from?: number; target?: string; mystery?: boolean; top?: number};
}

export interface ImageScene extends SceneBase {
  type: 'image';
  image?: string; // bölüm klasörüne göre yol, ör. "img/s01.png"
  video?: string; // isteğe bağlı: AI ile hareketlendirilmiş klip
  motion?: Motion;
  /** Yakınlaşma odağı (0-1), ör. [0.5, 0.35] = yüz */
  focus?: [number, number];
  /** Hareket şiddeti çarpanı (varsayılan 1) */
  intensity?: number;
}

export interface TitleScene extends SceneBase {
  type: 'title';
  image?: string;
  kicker?: string; // "BÖLÜM 1 · YARIM TON"
  lines: string[]; // "*İZ*" -> pembe
  footer?: string;
}

export interface InfoUnit {
  layout: 'unit';
  kicker?: string;
  unitLabel: string; // banknotun üstündeki yazı: "200"
  unitShape?: 'banknote' | 'coin' | 'box' | 'bar';
  caption: string; // "1 banknot ≈ *1 gram*"
}
export interface InfoGrid {
  layout: 'grid';
  kicker?: string;
  heading?: string;
  cols?: number;
  rows?: number;
  unitShape?: 'banknote' | 'coin' | 'box' | 'bar';
  /** "{n}" sayaçla değişir */
  caption?: string;
  count?: {from?: number; to: number; format?: ValueFormat};
  result?: string; // "250 kg"
}
export interface InfoStats {
  layout: 'stats';
  kicker?: string;
  rows: {label: string; value: number; format: ValueFormat; accent?: boolean; bar?: boolean; max?: number}[];
  footer?: string;
}
export interface InfoBig {
  layout: 'big';
  kicker?: string;
  heading?: string;
  value: number;
  /** sayaç bu değerden başlar (varsayılan 0), ör. yıl için 1999 */
  from?: number;
  format?: ValueFormat;
  prefix?: string;
  suffix?: string;
  caption?: string;
}
export interface InfoCompare {
  layout: 'compare';
  kicker?: string;
  heading?: string;
  items: {label: string; value: number; format?: ValueFormat; accent?: boolean}[];
  caption?: string;
}
export interface InfoList {
  layout: 'list';
  kicker?: string;
  heading?: string;
  items: {text: string; state?: 'ok' | 'bad' | 'neutral'}[];
}

/** Bölüm başında gösterilen kazanan (sabitlenen) izleyici yorumu */
export interface InfoComment {
  layout: 'comment';
  kicker?: string;
  user: string; // kullanıcı adı (@ olmadan)
  text: string; // yorum metni (küfür/hakaret içermemeli)
  likes?: number;
  badge?: string; // ör. "KAZANAN YORUM"
  caption?: string; // kartın altındaki satır, *vurgu* destekli
}

export type InfoBody = InfoUnit | InfoGrid | InfoStats | InfoBig | InfoCompare | InfoList | InfoComment;

export interface InfoScene extends SceneBase {
  type: 'info';
  info: InfoBody;
}

export interface BaitScene extends SceneBase {
  type: 'bait';
  image?: string;
  prompt_label?: string; // "YORUMA TEK KELİME YAZ"
  words: string[]; // ["SAKLA", "HARCA"]
  motion?: Motion;
  focus?: [number, number];
}

export interface EndScene extends SceneBase {
  type: 'end';
  kicker?: string;
  lines: string[]; // ["2. BÖLÜM", "*YARIN*"]
  body?: string; // "Yorumlara **SAKLA** ya da **HARCA** yaz."
  cta?: string; // "TAKİP ET · KAÇIRMA"
}

export type Scene = ImageScene | TitleScene | InfoScene | BaitScene | EndScene;

export interface Series {
  name: string; // "Peki Sonra?"
  handle: string; // "@pekisonra"
  avatar?: string; // public/ kökünden yol, ör. "brand/avatar.png"
}

export interface Episode {
  title: string;
  /** Bölümün varsayılan renk paleti */
  palette?: string;
  /** Arayüz vurgu rengi (#RRGGBB) — varsayılan referanstaki pembe */
  accent?: string;
  /** Ücretsiz seslendirme ayarları (scripts/tts.py) */
  tts?: {engine?: string; voice?: string; rate?: string; pitch?: string};
  /** Bu hikâyedeki kıyafet (İngilizce, görsel istemleri için). Karakterin kafası/yüzü/elleri sabittir. */
  outfit?: string;
  /** Hedef video süresi (sn): 30, 45 ya da 60. Gerçek süre ±%12 dışına çıkarsa uyarı verilir. */
  targetDuration?: number;
  series: Series;
  fps?: number;
  /** Seslendirme dosyası (bölüm klasörüne göre). Yoksa sessiz önizleme yapılır. */
  voice?: string;
  /** Kelime zamanlamaları (scripts/align.py üretir) */
  timings?: string;
  /** Müzik dosyası; "music/..." ile başlarsa public/ kökünden okunur */
  music?: string;
  musicVolume?: number;
  /** Seslendirme hızı tahmini (hece/sn) — ses yokken önizleme süreleri için */
  syllablesPerSecond?: number;
  hud?: HudItemDef[];
  /** SFX'leri sahne türüne göre otomatik ekle (varsayılan: evet) */
  autoSfx?: boolean;
  scenes: Scene[];
}

export interface WordTiming {
  w: string;
  s: number; // saniye
  e: number;
}

export interface Timings {
  words: WordTiming[];
}
