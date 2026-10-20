import pilotLimits from './pilot-limits.json' with { type: 'json' };
import { connect } from 'node:http2';
import { createPrivateKey, sign, type KeyObject } from 'node:crypto';
import type { DocumentData, DocumentReference } from 'firebase-admin/firestore';
import type { CloudStore, Person } from './store.js';
import { TelnyxTextSender, submissionStatus, type TextSender } from './text-alerts.js';
import { CARETAKER_EVENT_RETENTION_MS } from './caretaker-inbox.js';
import { deletionRef } from './deletion-jobs.js';

// Push alerts for the person and the helpers they share with. An alert is queued as a contentless job in the same
// write as the event that causes it; `sendShieldAlert` composes fixed wording and sends it through APNs.

/** Fixed wording only. Lock-screen text never includes caller words or numbers; helpers see the person's name. */
export const ALERTS = {
  monitor_intervened: { helpers: (name: string) => `Shield detected a possible scam request during a call with ${name}. Check in with them.` },
  blocked_caller: { helpers: (name: string) => `A caller Shield blocked tried to reach ${name} again.` },
  voicemail_removed: { helpers: (name: string) => `Shield removed a scam voicemail left for ${name}.` },
  voicemail: { person: () => 'You have a new voicemail in Shield.', helpers: (name: string) => `${name} has a new voicemail in Shield.`, helpersNeedListen: true },
  protection_paused: { person: () => 'Shield protection is paused.', helpers: (name: string) => `Shield protection is paused for ${name}.` },
  restoration_started: { person: () => 'Shield is being turned off on this phone.', helpers: (name: string) => `${name} started turning off Shield.` },
  setup_check_failed: { person: () => 'Shield needs attention. Open Shield to check your setup.', helpers: (name: string) => `Shield needs attention on ${name}'s phone.` }
} satisfies Record<string, { person?: () => string; helpers: (name: string) => string; helpersNeedListen?: boolean }>;
export type AlertKind = keyof typeof ALERTS;
type AlertSpec = { person?: () => string; helpers: (name: string) => string; helpersNeedListen?: boolean };

export const ALERT_TTL_MS = 86400_000;
/** A registration the app hasn't refreshed in this long is dropped; the app refreshes it every time it opens. */
export const DEVICE_TTL_MS = 60 * 86400_000;
export type PushEnvironment = 'development' | 'production';

/** Anything with Firestore's `create`: a transaction or a batch. */
type Writer = { create(ref: DocumentReference, data: DocumentData): unknown };
/** Queue an alert atomically with the event. Does nothing when neither delivery channel is configured. */
export function queueAlert(store: CloudStore, writer: Writer, participantId: string, kind: AlertKind) {
  if (!store.config.APNS && !store.config.SMS_ALERTS
    && !(kind === 'monitor_intervened' && store.config.TELNYX_VERIFY_PROFILE_ID)) return;
  const now = store.now();
  writer.create(store.db.collection('alerts').doc(), { participantId, kind, createdAt: now, expiresAt: now + ALERT_TTL_MS });
}

/** Whether the person has chosen to alert their helpers. Off until they choose. */
export const helperAlertsEnabled = (person: DocumentData | undefined) => person?.helperAlerts?.enabled === true;

export type PushResult = 'sent' | 'unregistered' | 'failed';
export interface PushSender { send(token: string, environment: PushEnvironment, body: string, kind: AlertKind): Promise<PushResult> }

export type APNsConfig = { keyId: string; teamId: string; privateKey: string };
const APNS_ORIGINS: Record<PushEnvironment, string> = { development: 'https://api.sandbox.push.apple.com', production: 'https://api.push.apple.com' };

