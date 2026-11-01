// Bölüm (episode) dosyasının şeması: public/episodes/<slug>/episode.json

export type ValueFormat = 'money' | 'percent' | 'number' | 'kg' | 'raw';

export type Motion =
  | 'zoomIn'
  | 'zoomOut'
  | 'panLeft'
  | 'panRight'
  | 'panUp'
  | 'panDown'
  | 'push' // hızlı içeri itme (gerilim)
  | 'shake' // hafif kamera titremesi
  | 'still';

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
  /** Görsel üretimi için istem (render'da kullanılmaz, scripts/prompts ile dışa aktarılır) */
  prompt?: string;
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

export type InfoBody = InfoUnit | InfoGrid | InfoStats | InfoBig | InfoCompare | InfoList;

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
