// Builds out/secretary-scenes.pptx: the six scenes as native slides for Google Slides.
//
//   npm run slides
//
// Each scene is one slide. Every beat is captured from index.html as a still
// frame; the parts that change between beats are cropped out and stacked on the
// slide with Fade-in animations (On click / After previous). Clicking through a
// slide plays the scene with Google Slides' own animations, so nothing streams.

import { chromium } from 'playwright-core';
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';
import { PNG } from 'pngjs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(here, 'build');
const outFile = path.join(here, 'out', 'secretary-scenes.pptx');

const SCALE = 2; // 3840×2160 stills so text stays sharp on large screens
const W = 1920 * SCALE;
const H = 1080 * SCALE;
const CELL = 8 * SCALE; // diff grid: 8 px at 1x keeps every crop on a whole-EMU boundary
const PX_PER_IN = 192 * SCALE; // a 16:9 slide is 10 in wide
const END = 1e9;

// Beats per scene. T = scene time in index.html; every tween started by T is shown finished.
// on: 'after' (After previous; a slide's first 'after' starts by itself), 'click', or 'pause'.
const SCENES = [
  {
    title: 'Meet your secretary',
    steps: [
      { on: 'after', T: 0.45, label: 'Title' },
      { on: 'after', T: 1.0, label: 'The secretary at her desk', ms: 600 },
      { on: 'after', T: 1.5, label: 'Caller and your phone' },
      { on: 'after', T: END, label: 'Phone lines and labels' },
    ],
  },
  {
    title: 'Contacts ring straight through',
    steps: [
      { on: 'after', T: 0.5, label: 'Title' },
      { on: 'click', T: 1.1, label: 'Mom calls' },
      { on: 'after', T: 2.0, label: 'Secretary takes her headset off: not listening' },
      { on: 'after', T: 2.2, over: { 'arc.d': 0.45 }, label: 'Call skips the secretary', ms: 300 },
      { on: 'after', T: 2.2, label: 'Call skips the secretary', ms: 300 },
      { on: 'after', T: 3.7, label: 'Your phone rings' },
      { on: 'click', T: END, label: 'You answer' },
    ],
  },
  {
    title: 'Shield questions unknown callers first',
    steps: [
      { on: 'after', T: 0.42, label: 'Title' },
      { on: 'click', T: 1.25, label: 'Unknown number calls; secretary puts her headset on' },
      { on: 'after', T: 1.5, over: { 'A.blue': 0.45 }, label: 'Call reaches the secretary', ms: 300 },
      { on: 'after', T: 2.35, label: 'Screening starts; your phone stays quiet' },
      { on: 'after', T: 2.45, label: 'Shield asks who is calling and why' },
      { on: 'click', T: 5.3, label: 'Caller: "the tax office"' },
      { on: 'after', T: 6.55, label: 'Who: noted' },
      { on: 'click', T: END, label: 'Why is missing, so Shield asks a follow-up' },
    ],
  },
  {
    title: 'Scam calls end with Shield',
    steps: [
      { on: 'after', T: 0.29, label: 'Title' },
      { on: 'click', T: 0.6, label: 'Caller demands gift cards' },
      { on: 'after', T: 3.05, label: 'The reason is flagged' },
      { on: 'pause', ms: 400 },
      { on: 'after', T: 4.12, label: 'Secretary raises a hand', ms: 400 },
      { on: 'after', T: 4.3, over: { 'A.red': 0.5 }, label: 'Line is cut', ms: 250 },
      { on: 'after', T: 4.6, label: 'Line is cut', ms: 250 },
      { on: 'after', T: 4.7, label: 'Call ended', ms: 400 },
      { on: 'after', T: 5.3, label: 'Held; your phone never rang' },
      { on: 'after', T: END, label: 'Secretary lowers her hand' },
    ],
  },
  {
    title: 'Routine calls are offered to you',
    steps: [
      { on: 'after', T: 0.43, label: 'Title' },
      { on: 'click', T: 1.0, label: 'Another unknown number calls' },
      { on: 'after', T: 1.2, over: { 'A.blue': 0.45 }, label: 'Call reaches the secretary', ms: 300 },
      { on: 'after', T: 2.05, label: 'Shield asks who is calling and why' },
      { on: 'click', T: 3.3, label: 'Caller gives a reason but no name' },
      { on: 'after', T: 4.85, label: 'Why: noted' },
      { on: 'click', T: 5.55, label: 'Shield asks a follow-up: who is calling?' },
      { on: 'click', T: 6.8, label: 'Caller: "Maria from Dr. Lee\'s office"' },
      { on: 'after', T: 7.95, label: 'Who: noted' },
      { on: 'click', T: 8.5, label: 'Shield: "Please hold while Shield offers your call."' },
      { on: 'after', T: 9.05, label: 'Secretary passes it to you', ms: 400 },
      { on: 'after', T: 9.3, over: { 'B.blue': 0.45 }, label: 'Call goes to your phone', ms: 300 },
      { on: 'after', T: 10.18, label: 'Your phone shows the summary: you decide' },
      { on: 'after', T: 10.6, label: 'Secretary lowers her arm', ms: 400 },
      { on: 'click', T: 11.55, label: 'You press 1', ms: 200 },
      { on: 'after', T: END, label: 'Connected', ms: 600 },
    ],
  },
  {
    title: 'Shield stays on the line',
    steps: [
      { on: 'after', T: 0.3, label: 'Title' },
      { on: 'after', T: 0.9, label: 'Shield keeps listening (optional feature note)' },
      { on: 'click', T: 1.3, label: 'Caller: "You\'re all set for 10 a.m."' },
      { on: 'after', T: 2.8, label: 'You: "Perfect, thank you!"' },
      { on: 'click', T: 4.0, label: 'Caller asks for the texted code' },
      { on: 'after', T: 6.45, label: 'The request is flagged' },
      { on: 'after', T: 6.8, label: 'Secretary steps in', ms: 400 },
      { on: 'after', T: 6.9, over: { 'A.red': 0.5 }, label: 'Line is cut', ms: 250 },
      { on: 'after', T: 7.4, label: 'Call ended; Shield warns you' },
      { on: 'after', T: 7.8, label: 'Your phone shows why' },
      { on: 'pause', ms: 600 },
      { on: 'after', T: END, label: 'Code kept private', ms: 600 },
    ],
  },
];

