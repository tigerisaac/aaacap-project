# iPhone screen and motion audit

October 17, 2026. The bounded screen and motion audit is complete, with physical limits stated below. This record separates source review, synthetic simulator results, and physical iPhone observations. No call or carrier-setting test is part of this audit.

## Scope and evidence

The request is to inspect every app screen and animation, reproduce visual breakage, correct the causes, and validate the result. Shield targets iPhone and portrait orientation. The audit uses iPhone 17e/iOS 26.5 and iPhone 18 Pro/iOS 27 simulators, plus an isolated iPhone 12 Pro Max/iOS 27 simulator matching the owner's phone dimensions. The physical iPhone 12 Pro Max is available through iPhone Mirroring.

The app uses native navigation, tab, sheet, keyboard, picker, alert, and switch transitions. Its custom continuous animation is the bundled setup demonstration. Lists use native recycling; there is no app-wide entrance animation or custom back recognizer. A source inventory found no explicit `withAnimation`, repeating SwiftUI animation, transition, matched-geometry or custom gesture animation to audit separately.

| Motion family | Evidence |
| --- | --- |
| Navigation, tab restoration and interactive back | Daily navigation, nested Settings/text-check route, retained help disclosure and call detail across tabs; physical Mirroring and simulator assertions |
| Form and action-state geometry | Quiet-hours toggle reversal, From/Until values and action top edge at standard/XXXL, including four-second Saving; final videos with Reduce Motion on/off |
| Disclosures and scrolling | Expanded help/privacy and restoration instructions, pinned ordinary-size actions and scrolling accessibility-size actions; viewport-safe taps and return paths |
| Modal, keyboard and native picker transitions | Phone/email sheet escape with keyboard, invalid/send recovery, system Contacts/photo opening and cancellation; native controls differ by OS |
| Seven bundled instructional guides | Source, GIF/poster/MP4 metadata, all seven poster assets and relevant setup/restoration routes; five physical timing samples below, background/resume observation, static Reduce Motion fixtures |
| Periodic text and playback | One-second resend/playback progress and 15-second Home freshness text; playback pause/resume/restart/background safety and status states. Native periodic updates are not compositor frame-rate measurements. |

The canonical checkout contained concurrent work. Existing changes were retained. The concurrent caching task repaired navigation routes, title lifetime, disclosure expansion and loading feedback in commit `79a23ec`. Those changes are included in this validation snapshot; their authorship is separate from this audit’s corrections. The audit's isolated combined-source build is identified by SHA-256 for each Swift source/project file in `artifacts/private/motion-audit-2026-10-17/shipping-source-verified.json`; tests against an earlier binary do not certify later changes.

The broad iOS 27 matrix uses `integrated-source-final.json`. The final targeted runs use the shipping source above. The app-source differences from the broad matrix are the final Quiet hours label-height envelope, wrapping SharedContacts action and the reproduced nested Form-link correction; each receives separate final-build checks. Later test-only changes correct native-service waiting, toolbar-progress queries, viewport-safe scrolling, current disclosure wording and 64-character speech excerpts. They also guard disclosure collapse against accidentally leaving Shield.

All test contacts, histories, numbers, messages, provider results and account deletion states are synthetic. Native OS surfaces are inspected without placing calls, sending requests to people, changing forwarding, changing the owner's phone settings, or deleting an account.

## Corrections made by this audit

