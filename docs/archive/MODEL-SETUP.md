# Screening model setup

Shield owns the extraction prompt and routing rules. Twilio supplies the telephone call and speech transcript. The model returns observations in a strict JSON schema; the backend checks evidence quotations and decides whether to offer, verify, hold for review, or fall back. A routine introduction does not authenticate the caller.

## OpenRouter / Gemini

1. Save the key privately in `.env.openrouter` using `.env.openrouter.example` as the template and restrict the file to mode `0600`. The key belongs on the backend only. Use the full OpenRouter key, including its `sk-or-` prefix.
2. Set `SCREENING_PROVIDER=openrouter`, `OPENROUTER_MODEL=google/gemini-3.7-flash`, and `MODEL_TIMEOUT_MS=5000`. The model is explicitly selected; there is no automatic switch to a different model or provider account.
3. Ensure the OpenRouter account has existing credits. Valid authentication does not establish that inference is funded. The setup does not add funds, enable automatic top-ups, or change account billing.
4. Run `npm run eval:model`. This makes 16 synthetic model requests and writes only case IDs, decisions and timing to the private `artifacts/evaluations/` directory. It does not publish transcripts or change live-service switches. Passing is a small smoke check, not a fraud-accuracy benchmark.
5. For the isolated phone demo, enable `TRIAL_SCREENING_ENABLED` and restart `npm run trial:voice`. For the full deployment, copy the provider settings into the host's secret store. The production `start` command reads `.env`; it does not automatically import the local trial credential file. Keep the full live-offering and SMS switches off until their separate routing and quality checks are complete.

Requests use a fixed HTTPS OpenRouter origin, reject redirects, cap output at 1,000 tokens, request minimal reasoning, apply a bounded deadline, and perform no application retries. Provider routing requires structured-output support, denies data-collection endpoints, requests ZDR endpoints, and favors latency. These request filters do not describe all OpenRouter account logging; review the account's actual privacy settings before a real pilot.

HTTP errors, truncated completions, refusals, invalid JSON/schema, and timeouts all become `screening_unavailable`. Missing or unsupported evidence becomes an uncertain decision. Caller text never becomes a tool call, transfer number, arbitrary spoken reply, or model instruction.

The existing direct OpenAI adapter remains available with `SCREENING_PROVIDER=openai`, `OPENAI_API_KEY` and `OPENAI_MODEL`. It is not used as an implicit fallback when OpenRouter is unavailable.

## Speech choices

- The active trial uses **Soniox TTS**, model `tts-rt-v2`, built-in voice `Adrian`, MP3/24 kHz/64 kbps. Run `npm run speech:prepare` with `.env.speech` to prepare the 11 fixed prompts. Completed prompts are reused; no caller text is sent to Soniox. The trial serves allowlisted, hash-verified audio and emits `<Play>` inside `<Gather>` and results. Startup rejects missing/stale/corrupt assets instead of silently changing voices. Runtime playback needs no Soniox key. See `.env.speech.example` and [Soniox's speech endpoint](https://soniox.com/docs/tts/rest-api/generate-speech).
- `<Gather>` can choose Google or Deepgram transcription automatically, or select a supported engine through `speechModel`. Selecting a specific engine requires a positive `speechTimeout`; the trial uses two seconds so a brief pause does not immediately cut off the introduction.
- `<Say>` can use supported Google or Amazon Polly voices through its `voice` attribute. Replacing the voice does not require changing the screening model.
- An external TTS provider can generate audio played with `<Play>`; static prompts can be generated once and cached. A fully custom streaming STT/TTS pipeline uses Media Streams and a WebSocket service, which is more work and is blocked in the current trial. ConversationRelay is also blocked by this trial's custom-TwiML restrictions.

Sources: [OpenRouter Gemini 3.7 Flash](https://openrouter.ai/google/gemini-3.7-flash), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs), [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), [Twilio Gather](https://www.twilio.com/docs/voice/twiml/gather), [Twilio Say](https://www.twilio.com/docs/voice/twiml/say), [Media Streams](https://www.twilio.com/docs/voice/media-streams), [trial restrictions](https://www.twilio.com/docs/usage/trials/try-out-voice).

## Observed status, 2026-09-21

The user added OpenRouter credits. The initial 3.5-second run matched 14/16 synthetic examples; two timed out and stayed unconnected. With a five-second deadline, all **16/16** matched, with zero unavailable results and zero inappropriate offers. Report: `artifacts/evaluations/model-1790028019118.json`. This remains a small synthetic smoke suite, not a fraud-accuracy benchmark.

After explicit approval to send the verified caller's spoken introduction to OpenRouter/Google, the trial was activated. A real call produced `call_received`, `introduction_received`, and a `message/uncertain` decision in **3,357 ms**. The user confirmed hearing the Soniox greeting and final screening result. The exact speech was not logged, so this establishes the connected pipeline, not whether that particular classification was correct.

The Soniox greeting was generated successfully, verified as a 2.352-second MP3, and fetched over the public tunnel with HTTP 200. All 11 trial prompts are cached. The full transfer/voicemail service still uses its existing speech implementation; those capabilities remain deferred. Latest local check: 94 backend tests across nine files, typecheck and compilation passed.
