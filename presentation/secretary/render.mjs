// Renders each scene in index.html to an MP4 for Google Slides.
//
//   npm run render                      all scenes, plus an all-scenes preview
//   npm run render -- 3 5               only scenes 3 and 5
//   npm run render -- --snap 3:2.5 4:6  still frames for checking layout
//   npm run render -- --fps 30          a lower frame rate (default 60)
//
// Each clip plays its scene once, then holds the final frame (with a blinking
// secretary) so the video never ends while you're still talking on that slide.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out');
const CLIP_SECONDS = 60; // total clip length, including the held ending
const LOOP_SECONDS = 8; // idle loop for the held ending (blink period is 4 s)
const PREVIEW_HOLD = 1.5;

const args = process.argv.slice(2);
const fpsIndex = args.indexOf('--fps');
const FPS = fpsIndex >= 0 ? Number(args.splice(fpsIndex, 2)[1]) : 60;
const snapIndex = args.indexOf('--snap');
const snaps = snapIndex >= 0 ? args.slice(snapIndex + 1) : [];
const only = (snapIndex >= 0 ? args.slice(0, snapIndex) : args).map(Number).filter(Boolean);

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`${pathToFileURL(path.join(here, 'index.html')).href}?render=1`);
await page.evaluate(() => document.fonts.ready);
const scenes = await page.evaluate(() => window.SCENE_INFO);

const frame = async (k, t) => {
  await page.evaluate(([k, t]) => window.seek(k, t), [k, t]);
  return page.screenshot({ type: 'png' });
};

if (snaps.length) {
  for (const spec of snaps) {
    const [n, t] = spec.split(':').map(Number);
    const file = path.join(outDir, `snap-${n}-${t}.png`);
    await writeFile(file, await frame(n - 1, t));
    console.log(file);
  }
  await browser.close();
  process.exit(0);
}

function encoder(file) {
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ff.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));
  return {
    write: buf => new Promise(resolve => (ff.stdin.write(buf) ? resolve() : ff.stdin.once('drain', resolve))),
    end: () => { ff.stdin.end(); return done; },
  };
}

const preview = only.length ? null : encoder(path.join(outDir, '00-all-scenes-preview.mp4'));
for (const [k, sc] of scenes.entries()) {
  if (only.length && !only.includes(k + 1)) continue;
  const name = `${String(k + 1).padStart(2, '0')}-${sc.id}`;
  const started = Date.now();
  const clip = encoder(path.join(outDir, `${name}.mp4`));

  const actionFrames = Math.round(sc.dur * FPS);
  for (let f = 0; f < actionFrames; f++) {
    const buf = await frame(k, f / FPS);
    await clip.write(buf);
    if (preview) await preview.write(buf);
  }
  const loop = [];
  for (let f = 0; f < LOOP_SECONDS * FPS; f++) loop.push(await frame(k, sc.dur + f / FPS));
  for (let written = actionFrames; written < CLIP_SECONDS * FPS;) {
    for (const buf of loop) { await clip.write(buf); written++; }
  }
  if (preview) for (const buf of loop.slice(0, PREVIEW_HOLD * FPS)) await preview.write(buf);
  await writeFile(path.join(outDir, `${name}.png`), loop[0]);
  await clip.end();
  console.log(`${name}.mp4  (${sc.dur.toFixed(1)} s of action, ${((Date.now() - started) / 1000).toFixed(0)} s to render)`);
}
if (preview) await preview.end();
await browser.close();