| Finding | Cause and correction | Verification |
| --- | --- | --- |
| Quiet hours jumps open while the switch is still moving | Conditional From/Until rows changed the native Form geometry in one frame. Keep both time pickers mounted and disable them while off. Reserve the unsaved-help line and the tallest native save-action label’s height, including Saving. Hidden sizing labels do not enter accessibility. The switch keeps its native motion. | Before: 60 fps video showed the card bottom jump from y277 to y397 in one frame. Independent review rejected the ineffective binding animation, then caught the separate one-line/two-line action-height change. Final checks pass for From position and action top edge through saved/unsaved/saving at standard/XXXL, with Reduce Motion on and off. The independent reviewer scored both scoped findings resolved (ship). |
| Setup guide skips instructional time on return from another app | Frame selection included all elapsed wall-clock time. Retain the paused timestamp and exclude inactive time from playback. Decode buffering and scene pausing remain bounded. | Source reviewed. Physical keypad guide resumed in the same instructional sequence after backgrounding; this was a qualitative observation, not a frame-index assertion. Five 40-second physical timing reports are recorded below. |
| Setup changes recreate the entire scroll container and primary action | A changing view identity enclosed the scroll view and was repeated on the footer. Keep both stable, reset only step content, and explicitly return the new step to its top anchor. | All six carrier, thirteen setup-guide and fifteen forwarding cases passed across the broad run and affected reruns. Largest-text written alternatives and actions were reviewed in the additional setup packet. |
| Email sign-in has no visible route back to phone sign-in | The presented email screen hides its navigation bar. Give the sheet a native Close action while retaining the standalone email layout. | Simulator checks passed at standard and maximum text sizes with the keyboard, including the broad iOS 27 run; the independent review confirmed Close remains reachable. |
| Secondary screens briefly insert loading cards before fast local/cached reads | Initial progress was shown immediately. Reuse the existing 250 ms deferred-loading behavior on saved numbers, blocked numbers, contacts, helpers, quiet hours, call protection, message alerts, trusted contacts and alerts for others. Retain actual error recovery and previously loaded content. | All 23 SeniorPolish cases passed in the broad run, including failed-load recovery and preserved forms. Slow first-load progress and retained empty/cached results passed with the current toolbar query. |
| Collapsing call-protection privacy can open Safari | A nested Link inside one native Form row adopted the row-wide automatic interaction. Give only that link an explicit borderless native style and full target; retain the native disclosure. The original text-disappearance assertion could pass while leaving Shield, so confirmation checks the settled foreground/page and actual pixels. | Final normal/XXXL native-button open/close passed with settled foreground/page checks and four actual Shield captures; the independent reviewer scored this interaction resolved (ship). |
| Contact-removal action truncates its destination at maximum text size | The bordered native Label compressed its title. Keep the native button and confirmation; use a leading SF Symbol plus vertically unrestricted, leading-aligned Text. | Independent review of all 126 compact captures found this defect. Final normal/XXXL confirmation-cancellation passed on iOS 26.5 and iOS 27. The final viewport-safe iOS 27 recaptures show the entire three-line action above Search; the independent reviewer scored the original finding resolved (ship), scoped to that correction. |

## Screen coverage ledger

The table lists screen families and their important states, rather than counting each presentation variant as a separate feature. An automated action assertion is functional evidence; screenshots are layout evidence; neither is a measured physical frame-rate result.

