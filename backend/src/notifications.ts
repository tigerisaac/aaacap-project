import { connect } from 'node:http2';
import { importPKCS8, SignJWT } from 'jose';
import type { Config } from './config.js';
import type { Store } from './store.js';

export interface Notifier { notify(participantId: string): Promise<void>; }

export class PushNotifier implements Notifier {
  constructor(private readonly store: Store, private readonly config: Config) {}
  async notify(participantId: string): Promise<void> {
    if (!this.config.APNS_PRIVATE_KEY || !this.config.APNS_KEY_ID || !this.config.APNS_TEAM_ID) return;
    const key = await importPKCS8(this.config.APNS_PRIVATE_KEY.replace(/\\n/g, '\n'), 'ES256');
    const jwt = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: this.config.APNS_KEY_ID })
      .setIssuer(this.config.APNS_TEAM_ID).setIssuedAt().sign(key);
    const devices = (await this.store.db.query(`SELECT d.* FROM push_devices d JOIN participants p ON p.id=d.participant_id
      WHERE p.id=$1 AND p.status <> 'offboarded' AND (d.auth_subject=p.auth_subject OR EXISTS(
        SELECT 1 FROM caregiver_grants g WHERE g.participant_id=p.id AND g.grantee_subject=d.auth_subject AND g.accepted_at IS NOT NULL AND g.revoked_at IS NULL))`, [participantId])).rows;
    for (const device of devices) {
      const token = this.store.vault.open(device.token_enc, `push:${participantId}:${device.token_hash}`);
      const status = await this.send(token, jwt);
      if (status === 410) await this.store.db.query('DELETE FROM push_devices WHERE participant_id=$1 AND token_hash=$2', [participantId, device.token_hash]);
      else if (status !== 200) throw new Error('push_delivery_failed');
    }
  }
  private async send(token: string, jwt: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const client = connect(this.config.APNS_PRODUCTION ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com');
      const timer = setTimeout(() => { client.destroy(); reject(new Error('push_timeout')); }, 5000);
      client.on('error', () => { clearTimeout(timer); client.destroy(); reject(new Error('push_unavailable')); });
      const request = client.request({ ':method': 'POST', ':path': `/3/device/${token}`, authorization: `bearer ${jwt}`,
        'apns-topic': this.config.IOS_BUNDLE_ID, 'apns-push-type': 'alert', 'apns-priority': '5', 'apns-expiration': '0' });
      let status = 500;
      request.on('response', headers => { status = Number(headers[':status'] ?? 500); });
      request.on('data', () => {});
      request.on('error', () => { clearTimeout(timer); client.destroy(); reject(new Error('push_unavailable')); });
      request.on('end', () => { clearTimeout(timer); client.close(); resolve(status); });
      request.end(JSON.stringify({ aps: { alert: { title: 'Shield', body: 'There’s new activity to review.' }, sound: 'default' } }));
    });
  }
}
