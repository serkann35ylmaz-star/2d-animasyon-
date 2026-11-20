import type {Episode, Scene, SfxCue, Timings, WordTiming} from '../types';
import {pauseAfter, syllables, tokenize} from './text';

export interface BuiltScene {
  index: number;
  scene: Scene;
  from: number; // kare
  durationInFrames: number;
  /** Seslendirme dosyasından bu sahnede çalınacak aralık (sn) */
  audio: {start: number; end: number} | null;
  /** Sahne başına göre kelime zamanları (sn) */
  words: WordTiming[];
  hud: Record<string, number | string> | null;
  prevHud: Record<string, number | string> | null;
  sfx: SfxCue[];
}

export interface Timeline {
  fps: number;
  durationInFrames: number;
  scenes: BuiltScene[];
  estimated: boolean; // gerçek ses yerine tahmini zamanlama kullanıldı mı
  warnings: string[];
}

const LEAD = 0.08; // ilk kelimeden önce bırakılan pay
const TAIL = 0.14; // son kelimeden sonra bırakılan pay
const DEFAULT_HOLD = 0.12;

/** Ses yokken: hece sayısına göre tahmini kelime zamanları üretir */
export const estimateTimings = (episode: Episode): Timings => {
  const sps = episode.syllablesPerSecond ?? 6.2;
  const words: WordTiming[] = [];
  let t = 0.1;
  for (const scene of episode.scenes) {
    if (!scene.text) continue;
    for (const w of tokenize(scene.text)) {
      const d = Math.max(0.16, syllables(w) / sps);
      words.push({w, s: t, e: t + d});
      t += d + pauseAfter(w);
    }
    t += 0.15;
  }
  return {words};
};

// Efekt seviyeleri düşük tutulur: anlatım sessiz (~-25 LUFS) olduğu için master +10 dB yükseltir;
// yüksek efekt vuruşları sınırlayıcıda cızırtı yapıyordu (5. bölüm).
const defaultSfx = (scene: Scene, hudChanged: boolean, tagChanged: boolean): SfxCue[] => {
  const out: SfxCue[] = [];
  switch (scene.type) {
    case 'title':
      out.push({name: 'impact', at: 0, volume: 0.45}, {name: 'whoosh', at: 0, volume: 0.5});
      break;
    case 'info':
      out.push({name: 'whoosh', at: 0, volume: 0.3});
      if (scene.info.layout === 'grid') out.push({name: 'cash', at: 0.25, volume: 0.3});
      if (scene.info.layout === 'grid' && scene.info.result) out.push({name: 'impact', at: -1, volume: 0.35});
      break;
    case 'bait':
      out.push({name: 'pop', at: 0.25, volume: 0.35});
      break;
    case 'end':
      out.push({name: 'whoosh', at: 0, volume: 0.3}, {name: 'ding', at: 0.5, volume: 0.35});
      break;
    case 'image':
      if (scene.transition === 'flash') out.push({name: 'impact', at: 0, volume: 0.3});
      if (scene.transition === 'whip') out.push({name: 'whoosh', at: 0, volume: 0.35});
      // 'riser' (yükselen vızz sesi) kullanılmaz — kullanıcı isteği
      break;
  }
  if (hudChanged) out.push({name: 'tick', at: 0.08, volume: 0.35});
  if (tagChanged) out.push({name: 'pop', at: 0.05, volume: 0.3});
  return out;
};

const capKey = (w: string): string =>
  w.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr').replace(/[^0-9a-zçğıöşüâîû]/g, '');

