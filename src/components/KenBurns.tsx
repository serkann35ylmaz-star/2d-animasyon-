import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Motion} from '../types';
import {Placeholder} from './Placeholder';
import {Grade} from './Grade';
import {getPalette} from '../palettes';

interface Props {
  src: string | null; // çözümlenmiş URL ya da null (eksik görsel)
  video?: string | null;
  motion?: Motion;
  focus?: [number, number];
  intensity?: number;
  label?: string; // görsel eksikse yer tutucuda gösterilecek açıklama
  dim?: number; // 0-1 karartma
  palette?: string;
}

const ease = Easing.bezier(0.33, 0, 0.2, 1);

/** Durağan illüstrasyona kamera hareketi (yakınlaşma / kaydırma / titreme) verir */
export const KenBurns: React.FC<Props> = ({src, video, motion = 'zoomIn', focus = [0.5, 0.45], intensity = 1, label, dim = 0, palette}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const p = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const k = intensity;
  let scale = 1.06;
  let tx = 0;
  let ty = 0;

  switch (motion) {
    case 'zoomIn':
      scale = 1.04 + 0.13 * k * p;
      break;
    case 'zoomOut':
      scale = 1.17 * (1 + 0.02 * k) - 0.13 * k * p;
      break;
    case 'panLeft':
      scale = 1.14;
      tx = (0.045 - 0.09 * p) * k;
      break;
    case 'panRight':
      scale = 1.14;
      tx = (-0.045 + 0.09 * p) * k;
      break;
    case 'panUp':
      scale = 1.14;
      ty = (0.04 - 0.08 * p) * k;
      break;
    case 'panDown':
      scale = 1.14;
      ty = (-0.04 + 0.08 * p) * k;
      break;
    case 'push': {
      const fast = interpolate(frame, [0, Math.min(durationInFrames, fps * 0.9)], [0, 1], {
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      });
      scale = 1.02 + 0.2 * k * fast + 0.04 * k * p;
      break;
    }
    case 'shake': {
      scale = 1.1 + 0.05 * k * p;
      const t = frame / fps;
      tx = (Math.sin(t * 37) * 0.6 + Math.sin(t * 23.3) * 0.4) * 0.006 * k;
      ty = (Math.cos(t * 31) * 0.6 + Math.sin(t * 17.7) * 0.4) * 0.006 * k;
      break;
    }
    case 'still':
      scale = 1.03 + 0.012 * p;
      break;
  }

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`,
    transform: `translate(${tx * 100}%, ${ty * 100}%) scale(${scale})`,
    filter: src || video ? getPalette(palette).filter : undefined,
  };

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      {video ? (
        <OffthreadVideo src={video} muted style={style} />
      ) : src ? (
        <Img src={src} style={style} />
      ) : (
        <div style={{...style, position: 'absolute', inset: 0}}>
          <Placeholder label={label} />
        </div>
      )}
      {src || video ? <Grade palette={palette} /> : null}
      {dim > 0 ? <AbsoluteFill style={{backgroundColor: `rgba(0,0,0,${dim})`}} /> : null}
    </AbsoluteFill>
  );
};
