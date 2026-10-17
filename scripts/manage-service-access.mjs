import { readFile } from 'node:fs/promises';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { cloudSchema } from '../dist/cloud/config.js';
import { CloudStore } from '../dist/cloud/store.js';
import { ServiceAccess } from '../dist/cloud/service-access.js';

// Operator-only; dry run unless --confirm is explicitly supplied after owner approval.
// No phone calls, texts, carrier changes, charges, or store-product changes.
const value = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const approval = z.object({ uid: z.string().min(1).max(128), participantId: z.string().uuid(), country: z.enum(['US', 'CA']),
  carrier: z.string().min(1).max(50), audience: z.enum(['public', 'pilot']), operator: z.string().min(1).max(128),
  allowSandbox: z.boolean().optional() }).strict();

async function main() {
  const input = value('--input'), project = value('--project');
  if (!input || !project) throw new Error('input_and_project_required');
  if (process.env.FIRESTORE_EMULATOR_HOST && !process.argv.includes('--emulator')) throw new Error('unexpected_emulator');
  if (process.argv.includes('--emulator') && (!project.startsWith('demo-') || !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? ''))) throw new Error('local_demo_emulator_required');
  const config = cloudSchema.parse(JSON.parse(await readFile(value('--runtime') ?? 'artifacts/private/firebase-runtime.json', 'utf8')));
  if (config.FIREBASE_PROJECT_ID !== project) throw new Error('project_mismatch');
  const data = approval.parse(JSON.parse(await readFile(input, 'utf8')));
  const app = initializeApp({ projectId: project, ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }) });
  const db = getFirestore(app);
  try {
    const access = new ServiceAccess(new CloudStore(db, config));
    const result = await access.approve(data, !process.argv.includes('--confirm'));
    console.log(JSON.stringify({ ...result, phoneChanges: false, charges: false }));
  } finally { await db.terminate(); await deleteApp(app); }
}
main().catch(error => {
  console.error(/^[a-z_0-9]+$/.test(error.message ?? '') ? error.message : 'service_access_operation_failed');
  process.exitCode = 1;
});
