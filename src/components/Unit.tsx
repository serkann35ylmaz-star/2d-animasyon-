import React from 'react';
import {C, FONT} from '../theme';

export type UnitShape = 'banknote' | 'coin' | 'box' | 'bar';

/** Bilgi grafiklerindeki tekil nesne: banknot, madeni para, kutu ya da külçe */
export const Unit: React.FC<{shape?: UnitShape; label?: string; width: number; filled?: boolean; stroke?: number}> = ({
  shape = 'banknote',
  label,
  width,
  filled = true,
  stroke,
}) => {
  const sw = stroke ?? Math.max(2, width * 0.035);
  const fill = filled ? C.note : 'transparent';
  const edge = filled ? C.noteEdge : C.paperLine;
  if (shape === 'coin') {
    return (
      <div
        style={{
          width,
          height: width,
          borderRadius: '50%',
          background: filled ? '#E9C46A' : 'transparent',
          border: `${sw}px solid ${edge}`,
          boxSizing: 'border-box',
        }}
      />
    );
  }
  const ratio = shape === 'box' ? 0.8 : shape === 'bar' ? 0.42 : 0.47;
  const h = width * ratio;
  return (
    <div
      style={{
        width,
        height: h,
        background: shape === 'bar' && filled ? '#E9C46A' : fill,
        border: `${sw}px solid ${edge}`,
        borderRadius: Math.max(2, width * 0.07),
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: label ? 'space-between' : 'center',
        padding: `0 ${width * 0.08}px`,
        boxShadow: label ? '0 10px 0 rgba(0,0,0,0.08)' : undefined,
      }}
    >
      {label && shape === 'banknote' ? (
        <>
          <div
            style={{
              width: h * 0.62,
              height: h * 0.62,
              borderRadius: '50%',
              border: `${sw}px solid ${edge}`,
              boxSizing: 'border-box',
            }}
          />
          <div style={{fontFamily: FONT, fontWeight: 800, fontSize: h * 0.42, color: C.noteEdge}}>{label}</div>
        </>
      ) : label ? (
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: h * 0.42, color: C.noteEdge}}>{label}</div>
      ) : null}
    </div>
  );
};
