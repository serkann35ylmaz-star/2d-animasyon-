import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {KenBurns} from '../components/KenBurns';
import {Rich} from '../components/Rich';
import {C, FONT, MONO} from '../theme';
import type {Motion, Series} from '../types';

const Dot: React.FC<{color?: string}> = ({color = '#9fc4ff'}) => (
  <span
    style={{
      display: 'inline-block',
      width: 16,
      height: 16,
      borderRadius: '50%',
      border: `4px solid ${color}`,
      marginRight: 14,
      verticalAlign: 'middle',
      boxSizing: 'border-box',
      position: 'relative',
      top: -2,
    }}
  />
);

/** Bölüm başlık kartı: "HER LİRA / İZ / BIRAKIR" */
export const TitleCard: React.FC<{image: string | null; kicker?: string; lines: string[]; footer?: string}> = ({image, kicker, lines, footer}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const shake = interpolate(frame, [0, 10], [1, 0], {extrapolateRight: 'clamp'});
  const sx = Math.sin(frame * 2.1) * 10 * shake;
  const sy = Math.cos(frame * 2.7) * 8 * shake;
  const kickIn = spring({frame, fps, config: {damping: 20}});
  return (
    <AbsoluteFill>
      <KenBurns src={image} motion="zoomOut" focus={[0.5, 0.6]} dim={0.48} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)'}} />
      <div
        style={{
          position: 'absolute',
          top: 560,
          left: 40,
          right: 40,
          textAlign: 'center',
          transform: `translate(${sx}px, ${sy}px)`,
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 27,
              fontWeight: 500,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.88)',
              marginBottom: 26,
              opacity: kickIn,
            }}
          >
            <Dot />
            {kicker}
          </div>
        ) : null}
        {lines.map((line, i) => {
          const p = spring({frame: frame - 2 - i * 4, fps, config: {damping: 12, stiffness: 210, mass: 0.7}});
          return (
            <div
              key={i}
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 166,
                lineHeight: 0.98,
                letterSpacing: '-0.02em',
                color: '#F4F1EE',
                textShadow: '0 10px 40px rgba(0,0,0,0.6)',
                opacity: p,
                transform: `translateY(${interpolate(p, [0, 1], [60, 0])}px) scale(${interpolate(p, [0, 1], [1.25, 1])})`,
              }}
            >
              <Rich text={line} />
            </div>
          );
        })}
        {footer ? (
          <div style={{fontFamily: MONO, fontSize: 24, color: 'rgba(255,255,255,0.7)', marginTop: 40, opacity: spring({frame: frame - 14, fps})}}>
            {footer}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** Yorum tuzağı: "YORUMA TEK KELİME YAZ" + değişen kelime (SAKLA / HARCA) */
export const BaitCard: React.FC<{
  image: string | null;
  label?: string;
  words: string[];
  motion?: Motion;
  focus?: [number, number];
}> = ({image, label = 'YORUMA TEK KELİME YAZ', words, motion = 'zoomIn', focus = [0.5, 0.4]}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const start = Math.round(fps * 0.25);
  const per = Math.max(Math.round(fps * 0.75), Math.floor((durationInFrames - start) / Math.max(1, words.length * 2)));
  const k = Math.max(0, Math.floor((frame - start) / per));
  const word = words[k % words.length];
  const local = frame - start - k * per;
  const pop = spring({frame: local, fps, config: {damping: 10, stiffness: 320, mass: 0.5}});
  const boxIn = spring({frame: frame - start, fps, config: {damping: 14}});
  return (
    <AbsoluteFill>
      <KenBurns src={image} motion={motion} focus={focus} label="Yorum tuzağı: karakter yakın plan, eli kameraya" />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.45) 100%)'}} />
      <div
        style={{
          position: 'absolute',
          top: 1300,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: boxIn,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.9)',
            background: 'rgba(20,18,20,0.72)',
            padding: '8px 16px',
            borderRadius: 6,
            marginBottom: 14,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 104,
            color: C.ink,
            background: '#F4F1EE',
            padding: '6px 34px 10px',
            borderRadius: 14,
            boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
            transform: `scale(${interpolate(pop, [0, 1], [0.75, 1])}) rotate(${interpolate(pop, [0, 1], [k % 2 ? 4 : -4, 0])}deg)`,
          }}
        >
          {word}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Kapanış kartı: kanal + "2. BÖLÜM YARIN" + yorum çağrısı + takip butonu */
export const EndCard: React.FC<{
  series: Series;
  avatar: string | null;
  kicker?: string;
  lines: string[];
  body?: string;
  cta?: string;
}> = ({series, avatar, kicker, lines, body, cta}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = (d: number) => spring({frame: frame - d, fps, config: {damping: 15, stiffness: 180}});
  const rise = (p: number) => ({opacity: p, transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`});
  const pulse = 1 + Math.max(0, Math.sin(((frame - 20) / fps) * Math.PI * 2 * 0.9)) * 0.045 * (frame > 20 ? 1 : 0);
  const initials = series.name
    .split(/\s+/)
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <AbsoluteFill style={{backgroundColor: C.night}}>
      <AbsoluteFill style={{background: 'radial-gradient(70% 40% at 50% 30%, rgba(232,37,127,0.16), transparent 70%)'}} />
      <div style={{position: 'absolute', top: 300, left: 70, right: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: `7px solid ${C.pink}`,
            overflow: 'hidden',
            background: C.pink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...rise(a(0)),
          }}
        >
          {avatar ? (
            <Img src={avatar} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          ) : (
            <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 80, color: '#fff'}}>{initials}</span>
          )}
        </div>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 56, color: '#F4F1EE', marginTop: 26, ...rise(a(3))}}>{series.name}</div>
        <div style={{fontFamily: MONO, fontSize: 26, color: C.pink, marginTop: 4, ...rise(a(4))}}>{series.handle}</div>
        {kicker ? (
          <div style={{fontFamily: MONO, fontSize: 25, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)', marginTop: 70, ...rise(a(7))}}>
            <Dot />
            {kicker}
          </div>
        ) : null}
        <div style={{marginTop: 24}}>
          {lines.map((l, i) => (
            <div
              key={i}
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 150,
                lineHeight: 1.0,
                letterSpacing: '-0.02em',
                color: '#F4F1EE',
                ...rise(a(9 + i * 4)),
              }}
            >
              <Rich text={l} />
            </div>
          ))}
        </div>
        {body ? (
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 42,
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.78)',
              marginTop: 36,
              whiteSpace: 'pre-line',
              ...rise(a(16)),
            }}
          >
            <Rich text={body} boldColor="#fff" />
          </div>
        ) : null}
        {cta ? (
          <div
            style={{
              marginTop: 50,
              background: C.pink,
              color: '#fff',
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 40,
              padding: '20px 54px',
              borderRadius: 999,
              boxShadow: '0 12px 40px rgba(232,37,127,0.45)',
              ...rise(a(20)),
              transform: `scale(${pulse})`,
            }}
          >
            {cta}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
