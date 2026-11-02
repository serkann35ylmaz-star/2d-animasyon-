import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Rich} from '../components/Rich';
import {Unit} from '../components/Unit';
import {formatValue} from '../lib/text';
import {C, FONT, MONO} from '../theme';
import type {InfoBig, InfoBody, InfoCompare, InfoGrid, InfoList, InfoStats, InfoUnit} from '../types';

const useIn = (delay = 0) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping: 16, stiffness: 170, mass: 0.8}});
};

const Appear: React.FC<{delay?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({delay = 0, children, style}) => {
  const p = useIn(delay);
  return (
    <div style={{opacity: p, transform: `translateY(${interpolate(p, [0, 1], [26, 0])}px)`, ...style}}>{children}</div>
  );
};

const Kicker: React.FC<{text?: string}> = ({text}) =>
  text ? (
    <Appear>
      <div style={{fontFamily: MONO, fontSize: 24, fontWeight: 500, letterSpacing: '0.14em', color: C.mute, textAlign: 'center'}}>
        {text}
      </div>
    </Appear>
  ) : null;

const Heading: React.FC<{text?: string; delay?: number; size?: number}> = ({text, delay = 3, size = 50}) =>
  text ? (
    <Appear delay={delay}>
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: size, color: C.ink, textAlign: 'center', lineHeight: 1.15}}>
        <Rich text={text} />
      </div>
    </Appear>
  ) : null;

const Unit1: React.FC<{d: InfoUnit}> = ({d}) => {
  const p = useIn(4);
  return (
    <>
      <Kicker text={d.kicker} />
      <div style={{height: 150}} />
      <div style={{transform: `scale(${interpolate(p, [0, 1], [0.4, 1])}) rotate(${interpolate(p, [0, 1], [-8, 0])}deg)`, opacity: p}}>
        <Unit shape={d.unitShape} label={d.unitLabel} width={300} stroke={7} />
      </div>
      <div style={{height: 70}} />
      <Heading text={d.caption} delay={12} size={56} />
    </>
  );
};

