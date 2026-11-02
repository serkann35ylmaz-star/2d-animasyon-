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
const inputProps = {slug};
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
const out = path.join(outDir, `${slug}${draft ? '-draft' : ''}.mp4`);
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: out,
  inputProps,
  browserExecutable,
  chromiumOptions,
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
// Ses seviyesi: TikTok/Reels standardı -14 LUFS, tepe -1.5 dBTP (patlama/cızırtı olmaz)
console.log('\n• Ses normalize ediliyor (-14 LUFS)…');
const tmp = out.replace(/\.mp4$/, '.tmp.mp4');
// İki geçiş: önce ölç, sonra ölçüme göre doğrusal ayarla (tek geçiş kısa videolarda -15/-16'da kalıyor)
const LN = 'loudnorm=I=-14:TP=-1.5:LRA=11';
const probe = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', out, '-af', `${LN}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'});
const m = (probe.stderr || '').match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
let af = LN;
if (m) {
  const j = JSON.parse(m[0]);
  af = `${LN}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
}
// Sonda tepe sınırlayıcı: -2 dBFS üstünü yumuşakça keser (efekt darbelerinde cızırtı olmaz)
af += ',alimiter=limit=0.79:level=false:attack=2:release=80';
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-c:v', 'copy', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp]);
renameSync(tmp, out);
console.log(`✓ Video: ${path.relative(ROOT, out)}`);
