#!/usr/bin/env node
// Bölümü MP4 olarak (ya da storyboard kareleri olarak) render eder.
//
//   node scripts/render.mjs <slug>                 -> out/<slug>.mp4 (1080x1920, 30fps, H.264)
//   node scripts/render.mjs <slug> --draft         -> yarım çözünürlük, hızlı önizleme
//   node scripts/render.mjs <slug> --stills        -> her sahneden bir kare + out/<slug>-storyboard.jpg
//   node scripts/render.mjs <slug> --frames=0-90   -> belirli kare aralığı
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, renameSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--')) ?? 'demo';
const flag = (n) => args.some((a) => a === `--${n}`);
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

if (!existsSync(path.join(ROOT, 'public/episodes', slug, 'episode.json'))) {
  console.error(`✗ public/episodes/${slug}/episode.json bulunamadı`);
  process.exit(1);
}

const HEADLESS = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = process.env.REMOTION_BROWSER ?? (existsSync(HEADLESS) ? HEADLESS : null);
const chromiumOptions = {gl: 'swangle'};

console.log('• Paketleniyor…');
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
const series = args.includes('--dizi'); // YouTube dizi modu: soru/yarın kartı/yorum şeridi yok, başta bölüm kartı
const inputProps = series ? {slug, series: true} : {slug};
const composition = await selectComposition({serveUrl, id: 'Episode', inputProps, browserExecutable, chromiumOptions});
const tl = composition.props.timeline;
console.log(
  `• "${composition.props.episode.title}" — ${tl.scenes.length} sahne, ${(composition.durationInFrames / composition.fps).toFixed(1)} sn` +
    (tl.estimated ? '  (ses yok: tahmini zamanlama)' : ''),
);
for (const w of tl.warnings) console.warn('  ⚠ ' + w);

const outDir = path.join(ROOT, 'out');
mkdirSync(outDir, {recursive: true});

