---
name: Shield
description: A familiar native call companion with clear words and roomy controls.
colors:
  action-light: "#224CC5"
  action-dark: "#9BB3FF"
  action-light-high: "#173AA3"
  action-dark-high: "#BDD0FF"
  held-light: "#B53742"
  held-dark: "#FF9B9C"
  held-light-high: "#8F2230"
  held-dark-high: "#FFBCC1"
  connected-light: "#076C5C"
  connected-dark: "#74DDC6"
  connected-light-high: "#005043"
  connected-dark-high: "#A2F3DF"
  message-light: "#7244B9"
  message-dark: "#CAAEFF"
  message-light-high: "#58308F"
  message-dark-high: "#DECAFF"
  secondary-light: "rgb(34% 34% 34%)"
  secondary-dark: "rgb(76% 76% 76%)"
  secondary-light-high: "rgb(20% 20% 20%)"
  secondary-dark-high: "rgb(86% 86% 86%)"
  action-ink-light: "#FFFFFF"
  action-ink-dark: "rgb(8% 12% 22%)"
typography:
  display:
    fontFamily: "system-ui"
    fontWeight: 700
  title:
    fontFamily: "system-ui"
    fontWeight: 700
  headline:
    fontFamily: "system-ui"
    fontWeight: 600
  body:
    fontFamily: "system-ui"
  supporting:
    fontFamily: "system-ui"
  label:
    fontFamily: "system-ui"
    fontWeight: 600
rounded:
  card: "26pt"
  field-and-intro: "14pt"
spacing:
  compact: "8pt"
  regular: "12pt"
  content: "16pt"
  card: "20pt"
  page: "24pt"
  section: "28pt"
components:
  button-primary:
    backgroundColor: "{colors.action-light}"
    textColor: "{colors.action-ink-light}"
    typography: "{typography.headline}"
    height: "52pt"
  button-primary-dark:
    backgroundColor: "{colors.action-dark}"
    textColor: "{colors.action-ink-dark}"
    typography: "{typography.headline}"
    height: "52pt"
  button-secondary:
    textColor: "{colors.action-light}"
    typography: "{typography.headline}"
  input-email:
    typography: "{typography.body}"
    rounded: "{rounded.field-and-intro}"
    padding: "{spacing.content}"
  navigation:
    textColor: "{colors.action-light}"
  outcome-label:
    typography: "{typography.label}"
  call-row:
    padding: "8pt 0"
  action-row:
    typography: "{typography.body}"
    height: "52pt"
    padding: "8pt 0"
  voicemail-row:
    typography: "{typography.headline}"
    padding: "8pt 0"
  sample-banner:
    typography: "{typography.label}"
    padding: "8pt 16pt"
  card-container:
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  home-stopped-calls:
    backgroundColor: "{colors.action-light}"
    typography: "{typography.display}"
    padding: "12pt 0"
  switch-row:
    height: "52pt"
---

# Design System: Shield

## Overview

**Creative North Star: "Public-library wayfinding"**

Shield keeps a familiar native iPhone appearance: grouped lists, straightforward labels, system text, and recognizable controls. Quiet surfaces and four adaptive accents help people find a call, understand its result, and choose the next action. The library metaphor describes legible wayfinding; it does not introduce themed decoration.

The October 12 refinement makes an 80-year-old's understanding the bar. Ordinary screens use everyday words, fewer visible choices, and room for text to grow. Less common details open on request. Setup, disconnection, privacy, and sharing retain the information and explicit confirmations needed for a meaningful choice.

**Key Characteristics:**

- Native tabs, navigation stacks, grouped lists, forms, sheets, menus, and confirmation dialogs.
- Action blue, stopped-call red, answered-call teal, and voicemail violet with Light, Dark, and increased-contrast variants.
- Semantic Dynamic Type, wrapping text, generous app controls, and content-based stacking.
- Explicit person context, sharing scope, truthful service state, and a persistent sample-data marker.
- Home's native large title shares the grouped canvas at rest; its collapsed navigation background matches that surface.
- One choice per onboarding screen, progressive disclosure, and visible recovery when a task fails.

