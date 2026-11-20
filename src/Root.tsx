import React from 'react';
import {CalculateMetadataFunction, Composition, staticFile} from 'remotion';
import {Episode, EpisodeProps} from './Episode';
import {buildTimeline} from './lib/timeline';
import type {Episode as EpisodeT, Timings} from './types';
import {H, W} from './theme';

const exists = async (path: string): Promise<boolean> => {
  try {
    const r = await fetch(staticFile(path), {method: 'HEAD'});
    return r.ok;
  } catch {
    return false;
  }
};

/** Yol önce bölüm klasöründe, sonra public/ kökünde aranır */
const resolveAsset = async (slug: string, p: string): Promise<string | null> => {
  for (const c of [`episodes/${slug}/${p}`, p]) {
    if (await exists(c)) return staticFile(c);
  }
  return null;
};

// ---- DİZİ MODU (YouTube birleştirme): izleyiciye soru, "yarın" kartı ve kazanan yorum şeridi çıkarılır ----
const sentences = (t: string): string[] => t.match(/[^.!?…]+[.!?…]+["')]*|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
/** İzleyiciye yöneltilen cümle mi? (soru, "yorumlara yaz", "bir de …" eki) */
const isAsk = (s: string): boolean => /\?\s*["')]*$/.test(s) || /yorum/i.test(s) || /^bir de\b/i.test(s.trim());
const stripAsk = (t: string): string => {
  const ss = sentences(t);
  while (ss.length && isAsk(ss[ss.length - 1])) ss.pop();
  return ss.join(' ');
};
const toSeries = (ep: EpisodeT): EpisodeT => {
  const isFinal = ep.scenes.some((s) => s.type === 'end' && /TEŞEKKÜR|SON/i.test(JSON.stringify(s)));
  let scenes = ep.scenes
    .filter((s) => s.type !== 'bait' && (isFinal || s.type !== 'end'))
    .map((s) => ({...s, note: undefined}) as EpisodeT['scenes'][number]);
  // Son konuşma sahne(ler)inin sonundaki soru cümlelerini kes; tamamen soru olan sahne düşer
  for (let i = scenes.length - 1; i >= 0; i--) {
    const s = scenes[i];
    if (!s.text) continue;
    const text = stripAsk(s.text);
    if (text === s.text) break;
    if (!text) {
      scenes.splice(i, 1);
      continue;
    }
    scenes[i] = {...s, text, caption: s.caption ? stripAsk(s.caption) || undefined : undefined, hold: Math.max(s.hold ?? 0, 0.8)};
    break;
  }
  // Bölüm başlık kartı
  const m = ep.title.match(/Bölüm\s*(\d+)(?:\s*:\s*(.+))?/i);
  const firstImg = scenes.find((s) => s.type === 'image' && (s as {image?: string}).image) as {image?: string} | undefined;
  if (m) {
    scenes = [
      {type: 'title', kicker: 'GELECEĞİ BİLEN ADAM', lines: [`BÖLÜM ${m[1]}`, ...(m[2] ? [`*${m[2].toLocaleUpperCase('tr')}*`] : [])], image: firstImg?.image, duration: 2.4, palette: 'nostalji'} as EpisodeT['scenes'][number],
      ...scenes,
    ];
  }
  return {...ep, scenes};
};

const calculateMetadata:CalculateMetadataFunction<EpisodeProps> = async ({props}) => {
  const slug = props.slug;
  const res = await fetch(staticFile(`episodes/${slug}/episode.json`));
  if (!res.ok) throw new Error(`Bölüm bulunamadı: public/episodes/${slug}/episode.json`);
  let episode = (await res.json()) as EpisodeT;
  if (props.series) episode = toSeries(episode);

  let timings: Timings | null = null;
  const tPath = episode.timings ?? 'timings.json';
  if (episode.voice) {
    const tr = await fetch(staticFile(`episodes/${slug}/${tPath}`));
    if (tr.ok) timings = (await tr.json()) as Timings;
  }

  const paths = new Set<string>();
  const add = (p?: string) => p && paths.add(p);
  add(episode.voice);
  add(episode.music);
  add(episode.series.avatar);
  for (const s of episode.scenes) {
    if (s.type === 'image') {
      add(s.image);
      add(s.video);
    }
    if (s.type === 'title' || s.type === 'bait') add(s.image);
    add(s.note?.avatar);
  }
  const assets: Record<string, string | null> = {};
  await Promise.all([...paths].map(async (p) => (assets[p] = await resolveAsset(slug, p))));

  if (episode.voice && !assets[episode.voice]) timings = null;
  const timeline = buildTimeline(episode, timings);

  const sfxNames = new Set(timeline.scenes.flatMap((s) => s.sfx.map((c) => c.name)));
  await Promise.all(
    [...sfxNames].map(async (n) => {
      const p = `sfx/${n}.wav`;
      assets[`sfx:${n}`] = (await exists(p)) ? staticFile(p) : null;
    }),
  );

  for (const w of timeline.warnings) console.warn('[timeline]', w);
  if (timeline.estimated) console.warn('[timeline] Ses/zamanlama yok — tahmini süreler kullanılıyor.');

  return {
    durationInFrames: timeline.durationInFrames,
    fps: timeline.fps,
    props: {...props, episode, timeline, assets},
  };
};

export const Root: React.FC = () => (
  <Composition
    id="Episode"
    component={Episode}
    width={W}
    height={H}
    fps={30}
    durationInFrames={300}
    defaultProps={{slug: 'demo'} as EpisodeProps}
    calculateMetadata={calculateMetadata}
  />
);