/** Token-based APNs over HTTP/2. One short-lived connection per alert: volumes are tiny and functions scale to zero. */
export class APNsSender implements PushSender {
  private key: KeyObject;
  private bearer?: { token: string; at: number };
  constructor(readonly config: APNsConfig, readonly topic: string, readonly origins: Record<PushEnvironment, string> = APNS_ORIGINS, readonly now = Date.now) {
    this.key = createPrivateKey(config.privateKey);
  }
  /** Apple accepts a provider token for up to an hour and rejects refreshing it more than every 20 minutes. */
  token() {
    const now = this.now();
    if (!this.bearer || now - this.bearer.at > 50 * 60_000) {
      const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const unsigned = `${part({ alg: 'ES256', kid: this.config.keyId })}.${part({ iss: this.config.teamId, iat: Math.floor(now / 1000) })}`;
      const signature = sign('sha256', Buffer.from(unsigned), { key: this.key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
      this.bearer = { token: `${unsigned}.${signature}`, at: now };
    }
    return this.bearer.token;
  }
  send(token: string, environment: PushEnvironment, body: string, kind: AlertKind): Promise<PushResult> {
    if (!/^[a-f0-9]{64,200}$/.test(token)) return Promise.resolve('unregistered');
    return new Promise(resolve => {
      let settled = false, status = 0, reply = '';
      const session = connect(this.origins[environment]);
      const done = (result: PushResult) => { if (settled) return; settled = true; clearTimeout(timer); session.close(); resolve(result); };
      const timer = setTimeout(() => { session.destroy(); done('failed'); }, 10_000);
      session.on('error', () => done('failed'));
      const request = session.request({ ':method': 'POST', ':path': `/3/device/${token}`, authorization: `bearer ${this.token()}`,
        'apns-topic': this.topic, 'apns-push-type': 'alert', 'apns-priority': '10', 'apns-expiration': String(Math.floor(this.now() / 1000) + 3600),
        'content-type': 'application/json' });
      request.on('response', headers => { status = Number(headers[':status']); });
      request.setEncoding('utf8');
      request.on('data', chunk => { if (reply.length < 2000) reply += chunk; });
      request.on('error', () => done('failed'));
      request.on('end', () => {
        let reason = ''; try { reason = JSON.parse(reply).reason ?? ''; } catch { /* empty body on success */ }
        done(status === 200 ? 'sent' : status === 410 || ['BadDeviceToken', 'DeviceTokenNotForTopic', 'Unregistered'].includes(reason) ? 'unregistered' : 'failed');
      });
      request.end(JSON.stringify({ aps: { alert: { title: 'Shield', body }, sound: 'default', 'thread-id': 'shield',
        ...(kind === 'voicemail' ? { 'content-available': 1 } : {}) }, shield: { kind } }));
    });
  }
}

/** Sends one queued alert to the person's and, if they chose it, their helpers' registered devices, then deletes the job. */
export class AlertDelivery {
  constructor(readonly store: CloudStore, readonly sender: PushSender, readonly textSender: TextSender = new TelnyxTextSender(store)) {}
  async deliver(alertId: string) {
    const s = this.store, ref = s.db.collection('alerts').doc(alertId);
    {
      const alert = (await ref.get()).data();
      if (!alert) return;
      if (alert.expiresAt <= s.now() || !(alert.kind in ALERTS)) { await ref.delete(); return; }
      const spec: AlertSpec = ALERTS[alert.kind as AlertKind];
      const person = (await s.personRef(alert.participantId).get()).data() as Person | undefined;
      if (!person || person.status === 'offboarded') { await ref.delete(); return; }
      // Save the opted-in inbox record before attempting external delivery.
      await this.deliverContacts(alertId, person, alert.kind as AlertKind, spec, alert.createdAt);
      const targets: { uid: string; body: string }[] = [];
      if (spec.person) targets.push({ uid: person.ownerUid, body: spec.person() });
      if (helperAlertsEnabled(person) && alert.kind === 'monitor_intervened') {
        const name = s.name(person);
        const grants = await s.db.collection('grants').where('participantId', '==', person.id).get();
        for (const grant of grants.docs.map(d => d.data())) {
          if (grant.acceptedAt && !grant.revokedAt && grant.granteeUid && grant.granteeUid !== person.ownerUid
            && (!spec.helpersNeedListen || grant.canListen)) targets.push({ uid: grant.granteeUid, body: spec.helpers(name) });
        }
      }
      const tally = { sent: 0, unregistered: 0, failed: 0 };
      for (const target of targets) {
        const result = await this.deliverPush(alertId, person.id, target.uid, target.body, alert.kind);
        for (const key of ['sent', 'unregistered', 'failed'] as const) tally[key] += result[key];
      }
      console.info(JSON.stringify({ event: 'alert_delivered', kind: alert.kind, recipients: targets.length, ...tally }));
      // Transient database failures leave the job available for the trigger retry.
      // Channel receipts still prevent duplicate external submissions.
      await ref.delete();
    }
  }

  /** One push attempt per event/account, even when a caretaker also has a sharing
   * grant or two workers receive the same event. A timeout is not a safe retry. */
  private async deliverPush(alertId: string, participantId: string, uid: string, body: string, kind: AlertKind) {
    const s = this.store, tally = { sent: 0, unregistered: 0, failed: 0 };
    const receipt = s.db.collection('alertDeliveries').doc(s.vault.hash(`push:${alertId}:${uid}`));
    const claimed = await s.db.runTransaction(async tx => {
      if ((await tx.get(receipt)).exists) return false;
      tx.create(receipt, { participantId, recipientUid: uid, startedAt: s.now(), expiresAt: s.now() + 30 * 86400_000 });
      return true;
    });
    if (!claimed) return tally;
    const devices = await s.db.collection('devices').where('uid', '==', uid).limit(10).get();
    for (const device of devices.docs) {
      const d = device.data();
      if (d.expiresAt <= s.now()) continue;
      const result = await this.sender.send(s.vault.open(d.tokenEnc, `device:${device.id}`), d.environment, body, kind);
      tally[result]++;
      if (result === 'unregistered') await device.ref.delete();
    }
    await receipt.update({ ...tally, finishedAt: s.now() });
    return tally;
  }

  private async deliverContacts(alertId: string, person: Person, kind: AlertKind, spec: AlertSpec, createdAt: number) {
    const s = this.store;
    // Caretakers hear only about an actual connected-call intervention. Screened
    // blocks, messages, setup changes and pauses must never notify another person.
    if (kind !== 'monitor_intervened') return;
    const docs = await s.db.collection('alertContacts').where('participantId', '==', person.id).get();
    for (const contact of docs.docs) {
      const receipt = s.db.collection('alertDeliveries').doc(s.vault.hash(`${alertId}:${contact.id}`));
      const claimed = await s.db.runTransaction(async tx => {
        const [old, personDoc, contactDoc] = await tx.getAll(receipt, s.personRef(person.id), contact.ref);
        const d = contactDoc!.data(), p = personDoc!.data();
        if (old!.exists || !p || p.status === 'offboarded' || p.trustedContactsChoice?.enabled !== true || d?.status !== 'accepted' || !d.recipientUid || d.respondedAt > createdAt || p.trustedContactsChoice.updatedAt > createdAt) return;
        const optOut = (await tx.get(s.db.collection('smsOptOuts').doc(d.phoneHash))).data();
        if ((await tx.get(deletionRef(s, d.recipientUid))).exists) return;
        tx.create(receipt, { participantId: person.id, recipientUid: d.recipientUid,
          startedAt: s.now(), expiresAt: s.now() + 30 * 86400_000 });
        if (d.inbox === true && (d.inboxAcceptedAt ?? d.respondedAt) <= createdAt) {
          tx.create(s.db.collection('caretakerEvents').doc(receipt.id), { participantId: person.id,
            contactId: contact.id, recipientUid: d.recipientUid, kind: 'monitor_intervened', createdAt,
            expiresAt: createdAt + CARETAKER_EVENT_RETENTION_MS });
        }
        return { phoneHash: d.phoneHash as string, phoneEnc: d.phoneEnc as string, recipientUid: d.recipientUid as string,
          push: d.push === true, sms: d.sms === true && !optOut?.stopped };
      });
      if (!claimed) continue;
      const body = spec.helpers(s.name(person));
      let textResult = 'not_requested';
      if (claimed.sms) {
        try {
          await s.quota([[`contact-alerts:${claimed.phoneHash}`, 20], ['contact-alerts:global', pilotLimits.contactAlertsTotalPerDay]]);
        } catch { textResult = 'limited'; }
        if (textResult !== 'limited') {
          const result = await this.textSender.send(s.vault.open(claimed.phoneEnc, `alert-contact:${contact.id}:phone`), `Shield: ${body} Reply STOP to stop texts.`).catch(() => 'unknown' as const);
          textResult = submissionStatus(result);
          if (typeof result === 'object') await receipt.update({ textMessageHash: s.vault.hash(`sms:${result.messageId}`), textPhoneHash: claimed.phoneHash });
        }
      }
      let pushSent = 0;
      if (claimed.push && s.config.APNS) {
        pushSent = (await this.deliverPush(alertId, person.id, claimed.recipientUid, body, kind)).sent;
      }
      await s.db.runTransaction(async tx => {
        const d = (await tx.get(receipt)).data();
        if (d) tx.update(receipt, { ...(d.textFinalizedAt === undefined ? { textResult } : {}), pushSent, finishedAt: s.now() });
      });
    }
  }
}

/** Remove every push registration for a signed-out or deleted account. */
export async function forgetDevices(store: CloudStore, uid: string) {
  const devices = await store.db.collection('devices').where('uid', '==', uid).limit(50).get();
  if (devices.empty) return;
  const batch = store.db.batch(); devices.docs.forEach(d => batch.delete(d.ref)); await batch.commit();
}
