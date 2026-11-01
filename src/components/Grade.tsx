import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

// Tüm görsellere aynı "film" görünümü: hafif kontrast/doygunluk, kenar karartma, pembe-mor ton, hareketli film greni.
// Farklı anlarda üretilmiş AI görsellerini tek bir dizi gibi gösterir.
export const GRADE_FILTER = 'contrast(1.07) saturate(1.08) brightness(0.98)';

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  const gx = Math.floor(random(`gx${Math.floor(frame / 2)}`) * 240);
  const gy = Math.floor(random(`gy${Math.floor(frame / 2)}`) * 240);
  return (
    <>
      {/* gölgelere hafif mor-pembe ton */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(60,10,50,0.10), rgba(20,5,30,0.16))', mixBlendMode: 'multiply', pointerEvents: 'none'}} />
      {/* kenar karartma */}
      <AbsoluteFill style={{background: 'radial-gradient(120% 85% at 50% 45%, transparent 55%, rgba(0,0,0,0.42) 100%)', pointerEvents: 'none'}} />
      {/* film greni */}
      <AbsoluteFill style={{backgroundImage: GRAIN, backgroundPosition: `${gx}px ${gy}px`, opacity: 0.13, mixBlendMode: 'overlay', pointerEvents: 'none'}} />
    </>
  );
};
