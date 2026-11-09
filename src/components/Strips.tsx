import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, MONO, accentA} from '../theme';
import {groupThousands} from '../lib/text';

/** Üstte küçük şerit: bölüm adı + kazanan yorum. Tam ekran kart yerine. */
export const NoteStrip: React.FC<{kicker?: string; user?: string; text?: string; likes?: number; from?: number}> = ({
  kicker,
  user,
  text,
  likes,
  from = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - Math.round(from * fps), fps, config: {damping: 16, stiffness: 160}});
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 300,
        left: 48,
        right: 48,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [-24, 0])}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      {kicker ? (
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 24, letterSpacing: '0.12em', color: C.night, background: C.pink, padding: '6px 14px', borderRadius: 8}}>
          {kicker}
        </div>
      ) : null}
      {user && text ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            maxWidth: '100%',
            background: 'rgba(18,15,22,0.82)',
            border: `1.5px solid ${accentA(0.5)}`,
            borderRadius: 18,
            padding: '12px 18px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{width: 46, height: 46, flex: '0 0 46px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.pink}, #7C3AED)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 24, color: '#fff'}}>
            {(user.replace(/^[^a-zA-Z0-9]+/, '')[0] ?? '?').toUpperCase()}
          </div>
          <div style={{minWidth: 0}}>
            <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 22, color: C.pink}}>KAZANAN YORUM · {user}</div>
            <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 30, color: '#fff', lineHeight: 1.2}}>{text}</div>
          </div>
          {likes ? <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 24, color: '#FF3B5C', marginLeft: 6}}>♥ {likes}</div> : null}
        </div>
      ) : null}
    </div>
  );
};

/** Kalıcı KASA şeridi: her bölümün sonunda aynı yerde, aynı grafikle. */
export const KasaStrip: React.FC<{value: number; from?: number; target?: string; mystery?: boolean; top?: number}> = ({value, from, target = '1 MİLYAR $', mystery, top = 1130}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 15, stiffness: 150}});
  const v = interpolate(frame, [6, 34], [from ?? value, value], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        right: 40,
        top,
        transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
        opacity: p,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background: 'linear-gradient(180deg, rgba(20,16,10,0.92), rgba(12,10,8,0.92))',
        border: `3px solid ${C.pink}`,
        borderRadius: 24,
        padding: '18px 22px',
        boxShadow: `0 0 50px ${accentA(0.35)}, 0 14px 40px rgba(0,0,0,0.5)`,
        fontFamily: FONT,
        fontWeight: 900,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{fontSize: 44}}>💰</span>
      <span style={{fontSize: 40, color: '#fff', letterSpacing: '0.02em'}}>KASA:</span>
      <span style={{fontSize: 52, color: C.pink, fontVariantNumeric: 'tabular-nums'}}>{mystery ? '??? $' : `${groupThousands(Math.round(v))} $`}</span>
      <span style={{fontSize: 36, color: 'rgba(255,255,255,0.6)'}}>→</span>
      <span style={{fontSize: 30, color: '#fff', lineHeight: 1.05}}>
        HEDEF:
        <br />
        <span style={{color: C.pink}}>{target}</span>
      </span>
    </div>
  );
};
