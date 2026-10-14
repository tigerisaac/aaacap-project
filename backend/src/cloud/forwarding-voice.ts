import { liveStreamXML } from './forwarding-live.js';
import type { FastifyInstance } from 'fastify';
import { secureEqual } from '../crypto.js';
import { purposes } from './copy.js';
import { CloudStore } from './store.js';
import { ForwardingProbes } from './forwarding-probes.js';
import { CONNECTED_CALL_SECONDS, ForwardingStore, type ForwardingCall } from './forwarding-store.js';
import { callerNumber, TelnyxVoice, validCallId, validRecordingId, verifyTelnyx } from './forwarding-provider.js';
import { assignedTo, isShieldNumber, knownShieldNumber, numberRef } from './numbers.js';
import { SETUP_CHECK_MESSAGE, SetupChecks } from './setup-check.js';
import { CallMonitor, warningText } from './monitoring.js';
import { ANNOUNCEMENT_BACKUP_VOICE, announcementResponse } from './announcements.js';
import { VoiceResponse } from './texml.js';

export type ForwardingVoiceDependencies = { lookupForwardingChild?: (sid: string) => Promise<{ to: string; from: string; status: string }>; lookupForwardingInbound?: (sid: string) => Promise<{ from: string; to: string; direction: string; status: string }>;
  callMonitor?: CallMonitor; warmLiveBridge?: () => void };