if (flag('stills')) {
  const dir = path.join(outDir, `${slug}-stills`);
  rmSync(dir, {recursive: true, force: true});
  mkdirSync(dir, {recursive: true});
  for (const s of tl.scenes) {
    const frame = s.from + Math.min(s.durationInFrames - 1, Math.round(s.durationInFrames * 0.7));
    const file = path.join(dir, `${String(s.index + 1).padStart(2, '0')}.jpg`);
    await renderStill({composition, serveUrl, output: file, frame, inputProps, browserExecutable, chromiumOptions, scale: 0.5, imageFormat: 'jpeg', jpegQuality: 88});
    process.stdout.write(`\r• Kare ${s.index + 1}/${tl.scenes.length}`);
  }
  const cols = Math.min(6, tl.scenes.length);
  const rows = Math.ceil(tl.scenes.length / cols);
  const sheet = path.join(outDir, `${slug}-storyboard.jpg`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-start_number', '1', '-i', path.join(dir, '%02d.jpg'), '-vf', `scale=360:-1,tile=${cols}x${rows}:padding=8:color=0x111111`, '-frames:v', '1', sheet]);
  console.log(`\n✓ Storyboard: ${path.relative(ROOT, sheet)}`);
  process.exit(0);
}

const draft = flag('draft');
const frames = opt('frames')?.split('-').map(Number);
const out = path.join(outDir, `${slug}${series ? '-dizi' : ''}${draft ? '-draft' : ''}.mp4`);
let last = -1;
const audioOnly = flag('audio'); // sadece sesi yeniden üret + videoya ekle (görüntü aynı kalır)
if (audioOnly && !existsSync(out)) throw new Error(`--audio için önce video gerekli: ${out}`);
if (!audioOnly) await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: out,
  inputProps,
  browserExecutable,
  chromiumOptions,
  timeoutInMilliseconds: 120000, // tek karede takılma tüm render'ı düşürmesin
  crf: draft ? 28 : 18,
  pixelFormat: 'yuv420p',
  audioCodec: 'aac',
  audioBitrate: '192k',
  scale: draft ? 0.5 : 1,
  imageFormat: 'jpeg',
  jpegQuality: draft ? 80 : 95,
  concurrency: Math.max(1, Math.min(8, os.cpus().length)),
  frameRange: frames && frames.length === 2 ? [frames[0], frames[1]] : null,
  onProgress: ({progress}) => {
    const p = Math.floor(progress * 100);
    if (p !== last) {
      last = p;
      if (p % 5 === 0) process.stdout.write(`\r• Render: %${p}   `);
    }
  },
});
// Ses (mastering): TikTok/Reels standardı -14 LUFS, tepe ≤ -1,5 dBTP.
// Ses kayıpsız WAV olarak ayrıca çıkarılır → yumuşak kompresör → kazanç → -2 dBFS sınırlayıcı.
// Kazanç, hedefe oturana kadar ölçülerek ayarlanır; videoya tek seferde AAC olarak eklenir.
// (Yalnız sınırlayıcıyla +5 dB vermek sesi bozuyor ve AAC sonrası tepeler +5 dB'ye fırlıyordu.)
console.log('\n• Ses hazırlanıyor (-14 LUFS)…');
const wav = out.replace(/\.mp4$/, '.master.wav');
// Tek bir karede tarayıcı takılırsa (28 sn varsayılan) tüm iş düşmesin: uzun bekleme + 2 deneme
for (let attempt = 1; ; attempt++) {
  try {
    await renderMedia({composition, serveUrl, codec: 'wav', outputLocation: wav, inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 120000, frameRange: frames && frames.length === 2 ? [frames[0], frames[1]] : null});
    break;
  } catch (e) {
    if (attempt >= 2) throw e;
    console.warn(`  ⚠ Ses adımı takıldı, yeniden deneniyor: ${e.message.split('\n')[0]}`);
  }
}
// ÇITIRTI ÇÖZÜMÜ (Kasım 2026): ham karışım çok kısık (~-31 LUFS) → +16 dB kazanç, TTS/efekt mikro tıklamalarını ve
// 5 ms ataklı limiter çıtırtısını duyulur yapıyordu. Zincir: adeclick (tıklama giderici) → yavaş kompresör
// (atak 20 ms, release 300 ms) → kazanç → yumuşak kırpma (asoftclip, limiter yerine) → yalnız aşırı tepeler için güvenlik limiter'ı.
// Ölçüm (bölüm 11): yeni çıtırtı olayı 26 → 2; konuşma yazıya dökme benzerliği %98,9; AAC sonrası gerçek tepe ≈ -1,2 dBTP.
const COMP = 'adeclick=w=55:o=75:a=2:t=2:b=2,acompressor=threshold=0.1:ratio=2.5:attack=20:release=300:knee=6';
const LIMIT = 'asoftclip=type=cubic:threshold=0.7,alimiter=limit=0.708:level=false:attack=3:release=60';
// (Bölüm 18: eşik 0.6 -> 0.7; çıtırtı olayı 7 -> 4. Daha sert kırpma AAC sonrası yeni tıklamalar üretiyordu.)
const chain = (g) => `${COMP},volume=${g.toFixed(2)}dB,${LIMIT}`;
const lufs = (af) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', `${af},ebur128`, '-f', 'null', '-'], {encoding: 'utf8'});
  const all = [...(r.stderr || '').matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
  return all.length ? parseFloat(all[all.length - 1][1]) : NaN;
};
let gain = 0;
for (let k = 0; k < 3; k++) {
  const now = lufs(chain(gain));
  if (!Number.isFinite(now)) break;
  gain += -14 - now;
}
const af = chain(gain);
const tmp = out.replace(/\.mp4$/, '.tmp.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', tmp]);
renameSync(tmp, out);
if (!process.env.KEEP_WAV) rmSync(wav, {force: true});
console.log(`✓ Video: ${path.relative(ROOT, out)}`);