| Screen family | States and interactions included | Validation paths |
| --- | --- | --- |
| Phone sign-in | Number entry, verification, incorrect code, resend/change number, keyboard, email sheet exit | PhoneOnboarding; motion email-sheet test |
| Email sign-in | Empty/invalid input, keyboard, interrupted submission, sent state, changed email, return link, largest text | ShieldUI; Redesign; SeniorPolish; motion sheet test |
| Protection choices | Default choice, toggling, failed save, largest text | ShieldUI; SeniorPolish |
| Trusted-contact onboarding | Independent choice, add form, waiting state, back/cancel, largest text | PhoneOnboarding; SeniorPolish |
| Get started | Unenrolled and account-load failure/retry, safe deletion entry | ShieldUI; SeniorPolish; screen matrix |
| Home | Status variants, stopped total/zero/unavailable, messages, recent calls, person change, scrolling | HomeReadability; Redesign; SeniorDesign; ShieldUI |
| Calls | All/Stopped/Answered/Messages, empty/error/cached history, row detail, scrolling, tab return | SeniorDesign; HomeReadability; OfflineHistory; motion navigation test |
| Call details | Stopped, answered, missed, notice, voicemail, unavailable/private/removed message, metadata and disclosure | ShieldUI; SeniorDesign; SeniorPolish |
| Messages | All/kept sample states, notices and voicemail, removed section, empty/error/offline | SeniorDesign; ShieldUI; OfflineHistory |
| Playback | Start, pause/resume, restart, background/cancelled load, denied access, unconfirmed heard status | SeniorPolish; MessageAudioStorage |
| More | Root title, each destination, tab stack restoration, safe sample exit | SeniorDesign; SeniorPolish; motion navigation test |
| Check a text | Editor, keyboard, paste/photo actions, consent cancellation, sample answer, retry/new text | SeniorDesign; Redesign |
| Family & friends | Person selection, owner/helper differences, helper and contact destinations, largest text | ShieldUI; SeniorPolish; SeniorDesign |
| Your helpers | Empty/unavailable, accepted/pending access, stop-sharing cancellation | SeniorPolish; screen matrix |
| Trusted contacts | Empty state, add form, pending status, alert choice and removal controls | PhoneOnboarding; extended screen matrix |
| Alerts for others | Pending/accepted requests, text/app choices, save/decline/stop, large text | PhoneOnboarding; extended screen matrix |
| Settings | Owner/helper menus, nested routes, privacy row, sign-out/delete entry, scroll and return | SeniorDesign; SeniorPolish; ShieldUI |
| Phone setup menu | Sample, ordinary saved setup, trial options, instructions, retry | SeniorPolish; screen matrix |
| Guided setup | Overview, consent/details, contact, sound check, helper install, settings and confirmation, actual carrier-code count, probe, completion | Forwarding; CarrierSetup; PhoneSetupShortcut; SetupGuide |
| Setup recovery | Failed checks, unavailable reminder, manual guide, repeated app visits, saved-file route, retained step | Forwarding; SetupGuide; PhoneSetupShortcut |
| All setup demonstrations | Phone settings, Silence, Live Voicemail off, keypad, Never, Live Voicemail on, shortcut reminder; running/static/post-return variants | Source/asset review; physical timing samples, Reduce Motion matrix and static guide fixtures |
| Disconnect | Overview/local instructions, carrier task, unknown-callers setting, voicemail setting, call check, voicemail check, completion, help and optional voicemail preference | Disconnect; Forwarding; SetupGuide |
| Delete account | Before enrollment, restoration prerequisite, final cancellation, contact restore choice, pending/accepted/completed receipt | ShieldUI; Disconnect; contact-storage fixtures |
| Numbers you trust | Loaded/empty/error, add form, name/phone input, picker, interrupted save, safe removal/call controls | SeniorPolish; SeniorDesign; Redesign |
| Your contacts | Calling list, search, removed contacts, partial save failure, restore/removal cancellation | SeniorPolish; contact-storage fixtures; screen matrix |
| Quiet hours | Loading/error, off/on, time pickers, unsaved/save-failed state, row target and reversal | SeniorPolish; motion quiet-hours test |
| Blocked numbers | Empty/populated/error, owner/helper permissions, allow/cancel, explanatory disclosure | ShieldUI; SeniorPolish; screen matrix |
| Checks while you talk | Unavailable/on/off, consent, expanded privacy explanation | SeniorDesign; SeniorPolish; screen matrix |
| Message alerts | On/off/provisional, status recovery and Settings action | Screen matrix |
| Automatic text checks | Availability explanation, privacy disclosure, nested Check a text route | SeniorDesign; navigation validation in the concurrent task |
| Get help | Each disclosure, nested trusted numbers, interactive back and retained expanded state | SeniorDesign; extended motion navigation test |

## Results and limitations

- `npm run check`: passed typecheck, build and **316 unit tests**; 228 emulator-only tests skipped in that unit invocation.
- `npm run test:firebase`: initial local run **229/229 passed**. The final rerun passed **228/229**, with one `INVALID_ARGUMENT: Transaction is invalid or closed` emulator failure in the concurrent stopped-total test. The affected `cloud.test.ts` suite then passed **16/16** in an isolated emulator rerun; no backend source change was needed. The original failure and confirming run are retained.
- Final Debug simulator build-for-testing, signed Debug physical-device build, and unsigned Release device build: passed. The previous combined Debug build was installed/reopened normally at approximately 01:16 Central. The last nested-link repair was installed at approximately 01:40 Central and its package signature verified; final Mirroring reconnection and normal launch were blocked because the iPhone required unlocking. The sample launch also failed before starting, so no final sample session was left open. Earlier physical observations below precede that last isolated link correction. The broad UI matrix and focused recovery results are listed below.
- **130 distinct UI checks passed across the recorded runs**, counted by class/test name rather than repeated executions. The broad iOS 27 matrix initially passed **110/115** with no skips; five outdated assumptions (disconnect routing, Settings link hit area, toolbar progress, native Contacts startup wait, retained Settings scroll) were corrected and all five affected cases passed. Final targeted runs also cover the last two geometry changes. The private `distinct-ui-checks.json` maps each passing check to its run.
- Focused final VoiceOver: playback, quiet hours and setup/disconnection each passed. The native service returns 64-character speech excerpts; setup verifies the warning’s reachable spoken prefix plus its complete accessibility label. The earlier retired-text assertion, interrupted excerpt-mismatch attempt, and final passing result remain recorded. A contact recapture helper initially overscrolled the row; a bounded drag corrected the test, and the complete action/confirmation-cancellation passed.
- On the installed combined-source build, physical iPhone Mirroring confirmed the nested Check a text route, expanded help containment, editor focus/dismissal, and correct titles returning through Automatic text checks to Settings. Setup checks use the offline synthetic fixture. No owner preference was saved.
Physical iPhone 12 Pro Max, 40 active seconds per guide; all request 30 fps. These are opt-in app presentation timings, not screen-wide compositor/Instruments traces. The same guide source is in the shipping build.

