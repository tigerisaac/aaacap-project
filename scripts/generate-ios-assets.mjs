import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

const assets = path.resolve(import.meta.dirname, '../ios/Shield/Resources/Assets.xcassets');
const writeJSON = async (directory, value) => { await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, 'Contents.json'), JSON.stringify(value, null, 2) + '\n'); };
const info = { author: 'xcode', version: 1 };
await writeJSON(assets, { info });
const colors = { Action: ['#224CC5', '#9BB3FF'], Held: ['#B53742', '#FF9B9C'], Connected: ['#076C5C', '#74DDC6'], Message: ['#7244B9', '#CAAEFF'], Surface: ['#F7F7F2', '#171918'] };
for (const [name, pair] of Object.entries(colors)) {
  const colors = pair.map((hex, index) => ({ idiom: 'universal', ...(index ? { appearances: [{ appearance: 'luminosity', value: 'dark' }] } : {}),
    color: { 'color-space': 'srgb', components: { red: `0x${hex.slice(1, 3)}`, green: `0x${hex.slice(3, 5)}`, blue: `0x${hex.slice(5, 7)}`, alpha: '1.000' } } }));
  await writeJSON(path.join(assets, `${name}.colorset`), { colors, info });
}
// Original geometric artwork. Same polygons generate the vector source and opaque PNG.
const polygons = [
  { fill: '#FFFFFF', points: [[512,174],[810,280],[780,616],[690,748],[512,866],[334,748],[244,616],[214,280]] },
  { fill: '#224CC5', points: [[512,258],[724,332],[698,586],[623,686],[512,766],[401,686],[326,586],[300,332]] },
  { fill: '#74DDC6', points: [[359,475],[414,432],[488,527],[645,362],[697,413],[483,641]] }
];
const source = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#224CC5"/>${polygons.map(p => `<polygon points="${p.points.map(v => v.join(',')).join(' ')}" fill="${p.fill}"/>`).join('')}</svg>\n`;
await mkdir(path.resolve(assets, '../../../../artwork'), { recursive: true });
await writeFile(path.resolve(assets, '../../../../artwork/shield-icon.svg'), source);
const rgb = color => [1, 3, 5].map(offset => Number.parseInt(color.slice(offset, offset + 2), 16));
const inside = (x, y, points) => {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
};
const palette = polygons.map(p => ({ ...p, rgb: rgb(p.fill) }));
const raw = Buffer.alloc(1024 * (1 + 1024 * 3));
for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
  const totals = [0,0,0];
  for (const dy of [0.25,0.75]) for (const dx of [0.25,0.75]) {
    let value = [34,76,197];
    for (const polygon of palette) if (inside(x + dx, y + dy, polygon.points)) value = polygon.rgb;
    for (let channel = 0; channel < 3; channel++) totals[channel] += value[channel];
  }
  const offset = y * 3073 + 1 + x * 3;
  totals.forEach((value, channel) => { raw[offset + channel] = Math.round(value / 4); });
}
const crc32 = data => { let value = 0xffffffff; for (const byte of data) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; };
const chunk = (name, data) => { const kind = Buffer.from(name); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([kind,data]))); return Buffer.concat([length,kind,data,crc]); };
const header = Buffer.alloc(13); header.writeUInt32BE(1024); header.writeUInt32BE(1024,4); header[8] = 8; header[9] = 2;
const icon = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),
  chunk('tEXt',Buffer.from('Source\0Original project artwork, artwork/shield-icon.svg; rasterized by scripts/generate-ios-assets.mjs. No external assets.')),
  chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
const iconDirectory = path.join(assets, 'AppIcon.appiconset');
await writeJSON(iconDirectory, { images: [{ filename: 'AppIcon.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info });
await writeFile(path.join(iconDirectory, 'AppIcon.png'), icon);
console.log('Generated light/dark semantic colors and original app icon.');
