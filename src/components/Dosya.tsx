// "DOSYA" formatı (Kasım 2026 referans videolarından): koyu noir çizgi roman + turuncu arayüz.
// Üst bölüm şeridi (Z 1 2 3 … Ç), turuncu çerçeveli değer kutuları, alt geri sayım, yer/saat etiketi,
// dosya durum rozeti, kartlar (oy / sizden gelen yorum / gerçek kural / bildirim / son dakika),
// başlık ("TEK KURAL: …") ve final seçim butonları.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {DosyaCard, Episode, Scene} from '../types';
import {formatValue} from '../lib/text';
import {Rich} from './Rich';
import {FONT, MONO} from '../theme';

export const OR = '#F39A1E'; // turuncu
const RED = '#E5413A';
const BOX = 'rgba(14,12,12,0.82)';
const EDGE = 'rgba(243,154,30,0.85)';

const useIn = (delay = 0, damping = 16) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, stiffness: 200}});
};

/** Üstte bölüm ilerleme şeridi: Z 1 2 3 4 5 6 Ç */
const Progress: React.FC<{labels: string[]; current: number}> = ({labels, current}) => (
  <div
    style={{
      position: 'absolute',
      top: 52,
      left: 40,
      right: 40,
      height: 74,
      borderRadius: 18,
      border: `3px solid ${EDGE}`,
      background: BOX,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 22px',
    }}
  >
    {labels.map((l, i) => {
      const on = i === current;
      const done = i < current;
      return (
        <div
          key={i}
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 26,
            color: on ? '#1a1206' : done ? '#fff' : 'rgba(255,255,255,0.55)',
            background: on ? OR : done ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)',
            boxShadow: on ? `0 0 22px ${OR}` : undefined,
          }}
        >
          {l}
        </div>
      );
    })}
  </div>
);

