import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/db.js';
import { Store } from '../src/store.js';
import { Vault } from '../src/crypto.js';
import { seedDemo } from '../src/demo.js';

let contents: string;
try { contents = await readFile('.env', 'utf8'); }
catch {
  contents = `NODE_ENV=development\nSHIELD_MODE=demo\nHOST=127.0.0.1\nPORT=3000\nPUBLIC_BASE_URL=http://127.0.0.1:3000\nEMBEDDED_DB_PATH=.data/shield\nDATA_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}\nDEMO_ACCESS_TOKEN=${randomBytes(32).toString('hex')}\n`;
  await writeFile('.env', contents, { flag: 'wx', mode: 0o600 });
}
const config = loadConfig(parseEnv(contents));
if (config.SHIELD_MODE !== 'demo') throw new Error('Existing .env is not a demo. Nothing was changed.');
await mkdir('.data', { recursive: true });
const db = await openDatabase(config);
try { await seedDemo(new Store(db, new Vault(config.DATA_ENCRYPTION_KEY), config)); }
finally { await db.close(); }
await mkdir('ios/Config', { recursive: true });
await writeFile('ios/Config/Local.xcconfig', `// Local-only development settings. Do not commit.\nSHIELD_API_SCHEME = http\nSHIELD_API_HOST = 127.0.0.1:3000\nSHIELD_DEMO_TOKEN = ${config.DEMO_ACCESS_TOKEN}\n`, { mode: 0o600 });
console.log('Local demo database and iOS Debug settings are ready. Run npm run dev. No telephone calls were placed.');
