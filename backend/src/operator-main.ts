import { readFile } from 'node:fs/promises';
import twilio from 'twilio';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { openDatabase } from './db.js';
import { Store } from './store.js';
import { Vault } from './crypto.js';
import { Operations } from './operations.js';
import { modelConfigured } from './model-config.js';

const [command, argument] = process.argv.slice(2);
const help = `Shield operator (trusted server shell only)
  doctor                         Check local configuration and database
  participants                   List IDs and setup states (no names/numbers)
  jobs                           List unresolved job counts
  carrier-import FILE.json       Import an immutable, evidenced carrier profile
  carrier-draft FILE.json        Store unvalidated setup/restoration instructions
  enroll FILE.json               Enroll a verified person using an owned Twilio DID
  record-test FILE.json          Record completed physical routing checks
  begin-test FILE.json           Open a 30-minute supervised routing test window
  end-test PARTICIPANT_UUID      Stop a supervised test window early
  activate PARTICIPANT_UUID      Activate after consent and current tests
  pause-all | resume-all         Change the global offer switch
  confirm-restoration FILE.json  Confirm carrier forwarding and voicemail restored
  purge-account PARTICIPANT_UUID Purge requested data after restoration
  retry-job JOB_UUID             Retry one failed durable job
No command purchases/releases phone numbers or edits carrier settings.`;
if (!command || command === 'help') { console.log(help); process.exit(0); }
const config = loadConfig();
const db = await openDatabase(config);
const store = new Store(db, new Vault(config.DATA_ENCRYPTION_KEY), config);
const ops = new Operations(store);
const input = async () => { if (!argument) throw new Error('A JSON file path is required.'); return JSON.parse(await readFile(argument, 'utf8')); };
try {
  switch (command) {
    case 'doctor': {
      await db.query('SELECT 1');
      console.log(JSON.stringify({ database: 'reachable', mode: config.SHIELD_MODE, origin: config.PUBLIC_BASE_URL,
        offersEnabled: config.LIVE_OFFERING_ENABLED, smsEnabled: config.SMS_CLASSIFICATION_ENABLED,
        modelConfigured: modelConfigured(config), screeningProvider: config.SCREENING_PROVIDER,
        globalOffersPaused: (await db.query("SELECT value FROM service_settings WHERE key='offers_paused'")).rows[0]?.value,
        note: 'This does not test provider credentials, carrier routing, or model quality.' }, null, 2));
      break;
    }
    case 'participants': console.log(JSON.stringify((await db.query('SELECT id,status,phone_verified_at,last_routing_test_at,restoration_requested_at,deletion_requested_at FROM participants ORDER BY created_at DESC')).rows, null, 2)); break;
    case 'jobs': console.log(JSON.stringify((await db.query("SELECT kind,status,count(*)::int AS count FROM jobs WHERE status <> 'done' GROUP BY kind,status")).rows, null, 2)); break;
    case 'carrier-import': console.log('Profile imported:', await ops.importCarrier(await input())); break;
    case 'carrier-draft': console.log('Unvalidated profile:', await ops.createCarrierDraft(await input())); break;
    case 'enroll': console.log('Participant enrolled:', await ops.enroll(await input(), async number => {
      if (config.SHIELD_MODE !== 'live') throw new Error('Use demo:setup for synthetic enrollment.');
      const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, { timeout: 5000, autoRetry: false });
      const owned = await client.incomingPhoneNumbers.list({ phoneNumber: number, limit: 2 });
      if (owned.length !== 1 || !owned[0]?.capabilities.voice) throw new Error('The configured Twilio account must own this voice-enabled number.');
      if (owned[0].voiceUrl !== `${config.PUBLIC_BASE_URL}/voice/inbound` || owned[0].statusCallback !== `${config.PUBLIC_BASE_URL}/voice/status`
        || owned[0].voiceMethod !== 'POST' || owned[0].statusCallbackMethod !== 'POST') throw new Error('Configure and verify the Twilio voice and status webhooks first.');
    })); break;
    case 'record-test': await ops.recordRoutingTest(await input()); console.log('Routing test recorded.'); break;
    case 'begin-test': await ops.beginSupervisedTest(await input()); console.log('Supervised test window opened for 30 minutes; global switches and all acceptance gates still apply.'); break;
    case 'end-test': await ops.endSupervisedTest(argument ?? ''); console.log('Supervised test window closed; forwarding is unchanged.'); break;
    case 'activate': await ops.activate(argument ?? ''); console.log('Participant activated; the global service switches still apply.'); break;
    case 'pause-all': case 'resume-all': await ops.pauseAll(command === 'pause-all'); console.log('Global offer switch updated.'); break;
    case 'confirm-restoration': await ops.confirmRestoration(await input()); console.log('Restoration recorded. The DID remains reserved.'); break;
    case 'purge-account': await ops.purgeRequestedAccount(argument ?? ''); console.log('Local personal data removed; provider recording purge queued. Follow the provider-auth and backup deletion runbook.'); break;
    case 'retry-job': {
      const id = z.string().uuid().parse(argument);
      const result = await db.query("UPDATE jobs SET status='pending',attempts=0,available_at=now(),locked_at=NULL WHERE id=$1 AND status='failed' RETURNING id", [id]);
      console.log(result.rows.length ? 'Job queued for retry.' : 'No failed job with that ID.'); break;
    }
    default: throw new Error('Unknown command. Run operator help.');
  }
} catch (error) {
  // Database/provider error details may include phone numbers or credentials.
  console.error(error instanceof z.ZodError ? 'Invalid input. Check the operator schema and evidence fields.' : 'Operation failed. Check the runbook, input, participant state, and provider configuration.');
  process.exitCode = 1;
} finally { await db.close(); }