/** Değer kutuları: BİLET 1 · HESAP 800 M · RADAR TÜM TR */
const Stats: React.FC<{ep: Episode; values: Record<string, number | string>; prev: Record<string, number | string> | null}> = ({ep, values, prev}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const defs = ep.hud ?? [];
  return (
    <div style={{position: 'absolute', top: 142, left: 40, right: 40, display: 'flex', gap: 14}}>
      {defs.map((d) => {
        const raw = values[d.key];
        if (raw === undefined) return null;
        const pv = prev?.[d.key];
        let shown: string;
        if (typeof raw === 'number') {
          const from = typeof pv === 'number' ? pv : raw;
          const p = interpolate(frame, [4, 4 + fps * 0.8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
          const v = from + (raw - from) * p;
          shown = d.format === 'raw' ? formatValue(v, 'raw') : compact(v, d.format === 'usd' ? ' $' : d.format === 'money' || d.format === 'tl' ? ' ₺' : '');
        } else shown = raw;
        const alert = typeof raw === 'string' && /BLOKE|YOK|DONDU|KAPALI/i.test(raw);
        const changed = pv !== undefined && pv !== raw;
        const glow = changed ? interpolate(frame, [4, 10, 4 + fps], [0, 1, 0], {extrapolateRight: 'clamp'}) : 0;
        return (
          <div
            key={d.key}
            style={{
              flex: 1,
              height: 80,
              borderRadius: 14,
              border: `3px solid ${alert ? RED : EDGE}`,
              background: BOX,
              padding: '6px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxShadow: glow ? `0 0 ${30 * glow}px ${alert ? RED : OR}` : undefined,
            }}
          >
            <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 18, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)'}}>{d.label}</div>
            <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 34, color: alert ? RED : d.accent ? OR : '#fff', textAlign: 'right', lineHeight: 1}}>{shown}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Kutuya sığan kısa sayı: 800 M, 1,2 MR, 53,4 M */
const compact = (v: number, suffix: string): string => {
  const f = (x: number) => (Math.round(x * 10) / 10).toLocaleString('tr-TR');
  if (Math.abs(v) >= 1e9) return `${f(v / 1e9)} MR${suffix}`;
  if (Math.abs(v) >= 1e6) return `${f(v / 1e6)} M${suffix}`;
  return `${Math.round(v).toLocaleString('tr-TR')}${suffix}`;
};

const two = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');
const hms = (s: number) => `${two(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}`;

/** Alt orta: yer/saat etiketi + durum rozeti + geri sayım */
const Bottom: React.FC<{scene: Scene; timerLabel?: string}> = ({scene, timerLabel}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inP = useIn(2);
  const t = scene.timer !== undefined ? scene.timer - frame / fps : undefined;
  return (
    <div style={{position: 'absolute', top: 1500, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: inP}}>
      {scene.loc ? (
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 26, color: OR, background: 'rgba(10,8,8,0.8)', padding: '6px 18px', borderRadius: 8, letterSpacing: '0.04em'}}>
          {scene.loc}
        </div>
      ) : null}
      {scene.status ? (
        <div style={{border: `3px solid ${RED}`, background: 'rgba(20,6,6,0.85)', borderRadius: 10, padding: '4px 26px 8px', textAlign: 'center'}}>
          <div style={{fontFamily: MONO, fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em'}}>{scene.status.label}</div>
          <div style={{fontFamily: FONT, fontSize: 40, fontWeight: 900, color: RED, lineHeight: 1}}>{scene.status.value}</div>
        </div>
      ) : null}
      {t !== undefined ? (
        <div style={{border: `3px solid ${EDGE}`, background: BOX, borderRadius: 12, padding: '4px 24px 8px', textAlign: 'center'}}>
          <div style={{fontFamily: MONO, fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em'}}>{timerLabel ?? 'KALAN'}</div>
          <div style={{fontFamily: MONO, fontSize: 46, fontWeight: 700, color: '#fff', lineHeight: 1.05}}>{hms(Math.max(0, t))}</div>
        </div>
      ) : null}
    </div>
  );
};

/** Kartlar: oy sonucu, sizden gelen yorum, gerçek kural, bildirim, son dakika */
const Card: React.FC<{card: DosyaCard}> = ({card}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const from = Math.round((card.from ?? 0.3) * fps);
  const p = spring({frame: frame - from, fps, config: {damping: 15, stiffness: 220}});
  if (frame < from) return null;
  const y = interpolate(p, [0, 1], [-60, 0]);
  const base: React.CSSProperties = {position: 'absolute', top: 250, left: 60, right: 60, transform: `translateY(${y}px)`, opacity: p};

  if (card.type === 'vote')
    return (
      <div style={{...base, left: 150, right: 150, border: `3px solid ${EDGE}`, background: BOX, borderRadius: 18, padding: '16px 20px', textAlign: 'center'}}>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em'}}>{card.title}</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 62, color: OR}}>{card.text}</div>
      </div>
    );
  if (card.type === 'comment')
    return (
      <div style={{...base, background: 'rgba(20,20,22,0.93)', borderRadius: 18, padding: '34px 30px 20px', border: '1px solid rgba(255,255,255,0.1)'}}>
        <div style={{position: 'absolute', top: -20, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <div style={{background: OR, color: '#1a1206', fontFamily: FONT, fontWeight: 900, fontSize: 22, padding: '4px 18px', borderRadius: 999}}>{card.title ?? 'SİZDEN GELEN YORUM'}</div>
        </div>
        <div style={{display: 'flex', gap: 18}}>
          <div style={{width: 54, height: 54, borderRadius: 27, background: '#555', flexShrink: 0}} />
          <div style={{flex: 1}}>
            {card.user ? <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 24, color: 'rgba(255,255,255,0.6)'}}>{card.user}</div> : null}
            <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 34, color: '#fff', lineHeight: 1.25}}>{card.text}</div>
            <div style={{fontFamily: FONT, fontSize: 22, color: 'rgba(255,255,255,0.5)', marginTop: 6}}>Yanıtla · {card.likes ?? 0} beğenme</div>
          </div>
          <div style={{color: RED, fontSize: 34}}>♥</div>
        </div>
      </div>
    );
  if (card.type === 'fact')
    return (
      <div style={{...base, background: '#F1E9DA', borderRadius: 14, padding: '22px 30px 28px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)'}}>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 20, color: '#6b6153', letterSpacing: '0.08em'}}>{card.title ?? 'GERÇEK KURAL'}</div>
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 36, color: '#1c1a19', lineHeight: 1.25, marginTop: 6}}>{card.text}</div>
        <div
          style={{
            position: 'absolute',
            right: 26,
            bottom: 16,
            transform: `rotate(-8deg) scale(${interpolate(spring({frame: frame - from - 8, fps, config: {damping: 9}}), [0, 1], [2.2, 1])})`,
            border: `4px solid ${RED}`,
            color: RED,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 34,
            padding: '0 12px',
            borderRadius: 8,
          }}
        >
          GERÇEK
        </div>
      </div>
    );
  if (card.type === 'notify')
    return (
      <div style={{...base, top: 250, background: 'rgba(245,245,245,0.96)', borderRadius: 26, padding: '20px 26px', display: 'flex', gap: 18}}>
        <div style={{width: 58, height: 58, borderRadius: 14, background: RED, flexShrink: 0}} />
        <div style={{flex: 1}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontWeight: 800, fontSize: 28, color: '#111'}}>
            <span>{card.title}</span>
            <span style={{fontWeight: 600, fontSize: 22, color: '#777'}}>şimdi</span>
          </div>
          <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 30, color: '#222', lineHeight: 1.25}}>{card.text}</div>
        </div>
      </div>
    );
  // news
  return (
    <div style={{...base, top: 230, background: 'rgba(245,240,232,0.95)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.5)'}}>
      <div style={{background: RED, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 30, padding: '8px 24px'}}>{card.title ?? 'SON DAKİKA'}</div>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 48, color: '#1c1a19', textAlign: 'center', padding: '18px 24px 24px', lineHeight: 1.2}}>
        <Rich text={card.text} />
      </div>
    </div>
  );
};