const Grid: React.FC<{d: InfoGrid}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const cols = d.cols ?? 10;
  const rows = d.rows ?? 10;
  const total = cols * rows;
  const fillEnd = Math.max(fps * 1.2, durationInFrames * (d.result ? 0.55 : 0.8));
  const fp = interpolate(frame, [fps * 0.35, fillEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  const filled = Math.round(fp * total);
  const cw = Math.floor(760 / cols) - 6;
  const count = d.count ? (d.count.from ?? 0) + (d.count.to - (d.count.from ?? 0)) * fp : 0;
  const caption = d.caption?.replace('{n}', formatValue(count, d.count?.format ?? 'number'));
  const resultP = spring({frame: frame - Math.round(fillEnd) - 2, fps, config: {damping: 11, stiffness: 200}});

  return (
    <>
      <Kicker text={d.kicker} />
      <div style={{height: 44}} />
      <Heading text={d.heading} />
      <div style={{height: 36}} />
      <Appear delay={5}>
        <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cw}px)`, gap: 6}}>
          {Array.from({length: total}).map((_, i) => (
            <Unit key={i} shape={d.unitShape} width={cw} filled={i < filled} stroke={3} />
          ))}
        </div>
      </Appear>
      <div style={{height: 40}} />
      {caption ? (
        <Appear delay={8}>
          <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 46, color: C.ink, textAlign: 'center', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums'}}>
            <Rich text={caption} />
          </div>
        </Appear>
      ) : null}
      {d.result ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: d.result.replace(/\*/g, '').length <= 7 ? 150 : 108,
            letterSpacing: '-0.03em',
            color: C.ink,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            opacity: resultP,
            transform: `scale(${interpolate(resultP, [0, 1], [1.8, 1])})`,
          }}
        >
          <Rich text={d.result} />
        </div>
      ) : null}
    </>
  );
};

const Stats: React.FC<{d: InfoStats}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{width: '100%'}}>
      <Kicker text={d.kicker} />
      <div style={{height: 60}} />
      {d.rows.map((r, i) => {
        const delay = 5 + i * 7;
        const p = interpolate(frame, [delay, delay + fps * 0.9], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        const max = r.max ?? (r.format === 'percent' ? 100 : r.value);
        return (
          <Appear key={i} delay={delay} style={{marginBottom: 34, borderBottom: r.bar ? 'none' : `2px solid ${C.paperLine}`, paddingBottom: 22}}>
            <div style={{fontFamily: MONO, fontSize: 21, letterSpacing: '0.12em', color: C.mute}}>{r.label}</div>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 84,
                letterSpacing: '-0.02em',
                color: r.accent ? C.pink : C.ink,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatValue(r.value * p, r.format)}
            </div>
            {r.bar ? (
              <div style={{height: 10, background: C.paperLine, borderRadius: 5, marginTop: 10, overflow: 'hidden'}}>
                <div style={{height: '100%', width: `${(r.value / max) * 100 * p}%`, background: r.accent ? C.pink : C.ink, borderRadius: 5}} />
              </div>
            ) : null}
          </Appear>
        );
      })}
      {d.footer ? (
        <Appear delay={5 + d.rows.length * 7 + 4}>
          <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 36, color: '#55504a', textAlign: 'center', marginTop: 20}}>
            <Rich text={d.footer} />
          </div>
        </Appear>
      ) : null}
    </div>
  );
};

const Big: React.FC<{d: InfoBig}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame, [6, 6 + fps * 1.1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  // Uzun sayılar 860 px genişliğe sığsın
  const len = `${d.prefix ?? ''}${formatValue(d.value, d.format ?? 'number')}${d.suffix ?? ''}`.length;
  const bigSize = Math.min(170, Math.floor(1450 / Math.max(1, len)));
  return (
    <>
      <Kicker text={d.kicker} />
      <div style={{height: 140}} />
      <Heading text={d.heading} />
      <div style={{height: 40}} />
      <Appear delay={4}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: bigSize, letterSpacing: '-0.04em', color: C.pink, fontVariantNumeric: 'tabular-nums', textAlign: 'center', lineHeight: 1, whiteSpace: 'nowrap'}}>
          {d.prefix}
          {formatValue((d.from ?? 0) + (d.value - (d.from ?? 0)) * p, d.format ?? 'number')}
          {d.suffix}
        </div>
      </Appear>
      <div style={{height: 44}} />
      <Heading text={d.caption} delay={14} size={46} />
    </>
  );
};

const Compare: React.FC<{d: InfoCompare}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const max = Math.max(...d.items.map((x) => x.value), 1);
  return (
    <div style={{width: '100%'}}>
      <Kicker text={d.kicker} />
      <div style={{height: 50}} />
      <Heading text={d.heading} />
      <div style={{height: 60}} />
      {d.items.map((it, i) => {
        const delay = 6 + i * 6;
        const p = interpolate(frame, [delay, delay + fps * 0.9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
        return (
          <Appear key={i} delay={delay} style={{marginBottom: 36}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontWeight: 700, fontSize: 36, color: C.ink, marginBottom: 10}}>
              <span>{it.label}</span>
              <span style={{fontWeight: 900, color: it.accent ? C.pink : C.ink, fontVariantNumeric: 'tabular-nums'}}>{formatValue(it.value * p, it.format ?? 'number')}</span>
            </div>
            <div style={{height: 34, background: C.paperLine, borderRadius: 10, overflow: 'hidden'}}>
              <div style={{height: '100%', width: `${(it.value / max) * 100 * p}%`, background: it.accent ? C.pink : C.note, border: `3px solid ${C.noteEdge}`, boxSizing: 'border-box', borderRadius: 10}} />
            </div>
          </Appear>
        );
      })}
      <Heading text={d.caption} delay={10 + d.items.length * 6} size={40} />
    </div>
  );
};

const List: React.FC<{d: InfoList}> = ({d}) => (
  <div style={{width: '100%'}}>
    <Kicker text={d.kicker} />
    <div style={{height: 50}} />
    <Heading text={d.heading} />
    <div style={{height: 50}} />
    {d.items.map((it, i) => (
      <Appear key={i} delay={8 + i * 9} style={{display: 'flex', alignItems: 'center', gap: 26, marginBottom: 30}}>
        <div
          style={{
            width: 64,
            height: 64,
            flex: '0 0 64px',
            borderRadius: 14,
            background: it.state === 'bad' ? C.pink : it.state === 'ok' ? C.ink : 'transparent',
            border: `4px solid ${it.state === 'bad' ? C.pink : C.ink}`,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 38,
          }}
        >
          {it.state === 'bad' ? '✕' : it.state === 'ok' ? '✓' : ''}
        </div>
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 44, color: C.ink, lineHeight: 1.2}}>
          <Rich text={it.text} />
        </div>
      </Appear>
    ))}
  </div>
);

export const InfoScene: React.FC<{info: InfoBody}> = ({info}) => {
  let body: React.ReactNode;
  switch (info.layout) {
    case 'unit':
      body = <Unit1 d={info} />;
      break;
    case 'grid':
      body = <Grid d={info} />;
      break;
    case 'stats':
      body = <Stats d={info} />;
      break;
    case 'big':
      body = <Big d={info} />;
      break;
    case 'compare':
      body = <Compare d={info} />;
      break;
    case 'list':
      body = <List d={info} />;
      break;
  }
  return (
    <AbsoluteFill style={{backgroundColor: C.paper}}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.45), transparent 60%), radial-gradient(100% 50% at 50% 100%, rgba(0,0,0,0.05), transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 110,
          right: 110,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {body}
      </div>
    </AbsoluteFill>
  );
};