**Evidence boundary:** Refreshed from local SwiftUI source and the October 12 senior-polish simulator packet at `.impeccable/review/polish-final/pro`. The rules below record implemented patterns; the current review evidence and unresolved native diagnostics belong in [the polish audit](docs/IOS-POLISH-AUDIT.md). No clean overall native audit, real VoiceOver session, older-participant usability, physical-device approval, or real-call performance is claimed. Deployment evidence remains separate in [Status](docs/STATUS.md). No deployment, owner-phone change, carrier setting, or real call occurred in this documentation pass.

## Colors

Color gives actions and call outcomes a consistent identity while opaque supporting text and native grouped surfaces carry the reading hierarchy.

### Primary

- **Action blue** (`Action`; `action-*`): application tint, selected navigation, primary actions, setup context, calls being checked or offered, and the positive Home Calls stopped panel. The historical panel does not represent current protection status.

### Secondary

- **Stopped-call red** (`Held`; `held-*`): Stopped and Check first outcomes, warning context, and text checks that need caution. It never authenticates a caller or independently proves wrongdoing.
- **Answered-call teal** (`Connected`; `connected-*`): Answered outcomes. It describes a connected call, not a verified identity.

### Tertiary

- **Voicemail violet** (`Message`; `message-*`): message outcomes, the unheard-message dot, and sharing context.

### Neutral

- **Opaque supporting text** (`ShieldTheme.secondaryText`; `secondary-*`): key headings, footnotes, timestamps, placeholders, and supporting explanations. The increased-contrast variants strengthen foreground separation without lowering opacity.
- **Native grouped surfaces:** `ShieldTheme.surface` is `systemGroupedBackground`; `ShieldTheme.card` is `secondarySystemGroupedBackground`. Lists and Forms retain native separator and selection behavior. These are adaptive system colors, not the earlier fixed Surface asset values.
- **Native foregrounds:** `.primary` remains the ordinary reading color; a missed-call outcome can use `.secondary`. **Action ink** (`ShieldTheme.actionInk`; `action-ink-*`) supplies white text on deep Light Mode actions and deep ink on pale Dark Mode actions. Disabled primary labels return to the native primary foreground. Native Paste has its own deep `PasteFill` asset so its system white label stays readable in both appearances.

Small symbol backgrounds may use a role tint at low opacity, such as ScreenIntro's 10% fill. Outcome labels themselves are unboxed. The sample marker sits on an opaque system surface.

**The Outcome Truth Rule.** Pair color with a familiar outcome label or symbol; a call being checked, offered, or answered never implies an authenticated caller.

The sidecar's synthesized tonal strips only illustrate hue in the documentation panel. The app uses the asset and foreground variants above; intermediate ramp colors are not native tokens.

Source: `ios/Shield/Design/ShieldTheme.swift`, `ios/Shield/Models/CallOutcome.swift`, and `ios/Shield/Resources/Assets.xcassets`.

## Typography

Native system fonts supply interface text and SF Symbols supply iconography. The frontmatter's `system-ui` is a portable family description; SwiftUI's semantic text styles and Dynamic Type are authoritative. There is no custom fixed-size type ramp or line-height scale.

| Role | Implemented style | Use |
| --- | --- | --- |
| Display | Native navigation title; `.largeTitle.bold()` for Shield | Screen identity and sign-in brand |
| Title | `.title.bold()`, `.title2.bold()`, or `.title3.bold()`; `.title3` for message summaries | Onboarding and setup headings, call-detail title, results, focused introductions, readable summaries |
| Headline | `.headline`; `.body.weight(.semibold)` in call rows | Message titles, section headings, action labels, call purposes |
| Body | `.body` or default Text | Instructions, form content, explanations, More choices |
| Supporting | `.subheadline` | Call time, outcome, number, sharing scope, sample marker |
| Label | `.subheadline.weight(.semibold)` | OutcomeBadge and sample-data identity |

Invitation and carrier codes use native monospaced text where appropriate. They are task-specific content, not a display face. Call timestamps expose full dates to accessibility even when visible text uses a local time, Yesterday, or a short date.

The user-requested Home count uses `.largeTitle.scaled(by: 1.5).bold()` with monospaced digits beneath a wrapping `.title3.bold()` heading. This emphasis belongs to the single historical count panel; it does not replace the native type ramp across other screens.

