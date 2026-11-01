import {Config} from '@remotion/cli/config';
import {existsSync} from 'node:fs';

// Bu ortamda önceden kurulu headless Chromium var; varsa onu kullan.
const HEADLESS = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (existsSync(HEADLESS)) {
  Config.setBrowserExecutable(HEADLESS);
}
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
