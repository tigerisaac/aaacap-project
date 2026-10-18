import { CallControlProvider } from './call-control-provider.js';
import type { ForwardingCall, ForwardingStore } from './forwarding-store.js';
import { requiredAnnouncementAudio } from './announcements.js';
import { warningText } from './warning-copy.js';

const validRoom = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id);
/** Intervention-only delivery: never park the recipient before moving its existing leg.
 * Creation and playback are fenced before submission; uncertain commands are never replayed.
 * The transactional warning/deadline jobs survive the initiating monitor worker.
 */
export class WarningHandoff {
  readonly store;
  constructor(readonly f: ForwardingStore, readonly provider = new CallControlProvider(f.store.config)) { this.store = f.store; }
  async call(id: string) { return (await this.store.callRef(id).get()).data() as ForwardingCall | undefined; }
  eligible(c: ForwardingCall | undefined): c is ForwardingCall & { childSid: string; monitorIntervenedAt: number } {
    return !!c && c.transport === 'call-control' && c.monitorWarningVersion === 2 && c.state === 'accepted'
      && !!c.acceptedAt && !!c.childSid && c.childSid !== c.parentSid && !!c.monitorIntervenedAt && !c.inboundEndedAt;
  }
  async hangup(sid: string) {
    try { await this.provider.action(sid, 'hangup', { command_id: this.store.vault.hash(`${sid}:hangup`) }); }
    catch (error) { if ((await this.provider.request(`/calls/${encodeURIComponent(sid)}`).catch(() => undefined))?.is_alive !== false) throw error; }
  }
  async abort(c: ForwardingCall) {
    await this.store.callRef(c.id).update({ monitorWarningFailedAt: c.monitorWarningFailedAt ?? this.store.now() });
    // Last-participant hangup also removes its media; room duration independently bounds an unknown create.
    await Promise.all([this.hangup(c.parentSid), ...(c.childSid ? [this.hangup(c.childSid)] : [])]);
    await this.f.ended(c.parentSid);
  }
  /** false means a bound receipt/participant is pending; the durable job retries within 30 seconds. */
  async run(id: string): Promise<boolean> {
    let c = await this.call(id);
    if (!this.eligible(c)) return true;
    if (c.monitorWarningFailedAt || this.store.now() >= c.monitorIntervenedAt + 30_000) { await this.abort(c); return true; }
    try {
      if (!c.monitorWarningConferenceId) {
        const claimed = await this.store.db.runTransaction(async tx => {
          const current = (await tx.get(this.store.callRef(id))).data() as ForwardingCall | undefined;
          if (!this.eligible(current) || current.monitorWarningFailedAt || current.monitorWarningConferenceSubmittedAt
            || this.store.now() >= current.monitorIntervenedAt + 30_000) return false;
          // Conference callbacks can preserve the prior leg state instead of the command's state.
          // Bind the immutable recipient before submission, so signed callbacks need no guessed client state.
          const key = this.store.keyRef(current.childSid), bound = (await tx.get(key)).data();
          if (bound && bound.callId !== id) throw new Error('warning_recipient_binding_conflict');
          if (!bound) tx.create(key, { callId: id, expiresAt: this.store.now() + 2 * 3600_000 });
          tx.update(this.store.callRef(id), { monitorWarningConferenceSubmittedAt: this.store.now() });
          return true;
        });
        if (!claimed) {
          c = await this.call(id);
          if (this.eligible(c) && c.monitorWarningConferenceSubmittedAt && !c.monitorWarningConferenceId
            && this.store.now() - c.monitorWarningConferenceSubmittedAt > 10_000) throw new Error('warning_create_uncertain');
          return false;
        }
        const result = await this.provider.request('/conferences', { call_control_id: c.childSid, name: `shield-warning-${id}`,
          command_id: id, beep_enabled: 'never', comfort_noise: false, duration_minutes: 1, max_participants: 2, start_conference_on_create: true });
        if (!validRoom(result?.id)) throw new Error('warning_room_invalid');
        await this.store.callRef(id).update({ monitorWarningConferenceId: result.id });
      }
      c = await this.call(id);
      if (!this.eligible(c)) return true;
      if (c.monitorWarningFailedAt || this.store.now() >= c.monitorIntervenedAt + 30_000) { await this.abort(c); return true; }
      if (!validRoom(c.monitorWarningConferenceId)) return false;
      if (c.monitorWarningSubmittedAt) return true;
      const participants = await this.provider.request(`/conferences/${c.monitorWarningConferenceId}/participants`);
      if (!Array.isArray(participants)) throw new Error('warning_participants_invalid');
      const active = participants.filter(p => p.status !== 'left');
      if (active.some(p => p.call_control_id !== c!.childSid)) throw new Error('warning_participant_unexpected');
      if (!active.some(p => p.status === 'joined' && !p.on_hold && !p.muted)) return false;
      // Creating the room can end the caller itself. Only explicit inactive readback tolerates a rejected hangup.
      if (!c.monitorCallerEndedAt) { await this.hangup(c.parentSid); return false; }
      const claimed = await this.store.db.runTransaction(async tx => {
        const current = (await tx.get(this.store.callRef(id))).data() as ForwardingCall | undefined;
        if (!this.eligible(current) || current.monitorWarningFailedAt || !current.monitorCallerEndedAt || current.monitorWarningSubmittedAt
          || current.monitorWarningConferenceId !== c!.monitorWarningConferenceId || this.store.now() >= current.monitorIntervenedAt + 30_000) return false;
        tx.update(this.store.callRef(id), { monitorWarningSubmittedAt: this.store.now() });
        return true;
      });
      if (!claimed) return true;
      await this.provider.request(`/conferences/${c.monitorWarningConferenceId}/actions/play`, {
        audio_url: requiredAnnouncementAudio(warningText(c.monitorConcern ?? '')).url, call_control_ids: [c.childSid], loop: 1
      });
      await this.store.callRef(id).update({ monitorRedirectedAt: this.store.now() });
      return true;
    } catch (error) {
      const current = await this.call(id);
      if (current && current.state !== 'ended') await this.abort(current);
      throw error;
    }
  }
}
