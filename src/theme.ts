import {continueRender, delayRender} from 'remotion';

// Referans videodan çıkarılan renk paleti
export const C = {
  pink: '#E8257F', // vurgu (İZ, YARIN, %35, 200 ₺)
  pinkDeep: '#B5135F',
  ink: '#1C1A19', // açık zemin üstü koyu yazı
  paper: '#E9E4D8', // bilgi grafiği zemini (bej)
  paperLine: '#D6CFBF',
  mute: '#8E887C', // mono küçük başlıklar
  note: '#C6A4EA', // banknot moru
  noteEdge: '#2A2235',
  night: '#141213', // kapanış kartı zemini
  white: '#FFFFFF',
  hudBg: 'rgba(16,14,16,0.78)',
  hudEdge: 'rgba(255,255,255,0.10)',
};

export const W = 1080;
export const H = 1920;

export const FONT = "'Inter', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, monospace";

// Fontsource CSS'leri (latin + latin-ext => Türkçe karakterler dahil) paketle birlikte gelir.
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';

const FONT_CHECKS = [
  "600 40px 'Inter'",
  "700 40px 'Inter'",
  "800 40px 'Inter'",
  "900 40px 'Inter'",
  "500 40px 'JetBrains Mono'",
  "700 40px 'JetBrains Mono'",
];

let loaded = false;
/** Render başlamadan önce tüm font ağırlıklarının (Türkçe glifler dahil) yüklenmesini bekler */
export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Fontlar yükleniyor');
  Promise.all(FONT_CHECKS.map((f) => document.fonts.load(f, 'AaİıŞşĞğÜüÖöÇç₺%0123')))
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('Font yüklenemedi', e);
      continueRender(handle);
    });
};