export async function registerForwardingVoice(app: FastifyInstance, store: CloudStore, deps: ForwardingVoiceDependencies = {}) {
  const f = new ForwardingStore(store), config = store.config;
  const probes = new ForwardingProbes(store), checks = new SetupChecks(store);
  const telnyx = new TelnyxVoice(config);
  const childLookup = deps.lookupForwardingChild ?? (sid => telnyx.call(sid));
  const inboundLookup = deps.lookupForwardingInbound ?? (sid => telnyx.call(sid));
  const monitor = deps.callMonitor ?? new CallMonitor(f, telnyx);
  // The bridge scales to zero and only connects after the greeting; wake it now so a cold start overlaps the greeting.
  const warmLiveBridge = deps.warmLiveBridge ?? (() => {
    if (config.LIVE_BRIDGE_URL) void fetch(`${config.LIVE_BRIDGE_URL}/ready`, { redirect: 'error', signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
  });
  const callback = (step: string, id?: string) => `${config.PUBLIC_BASE_URL}/forwarding/${config.TRIAL_PROXY_SECRET}/${step}${id ? `/${id}` : ''}`;
  const xml = announcementResponse;
  const hangup = (message?: string) => { const r = xml(); if (message) r.say(message); r.hangup(); return r.toString(); };
  const voicemail = (call: ForwardingCall, afterLiveScreening = false) => {
    const r = xml();
    if (afterLiveScreening) {
      r.stop().stream({ name: 'shield-live' });
      r.say('Sorry, Shield couldn\'t put your call through right now. Please leave a message after the tone, and press pound when you\'re finished.');
    } else r.say('You have reached Shield voicemail. Please leave a message after the tone. Press pound when finished.');
    r.record({ maxLength: 60, timeout: 0, finishOnKey: '#', playBeep: true, channels: 'single', format: 'mp3', method: 'POST',
      action: callback('recorded', call.id), recordingStatusCallback: callback('recording', call.id), recordingStatusCallbackMethod: 'POST' });
    r.hangup(); return r.toString();
  };
  await app.register(async voice => {
    voice.addHook('preValidation', async (request, reply) => {
      const body = request.body as Record<string, string> | undefined;
      const { secret, id } = request.params as { secret: string; id?: string };
      if (id && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return reply.code(403).type('text/xml').send(hangup());
      const validBody = body && typeof body === 'object' && !Array.isArray(body) && Object.values(body).every(v => typeof v === 'string');
      const valid = /^[a-f0-9]{64}$/.test(secret ?? '') && secureEqual(secret, config.TRIAL_PROXY_SECRET)
        && validBody && validCallId(body.CallSid ?? '')
        && body.AccountSid === config.TELNYX_ACCOUNT_ID && (!body.ConnectionId || body.ConnectionId === config.TELNYX_APPLICATION_ID)
        && verifyTelnyx(config.TELNYX_PUBLIC_KEY, request.headers['telnyx-signature-ed25519'], request.headers['telnyx-timestamp'], request.rawFormBody, store.now());
      if (!valid) return reply.code(403).type('text/xml').send(hangup());
      reply.type('text/xml');
    });
    voice.post('/forwarding/:secret/inbound', async request => {
      const b = request.body as Record<string, string>, to = b.To;
      // Whose call it is comes only from the Shield number it arrived on; admission checks that number's owner.
      if (!isShieldNumber(to)) return hangup();
      if (config.LIVE_SCREENING_ENABLED && b.From !== to) warmLiveBridge();
      // Clinics, hospitals and international family often withhold or lack a US number; screen them like anyone else.
      const caller = callerNumber(b.From);
      // TeXML does not promise Direction on its instruction-fetch webhook, so ask Telnyx.
      let remote; try { remote = await inboundLookup(b.CallSid!); } catch { return hangup(); }
      const sameCaller = caller ? remote.from === caller : !callerNumber(remote.from);
      if (!sameCaller || remote.to !== to || remote.direction !== 'inbound' || !['ringing', 'in-progress'].includes(remote.status)) return hangup();
      // The daily setup check coming back through her forwarding: record how long it took, then hang up silently.
      if (checks.checkNumber && caller === checks.checkNumber) { await checks.arrived(to); return hangup(); }
      // Loop guard: a call from any Shield number is never screened. The only one answered is a forwarding test
      // coming back from a person's own Shield number to itself.
      if (await knownShieldNumber(store, caller)) {
        const participantId = caller === to ? assignedTo((await numberRef(store, to).get()).data()) : undefined;
        const probe = participantId ? await probes.incoming(b.CallSid!, participantId) : undefined;
        if (!probe) return hangup();
        const r = xml();
        r.gather({ input: ['dtmf'], numDigits: 8, timeout: 10, action: callback('probe-confirm', probe.id), method: 'POST' });
        r.hangup(); return r.toString();
      }
      const call = await f.begin(b.CallSid!, to, caller);
      if (!call) return hangup('Shield is not ready to receive this call. Please try again later.');
      // A number Shield stopped a scam from. It may be spoofed, so point a real person to a number they already know.
      if (call.state === 'ended') return hangup('This person cannot take this call. Please contact them through a number or service they already know.');
      // Only live screening makes a call eligible, so every other call is offered voicemail here.
      if (call.state === 'voicemail') return voicemail(call);
      return liveStreamXML(config, call, store.now());
    });
    // A probe call must go from the probe's own person's Shield number to their verified phone.
    const probeEnds = async (id: string, from: string | undefined, to: string | undefined) => {
      const participantId = (await probes.indexRef(id).get()).data()?.participantId as string | undefined;
      const ends = participantId ? await f.endpointsFor(participantId) : undefined;
      return !!ends && from === ends.shieldNumber && to === ends.phone;
    };
    voice.post('/forwarding/:secret/probe/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      if (!await probeEnds(id, b.From, b.To)) return hangup();
      const probe = await probes.outbound(id, b.CallSid!); if (!probe) return hangup();
      const r = xml();
      if (probe.kind === 'ring') {
        r.gather({ input: ['dtmf'], numDigits: 1, timeout: 15, method: 'POST', action: callback('probe-confirm', id) })
          .say('Hello, this is your Shield sound check. If you can hear me, press 1 on your phone keypad.');
      } else {
        r.pause({ length: 2 }); r.play({ digits: probe.nonce }); r.pause({ length: 2 });
      }
      r.hangup(); return r.toString();
    });
    // The check call reached her phone itself and was answered: tell her once, in fixed words, then hang up.
    const checkEnds = async (id: string, from: string | undefined, to: string | undefined) => {
      const participantId = (await checks.ref(id).get()).data()?.participantId as string | undefined;
      const ends = participantId ? await f.endpointsFor(participantId) : undefined;
      return !!ends && !!checks.checkNumber && from === checks.checkNumber && to === ends.phone;
    };
    voice.post('/forwarding/:secret/setup-check/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      if (!await checkEnds(id, b.From, b.To) || !await checks.answered(id)) return hangup();
      const r = xml(); r.pause({ length: 1 }); r.say(SETUP_CHECK_MESSAGE); r.hangup(); return r.toString();
    });
    voice.post('/forwarding/:secret/setup-check-status/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      if (await checkEnds(id, b.From, b.To) && ['completed', 'busy', 'failed', 'no-answer', 'canceled'].includes(b.CallStatus ?? '')) await checks.ended(id);
      return xml().toString();
    });
    voice.post('/forwarding/:secret/probe-confirm/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      const result = await probes.confirm(id, b.CallSid!, b.Digits ?? '');
      return hangup(result?.kind === 'ring' ? 'Your sound check passed. Shield has saved the result. Goodbye.' : undefined);
    });
    voice.post('/forwarding/:secret/probe-status/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      if (await probeEnds(id, b.From, b.To)) {
        await probes.outbound(id, b.CallSid!);
        await probes.ended(id, b.CallSid!, b.CallStatus ?? '');
      }
      return xml().toString();
    });
    voice.post('/forwarding/:secret/result', async request => {
      const call = await f.find((request.body as Record<string, string>).CallSid!); if (!call) return hangup();
      if (call.state === 'voicemail') return voicemail(call);
      // The recipient is fixed: always this call's own person's verified phone, called from their own Shield number.
      const ends = await f.endpointsFor(call.participantId);
      if (call.state !== 'offering' || !ends) return hangup('This person cannot take this call. Please contact them through a number or service they already know.');
      const r = xml();
      if (call.liveConnectedAt) r.stop().stream({ name: 'shield-live' });
      const monitored = await monitor.begin(call.id);
      // The caller hears the disclosure before transcription starts; only the accepted conversation is checked.
      r.say(monitored ? 'Please hold while Shield offers your call. If it connects, an AI assistant will transcribe the call to help protect against fraud.'
        : 'Please hold while Shield offers your call.');
      if (monitored) r.start().transcription({ transcriptionEngine: config.MONITOR_TRANSCRIPTION_ENGINE,
        ...(config.MONITOR_TRANSCRIPTION_ENGINE === 'Soniox' ? { model: 'soniox/stt-rt-v4' } : {}), transcriptionTracks: 'both',
        transcriptionCallback: callback('monitor', call.id), transcriptionCallbackMethod: 'POST' });
      const dial = r.dial({ callerId: ends.shieldNumber, answerOnBridge: true, timeout: 20, timeLimit: CONNECTED_CALL_SECONDS,
        action: callback('dial-ended', call.id), method: 'POST' });
      dial.number({ url: callback('whisper', call.id), method: 'POST',
        statusCallback: callback('child', call.id), statusCallbackMethod: 'POST', statusCallbackEvent: ['initiated', 'ringing', 'answered'] }, ends.phone);
      r.hangup(); return r.toString();
    });
    voice.post('/forwarding/:secret/child/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      const call = (await store.callRef(id).get()).data() as ForwardingCall | undefined;
      const ends = call?.source === 'forwarding' ? await f.endpointsFor(call.participantId) : undefined;
      if (ends && b.From === ends.shieldNumber && b.To === ends.phone
        && validCallId(b.ParentCallSid ?? '') && b.ParentCallSid !== b.CallSid
        && ['initiated', 'ringing', 'in-progress'].includes(b.CallStatus ?? '')) {
        await f.bindChild(id, b.CallSid!, b.ParentCallSid!);
      }
      return xml().toString();
    });
    voice.post('/forwarding/:secret/whisper/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      // Bind from an authenticated child-status event, never from an unverified URL parameter.
      const bound = (await store.callRef(id).get()).data() as ForwardingCall | undefined;
      if (bound?.source !== 'forwarding' || bound.provider !== 'telnyx' || bound.childSid !== b.CallSid) return hangup();
      const ends = await f.endpointsFor(bound.participantId);
      let child; try { child = await childLookup(b.CallSid!); } catch { return hangup(); }
      if (!ends || child.from !== ends.shieldNumber || child.to !== ends.phone || child.status !== 'in-progress') return hangup();
      const call = await f.whisper(id, b.CallSid!, bound.parentSid); if (!call) return hangup();
      const r = xml(); const g = r.gather({ input: ['dtmf'], numDigits: 1, timeout: 7, method: 'POST', action: callback('accept', id) });
      g.say(`Shield screened a call about ${purposes[call.purpose as keyof typeof purposes] ?? 'a routine matter'}. This does not verify who is calling. Press 1 to connect, or 2 for voicemail.`);
      r.hangup(); return r.toString();
    });
    voice.post('/forwarding/:secret/accept/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      const call = await f.accept(id, b.CallSid!, b.Digits ?? '');
      if (!call?.acceptedAt) return hangup();
      // Only the exact bound child with digit 1 reaches an empty response and bridges.
      return xml().toString();
    });
    voice.post('/forwarding/:secret/dial-ended/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      const call = await f.dialEnded(id, b.CallSid!, b.DialCallSid ?? '', b.DialCallStatus ?? '');
      if (call?.state === 'ended') await monitor.end(id);
      return call?.state === 'voicemail' ? voicemail(call) : hangup();
    });
    // Live screening hands a caller it could not clear or offer to voicemail rather than hanging up.
    voice.post('/forwarding/:secret/voicemail/:id', async request => {
      const b = request.body as Record<string, string>, call = await f.find(b.CallSid!);
      if (call?.id !== (request.params as { id: string }).id || call.state !== 'voicemail' || call.acceptedAt || !call.liveFinishedAt) return hangup();
      return voicemail(call, true);
    });
    voice.post('/forwarding/:secret/monitor/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      if (b.IsFinal === 'true' && b.Transcript?.trim()) await monitor.transcript(id, b.CallSid!, b.Transcript, b.Track ?? b.TranscriptionTrack);
      else if (b.Transcript?.trim()) monitor.interim(id);
      return xml().toString();
    });
    voice.post('/forwarding/:secret/monitor-warning/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      const call = (await store.callRef(id).get()).data() as ForwardingCall | undefined;
      // Only the recipient's own leg, redirected by an intervention Shield recorded.
      if (call?.source !== 'forwarding' || !call.monitorIntervenedAt || !call.childSid || call.childSid !== b.CallSid) return hangup();
      return hangup(warningText(call.monitorConcern ?? ''));
    });
    voice.post('/forwarding/:secret/recorded/:id', async request => {
      const b = request.body as Record<string, string>, call = await f.find(b.CallSid!);
      if (call?.id === (request.params as { id: string }).id && call.state === 'voicemail') await f.ended(b.CallSid!);
      return hangup('Thank you. Goodbye.');
    });
    voice.post('/forwarding/:secret/recording/:id', async request => {
      const b = request.body as Record<string, string>, call = await f.find(b.CallSid!);
      if (call?.id === (request.params as { id: string }).id && b.RecordingStatus === 'completed' && validRecordingId(b.RecordingSid ?? '')) {
        await f.recording(b.CallSid!, b.RecordingSid!, Number(b.RecordingDuration));
      }
      return xml().toString();
    });
    voice.post('/forwarding/:secret/status', async request => {
      const b = request.body as Record<string, string>;
      if (['completed', 'busy', 'failed', 'no-answer', 'canceled'].includes(b.CallStatus ?? '')) {
        await f.ended(b.CallSid!);
        const call = await f.find(b.CallSid!); if (call) await monitor.end(call.id);
      }
      return xml().toString();
    });
    // The normal path plays Grace. Its provider error route is independent of both audio origins.
    voice.post('/forwarding/:secret/fallback', async () => {
      const r = new VoiceResponse(); r.say('Shield is temporarily unavailable. Please try again later.', { voice: ANNOUNCEMENT_BACKUP_VOICE }); r.hangup(); return r.toString();
    });
  });
}