**The Native Type Rule.** Preserve semantic text styles and allow wrapping or stacking before introducing a fixed text size.

## Layout

The four native tabs are Home, Calls, Messages, and More. Messages keeps voicemail and saved prerecorded notices in one inbox. Each destination owns a NavigationStack. Lists use `.insetGrouped`, hide the scroll-content background in favor of the shared system surface, and set the default minimum row height to 60 points. Native hard scroll-edge effects remain the shared default, with Home's top edge deliberately hidden. Sheets and dialogs retain platform behavior.

Home explicitly uses the native large navigation title and hides its top scroll-edge effect. Its navigation-bar background uses `ShieldTheme.surface` with automatic visibility: the large title shares a continuous grouped canvas at rest, and the collapsed title gains an opaque matching background while content scrolls beneath it. NavigationShell supplies the same adaptive grouped surface behind the NavigationStack and safe areas. At ordinary text sizes the native person control stays in the toolbar; at accessibility sizes person context moves into the scrollable page. Other screens and scroll edges retain their hard effect. These are scoped native behaviors, not fixed surface-color or safe-area-offset tokens.

`ShieldTheme.Spacing` defines the six spacing tokens in frontmatter. Sign-in has a centered readable column capped at 560 points and page padding; it scrolls as content and the keyboard require. There is no custom viewport breakpoint system or app-specific iPad split layout.

`ShieldTheme.Layout.minimumTarget` is 52 points for shared primary-action labels and many app-owned actions; this is a minimum, never a fixed clipping height. The frontmatter's component `height` values express this minimum. Grouped rows use the 60-point default and grow with their content. Platform-owned controls keep native sizing. PersonPicker currently has a separate explicit 44-point minimum; this local exception does not establish the general app target.

From `.xxxLarge`, Calls replaces its segmented filter with a full-width menu, call titles and times stack, and call outcomes and numbers occupy separate lines. Message kind, new/removed/kept state, and date stack at the same threshold. At accessibility sizes, busy primary-action labels can put the spinner above the words; ActionRow removes its decorative icon column so the label has more room. At other sizes that column scales relative to `.title3` through `ScaledMetric`. `ViewThatFits` stacks short action groups when their content does not fit horizontally. The text-check editor scales its 120-point base height relative to `.body`.

`PersonContextSection` keeps the viewed person's name in the scrollable Home, Calls, and Messages lists at accessibility sizes. A multiple-person context offers a wrapping link to Family & friends; a single helper context shows the name in words. It replaces the toolbar person treatment at those sizes rather than adding a second cramped control.

**The Room for Words Rule.** Stack metadata and move person context into the page before shrinking text; at accessibility sizes remove decorative row icons when they compete with the label.

## Elevation & Depth

Shield defines no custom shadow, blur, motion-duration, or easing tokens. Native grouped rows and system surface layering provide depth. The Home historical count uses one opaque Action-colored native list row when positive and a neutral card surface when zero or unavailable. Home's navigation background appears automatically in its collapsed state and matches the grouped canvas; its top scroll-edge effect is hidden, and other edges keep the shared hard effect. Menus, sheets, dialogs, control materials, and pressed feedback use operating-system behavior. The sample-data marker occupies its own opaque area above the TabView content; it does not float over scrolling rows. Message listening and legacy restoration controls use a bottom safe-area inset with an opaque system surface.

**The Native Surface Rule.** Use grouped system surfaces and native control feedback before introducing custom elevation or viewport geometry.

## Shapes

Primary buttons are native large `.borderedProminent` controls with capsule borders. Sign-in fields and introduction symbol tiles share the rounded field-and-intro geometry. The reusable `shieldCard` helper uses the card radius and card padding; ordinary list sections remain native grouped containers. No custom badge capsule surrounds outcome labels.

The existing ShieldMark image retains its continuous app-icon enclosure. Its geometry is specific to the identity asset and does not establish a general-purpose container. In-app icons use SF Symbols, not character glyphs or a separate icon font.

## Components

### Buttons

`shieldPrimaryButton` sets native prominent styling, large control size, capsule shape, and Action tint. `ShieldActionLabel` supplies a full-width, wrapping headline and the shared minimum target, with adaptive `actionInk` foreground. Loading states name the work and show ProgressView; disabled controls prevent duplicate or incomplete submissions. Secondary actions use native text or bordered controls. Destructive actions use native roles and explicit confirmation. Native focus, pressed, and disabled appearances remain authoritative.

