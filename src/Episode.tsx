import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Captions} from './components/Captions';
import {Hud} from './components/Hud';
import type {BuiltScene, Timeline} from './lib/timeline';
import {stripMarkup} from './lib/text';
import {BaitCard, EndCard, TitleCard} from './scenes/CardScenes';
import {InfoScene} from './scenes/InfoScene';
import {KenBurns} from './components/KenBurns';
import {KasaStrip, NoteStrip, KadroStrip} from './components/Strips';
import {DosyaOverlay} from './components/Dosya';
import {Fx} from './components/Fx';
import {loadFonts, setAccent} from './theme';
import type {Episode as EpisodeT} from './types';

loadFonts();

export interface EpisodeProps {
  slug: string;
  episode?: EpisodeT;
  timeline?: Timeline;
  /** episode.json'daki yol -> çözümlenmiş URL (yoksa null) */
  assets?: Record<string, string | null>;
  [key: string]: unknown;
}

const Transition: React.FC<{kind?: 'cut' | 'flash' | 'whip'}> = ({kind}) => {
  const frame = useCurrentFrame();
  if (kind === 'flash') {
    const o = interpolate(frame, [0, 7], [0.95, 0], {extrapolateRight: 'clamp'});
    return <AbsoluteFill style={{backgroundColor: '#fff', opacity: o, pointerEvents: 'none'}} />;
  }
  return null;
};