/** Altyazı kelimesi i -> seslendirme kelime aralığı [j0, j1] (LCS çapaları + aradaki boşlukların paylaştırılması) */
export const mapCaption = (cap: string[], spoken: string[]): Array<[number, number]> => {
  const m = cap.length;
  const n = spoken.length;
  if (n === 0) return cap.map(() => [0, 0]);
  const a = cap.map(capKey);
  const b = spoken.map(capKey);
  // LCS tablosu
  const L: number[][] = Array.from({length: m + 1}, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs: Array<[number, number]> = [];
  for (let i = 0, j = 0; i < m && j < n; ) {
    if (a[i] && a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  const out: Array<[number, number]> = new Array(m);
  const bounds: Array<[number, number]> = [[-1, -1], ...pairs, [m, n]];
  for (let k = 0; k < bounds.length - 1; k++) {
    const [ci, sj] = bounds[k];
    const [ci2, sj2] = bounds[k + 1];
    if (ci >= 0 && ci < m) out[ci] = [sj, sj];
    const cn = ci2 - ci - 1; // aradaki altyazı kelimeleri
    const sn = sj2 - sj - 1; // aradaki sesli kelimeler
    for (let q = 0; q < cn; q++) {
      if (sn <= 0) {
        const at = Math.min(n - 1, Math.max(0, sj));
        out[ci + 1 + q] = [at, at];
      } else {
        const j0 = sj + 1 + Math.floor((q * sn) / cn);
        const j1 = Math.max(j0, sj + Math.ceil(((q + 1) * sn) / cn));
        out[ci + 1 + q] = [Math.min(n - 1, j0), Math.min(n - 1, j1)];
      }
    }
  }
  return out;
};

export const buildTimeline = (episode: Episode, timings: Timings | null): Timeline => {
  const fps = episode.fps ?? 30;
  const warnings: string[] = [];
  const estimated = !timings || timings.words.length === 0;
  const tw = estimated ? estimateTimings(episode).words : timings!.words;

  let cursor = 0; // timings içinde sıradaki kelime
  let frame = 0;
  let hud: Record<string, number | string> | null = null;
  let lastTag: string | undefined;
  let lastAudioEnd = 0;
  const scenes: BuiltScene[] = [];

  episode.scenes.forEach((scene, index) => {
    let audio: BuiltScene['audio'] = null;
    let words: WordTiming[] = [];
    let seconds = scene.duration ?? 2;

    if (scene.text) {
      const tokens = tokenize(scene.text);
      const slice = tw.slice(cursor, cursor + tokens.length);
      if (slice.length < tokens.length) {
        warnings.push(`Sahne ${index + 1}: zamanlamada yeterli kelime yok (${slice.length}/${tokens.length}).`);
      }
      cursor += tokens.length;
      if (slice.length > 0) {
        const next = tw[cursor];
        const start = Math.max(lastAudioEnd, slice[0].s - LEAD);
        let end = slice[slice.length - 1].e + TAIL;
        if (next) end = Math.min(end, Math.max(slice[slice.length - 1].e, next.s - 0.03));
        lastAudioEnd = end;
        audio = {start, end};
        // Ekranda görünen kelime = senaryodaki yazım (noktalama dahil)
        if (scene.caption) {
          // Altyazı metni (rakamlı) seslendirmeden farklı kelime sayısında olabilir ("2009" = "iki bin dokuz").
          // Aynı kelimeler çapa olarak eşlenir; aradaki rakamlar yalnızca kendi boşluğundaki sesli kelimeleri kapsar
          // (eski orantılı eşleme sahne boyunca kaymaya yol açıyordu).
          const cap = tokenize(scene.caption);
          const map = mapCaption(cap, tokens.slice(0, slice.length));
          words = cap.map((t, i) => {
            const [j0, j1] = map[i];
            return {w: t, s: slice[j0].s - start, e: slice[j1].e - start};
          });
        } else {
          words = slice.map((w, i) => ({w: tokens[i] ?? w.w, s: w.s - start, e: w.e - start}));
        }
        const spoken = end - start + (scene.hold ?? DEFAULT_HOLD);
        seconds = Math.max(spoken, scene.duration ?? 0);
      }
    }

    const prevHud = hud;
    let hudChanged = false;
    if (scene.hud) {
      hudChanged = !!prevHud && Object.entries(scene.hud).some(([k, v]) => prevHud[k] !== v);
      hud = {...(hud ?? {}), ...scene.hud};
    }
    const tagChanged = !!scene.tag && scene.tag !== lastTag;
    lastTag = scene.tag ?? lastTag;

    const durationInFrames = Math.max(1, Math.round(seconds * fps));
    const auto = episode.autoSfx === false ? [] : defaultSfx(scene, hudChanged, tagChanged);
    const sfx = [...auto, ...(scene.sfx ?? [])].map((c) => ({
      ...c,
      // negatif "at": sahne sonundan geriye
      at: (c.at ?? 0) < 0 ? Math.max(0, seconds * 0.55) : c.at ?? 0,
    }));

    scenes.push({index, scene, from: frame, durationInFrames, audio, words, hud, prevHud, sfx});
    frame += durationInFrames;
  });

  if (!estimated && cursor < tw.length) {
    warnings.push(`Zamanlamada kullanılmayan ${tw.length - cursor} kelime var — senaryo ile ses uyuşmuyor olabilir.`);
  }

  const total = frame / fps;
  const target = episode.targetDuration;
  if (target && Math.abs(total - target) > target * 0.12) {
    warnings.push(
      `Süre ${total.toFixed(1)} sn, hedef ${target} sn. ${total > target ? 'Metni kısalt ya da sahne çıkar.' : 'Metni uzat ya da sahne ekle.'}`,
    );
  }

  return {fps, durationInFrames: Math.max(1, frame), scenes, estimated, warnings};
};