`shieldSecondaryButton` gives reusable secondary actions the native large bordered capsule treatment. Visible **Remove**, **Allow calls again**, **Call**, and recovery actions supplement swipe or context-menu shortcuts where present. **Allow calls again** uses words without a competing hand symbol. Contacts' **Remove** action fills its row with a rectangular touch area. Each action names its affected number or person for accessibility. A disabled or unavailable service action needs nearby state text; its appearance alone does not explain the reason.

### Switches

`ShieldSwitchStyle` preserves the familiar iPhone switch while making the entire labeled row tappable with the shared minimum target. The wrapping label and visual switch remain together. The inner visual switch is hidden from accessibility and hit testing; an accessibility representation exposes one native Toggle with its label and value. RootView applies this treatment across app toggles. This is an implemented interaction pattern, not evidence that a real VoiceOver session has passed.

### Inputs / Fields

Sign-in uses email and one-time-code fields with keyboard/content types, persistent visible labels, explicit accessibility labels, rounded card-colored containers, and a focus border. Long email addresses, helper names, saved-number names, phone numbers, and invitation codes use vertical fields that can grow. Email and phone entry expose a labeled **Clear** action while editing. Add number keeps **Done** in the full-width bottom action while a field is being edited; it ends editing and dismisses the keyboard. The same action becomes **Save number** after editing, with validation and working-state guards. Other entry screens retain keyboard **Done** controls where implemented. Sharing and entry sheets retain native Form fields, Picker, and Toggle. Check a text uses a labeled TextEditor with an accessibility-hidden placeholder, native Paste and Picture actions, and explicit agreement before sending text.

Routine errors use ShieldNotice near the affected content; the root alert handles shared errors. Add number, Use an invitation, and Quiet hours scroll new save errors into view and request accessibility focus. Editing clears the stale error. Forwarding also scrolls and requests focus for step errors when setup data is present. These are source behaviors, with real assistive-technology delivery still unverified. There is no global custom error-border system.

Add number reports **Save not confirmed** when a response fails rather than claiming that nothing was saved. If the iPhone Contacts save succeeded but the Shield update failed, it says **The number is in iPhone Contacts. Try saving again to update Shield.** The **Save number** action retries that update; underlying recovery detail sits behind **More about this problem**.

### Sign-in and choices

Sign-in begins with the Shield mark, one plain explanation, one email field, and **Continue**. The sent-link state names **Check your email**, shows the full wrapping address, and gives **Resend link** and **Change email** room to stack. The initial introduction and sample-app action leave that sent state so the next task stays clear. Source requests accessibility focus for the sent-state heading and sign-in errors. Working states name sending or signing in and prevent duplicate submission.

Protection onboarding asks one choice per screen: **Help while you talk**, then **Let a helper know** when both choices are required. **Next** advances the first choice; **Save my choice** saves the final choice. Each screen has a full-row switch and a stable bottom action on the grouped surface. Back returns to the first choice. Advancing resets scroll position and requests focus for the new heading. Optional alert details use a DisclosureGroup; a failed save uses a native retry/cancel alert. Explicit consent and the limitations of call checks remain readable.

### Navigation

The tabs are **Home**, **Calls**, **Messages**, and **More**, with `house.fill`, `phone.fill`, `tray.fill`, and `ellipsis` SF Symbols. The Messages destination contains both **Voicemail** and **Saved notice**, distinguished in row metadata and detail titles. More lists **Check a text**, **Family & friends**, **Get help**, and **Settings**. Its Check a text row has no explanatory subtitle. Focused tasks push through native NavigationLink rows; entry sheets retain Cancel and task-specific confirmation controls. Standard back navigation remains visible.

### Call and message rows

CallRow follows Phone's Recents pattern: purpose or name and time, followed by outcome and optional number. The call symbol is paired with an outcome word unless the title already supplies it. An adaptive violet dot marks unheard voicemail at ordinary sizes; accessibility sizes or Differentiate Without Color replace that dot with the visible words **New message**. The row also exposes that state as an accessibility value. Home hides the number while Calls and detail retain it. The user-requested Home count is one focused historical action, rather than a grid of competing outcome totals.

