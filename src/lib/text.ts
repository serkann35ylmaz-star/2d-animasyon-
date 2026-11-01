import type {ValueFormat} from '../types';

/** Seslendirme metnini kelimelere böler. scripts/align.py ile AYNI kural: boşluklara göre. */
export const tokenize = (text: string): string[] => text.split(/\s+/).filter(Boolean);

const groupThousands = (n: number): string => {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString();
  const out = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return neg ? '-' + out : out;
};

export const formatValue = (v: number, format: ValueFormat = 'number'): string => {
  switch (format) {
    case 'money':
      return `${groupThousands(v)} ₺`;
    case 'tl': // eski Türk lirası (₺ simgesi 2012'den önce yoktu)
      return `${groupThousands(v)} TL`;
    case 'percent':
      return `%${Math.round(v)}`;
    case 'kg':
      return `${groupThousands(v)} kg`;
    case 'raw':
      return String(Math.round(v));
    default:
      return groupThousands(v);
  }
};

export interface Span {
  text: string;
  accent?: boolean; // *pembe*
  bold?: boolean; // **kalın**
}

/** Basit işaretleme: **kalın**, *vurgu (pembe)* */
export const parseMarkup = (input: string): Span[] => {
  const spans: Span[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m.index > last) spans.push({text: input.slice(last, m.index)});
    if (m[1] !== undefined) spans.push({text: m[1], bold: true});
    else spans.push({text: m[2], accent: true});
    last = m.index + m[0].length;
  }
  if (last < input.length) spans.push({text: input.slice(last)});
  return spans;
};

export const stripMarkup = (s: string) => s.replace(/\*\*(.+?)\*\*|\*(.+?)\*/g, '$1$2');

// ---- Türkçe hece sayımı (ses yokken süre tahmini için) ----
const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

export const numberToTurkish = (n: number): string => {
  if (n === 0) return 'sıfır';
  const parts: string[] = [];
  const scales: [number, string][] = [
    [1e9, 'milyar'],
    [1e6, 'milyon'],
    [1e3, 'bin'],
  ];
  let rest = Math.floor(n);
  for (const [v, name] of scales) {
    const q = Math.floor(rest / v);
    if (q > 0) {
      if (!(v === 1e3 && q === 1)) parts.push(numberToTurkish(q));
      parts.push(name);
      rest %= v;
    }
  }
  const h = Math.floor(rest / 100);
  if (h > 0) {
    if (h > 1) parts.push(ONES[h]);
    parts.push('yüz');
  }
  rest %= 100;
  if (rest >= 10) parts.push(TENS[Math.floor(rest / 10)]);
  if (rest % 10) parts.push(ONES[rest % 10]);
  return parts.join(' ');
};

const VOWELS = /[aeıioöuüâîûAEIİOÖUÜÂÎÛ]/g;

export const syllables = (word: string): number => {
  let w = word.replace(/%/g, ' yüzde ').replace(/₺/g, ' lira ');
  w = w.replace(/\d[\d.]*/g, (d) => ' ' + numberToTurkish(parseInt(d.replace(/\./g, ''), 10)) + ' ');
  const v = (w.match(VOWELS) || []).length;
  return Math.max(1, v);
};

/** Kelimeden sonra gelen doğal duraklama (sn) — noktalama işaretine göre */
export const pauseAfter = (word: string): number => {
  if (/[.!?…]["')]*$/.test(word)) return 0.38;
  if (/[,;:—–-]["')]*$/.test(word)) return 0.18;
  return 0.02;
};
