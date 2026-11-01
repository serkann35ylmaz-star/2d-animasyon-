// Sahne renk paletleri. Her palet iki yerde kullanılır:
//  1) Görsel üretiminde ışık/renk tarifi (docs/style-prompt.json → palettes, aynı anahtarlar)
//  2) Videoda görselin üstüne binen renk tonu (Grade): gölge rengi, kenar karartma, filtre
// Referans videonun dilini korur (kalın kontur, sinematik ışık), ama her sahne sadece mor-siyah olmaz.

export type PaletteName =
  | 'neon'
  | 'sabah'
  | 'nostalji'
  | 'gerilim'
  | 'soguk'
  | 'gunbatimi'
  | 'tehlike'
  | 'gunduz'
  | 'kahve';

export interface Palette {
  label: string;
  /** üstten alta gölge tonu (multiply) */
  tint: [string, string];
  /** kenar karartma rengi */
  vignette: string;
  filter: string;
}

export const PALETTES: Record<PaletteName, Palette> = {
  neon: {label: 'Gece neonu (referans)', tint: ['rgba(60,10,50,0.10)', 'rgba(20,5,30,0.16)'], vignette: 'rgba(0,0,0,0.42)', filter: 'contrast(1.07) saturate(1.08) brightness(0.98)'},
  sabah: {label: 'Sıcak sabah', tint: ['rgba(255,190,120,0.10)', 'rgba(120,70,30,0.10)'], vignette: 'rgba(40,20,5,0.30)', filter: 'contrast(1.03) saturate(1.05) brightness(1.03)'},
  nostalji: {label: "90'lar nostalji", tint: ['rgba(170,120,60,0.12)', 'rgba(70,40,15,0.14)'], vignette: 'rgba(30,15,0,0.40)', filter: 'contrast(1.04) saturate(0.88) sepia(0.12)'},
  gerilim: {label: 'Yeşil floresan gerilim', tint: ['rgba(40,110,80,0.12)', 'rgba(5,35,30,0.18)'], vignette: 'rgba(0,10,5,0.48)', filter: 'contrast(1.1) saturate(0.95) brightness(0.96)'},
  soguk: {label: 'Soğuk mavi gece', tint: ['rgba(40,90,170,0.12)', 'rgba(5,15,45,0.18)'], vignette: 'rgba(0,5,20,0.46)', filter: 'contrast(1.06) saturate(1.02) brightness(0.97)'},
  gunbatimi: {label: 'Gün batımı', tint: ['rgba(255,130,70,0.10)', 'rgba(90,25,50,0.14)'], vignette: 'rgba(30,5,15,0.36)', filter: 'contrast(1.05) saturate(1.12)'},
  tehlike: {label: 'Kırmızı tehlike', tint: ['rgba(170,25,25,0.12)', 'rgba(35,0,0,0.20)'], vignette: 'rgba(15,0,0,0.52)', filter: 'contrast(1.12) saturate(1.05) brightness(0.95)'},
  gunduz: {label: 'Aydınlık gündüz', tint: ['rgba(255,255,255,0)', 'rgba(40,50,70,0.06)'], vignette: 'rgba(0,0,0,0.22)', filter: 'contrast(1.03) saturate(1.04) brightness(1.04)'},
  kahve: {label: 'Sıcak iç mekân (amber)', tint: ['rgba(210,130,50,0.10)', 'rgba(55,28,8,0.15)'], vignette: 'rgba(20,8,0,0.42)', filter: 'contrast(1.05) saturate(1.06)'},
};

export const getPalette = (name?: string): Palette => PALETTES[(name as PaletteName) ?? 'neon'] ?? PALETTES.neon;