OutcomeBadge is an unboxed subheadline label with an SF Symbol. The labels are **Checking call**, **Phone rang**, **Answered**, **Stopped**, **Check first**, **Message**, and **Missed**. Call rows expand Missed to Missed call. Preserve these distinctions and the uncertainty behind Check first.

VoicemailRow leads with the message purpose, then a summary of up to three lines at ordinary sizes and two at accessibility sizes when listening access permits. The supporting metadata names **Voicemail** or **Saved notice**, the date, and a **New**, sample-only **Kept**, or **Removed** state when applicable; from `.xxxLarge` these become separate lines. Opening the message provides the full summary. The Messages inbox offers native loading, retry, empty, pagination, and removed-message disclosure states.

Message detail leads with the summary and keeps playback as the main bottom action. Summaries use wrapping `.title3` text with a reminder that the caller's claims have not been verified. Full transcripts are not saved, returned or displayed. If readable text is unavailable, the detail explains that listening is still possible. Saved notices include advice to check the organization's app or a number from a card, statement, or saved contacts, plus **Find a trusted number** for the owner. **More about this call** opens additional detail. Helpers without `canListen` see **Message is private** and receive no summary or audio controls.

Real playback uses **Listen to message**, **Getting message…**, **Pause message**, and **Resume message** for the current state. After audio loads, MessagePlaybackProgress shows a native progress bar, elapsed and total time in ordinary words, and a visible **Start over** action. The time text uses monospaced digits; the bar exposes elapsed and total time as its accessibility value. A **Can’t hear the message?** disclosure gives volume guidance. Playback failures offer a native **Try again** alert. Sample speech remains a separate **Hear sample message** / **Stop sample** flow.

**Pause message** stays usable while Shield updates the message's played status. A failed status update leaves listening available with **Shield couldn’t mark this message as played** and a visible **Update played status** action; it does not become a playback-failure alert. Authentication refusal or loss of listening permission stops audio.

Leaving the detail, moving the app away from its active scene, changing the viewed person, or losing listening permission stops playback and invalidates the pending audio request. Stale download results, failures, and loading cleanup are ignored; returning to the app or regaining permission does not revive the cancelled request. Changing the viewed person also dismisses the old call detail. MessageAudioSession sequences audio-route activation and deactivation, uses asynchronous system operations on iOS 27 with the iOS 26 fallback, and ignores cleanup from an earlier playback session.

Clear scam messages retain no audio or readable content and offer no restoration action. Legacy removed-message detail keeps one readable panel: **Message removed**, the tentative explanation **It seemed suspicious.**, and the restoration deadline when available. The heading, explanation, and deadline grow vertically with Dynamic Type. The timestamp and callback advice live inside **More about this call**. **Bring back message** remains a bottom primary action only for a legacy message when listening permission and restoration eligibility allow it; it retains the confirmation, expiry, working-state, and sample-disabled guards.

Source: `ios/Shield/App/RootView.swift`, `ios/Shield/Features/Calls/VoicemailView.swift`, `ios/Shield/Features/Calls/VoicemailRow.swift`, `ios/Shield/Features/Calls/CallDetailView.swift`, and `ios/Shield/Models/Voicemail.swift`. These describe local implementation, not deployment or real-call verification.

### Home historical count

`StoppedCallsCard` shows **Calls stopped**, a prominent positive numeral, **Total**, and **See calls** on one opaque Action-accent native row with adaptive `actionInk`. The entire panel opens the retained recent held-call filter. A zero total uses the quiet neutral card surface and **None so far**, without the enlarged numeral. A missing optional `counts.stoppedTotal` displays **Total unavailable** on the neutral surface; it never falls back to the weekly `held` count or invents a zero. Missing overview data or a context error never becomes a zero-count claim.

The overview field is a persistent historical total, distinct from the existing seven-day aggregates. The live counter counts stopped and review-needed calls through the existing screening path and recoverable-history backfill. Repository source also contains counter hooks for blocked-caller-ended and voicemail-removed events, which remain tied to deployment of those pending features. Restoring a message does not undo its historical stop. The total can exceed the recent held/review-needed records shown by See calls, since retained history expires. Neither the label nor the number proves every caller was malicious or that checks are currently on. Real phone status and actionable warnings stay above the count. Pure sample Home begins with this total, then voicemail and recent calls, while the persistent sample marker establishes its context.

