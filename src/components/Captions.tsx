import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {WordTiming} from '../types';
import {FONT} from '../theme';

interface Chunk {
  words: WordTiming[];
  start: number;
  end: number;
}

const MAX_WORDS = 3;
const MAX_CHARS = 19;

/** Kelimeleri ekranda 1-3 kelimelik parçalara böler (referans videodaki gibi) */
export const chunkWords = (words: WordTiming[], sceneEnd: number): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: WordTiming[] = [];
  const flush = () => {
    if (cur.length) chunks.push({words: cur, start: cur[0].s, end: 0});
    cur = [];
  };
  words.forEach((w, i) => {
    const chars = cur.reduce((n, x) => n + x.w.length + 1, 0) + w.w.length;
    const prev = words[i - 1];
    const gap = prev ? w.s - prev.e : 0;
    if (cur.length >= MAX_WORDS || (cur.length > 0 && chars > MAX_CHARS) || gap > 0.45) flush();
    cur.push(w);
    if (/[.!?…,;:]["')]*$/.test(w.w)) flush();
  });
  flush();
  chunks.forEach((c, i) => {
    const next = chunks[i + 1];
    c.end = next ? next.start : Math.max(sceneEnd, c.words[c.words.length - 1].e + 0.3);
  });
  return chunks;
};

export const Captions: React.FC<{words: WordTiming[]; top?: number}> = ({words, top = 1290}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps;
  const chunks = useMemo(() => chunkWords(words, durationInFrames / fps), [words, durationInFrames, fps]);
  const idx = chunks.findIndex((c) => t >= c.start - 0.06 && t < c.end - 0.06);
  if (idx < 0) return null;
  const chunk = chunks[idx];
  const local = frame - Math.round((chunk.start - 0.06) * fps);
  const pop = spring({frame: local, fps, config: {damping: 14, stiffness: 260, mass: 0.6}});
  const scale = interpolate(pop, [0, 1], [0.86, 1]);
  const y = interpolate(pop, [0, 1], [14, 0]);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top,
          left: 90,
          right: 90,
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          columnGap: 18,
          transform: `translateY(${y}px) scale(${scale})`,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 70,
          lineHeight: 1.12,
          letterSpacing: '-0.01em',
          textAlign: 'center',
        }}
      >
        {chunk.words.map((w, i) => {
          const spoken = t >= w.s - 0.04;
          return (
            <span
              key={i}
              style={{
                color: spoken ? '#FFFFFF' : 'rgba(255,255,255,0.42)',
                textShadow: '0 3px 0 rgba(0,0,0,0.35), 0 6px 22px rgba(0,0,0,0.65)',
                WebkitTextStroke: '1.5px rgba(0,0,0,0.18)',
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
