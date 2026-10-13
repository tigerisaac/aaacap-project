import type { CloudStore } from './store.js';
import { ForwardingProbes } from './forwarding-probes.js';
import { ForwardingStore } from './forwarding-store.js';
import { CallControlProvider } from './call-control-provider.js';
import { forwardingIdentity, routeRef } from './shared-routing.js';
import { ANNOUNCEMENT_BACKUP_VOICE, failedPlayback, rejectedAudioCommand, requiredAnnouncementAudio, SOUND_CHECK_MESSAGE } from './announcements.js';

/** Verification uses its own signed correlation, never a shared global pending-verification slot. */
export class SharedProbes {
  readonly probes: ForwardingProbes;
  constructor(readonly store: CloudStore, readonly provider = new CallControlProvider(store.config)) { this.probes = new ForwardingProbes(store); }
  async fallback(id: string, sid: string) {
    if (!await this.probes.audioFallback(id, sid)) return;
    await this.provider.action(sid, 'gather_using_speak', { payload: SOUND_CHECK_MESSAGE, voice: ANNOUNCEMENT_BACKUP_VOICE,
      minimum_digits: 1, maximum_digits: 1, maximum_tries: 1, timeout_millis: 15000,
      client_state: this.provider.state(id, 'probe-ring-backup'), command_id: this.store.vault.hash(`${id}:gather-ring-backup`) });
  }
  async start(id: string, from: string, to: string) {
    const index = (await this.probes.indexRef(id).get()).data();
    if (!index) throw new Error('probe_missing');
    const control = (await new ForwardingStore(this.store).controlRef(index.participantId).get()).data();
    const probe = control?.probe;
    if (probe?.id !== id || probe.state !== 'waiting' || probe.expiresAt <= this.store.now()) throw new Error('probe_expired');
    await this.provider.request('/calls', { connection_id: this.store.config.TELNYX_SHARED_APPLICATION_ID, from, to,
      timeout_secs: 40, time_limit_secs: 30, client_state: this.provider.state(id, `probe-${probe.kind}`), command_id: this.store.vault.hash(`probe:${id}`) });
  }
  async handle(type: string, p: { call_control_id: string; from?: string; to?: string; client_state?: string | null; direction?: string; sip_headers?: unknown; digits?: string; status?: string }): Promise<boolean> {
    const s = this.store, sid = p.call_control_id;
    let state = this.provider.readState(p.client_state);
    if (type === 'call.initiated' && p.direction === 'incoming' && p.from === s.config.TELNYX_NUMBER) {
      const identity = forwardingIdentity(p.sip_headers);
      const route = identity && p.to === s.config.TELNYX_NUMBER ? (await routeRef(s, p.to, identity).get()).data() : undefined;
      if (!route?.participantId || !identity) return false;
      const ends = await new ForwardingStore(s).endpointsFor(route.participantId);
      if (ends?.phone !== identity || ends.shieldNumber !== p.to) return false;
      const probe = await this.probes.incoming(sid, route.participantId); if (!probe) return false;
      await this.provider.action(sid, 'answer', { client_state: this.provider.state(probe.id, 'probe-inbound'), command_id: s.vault.hash(`${probe.id}:answer`) });
      return true;
    }
    if (!state?.phase.startsWith('probe-')) return false;
    const index = (await this.probes.indexRef(state.id).get()).data(); if (!index) return true;
    const f = new ForwardingStore(s), ends = await f.endpointsFor(index.participantId);
    const probe = (await f.controlRef(index.participantId).get()).data()?.probe;
    if (!ends || !probe || probe.id !== state.id || probe.state !== 'waiting' || probe.expiresAt <= s.now()) {
      if (type !== 'call.hangup') await this.provider.action(sid, 'hangup'); return true;
    }
    const incoming = state.phase === 'probe-inbound';
    if (incoming ? probe.inboundSid !== sid : probe.outboundSid ? probe.outboundSid !== sid : p.from !== ends.shieldNumber || p.to !== ends.phone) return true;
    if (!incoming) await this.probes.outbound(probe.id, sid);
    if (type === 'call.answered') {
      if (incoming) await this.provider.action(sid, 'gather', { minimum_digits: 8, maximum_digits: 8, timeout_millis: 10000, command_id: s.vault.hash(`${probe.id}:gather-inbound`) });
      else if (probe.kind === 'ring') {
        if (probe.audioFallbackAt) { await this.fallback(probe.id, sid); return true; }
        try {
          await this.provider.action(sid, 'gather_using_audio', { audio_url: requiredAnnouncementAudio(SOUND_CHECK_MESSAGE).url,
            minimum_digits: 1, maximum_digits: 1, maximum_tries: 1, timeout_millis: 15000, command_id: s.vault.hash(`${probe.id}:gather-ring`) });
        } catch (error) {
          if (!rejectedAudioCommand(error)) throw error;
          await this.fallback(probe.id, sid);
        }
      }
      else await this.provider.action(sid, 'send_dtmf', { digits: `ww${probe.nonce}`, duration_millis: 200, command_id: s.vault.hash(`${probe.id}:nonce`) });
    } else if (type === 'call.playback.ended' && !incoming && probe.kind === 'ring' && state.phase === 'probe-ring' && failedPlayback(p.status)) {
      await this.fallback(probe.id, sid);
    } else if (type === 'call.gather.ended') {
      if (probe.kind === 'ring' && !!probe.audioFallbackAt !== (state.phase === 'probe-ring-backup')) return true;
      if (['cancelled', 'cancelled_amd', 'call_hangup'].includes(p.status ?? '')) return true;
      const passed = await this.probes.confirm(probe.id, sid, p.status && p.status !== 'valid' ? '' : p.digits ?? '');
      if (passed?.kind === 'forwarding') await s.db.runTransaction(async tx => {
        const ref = routeRef(s, ends.shieldNumber, ends.phone), person = (await tx.get(s.personRef(index.participantId))).data(), route = (await tx.get(ref)).data();
        if (route && route.participantId === index.participantId && !route.disabledAt && route.version === passed.routeVersion && person?.status === 'setup' && f.endpoints(person)?.phone === ends.phone) tx.update(ref, { enabled: true, qualifiedAt: s.now(), qualification: 'forwarding_nonce', probeId: probe.id });
      });
      await this.provider.action(sid, 'hangup', { command_id: s.vault.hash(`${probe.id}:hangup`) });
    } else if (type === 'call.hangup' && !incoming) await this.probes.ended(probe.id, sid, 'completed');
    return true;
  }
}
