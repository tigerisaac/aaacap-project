import twilio from 'twilio';
import { liveStreamXML } from './forwarding-live.js';
import type { FastifyInstance } from 'fastify';
import { secureEqual } from '../crypto.js';
import { purposes } from '../screening.js';
import { CloudStore } from './store.js';
import { ForwardingProbes } from './forwarding-probes.js';
import { ForwardingStore, type ForwardingCall } from './forwarding-store.js';
import { forwardingNumber, TelnyxVoice, validCallId, validRecordingId, verifyTelnyx } from './forwarding-provider.js';
import { CallMonitor, warningText } from './monitoring.js';

export type ForwardingVoiceDependencies = { lookupForwardingChild?: (sid: string) => Promise<{
  parentCallSid?: string | null; to: string; from: string; status: string;
}>; lookupForwardingInbound?: (sid: string) => Promise<{ from: string; to: string; direction: string; status: string }>;
  callMonitor?: CallMonitor };

export async function registerForwardingVoice(app: FastifyInstance, store: CloudStore, deps: ForwardingVoiceDependencies = {}) {
  const f = new ForwardingStore(store), config = store.config, kind = config.FORWARDING_PROVIDER;
  const probes = new ForwardingProbes(store);
  const number = forwardingNumber(config), telnyx = new TelnyxVoice(config);
  const provider = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, { timeout: 3000, autoRetry: false });
  const childLookup = deps.lookupForwardingChild ?? (sid => kind === 'telnyx' ? telnyx.call(sid) : provider.calls(sid).fetch());
  const inboundLookup = deps.lookupForwardingInbound ?? (sid => telnyx.call(sid));
  const monitor = deps.callMonitor ?? new CallMonitor(f, telnyx);
  const callback = (step: string, id?: string) => `${config.PUBLIC_BASE_URL}/forwarding/${config.TRIAL_PROXY_SECRET}/${step}${id ? `/${id}` : ''}`;
  const xml = () => new twilio.twiml.VoiceResponse();
  const hangup = (message?: string) => { const r = xml(); if (message) r.say(message); r.hangup(); return r.toString(); };
  const voicemail = (call: ForwardingCall, afterLiveScreening = false) => {
    const r = xml();
    if (afterLiveScreening) {
      r.stop().stream({ name: 'shield-live' });
      r.say('Sorry, Shield couldn\'t put your call through right now. Please leave a message after the tone, and press pound when you\'re finished.');
    } else r.say('You have reached Shield voicemail. Please leave a message after the tone. Press pound when finished.');
    r.record({ maxLength: 60, timeout: kind === 'telnyx' ? 0 : 5, finishOnKey: '#', playBeep: true,
      ...(kind === 'telnyx' ? { channels: 'single', format: 'mp3' } : { trim: 'trim-silence' as const }), method: 'POST',
      action: callback('recorded', call.id), recordingStatusCallback: callback('recording', call.id), recordingStatusCallbackMethod: 'POST' });
    r.hangup(); return r.toString();
  };
  const waiting = (seconds: number, announce = false) => {
    const r = xml(); if (announce) r.say('One moment while Shield checks your introduction.');
    r.pause({ length: seconds }); r.redirect({ method: 'POST' }, callback('result')); return r.toString();
  };
  await app.register(async voice => {
    voice.addHook('preValidation', async (request, reply) => {
      const body = request.body as Record<string, string> | undefined;
      const { secret, id } = request.params as { secret: string; id?: string };
      if (id && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return reply.code(403).type('text/xml').send(hangup());
      const signature = request.headers['x-twilio-signature'];
      const validBody = body && typeof body === 'object' && !Array.isArray(body) && Object.values(body).every(v => typeof v === 'string');
      const valid = /^[a-f0-9]{64}$/.test(secret ?? '') && secureEqual(secret, config.TRIAL_PROXY_SECRET)
        && validBody && validCallId(kind, body.CallSid ?? '')
        && (kind === 'telnyx'
          ? body.AccountSid === config.TELNYX_ACCOUNT_ID && (!body.ConnectionId || body.ConnectionId === config.TELNYX_APPLICATION_ID)
            && verifyTelnyx(config.TELNYX_PUBLIC_KEY!, request.headers['telnyx-signature-ed25519'], request.headers['telnyx-timestamp'], request.rawFormBody, store.now())
          : body.AccountSid === config.TWILIO_ACCOUNT_SID && typeof signature === 'string'
            && twilio.validateRequest(config.TWILIO_AUTH_TOKEN, signature, `${config.PUBLIC_BASE_URL}${request.raw.url}`, body));
      if (!valid) return reply.code(403).type('text/xml').send(hangup());
      reply.type('text/xml');
    });
    voice.post('/forwarding/:secret/inbound', async request => {
      const b = request.body as Record<string, string>;
      if (b.To !== number || !/^\+1\d{10}$/.test(b.From ?? '')) return hangup();
      if (kind === 'telnyx') {
        // TeXML does not promise Direction on its instruction-fetch webhook.
        let remote; try { remote = await inboundLookup(b.CallSid!); } catch { return hangup(); }
        if (remote.from !== b.From || remote.to !== number || remote.direction !== 'inbound' || !['ringing', 'in-progress'].includes(remote.status)) return hangup();
      } else if (b.Direction !== 'inbound') return hangup();
      if (b.From === number) {
        const probe = await probes.incoming(b.CallSid!);
        if (!probe) return hangup();
        const r = xml();
        r.gather({ input: ['dtmf'], numDigits: 8, timeout: 10, action: callback('probe-confirm', probe.id), method: 'POST' });
        r.hangup(); return r.toString();
      }
      const call = await f.begin(b.CallSid!, b.From!);
      if (!call) return hangup('Shield is not ready to receive this call. Please try again later.');
      if (call.state === 'voicemail') return voicemail(call);
      if (config.LIVE_SCREENING_ENABLED && kind === 'telnyx') return liveStreamXML(config, call, store.now());
      const r = xml(); const g = r.gather({ input: ['speech'], language: 'en-US', timeout: 6, speechTimeout: '1',
        ...(kind === 'telnyx' ? { transcriptionEngine: 'Telnyx' } : { actionOnEmptyResult: true }), action: callback('introduction'), method: 'POST' });
      g.say('This person uses Shield to screen calls. Please say your name and why you are calling.');
      r.redirect({ method: 'POST' }, callback('introduction')); return r.toString();
    });
    voice.post('/forwarding/:secret/probe/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      if (b.From !== number || b.To !== config.TRIAL_VERIFIED_CALLER) return hangup();
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
    voice.post('/forwarding/:secret/probe-confirm/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      const result = await probes.confirm(id, b.CallSid!, b.Digits ?? '');
      return hangup(result?.kind === 'ring' ? 'Your sound check passed. Shield has saved the result. Goodbye.' : undefined);
    });
    voice.post('/forwarding/:secret/probe-status/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      if (b.From === number && b.To === config.TRIAL_VERIFIED_CALLER) {
        await probes.outbound(id, b.CallSid!);
        await probes.ended(id, b.CallSid!, b.CallStatus ?? '');
      }
      return xml().toString();
    });
    voice.post('/forwarding/:secret/introduction', async request => {
      const b = request.body as Record<string, string>, call = await f.find(b.CallSid!);
      if (!call || call.state !== 'screening') return hangup();
      if (!b.SpeechResult?.trim() || b.SpeechResult.length > 6000) {
        const next = await f.transition(call.id, c => c.state !== 'screening' ? undefined : { state: 'voicemail', outcome: 'voicemail', reason: 'no_introduction',
          events: [...c.events, { kind: 'voicemail_offered', at: store.now() }] });
        return next ? voicemail(next) : hangup();
      }
      return await store.introduction(b.CallSid!, b.SpeechResult) === 'queued' ? waiting(1, true) : hangup();
    });
    voice.post('/forwarding/:secret/result', async request => {
      const original = await f.find((request.body as Record<string, string>).CallSid!); if (!original) return hangup();
      const { call, pauseSeconds } = original.screeningModel === 'gpt-live-1' && original.state === 'offering'
        ? { call: original, pauseSeconds: undefined } : await f.result(original.id); if (!call) return hangup();
      if (pauseSeconds) return waiting(pauseSeconds);
      if (call.state === 'voicemail') return voicemail(call);
      if (call.state !== 'offering') return hangup('This person cannot take this call. Please contact them through a number or service they already know.');
      const r = xml();
      if (original.screeningModel === 'gpt-live-1') r.stop().stream({ name: 'shield-live' });
      const monitored = await monitor.begin(call.id);
      // The caller hears the disclosure before transcription starts; only the accepted conversation is checked.
      r.say(monitored ? 'Please hold while Shield offers your call. If it connects, an AI assistant will transcribe the call to help protect against fraud.'
        : 'Please hold while Shield offers your call.');
      if (monitored) r.start().transcription({ transcriptionEngine: config.MONITOR_TRANSCRIPTION_ENGINE, transcriptionTracks: 'both',
        transcriptionCallback: callback('monitor', call.id), transcriptionCallbackMethod: 'POST' } as Parameters<ReturnType<typeof r.start>['transcription']>[0]);
      const dial = r.dial({ callerId: number, answerOnBridge: true, timeout: 20, timeLimit: 300,
        action: callback('dial-ended', call.id), method: 'POST' });
      dial.number({ url: callback('whisper', call.id), method: 'POST', ...(kind === 'telnyx' ? {
        statusCallback: callback('child', call.id), statusCallbackMethod: 'POST', statusCallbackEvent: ['initiated', 'ringing', 'answered']
      } : {}) }, config.TRIAL_VERIFIED_CALLER);
      r.hangup(); return r.toString();
    });
    voice.post('/forwarding/:secret/child/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      if (kind === 'telnyx' && b.From === number && b.To === config.TRIAL_VERIFIED_CALLER
        && validCallId(kind, b.ParentCallSid ?? '') && b.ParentCallSid !== b.CallSid
        && ['initiated', 'ringing', 'in-progress'].includes(b.CallStatus ?? '')) {
        await f.bindChild(id, b.CallSid!, b.ParentCallSid!);
      }
      return xml().toString();
    });
    voice.post('/forwarding/:secret/whisper/:id', async request => {
      const b = request.body as Record<string, string>, id = (request.params as { id: string }).id;
      let child; try { child = await childLookup(b.CallSid!); } catch { return hangup(); }
      if (child.from !== number || child.to !== config.TRIAL_VERIFIED_CALLER || child.status !== 'in-progress') return hangup();
      let parent = 'parentCallSid' in child ? child.parentCallSid : undefined;
      if (kind === 'telnyx') {
        // Bind from an authenticated child-status event, never from an unverified URL parameter.
        const bound = (await store.callRef(id).get()).data() as ForwardingCall | undefined;
        if (bound?.provider !== 'telnyx' || bound.childSid !== b.CallSid) return hangup();
        parent = bound.parentSid;
      }
      if (!parent) return hangup();
      const call = await f.whisper(id, b.CallSid!, parent); if (!call) return hangup();
      const r = xml(); const g = r.gather({ input: ['dtmf'], numDigits: 1, timeout: 7, ...(kind === 'twilio' ? { actionOnEmptyResult: true } : {}),
        method: 'POST', action: callback('accept', id) });
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
      if (call?.id === (request.params as { id: string }).id && b.RecordingStatus === 'completed' && validRecordingId(kind, b.RecordingSid ?? '')) {
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
    voice.post('/forwarding/:secret/fallback', async () => hangup('Shield is temporarily unavailable. Please try again later.'));
  });
}
