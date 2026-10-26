import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const config = JSON.parse(await readFile(new URL('site.json', import.meta.url), 'utf8'));
for (const key of ['appStoreUrl', 'privacyUrl', 'supportUrl']) {
  const url = new URL(config[key]);
  if (url.protocol !== 'https:') throw new Error(`${key} must use HTTPS`);
}
if (typeof config.appStoreLive !== 'boolean') throw new Error('appStoreLive must be a boolean');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const live = config.appStoreLive;
const values = {
  DESCRIPTION: `Shield screens unfamiliar calls, saves useful voicemail, and lets you choose who gets through. ${live ? 'Available for iPhone.' : 'Coming soon to iPhone.'}`,
  SOCIAL_DESCRIPTION: `Call screening with you in control. ${live ? 'Available for iPhone.' : 'Coming soon to iPhone.'}`,
  APP_URL: live ? config.appStoreUrl : '#iphone',
  APP_LABEL: live ? 'Get Shield for iPhone' : 'Coming soon to iPhone',
  RELEASE_TITLE: live ? 'A quieter phone starts here.' : 'A quieter phone is on its way.',
  RELEASE_COPY: live ? 'Meet Shield: Call Protection, available on the App Store.' : 'Shield: Call Protection is coming to the App Store. We’re getting the last details ready.',
  RELEASE_LINK: live ? config.appStoreUrl : config.supportUrl,
  RELEASE_LINK_LABEL: live ? 'View on the App Store' : 'Contact Shield',
  PRIVACY_URL: config.privacyUrl,
  SUPPORT_URL: config.supportUrl,
};
let html = await readFile(`${root}index.html`, 'utf8');
for (const [key, value] of Object.entries(values)) html = html.replaceAll(`{{${key}}}`, escape(value));
if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error('Unresolved website template value');
await rm(`${root}dist`, { recursive: true, force: true });
await mkdir(`${root}dist`, { recursive: true });
await writeFile(`${root}dist/index.html`, html);
await cp(`${root}styles.css`, `${root}dist/styles.css`);
await cp(`${root}assets`, `${root}dist/assets`, { recursive: true });
console.log(`Built Shield website (${live ? 'App Store link enabled' : 'coming soon'}).`);