| Guide | Frames presented | Longest presentation gap | Gaps above 50 ms |
| --- | --- | --- | --- |
| keypad | 1,200 | 34.3 ms | 0 |
| phoneSettings | 1,200 | 46.1 ms | 0 |
| shortcutVoicemail | 1,201 | 35.4 ms | 0 |
| voicemailOff | 1,200 | 47.9 ms | 0 |
| never | 1,200 | 34.8 ms | 0 |

Keypad had one 52.1 ms display-link tick; its decode runway avoided a corresponding presentation gap. Private reports are named `physical-*-timing.json`. Guide pause/resume was observed qualitatively and reviewed in source; exact frame-index continuity was not instrumented.

- Focused iOS 27 VoiceOver checks inspect actual spoken focus and reading flow. The existing walkthrough disables VoiceOver for direct test actions and paging because the simulator does not reliably activate even native switches with VoiceOver enabled. These results do not certify physical VoiceOver gestures.
- Historical automated accessibility diagnostics under native bars and unassociated clipping reports are documented in DESIGN.md. They are not silently treated as passes by this audit.
- Real-call behavior, carrier restoration, notification delivery, another person's usability, and universal hitch-free physical performance require separate evidence.
- Compact Reduce Motion matrix: **11/11 passed**, with **126 exported captures** reviewed individually and in 21 contact sheets by the main agent and an independent fresh reviewer. Their full-scope image review identified the contact-action truncation; Quiet hours was excluded and reviewed separately.
- The compact result still records four invalid-frame warnings plus an internal quality-of-service warning. Check a text opening reproduces the frame warning; source review found no negative or infinite explicit frame values in that screen. These diagnostics are retained and are not declared resolved. **Follow-up (October 17):** the frame warning comes from SwiftUI's keyboard toolbar on a pushed or presented screen. A timestamped probe on iOS 26.5 put it at the push of Check a text. It persisted with a single `.keyboard` item and moved to the moment of focus when the item was declared only while editing. Moving Done to the navigation bar on Check a text, Add trusted contact and the email sheet removed it from all four affected tests (see DESIGN.md, October 17). Phone sign-in no longer has a keyboard Done, and the test-only standalone email screen shows Done on the bottom safe area instead. No `.keyboard` toolbar remains, and the iOS 26.5 run of all affected suites recorded no invalid-frame warning. The quality-of-service warning remains. Native photo-picker evidence covers opening/loading and cancellation back to the editor, not a loaded photo library or OCR accuracy. The Device Hub mirror omitted the iOS 27 Contacts remote view; an authoritative simulator framebuffer capture showed the populated native picker and its Close control. That mirror artifact is not recorded as an app rendering defect.

The additional broad-run screenshot pass inspected 223 captures in 39 sheets: 58 account/onboarding/disconnection and 74 setup captures received independent scoped **ship** reviews; the main agent inspected 91 daily/recovery captures. The superseded Quiet hours/contact images in that broad source are not substituted for final geometry evidence. One collapsed-disclosure capture showed Safari. The first foreground/page assertions raced the external launch; actual simulator pixels revealed a real nested Form-link defect rather than a capture artifact. An explicit borderless style on only the nested Link corrected its row-wide interaction. Final native-button open/close passed at standard/XXXL, with settled foreground/page checks and valid expanded/collapsed captures. The old Safari and initially misleading guarded result are retained and excluded from success evidence. Neither backgrounding nor absence of the old text alone is treated as successful collapse.

Full logs, videos, source manifests and test bundles are retained under ignored `artifacts/private/motion-audit-2026-10-17/`. Fresh synthetic captures and contact sheets are under `.impeccable/review/motion-audit-2026-10-17/`. Only captures from the named test run are used; older simulator screenshots are excluded by capture time or test-bundle identity.

Independent review dispositions and committed synthetic Quiet hours references are in [the scoped finish-review record](../.impeccable/review/motion-audit-2026-10-17/finish-review.md). No deployment or real-call verification is part of completion.
