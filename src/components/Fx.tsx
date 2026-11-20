// Sahne efektleri (isteğe bağlı; sahnede `fx` yoksa hiçbir şey çizilmez, eski bölümler etkilenmez).
//   flicker   — bozuk ampul: düzensiz kararmalar, arada tam karanlık (referans 2. video, merdiven boşluğu)
//   lightning — şimşek: çift parlama + soğuk mavi ışık, sonra karanlık
//   pulse     — kalp atışı: kenarlarda nabız gibi atan kırmızı karartma
//   underwater— su altı: koyu turkuaz renk, yavaş dalgalanan ışık lekeleri, kenar karartma
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import type {FxCue} from '../types';

const inRange = (t: number, c: FxCue, dur: number) => t >= (c.from ?? 0) && t <= (c.to ?? dur);

/** 0 = aydınlık, 1 = tam karanlık. Bloklar 2–5 kare sürer; sahnenin %40'ı kararır, %8'i tam karanlık. */
const flickerDark = (frame: number, seed: string, strength: number) => {
  const block = Math.floor(frame / 3);
  const r = random(`${seed}-${block}`);
  if (r > 0.6) return 0;
  if (r < 0.08) return 0.92 * strength;
  return (0.35 + random(`${seed}-d-${block}`) * 0.4) * strength;
};

/** Şimşek parlaklığı: rastgele aralıklarla çift çakış */
const lightningFlash = (t: number, seed: string, every: number) => {
  const slot = Math.floor(t / every);
  const at = slot * every + random(`${seed}-${slot}`) * every * 0.6;
  const d = t - at;
  if (d < 0) return 0;
  if (d < 0.07) return 1;
  if (d < 0.12) return 0.15;
  if (d < 0.2) return 0.85;
  if (d < 0.6) return 0.85 * (1 - (d - 0.2) / 0.4);
  return 0;
};

export const Fx: React.FC<{fx: FxCue[]; seed: string}> = ({fx, seed}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps;
  const dur = durationInFrames / fps;

  return (
    <>
      {fx.map((c, i) => {
        if (!inRange(t, c, dur)) return null;
        const s = c.strength ?? 1;
        const k = `${seed}-${i}`;
        switch (c.type) {
          case 'flicker': {
            const d = flickerDark(frame, k, s);
            return <AbsoluteFill key={i} style={{backgroundColor: '#000', opacity: d, pointerEvents: 'none'}} />;
          }
          case 'lightning': {
            const f = lightningFlash(t, k, c.every ?? 2.6) * s;
            return (
              <React.Fragment key={i}>
                <AbsoluteFill style={{backgroundColor: '#03050c', opacity: 0.45 * (1 - f), pointerEvents: 'none'}} />
                <AbsoluteFill style={{backgroundColor: '#bcd4ff', opacity: f * 0.95, mixBlendMode: 'overlay', pointerEvents: 'none'}} />
                <AbsoluteFill style={{backgroundColor: '#ffffff', opacity: f * 0.22, mixBlendMode: 'screen', pointerEvents: 'none'}} />
              </React.Fragment>
            );
          }
          case 'pulse': {
            // lub-dub: iki atış, ~1.1 sn döngü
            const ph = (t * (c.bpm ?? 66) / 60) % 1;
            const beat = Math.exp(-((ph - 0.05) ** 2) / 0.002) + 0.7 * Math.exp(-((ph - 0.22) ** 2) / 0.002);
            return (
              <AbsoluteFill
                key={i}
                style={{
                  pointerEvents: 'none',
                  background: `radial-gradient(ellipse at center, transparent 45%, rgba(150,0,0,${(0.25 + beat * 0.45) * s}) 100%)`,
                }}
              />
            );
          }
          case 'underwater': {
            const blobs = [0, 1, 2, 3].map((j) => {
              const x = 50 + 35 * Math.sin(t * (0.35 + j * 0.13) + j * 1.7);
              const y = 30 + 25 * Math.cos(t * (0.28 + j * 0.11) + j);
              return `radial-gradient(circle at ${x}% ${y}%, rgba(170,255,240,${0.10 * s}) 0%, transparent 22%)`;
            });
            return (
              <React.Fragment key={i}>
                <AbsoluteFill style={{backgroundColor: `rgba(0,85,105,${0.5 * s})`, mixBlendMode: 'multiply', pointerEvents: 'none'}} />
                <AbsoluteFill style={{background: blobs.join(','), mixBlendMode: 'screen', pointerEvents: 'none'}} />
                <AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,10,20,${0.6 * s}) 100%)`, pointerEvents: 'none'}} />
              </React.Fragment>
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
};