/* ---------- Capture ---------- */
await rm(buildDir, { recursive: true, force: true });
await mkdir(buildDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--force-color-profile=srgb', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE });
await page.goto(`${pathToFileURL(path.join(here, 'index.html')).href}?render=1`);
await page.evaluate(() => document.fonts.ready);
const still = async (k, T, over = {}) => {
  await page.evaluate(([k, T, over]) => window.still(k, T, over), [k, T, over]);
  return PNG.sync.read(await page.screenshot({ type: 'png' }));
};

/* ---------- Diff two stills into changed rectangles ---------- */
function changedRects(a, b) {
  const gw = W / CELL, gh = H / CELL;
  // A cell changes when several of its pixels clearly differ; stray anti-aliasing noise is ignored.
  const counts = new Uint16Array(gw * gh);
  const A = a.data, B = b.data;
  for (let y = 0; y < H; y++) {
    const gy = (y / CELL) | 0;
    for (let x = 0, i = y * W * 4; x < W; x++, i += 4) {
      if (Math.abs(A[i] - B[i]) > 16 || Math.abs(A[i + 1] - B[i + 1]) > 16 || Math.abs(A[i + 2] - B[i + 2]) > 16) counts[gy * gw + ((x / CELL) | 0)]++;
    }
  }
  const grid = counts.map(n => (n >= 4 ? 1 : 0));
  // Grow each changed cell by one so anti-aliased edges are always included.
  const grown = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (!grid[y * gw + x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) grown[yy * gw + xx] = 1;
    }
  }
  // Bounding boxes of connected regions, then merge boxes that touch or nearly touch.
  const seen = new Uint8Array(gw * gh);
  let boxes = [];
  for (let start = 0; start < gw * gh; start++) {
    if (!grown[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let x0 = gw, y0 = gh, x1 = 0, y1 = 0;
    while (stack.length) {
      const c = stack.pop(), cx = c % gw, cy = (c / gw) | 0;
      x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, n = ny * gw + nx;
        if (nx >= 0 && nx < gw && ny >= 0 && ny < gh && grown[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      }
    }
    boxes.push([x0, y0, x1 + 1, y1 + 1]);
  }
  const GAP = 10; // cells; nearby changes become one picture so each beat stays a few layers
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [a0, b0, a1, b1] = boxes[i], [c0, d0, c1, d1] = boxes[j];
      if (a0 - GAP <= c1 && c0 - GAP <= a1 && b0 - GAP <= d1 && d0 - GAP <= b1) {
        boxes[i] = [Math.min(a0, c0), Math.min(b0, d0), Math.max(a1, c1), Math.max(b1, d1)];
        boxes.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }
  return boxes.map(([x0, y0, x1, y1]) => ({ x: x0 * CELL, y: y0 * CELL, w: (x1 - x0) * CELL, h: (y1 - y0) * CELL }));
}
function crop(png, r) {
  const out = new PNG({ width: r.w, height: r.h });
  PNG.bitblt(png, out, r.x, r.y, r.w, r.h, 0, 0);
  return out;
}
const inches = px => px / PX_PER_IN;

/* ---------- Build the deck ---------- */
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title = 'Shield: your call secretary';
const pausePng = new PNG({ width: 8, height: 8 }); // fully transparent; its fade-in is a timed pause
const pausePath = path.join(buildDir, 'pause.png');
await writeFile(pausePath, PNG.sync.write(pausePng));

const plan = []; // per slide: ordered effects { name, on, ms }
let prevEnd = null;
for (const [k, scene] of SCENES.entries()) {
  const slide = pres.addSlide();
  const effects = [];
  let current = await still(k, -1); // = end of the previous scene, so slide changes are seamless
  if (prevEnd && changedRects(prevEnd, current).length) {
    await writeFile(path.join(buildDir, 'mismatch-a.png'), PNG.sync.write(prevEnd));
    await writeFile(path.join(buildDir, 'mismatch-b.png'), PNG.sync.write(current));
    throw new Error(`Scene ${k + 1} does not start where scene ${k} ends: ${JSON.stringify(changedRects(prevEnd, current))}`);
  }
  const basePath = path.join(buildDir, `s${k + 1}-base.png`);
  await writeFile(basePath, PNG.sync.write(current));
  slide.addImage({ path: basePath, x: 0, y: 0, w: 10, h: 5.625, objectName: `Scene ${k + 1} start` });

  let pauseCount = 0;
  const notes = [`${scene.title}. Advance with → or a clicker.`];
  let click = 0;
  for (const [j, step] of scene.steps.entries()) {
    if (step.on === 'pause') {
      const name = `Scene ${k + 1} pause ${++pauseCount}`;
      slide.addImage({ path: pausePath, x: 0, y: 0, w: 0.04, h: 0.04, objectName: name });
      effects.push({ name, on: 'after', ms: step.ms });
      continue;
    }
    const next = await still(k, step.T, step.over);
    const rects = changedRects(current, next);
    if (step.on === 'click') notes.push(`Click ${++click}: ${step.label}`);
    else if (j > 0 || k === 0) notes.push(`   then: ${step.label}`);
    if (!rects.length) { // keep the click count honest even if nothing visible changes
      const name = `Scene ${k + 1} step ${j + 1}`;
      slide.addImage({ path: pausePath, x: 0, y: 0, w: 0.04, h: 0.04, objectName: name });
      effects.push({ name, on: step.on, ms: 100 });
    }
    rects.forEach((r, i) => {
      const name = `Scene ${k + 1} step ${j + 1}${rects.length > 1 ? `.${i + 1}` : ''}: ${step.label}`.replace(/[^\w .:,-]/g, '');
      const file = path.join(buildDir, `s${k + 1}-step${j + 1}-${i + 1}.png`);
      plan.push(writeFile(file, PNG.sync.write(crop(next, r))));
      slide.addImage({ path: file, x: inches(r.x), y: inches(r.y), w: inches(r.w), h: inches(r.h), objectName: name });
      effects.push({ name, on: i === 0 ? step.on : 'with', ms: step.ms ?? 500 });
    });
    current = next;
  }
  if (changedRects(current, await still(k, END)).length) throw new Error(`Scene ${k + 1} does not finish on its end state`);
  prevEnd = current;
  slide.addNotes(notes.join('\n'));
  scene.effects = effects;
}
await Promise.all(plan);
await browser.close();
await pres.writeFile({ fileName: outFile });

/* ---------- Add the animations (pptxgenjs can't write them) ---------- */
function timingXml(effects) {
  let id = 2;
  const next = () => ++id;
  const groups = [];
  for (const e of effects) {
    if (e.on === 'click' || !groups.length) groups.push({ auto: e.on !== 'click', subs: [[e]] });
    else if (e.on === 'after') groups.at(-1).subs.push([e]);
    else groups.at(-1).subs.at(-1).push(e);
  }
  let body = '';
  for (const g of groups) {
    const gid = next();
    let subs = '';
    let at = 0;
    g.subs.forEach((list, si) => {
      const sid = next();
      let fx = '';
      list.forEach((e, ei) => {
        const nodeType = ei > 0 ? 'withEffect' : si === 0 && !g.auto ? 'clickEffect' : 'afterEffect';
        const [a, b, c] = [next(), next(), next()];
        fx += `<p:par><p:cTn id="${a}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" nodeType="${nodeType}">`
          + `<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>`
          + `<p:set><p:cBhvr><p:cTn id="${b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>`
          + `<p:tgtEl><p:spTgt spid="${e.spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>`
          + `<p:to><p:strVal val="visible"/></p:to></p:set>`
          + `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${c}" dur="${e.ms}"/>`
          + `<p:tgtEl><p:spTgt spid="${e.spid}"/></p:tgtEl></p:cBhvr></p:animEffect>`
          + `</p:childTnLst></p:cTn></p:par>`;
      });
      subs += `<p:par><p:cTn id="${sid}" fill="hold"><p:stCondLst><p:cond delay="${at}"/></p:stCondLst><p:childTnLst>${fx}</p:childTnLst></p:cTn></p:par>`;
      at += Math.max(...list.map(e => e.ms));
    });
    const cond = g.auto
      ? '<p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond>'
      : '<p:cond delay="indefinite"/>';
    body += `<p:par><p:cTn id="${gid}" fill="hold"><p:stCondLst>${cond}</p:stCondLst><p:childTnLst>${subs}</p:childTnLst></p:cTn></p:par>`;
  }
  return '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
    + `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${body}</p:childTnLst></p:cTn>`
    + '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
    + '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
    + '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>';
}

const zip = await JSZip.loadAsync(await readFile(outFile));
for (const [k, scene] of SCENES.entries()) {
  const file = `ppt/slides/slide${k + 1}.xml`;
  let xml = await zip.file(file).async('string');
  const ids = new Map([...xml.matchAll(/<p:cNvPr id="(\d+)" name="([^"]*)"/g)].map(m => [m[2], m[1]]));
  for (const e of scene.effects) {
    e.spid = ids.get(e.name);
    if (!e.spid) throw new Error(`No shape named "${e.name}" on slide ${k + 1}`);
  }
  if (xml.includes('<p:timing')) throw new Error(`${file} already has timing`);
  const at = xml.includes('</p:clrMapOvr>') ? xml.indexOf('</p:clrMapOvr>') + '</p:clrMapOvr>'.length : xml.lastIndexOf('</p:sld>');
  xml = xml.slice(0, at) + timingXml(scene.effects) + xml.slice(at);
  zip.file(file, xml);
}
await writeFile(outFile, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));

for (const [k, scene] of SCENES.entries()) {
  const clicks = scene.effects.filter(e => e.on === 'click').length;
  console.log(`Slide ${k + 1}: ${scene.title} — ${scene.effects.length} animations, ${clicks} click${clicks === 1 ? '' : 's'}`);
}
console.log(outFile);