/** Açılış başlığı: "TEK KURAL:\n*SABRİ SİLMEDEN SAVCIYA ULAŞTIR.*" */
const Headline: React.FC<{text: string}> = ({text}) => {
  const p = useIn(0, 14);
  return (
    <div
      style={{
        position: 'absolute',
        top: 250,
        left: 50,
        right: 50,
        textAlign: 'center',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 76,
        lineHeight: 1.06,
        color: '#fff',
        textTransform: 'uppercase',
        textShadow: '0 4px 0 rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.8)',
        transform: `scale(${interpolate(p, [0, 1], [0.9, 1])})`,
        opacity: p,
        whiteSpace: 'pre-line',
      }}
    >
      {text.split('\n').map((l, i) => {
        const m = l.match(/^\*(.*)\*$/);
        return (
          <div key={i} style={{color: m ? OR : '#fff'}}>
            {m ? m[1] : l}
          </div>
        );
      })}
    </div>
  );
};

/** Final seçim butonları */
const Choices: React.FC<{choices: string[]; tag?: string}> = ({choices, tag}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{position: 'absolute', top: 1560, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
      <div style={{display: 'flex', gap: 22, width: '100%'}}>
        {choices.map((c, i) => {
          const p = spring({frame: frame - 6 - i * 5, fps, config: {damping: 12}});
          const pulse = 1 + 0.03 * Math.sin((frame / fps) * 6 + i * 3);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 120,
                borderRadius: 18,
                border: `4px solid ${i === 0 ? OR : 'rgba(255,255,255,0.75)'}`,
                background: 'rgba(14,12,12,0.88)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 60,
                color: i === 0 ? OR : '#fff',
                transform: `scale(${p * pulse})`,
              }}
            >
              {c}
            </div>
          );
        })}
      </div>
      {tag ? <div style={{background: OR, color: '#1a1206', fontFamily: FONT, fontWeight: 900, fontSize: 26, padding: '6px 24px', borderRadius: 8}}>{tag}</div> : null}
    </div>
  );
};

/** Sağ altta küçük kanal imzası */
const Mark: React.FC<{handle: string}> = ({handle}) => (
  <div style={{position: 'absolute', top: 980, right: 40, fontFamily: FONT, fontWeight: 700, fontSize: 20, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em'}}>{handle.toUpperCase()}</div>
);

export const DosyaOverlay: React.FC<{
  ep: Episode;
  scene: Scene;
  values: Record<string, number | string> | null;
  prev: Record<string, number | string> | null;
}> = ({ep, scene, values, prev}) => {
  const ui = scene.ui !== false;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {ui ? <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 16%, transparent 70%, rgba(0,0,0,0.55) 100%)'}} /> : null}
      {ui && ep.progress ? <Progress labels={ep.progress.labels} current={ep.progress.current} /> : null}
      {ui && values ? <Stats ep={ep} values={values} prev={prev} /> : null}
      {scene.headline ? <Headline text={scene.headline} /> : null}
      {scene.card ? <Card card={scene.card} /> : null}
      {scene.choices ? <Choices choices={scene.choices} tag={scene.choiceTag} /> : ui ? <Bottom scene={scene} timerLabel={ep.timerLabel} /> : null}
      {ui ? <Mark handle={ep.series.handle} /> : null}
    </AbsoluteFill>
  );
};
