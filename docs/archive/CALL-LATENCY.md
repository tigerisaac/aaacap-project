# Private trial latency

The September 21 update addresses the user's report of intermittent delay. The expired-session message was the stored one-hour trial limit, not a Mac process or Firebase outage. A new window was explicitly opened at 20:44:55 America/Chicago, ending at 21:44:55, with the existing verified-caller restriction and ten-call cap.

## Baseline evidence

Two hosted calls completed screening 4,288 ms and 4,565 ms after their introductions reached the backend. Final result responses followed another 2,021 ms and 1,636 ms later, respectively. Those timestamps do not measure Twilio's initial pickup, speech recognition or final audio playback. The earlier code also waited for two seconds of silence before submitting speech and used two-second result pauses.

## Changes

- Twilio `<Say>` replaces every Soniox `<Play>` prompt. The greeting remains “Hello, what's your reason for calling?” The deployment no longer requires or includes Soniox audio; local originals are retained for a future opt-in.
- End-of-speech silence is one second rather than two. The six-second allowance to begin speaking stays intact. A pause of one second within an introduction can finish recognition sooner, so slower speech with long pauses still needs device testing. This is Twilio's documented [`speechTimeout`](https://www.twilio.com/docs/voice/twiml/gather#speechtimeout) behavior.
- The first result check and first three retries use one-second pauses, followed by two-second backoff. Total allowed pauses remain twelve seconds, and the last result uses hop nine, below the [trial's ten-hop limit](https://www.twilio.com/docs/usage/trials/try-out-voice). Every callback still validates the secret, verified caller and active provider call. There are no model retries.
- Only the API function loads the HTTP app, Twilio client and auth handler. Screening and cleanup avoid those imports. A local fresh-process entry-module check fell from 693 ms to 220 ms; this is not a full Firebase cold-start benchmark. [Firebase's dependency guidance](https://firebase.google.com/docs/functions/tips#use_dependencies_wisely) recommends avoiding imports a function does not use.
- An admitted inbound call creates one preparation event for the same screening function. The worker initializes and deletes that empty preparation while the greeting and caller introduction are in progress. This performs no model request, stores no speech and uses no additional call allowance. It adds one small event invocation/document per admitted call and helps move cold initialization ahead of the introduction; instance reuse is not guaranteed. No timer or minimum instance keeps it running between calls.
- Stored `timings.queueMs` measures job creation through model start; `timings.modelMs` measures the screening attempt. Cloud logs contain only a fixed webhook step, total duration, provider lookup duration and HTTP status. No secret URL, call ID, phone number, or introduction is logged.

Gemini already uses minimal reasoning and latency-based provider routing. Its prompt, evidence validation, privacy settings and five-second deadline are unchanged. Functions still have zero minimum instances, so cold starts and external provider variability remain possible. A shorter fixed wait is not a guarantee that every call will be faster.

## Validation

95 backend tests and twelve Firestore emulator tests passed, including the Twilio speech flow, shortened early polls, bounded timeout, fail-closed screening, concurrent call limits, duplicate jobs, empty worker preparation and access control. TypeScript compilation passed. A REST-transport experiment was dropped after incompatibility with emulator authentication; the existing Firestore transport is retained.

The final update deployed successfully. All three functions are ACTIVE with zero minimum instances. Hosting health/readiness returned 200, and the public privacy page confirms Twilio speech and no Soniox. A newly deployed worker initially took 5,555 ms before model start and 3,164 ms for Gemini; its synthetic result was observed at 10,036 ms. This exposed startup/event delivery as another source of intermittent delay and motivated the preparation event above.

After the final deployment, preparation completed in 2,885 ms before the synthetic introduction was submitted. That introduction then waited 1,652 ms to start the model, Gemini completed in 2,628 ms, and the diagnostic client observed the result after 5,251 ms. This verifies preparation and screening against real Firebase events and Gemini. These are two individual synthetic samples, not a latency percentile or an all-call improvement guarantee; they also include variation in model response time and the diagnostic client's one-second polling. The final phone/audio comparison remains pending user feedback.

`node scripts/check-firebase-screening.mjs --prepare` exercises preparation followed by one isolated synthetic introduction, records queue/model timing, and removes its fixture records. `node scripts/check-call-latency.mjs` reads up to ten recent trial calls and forty sanitized webhook timings; its local report contains no caller numbers or speech. A real inbound call is needed to confirm the new audio and perceived delay on the phone.