const SceneView: React.FC<{bs: BuiltScene; ep: EpisodeT; assets: Record<string, string | null>; prevHasHud: boolean; voice: string | null}> = ({
  bs,
  ep,
  assets,
  prevHasHud,
  voice,
}) => {
  const {scene} = bs;
  const {fps} = useVideoConfig();
  const frame = useCurrentFrame();
  const a = (p?: string) => (p ? assets[p] ?? null : null);
  const palette = scene.palette ?? ep.palette;
  const label = scene.prompt ? `${scene.prompt}` : scene.text ? stripMarkup(scene.text) : scene.id ?? `Sahne ${bs.index + 1}`;

  let visual: React.ReactNode = null;
  switch (scene.type) {
    case 'image':
      visual = (
        <KenBurns
          src={a(scene.image)}
          video={a(scene.video)}
          motion={scene.motion}
          focus={scene.focus}
          intensity={scene.intensity}
          label={label}
          palette={palette}
        />
      );
      break;
    case 'title':
      visual = <TitleCard image={a(scene.image)} kicker={scene.kicker} lines={scene.lines} footer={scene.footer} palette={palette} />;
      break;
    case 'info':
      visual = <InfoScene info={scene.info} />;
      break;
    case 'bait':
      visual = <BaitCard image={a(scene.image)} label={scene.prompt_label} words={scene.words} motion={scene.motion} focus={scene.focus} palette={palette} />;
      break;
    case 'end':
      visual = (
        <EndCard
          series={ep.series}
          avatar={a(ep.series.avatar)}
          kicker={scene.kicker}
          lines={scene.lines}
          body={scene.body}
          cta={scene.cta}
        />
      );
      break;
  }

  const dosya = ep.style === 'dosya';
  const hasHud = !dosya && sceneHasHud(bs, ep);
  const showCaptions = scene.captions ?? scene.type === 'image';
  const whip = scene.transition === 'whip' ? interpolate(frame, [0, 6], [1, 0], {extrapolateRight: 'clamp'}) : 0;

  return (
    <AbsoluteFill style={{transform: whip ? `translateX(${whip * 18}%)` : undefined, filter: whip ? `blur(${whip * 14}px)` : undefined}}>
      {visual}
      {scene.fx?.length ? <Fx fx={scene.fx} seed={`s${bs.index}`} /> : null}
      {showCaptions && !dosya ? (
        <AbsoluteFill style={{background: 'linear-gradient(180deg, transparent 52%, rgba(0,0,0,0.42) 78%, rgba(0,0,0,0.5) 100%)'}} />
      ) : null}
      {dosya ? <DosyaOverlay ep={ep} scene={scene} values={bs.hud} prev={prevHasHud ? bs.prevHud : null} /> : null}
      {hasHud ? (
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 22%)'}} />
      ) : null}
      {hasHud && bs.hud ? (
        <Hud defs={ep.hud!} values={bs.hud as Record<string, number>} prev={prevHasHud ? (bs.prevHud as Record<string, number>) : null} tag={scene.tag} enter={!prevHasHud} />
      ) : !dosya && scene.tag && (scene.type === 'image' || scene.type === 'bait') ? (
        <Hud defs={[]} values={{}} prev={null} tag={scene.tag} />
      ) : null}
      {scene.note ? <NoteStrip {...scene.note} avatar={a(scene.note.avatar) ?? undefined} /> : null}
      {scene.kasa ? <KasaStrip {...scene.kasa} /> : null}
      {scene.kadro ? <KadroStrip {...scene.kadro} /> : null}
      {showCaptions && bs.words.length ? <Captions words={bs.words} {...(dosya ? {variant: 'dosya' as const, top: 760} : {})} /> : null}
      <Transition kind={scene.transition} />
      {voice && bs.audio ? (
        <Audio
          src={voice}
          trimBefore={Math.round(bs.audio.start * fps)}
          durationInFrames={Math.max(1, Math.round((bs.audio.end - bs.audio.start) * fps))}
          volume={1}
        />
      ) : null}
      {bs.sfx.map((c, i) => {
        const src = assets[`sfx:${c.name}`];
        if (!src) return null;
        return (
          <Sequence key={i} from={Math.round((c.at ?? 0) * fps)} layout="none">
            <Audio src={src} volume={c.volume ?? 0.7} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const sceneHasHud = (bs: BuiltScene, ep: EpisodeT) =>
  !!ep.hud?.length && !!bs.hud && bs.scene.showHud !== false && (bs.scene.type === 'image' || bs.scene.type === 'bait' || bs.scene.showHud === true);

export const Episode: React.FC<EpisodeProps> = ({episode, timeline, assets = {}}) => {
  const {fps, durationInFrames} = useVideoConfig();

  // Müzik: konuşma varken kısılır (ducking), başta/sonda yumuşak geçiş
  const duck = useMemo(() => {
    if (!timeline) return [] as number[];
    const raw = new Array(durationInFrames).fill(1);
    for (const s of timeline.scenes) {
      if (!s.audio) continue;
      for (let f = s.from; f < s.from + s.durationInFrames && f < durationInFrames; f++) raw[f] = 0.38;
    }
    const R = 6;
    return raw.map((_, i) => {
      let sum = 0;
      let n = 0;
      for (let j = i - R; j <= i + R; j++) {
        if (j >= 0 && j < raw.length) {
          sum += raw[j];
          n++;
        }
      }
      return sum / n;
    });
  }, [timeline, durationInFrames]);

  setAccent(episode?.accent);
  if (!episode || !timeline) {
    return <AbsoluteFill style={{backgroundColor: '#111'}} />;
  }
  const voice = episode.voice ? assets[episode.voice] ?? null : null;
  const music = episode.music ? assets[episode.music] ?? null : null;
  const mv = episode.musicVolume ?? 0.22;

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {timeline.scenes.map((bs, i) => {
        const prev = timeline.scenes[i - 1];
        return (
          <Sequence key={i} from={bs.from} durationInFrames={bs.durationInFrames} name={`${i + 1}. ${bs.scene.type}${bs.scene.id ? ' · ' + bs.scene.id : ''}`}>
            <SceneView bs={bs} ep={episode} assets={assets} prevHasHud={!!prev && sceneHasHud(prev, episode)} voice={voice} />
          </Sequence>
        );
      })}
      {music ? (
        <Audio
          src={music}
          loop
          volume={(f) =>
            mv *
            (duck[f] ?? 1) *
            interpolate(f, [0, fps * 0.4, durationInFrames - fps * 1.2, durationInFrames - 1], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};

export const sfxUrl = (name: string) => staticFile(`sfx/${name}.wav`);
