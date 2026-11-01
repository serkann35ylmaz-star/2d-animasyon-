import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {HudItemDef} from '../types';
import {formatValue} from '../lib/text';
import {C, FONT, MONO} from '../theme';

interface Props {
  defs: HudItemDef[];
  values: Record<string, number>;
  prev: Record<string, number> | null;
  tag?: string;
  /** Sahne HUD'un ilk göründüğü sahne mi (giriş animasyonu) */
  enter?: boolean;
}

export const HUD_TOP = 200;

/** Üstteki durum çubuğu: NAKİT / BANKADA / ŞÜPHE gibi değişen değerler */
export const Hud: React.FC<Props> = ({defs, values, prev, tag, enter}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const visible = defs.filter((d) => values[d.key] !== undefined);
  const inP = enter ? spring({frame, fps, config: {damping: 18, stiffness: 180}}) : 1;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: HUD_TOP,
          left: 28,
          right: 28,
          display: 'flex',
          gap: 12,
          transform: `translateY(${interpolate(inP, [0, 1], [-40, 0])}px)`,
          opacity: inP,
        }}
      >
        {visible.map((d, i) => {
          const to = values[d.key];
          const from = prev?.[d.key] ?? to;
          const changed = from !== to;
          const p = interpolate(frame, [4, 4 + fps * 0.8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          const v = changed ? from + (to - from) * p : to;
          const glow = changed ? interpolate(frame, [4, 10, 4 + fps * 1.1], [0, 1, 0], {extrapolateRight: 'clamp'}) : 0;
          const itemIn = enter ? spring({frame: frame - i * 3, fps, config: {damping: 16}}) : 1;
          return (
            <div
              key={d.key}
              style={{
                flex: 1,
                background: C.hudBg,
                border: `2px solid ${glow > 0.01 ? `rgba(232,37,127,${0.25 + glow * 0.75})` : C.hudEdge}`,
                borderRadius: 16,
                padding: '12px 18px 14px',
                boxShadow: glow > 0.01 ? `0 0 ${28 * glow}px rgba(232,37,127,${0.6 * glow})` : '0 6px 24px rgba(0,0,0,0.35)',
                transform: `scale(${1 + glow * 0.04}) translateY(${(1 - itemIn) * -20}px)`,
              }}
            >
              <div style={{fontFamily: MONO, fontSize: 19, fontWeight: 500, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)'}}>
                {d.label}
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontWeight: 800,
                  fontSize: 40,
                  marginTop: 2,
                  color: d.accent ? C.pink : '#fff',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatValue(v, d.format)}
              </div>
            </div>
          );
        })}
      </div>
      {tag ? <Tag text={tag} top={visible.length ? HUD_TOP + 118 : HUD_TOP} /> : null}
    </AbsoluteFill>
  );
};

export const Tag: React.FC<{text: string; top: number}> = ({text, top}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 2, fps, config: {damping: 13, stiffness: 220}});
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 28,
        background: C.pink,
        color: '#fff',
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: '0.1em',
        padding: '7px 14px',
        borderRadius: 7,
        transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`,
        transformOrigin: 'left center',
        opacity: s,
      }}
    >
      {text}
    </div>
  );
};