The counter preserves recoverable and newly counted activity; already-deleted history cannot be reconstructed. Storage, deployment, and synthetic verification details belong in [the deployment record](docs/OPERATIONS.md#persistent-home-count-deployment--october-12), not in the visual token system.

**The Historical Count Rule.** Use the persistent stopped total, include review-needed calls honestly, and keep it distinct from recent retained history and current protection status; unavailable data is never zero or a weekly fallback.

Source: `ios/Shield/Features/Overview/StoppedCallsCard.swift`, `ios/Shield/Features/Overview/OverviewView.swift`, `ios/Shield/Models/Overview.swift`, `backend/src/cloud/stopped-total.ts`, `backend/src/cloud/api.ts`, `backend/src/cloud/store.ts`, and `backend/src/cloud/forwarding-store.ts`.

### Status and notices

Home's real-phone status depends on current forwarding evidence. Loading, unavailable, stale, expired, paused, and disconnection states are handled explicitly. Missing or old status never becomes an active-protection claim. Retry and setup appear when actionable; a healthy ProtectionCheckCard stays out of the daily path. Pure sample Home relies on the persistent sample marker rather than another introductory status block.

ShieldNotice combines a headline and supporting explanation, with a recognizable decorative symbol at ordinary text sizes. At accessibility sizes it omits the symbol to give the words more room. ShieldLoadingView combines a system spinner and a short description. Use ordinary words for the result and reveal technical context only when needed for the person's task.

ShieldLoadFailure pairs a readable explanation with a visible bordered **Try again** action. A failed read does not become **No numbers yet**, **No blocked numbers**, or another empty-state claim. Existing rows may remain visible during a failed refresh, with the failure stated separately. The loaded Contacts empty state says **Your calling list is empty**, which remains accurate after all contacts have been removed.

Settings groups owner controls under **Your phone** and **People you trust**. Quiet hours distinguishes loading, unsaved changes, **Saving…**, and **Saved**; its bottom action is enabled only after loading and when the choice differs from the saved value. **Save below to use these hours** explains that an edited choice is still pending. A failed response reports **Hours not confirmed**, preserving the difference between an unconfirmed response and a confirmed rejection. Message alerts reports current iPhone authorization, including **Quiet alerts are on**, and offers Settings when the system controls the change. Service availability gates alerts and other unavailable controls. Sign out retains the reminder that the phone may still forward calls to Shield.

**The Recoverable State Rule.** Name loading, unsaved, unavailable, and failed states in words; offer a visible recovery action and never turn a failed read into a claim that data is empty or protection is active.

### Person context and sharing

PersonPicker appears as a native Menu when more than one person is available at ordinary text sizes; a single helper context can show the person's name without a menu. At accessibility sizes PersonContextSection supplies the wrapping page treatment described in Layout. The control names the viewed person for accessibility. Selecting someone resets the old context and call filter, stops audio, and dismisses the old call detail. Family & friends rows state who owns the phone and whether **Calls only** or **Calls and messages** are shared.

Owner-only actions remain conditional on ownership. **Include messages**, invitation, and revocation controls preserve explicit permission and confirmation; message access covers reading or hearing voicemail and saved notices. Setup and disconnection retain their setting confirmations and call checks; returning from Phone or Settings never confirms a change by itself.

Sharing leads with the helper's name, the message-sharing choice, and **Make invitation**. Once created, **Share invitation** is the main action; the long monospaced code stays behind **See invitation code**. The single-use, two-day limit remains visible. Source scrolls the new invitation into view and requests focus for its share action. Accepted helper rows retain their access scope and a visible, confirmed **Stop sharing** action.

ShieldInvitation supplies the shared invitation wording. **Use an invitation** accepts either a whole copied message or the code through native Paste or field entry. It extracts exactly one unique standalone token matching the service's 32-character base64url format anywhere in the text, including when an email signature follows it. Ambiguous or unmatched trimmed input remains available for server validation. Extracting a code never proves that an invitation is valid or grants access by itself.

**The Visible Context Rule.** Show the viewed person and sharing scope in words, and keep participant ownership distinct from helper access.

Onboarding returns to the complete page top when changing choices, keeping its step counter visible before the task heading. The heading still receives accessibility focus; unsaved selections survive Back. At large text sizes, explanations and the full switch remain scrollable above the persistent bottom action.

### Phone setup and disconnection

Forwarding setup uses a short task heading, **Step … of …** progress, readable numbered instructions, and one stable bottom action whose label names the next action or required confirmation. The Contacts step uses **Save Shield**. The numbered marker scales with semantic text and its explanation wraps. Changing steps resets the scrolling page and requests focus for the new heading. Previous-step navigation keeps visible **Back** text, and **Close** remains available outside working states.

Codes are copied for a manual Phone handoff, with the code itself behind **See copied code**. **Copy code again**, **Show Phone again**, and **Need help?** remain visible recovery choices. Returning from Phone or Settings changes the instructions, never the verification result. Carrier confirmation, each Phone setting, an ordinary call, and ordinary voicemail require their explicit checks. **Done** dismisses completed setup; **Disconnect Shield** remains a separate confirmed option. Ordinary setup copy explains the choice first, with detailed privacy and provider context in **More before you agree**.

**The Explicit Confirmation Rule.** Keep the action and the proof separate: returning from another app never confirms a carrier or Phone-setting change, and ending a call test never disconnects the phone.

### Sample-only features

The persistent marker says **Sample app** or **Test account · Sample data**. Ordinary sample exit lives in More as Leave sample app. The marker has an explicit sample-only accessibility label.

**Sample summary** identifies authored demo text. **Hear sample message** reads an authored sample using on-device speech, not a caller recording. **Keep this message** and the **All/Kept** sample filter only change in-memory sample state; they do not change real-message expiry or service data. Permissions still gate listening and owner actions. Real Messages use service-generated summaries when available, with playback preserved when readable text is unavailable. Real messages follow the service's expiry and deletion rules and have no permanent Keep action.

The sidecar's HTML/CSS is a schematic documentation preview. Browser type metrics, symbols, pixels, corners, and interaction styles do not specify the native implementation.

## Do's and Don'ts

### Do:

- Do use ShieldTheme's adaptive role colors, opaque supporting text, and native grouped system surfaces.
- Do pair outcome color with familiar words and SF Symbols while preserving uncertainty.
- Do keep semantic Dynamic Type, wrapping text, content-based stacking, 52-point shared app action minima, and 60-point grouped-row defaults.
- Do give ordinary tasks one clear next action and reveal less common detail on request.
- Do make switches tappable through their labeled row and keep one native accessibility toggle representation.
- Do stack call and message metadata from `.xxxLarge` and keep person context in the scrollable page at accessibility sizes.
- Do name unsaved changes and failed loads, and place a visible retry or save action beside the relevant task.
- Do show playback progress with elapsed and total time, clear pause/resume labels, and a visible Start over action.
- Do make person context, message permission, and sample-only state visible in words.
- Do retain explicit privacy, sharing, setup, and disconnection confirmations.
- Do label the Home count as the persistent historical total, keep real status above it, and distinguish zero, unavailable data, and recent retained history.
- Do verify the running native app in Light and Dark Mode, increased contrast, large Dynamic Type, VoiceOver, and Reduced Motion before claiming accessibility approval.

### Don't:

- Don't describe a checked, offered, or answered caller as verified, authenticated, or safe.
- Don't infer active call checks from stale, missing, paused, or expired status.
- Don't promote old tab labels or fixed Surface asset colors from earlier designs into new screens.
- Don't present Calls stopped as confirmed scams, complete recovery of already-deleted history, or evidence that current call checks are on.
- Don't treat schematic sidecar HTML/CSS as a native pixel specification.
- Don't treat helper access as ownership or extend message access implicitly.
- Don't present sample summaries, synthetic speech, or temporary keeping as real-message services.
- Don't use a failed load as an empty-state, saved-choice, or active-protection claim.
- Don't treat an app return, call-test completion, sign-out, or app deletion as confirmation that forwarding is disconnected.
- Don't claim a clean native audit, real VoiceOver approval, older-person usability, deployment, or real-call evidence from source extraction or simulator captures.
