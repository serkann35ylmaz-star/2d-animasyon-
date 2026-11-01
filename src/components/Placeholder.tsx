import React from 'react';
import {AbsoluteFill} from 'remotion';
import {accentA, C, MONO} from '../theme';

/** Görsel henüz üretilmediyse: storyboard önizlemesi için koyu, neon tonlu yer tutucu */
export const Placeholder: React.FC<{label?: string}> = ({label}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 70% at 70% 15%, ${accentA(0.55)} 0%, rgba(80,20,60,0.5) 35%, #120e14 75%),
        repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 46px)`,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 120,
    }}
  >
    {label ? <div
      style={{
        fontFamily: MONO,
        fontSize: 30,
        lineHeight: 1.45,
        color: 'rgba(255,255,255,0.55)',
        textAlign: 'center',
        border: `2px dashed rgba(255,255,255,0.25)`,
        borderRadius: 18,
        padding: '36px 40px',
        marginTop: -260,
        maxWidth: 820,
      }}
    >
      <div style={{color: C.pink, fontWeight: 700, marginBottom: 14, letterSpacing: '0.1em'}}>GÖRSEL BEKLENİYOR</div>
      {label}
    </div> : null}
  </AbsoluteFill>
);
