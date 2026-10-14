---
name: "Shield"
description: "An editorial phone companion with clear choices and familiar native controls."
colors:
  action-light: "#002664"
  action-dark: "#B9CDF2"
  action-light-high: "#001A45"
  action-dark-high: "#D6E4FF"
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
  surface-light: "#F2F3F4"
  surface-dark: "#101B2B"
  surface-light-high: "#E8EBEF"
  surface-dark-high: "#091321"
  card-light: "#FFFFFF"
  card-dark: "#1C293B"
  card-light-high: "#FFFFFF"
  card-dark-high: "#162235"
  ink-light: "#101E32"
  ink-dark: "#F3F6FB"
  ink-light-high: "#061326"
  ink-dark-high: "#FFFFFF"
  quiet-surface-light: "#E7EBF1"
  quiet-surface-dark: "#28364A"
  quiet-surface-light-high: "#DCE2EA"
  quiet-surface-dark-high: "#34465F"
  field-border-light: "#7C8B9E"
  field-border-dark: "#6B7D97"
  field-border-light-high: "#607188"
  field-border-dark-high: "#95A6BD"
  paste-fill-light: "#002664"
  paste-fill-dark: "#244C82"
  paste-fill-light-high: "#001A45"
  paste-fill-dark-high: "#173969"
  secondary-light: "rgb(32% 37% 44%)"
  secondary-dark: "rgb(72% 77% 84%)"
  secondary-light-high: "rgb(18% 23% 30%)"
  secondary-dark-high: "rgb(85% 90% 96%)"
  action-ink-light: "#FFFFFF"
  action-ink-dark: "rgb(8% 12% 22%)"
typography:
  display:
    fontFamily: "ui-serif"
    fontWeight: 400
  title:
    fontFamily: "ui-serif"
    fontWeight: 400
  section:
    fontFamily: "ui-serif"
    fontWeight: 400
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
  card: "20pt"
  field-and-intro: "14pt"
  symbol: "10pt"
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
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.ink-light}"
    typography: "{typography.body}"
    rounded: "{rounded.field-and-intro}"
    padding: "{spacing.content}"
  navigation:
    textColor: "{colors.action-light}"
  outcome-label:
    typography: "{typography.label}"
  call-row:
    typography: "{typography.body}"
    padding: "10pt 0"
  voicemail-row:
    typography: "{typography.body}"
    padding: "10pt 0"
  card-container:
    backgroundColor: "{colors.card-light}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  home-stopped-calls:
    backgroundColor: "{colors.action-light}"
    typography: "{typography.display}"
    padding: "12pt 0"
  switch-row:
    height: "52pt"
  toolbar-action:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.action-light}"
    height: "44pt"
    width: "52pt"
---

# Design System: Shield

## Overview

**Creative North Star: "Editorial phone companion"**

Shield translates the user's America.gov reference into a simple native iPhone companion: pale neutral ground, white reading groups, deep navy actions, serif content headings and familiar sans controls. The reference supplies composure and the relationship between display and interface text. SwiftUI supplies the navigation, controls and adaptive text; no licensed reference font, photograph or website-scale composition is copied.

An 80-year-old's comprehension is the design bar. Plain labels, generous controls and one clear next action carry the work. Daily calls and messages remain within four familiar tabs. Setup, sharing, privacy and uncertain results retain the information needed for explicit choices. The decorative vocabulary stays sparse so the words can grow.

**Key Characteristics:**

- Pale neutral ground and white grouped reading surfaces, with navy ground and pale actions in Dark Mode.
- Native serif purpose and section headings; native sans body, controls, toolbars and navigation.
- Native tabs, lists, forms, switches, sheets, alerts and state feedback.
- Semantic Dynamic Type, wrapping text, content-based stacking and generous app-owned actions.
- Call outcomes, person context, sharing scope and sample-only state expressed in words as well as color.
- Flat surfaces, restrained SF Symbols and explicit choices with retained state and visible recovery.

**Evidence boundary (October 13, 2026):** This document records the current local SwiftUI source and the code-led direction in `.impeccable/surfaces/ios-shield-app-rootview-swift.md`. In the earlier visual-redesign pass, the [full finish review](.impeccable/review/visual-redesign/final/finish-review.md) returned **fix** for accessibility-size onboarding completion order and the stale design documentation. The same reviewer's [bounded final verdict](.impeccable/review/visual-redesign/verdict/finish-verdict.md) resolved both fixes with **disposition: ship**. That result covers the two scored fixes; it did not reopen or certify the complete surface. No regression was identified in the requested recaptures or inspected correction.

The initial full-review evidence is `.impeccable/review/visual-redesign/final/pro` (18 contact sheets, 103 PNGs) and `.impeccable/review/visual-redesign/final/small` (30 sheets, 176 PNGs, including seven intentional audit crops). Corresponding onboarding device PNGs were replaced with matching corrected captures; the initial 48 contact sheets were not used to score the correction. Fresh corrected evidence is unambiguous in `.impeccable/review/visual-redesign/verdict/pro` and `.impeccable/review/visual-redesign/verdict/small`, each with fourteen device PNGs, a manifest and three contact sheets. Both phones passed all nine focused onboarding tests, including normal/accessibility reading order, Back/off-choice retention and repeated failed-save recovery; the corrected Release simulator build passed. Durable proof is in [everyday screens](docs/images/ios-visual-everyday.jpg), [onboarding](docs/images/ios-visual-onboarding.jpg) and [the visual polish record](docs/IOS-VISUAL-POLISH.md).

The subsequent [senior walkthrough](docs/IOS-SENIOR-WALKTHROUGH.md) reopened the original [twenty native diagnostics](.impeccable/review/visual-redesign/final/native-issues.txt) and the actual reading, next-action and recovery burden. Current source removes paragraph excerpts from inbox rows, uses one spoken row description with a complete date, expands contact removal, names affected entries and visible safe choices in native alerts, makes Cancel/Close opaque, and places accessibility-size forwarding consent after its content. The fresh [independent finish review](.impeccable/review/senior-followup/independent-finish-review.md) returned **disposition: ship** for the reviewed native implementation and simulator viewports, with no remaining material fix established in its valid captures and sampled source. It resolved accessibility-size forwarding agreement order, enabled Dark Mode Cancel/Close contrast and the repeated Sample answer eyebrow. This scope does not certify the failed daily audit or actual older-person usability.

Final [test evidence](.impeccable/review/senior-followup/verdict/test-evidence.json) records 22/22 Pro walkthrough tests and 19/19 core flow methods, passing raw audits on five Dark Mode toolbar screens and ten Light Mode owner screens, and corrected compact contact edge/cancellation checks, with exit and sharing confirmations checked at standard and largest accessibility text. Recovery checks retain number input, played-status listening and unsaved quiet-hours choices. The final unsigned Release build, repository typecheck/build with 203 unit tests, and 154 required Firestore emulator tests passed. Earlier selector and toolbar failures remain in the ledger rather than being counted as a clean aggregate suite.

The final evidence packet is `.impeccable/review/senior-followup/verdict`: the Pro, compact, Dark Mode and compact-recovery capture manifests record the reviewed states. Device capture folders remain local QA; the final Pro/Dark Mode toolbar rendering supersedes the older compact-recovery rendering. Durable summaries are [task clarity](docs/images/ios-senior-task-clarity.jpg), [safe actions](docs/images/ios-senior-safe-actions.jpg) and [retained diagnostics](docs/images/ios-senior-retained-diagnostics.jpg). Only the iOS 27 simulator runtime was available; the app's iOS 26 minimum-version behavior was not verified.

The raw daily native audit still retains twelve reports: eleven contrast reports and one unlocalized Home clipping report after scrolling. The [diagnostic crops](docs/images/ios-senior-retained-diagnostics.jpg) and [report ledger](.impeccable/review/senior-followup/verdict/contrast-evidence.json) show two partially exposed targets at the scroll boundary, eight fully occluded targets on a bar/background, and one [fully exposed Appointment message label](.impeccable/review/senior-followup/verdict/diagnostic-exposed-target.png) whose measured ink-on-white contrast is 18.60:1 despite the report. An app-free native TabView/NavigationStack/List reference reproduces edge contrast. Separate minimal fixtures using the actual Shield StoppedCallsCard and plain native rows reproduce unlocalized clipping after scrolling; those fixtures retain Shield code and do not establish app-free clipping. These reproductions do not clear the real app's audit or establish the Home report's cause. Isolated actual CallRow and VoicemailRow audits pass after removing redundant full-date child labels. The Home clipping report remains unlocalized, with no visible clipping established. No diagnostic exemption or result filter is used.

Earlier Cancel/Close pixel checks measured approximately 16.55:1 and 20.06:1; they are historical evidence. A later Dark Mode toolbar rendering was measured below 4.5:1 and corrected by hiding the native shared translucent background behind the opaque control. Source, synthetic fixtures and iOS simulators cannot establish real VoiceOver use, physical-device quality, older-participant comprehension, real-call performance or deployment. Deployed facts belong in [Status](docs/STATUS.md).

## Colors

The palette places navy actions and dark reading ink on quiet neutral surfaces. Outcome hues preserve their existing meanings without competing with the reading hierarchy. The frontmatter records the asset catalog's actual Light, Dark and increased-contrast values; SwiftUI resolves the appropriate variant.

### Primary

- **Navy action** (`Action`; `action-*`): primary buttons, selected navigation, ordinary actions and calls being checked or offered. Dark Mode uses the pale counterpart against navy surfaces.
- **Native Paste fill** (`PasteFill`; `paste-fill-*`): stays deep in both appearances because the native Paste control draws a white label.
- **Action ink** (`ShieldTheme.actionInk`; `action-ink-*`): white on deep Light Mode actions, deep ink on pale Dark Mode actions. Disabled primary labels use native primary foreground instead.

### Secondary

- **Stopped-call red** (`Held`; `held-*`): Stopped, Check first and caution. It describes the result of screening, not proof that a caller is malicious.
- **Answered-call teal** (`Connected`; `connected-*`): Answered calls. Connection never proves identity.

### Tertiary

- **Voicemail violet** (`Message`; `message-*`): message context, New message text and message-related symbols.

### Neutral

- **Neutral ground** (`Surface`; `surface-*`): the shared page, navigation and safe-area canvas. It is now an adaptive asset, not `systemGroupedBackground`.
- **Grouped reading surface** (`Card`; `card-*`): white Light Mode groups and distinct navy Dark Mode groups. Native List/Form grouping and separators remain authoritative.
- **Reading ink** (`Ink`; `ink-*`): custom content headings, row titles and other emphasized reading text. Ordinary native controls may retain `.primary`.
- **Supporting ink** (`ShieldTheme.secondaryText`; `secondary-*`): opaque supporting explanations, dates and placeholders. Increased contrast strengthens separation without lowering opacity.
- **Quiet symbol surface** (`QuietSurface`; `quiet-surface-*`): restrained backings for repeated row symbols.
- **Input boundary** (`FieldBorder`; `field-border-*`): sign-in's visible field boundary; focus uses Action. The focus and increased-contrast stroke is thicker than the resting standard stroke.

ScreenIntro may place a role symbol on a low-opacity tint. This small illustration does not set the opacity of readable text. Outcome labels remain unboxed. The positive Home historical-total row uses Action with Action ink; zero and unavailable totals return to Card.

**The Outcome Truth Rule.** Pair outcome color with plain words or a familiar symbol; a checked, offered or answered call never implies an authenticated caller.

The sidecar's synthesized tonal strips are documentation illustrations. Intermediate ramp colors are not app tokens. Source: `ios/Shield/Design/ShieldTheme.swift` and `ios/Shield/Resources/Assets.xcassets`.

## Typography

**Display Font:** Native SwiftUI system serif
**Body Font:** Native SwiftUI system sans

**Character:** Serif content headings add the reference's calm editorial emphasis. Familiar sans words and controls preserve ordinary iPhone reading and interaction. Semantic text styles and Dynamic Type are authoritative; there is no custom fixed-size type or line-height scale. Frontmatter uses the portable families `ui-serif` and `system-ui` for SwiftUI's native serif and default sans designs.

### Hierarchy

- **Display** (`Font.system(.largeTitle, design: .serif)`): sign-in purpose and full Shield brand.
- **Title** (`Font.system(.title, design: .serif)`): page purpose, status and call-detail headings.
- **Section** (`Font.system(.title3, design: .serif)`): reusable section headings and focused introductions.
- **Headline** (native `.headline` or `.body.weight(.semibold)`): buttons, call/message titles and actionable labels.
- **Body** (native `.body` or default Text): instructions, form content and ordinary choices.
- **Supporting** (native `.subheadline`): dates, outcomes, numbers, sharing scope and explanations.
- **Label** (native `.subheadline.weight(.semibold)`): unboxed outcome and sample identity.

Navigation titles, tabs and toolbars retain the platform sans face. Some functional headings, including Calls stopped, remain native sans; serif is a content hierarchy, not a replacement for every label. Compact Shield identity uses native serif `.title2`. Invitation/carrier codes and time values use native monospaced treatment where useful.

The historical stopped count alone uses the display style scaled by 1.6 with monospaced digits. This focused numeral is not a general display-size token. Call and message dates expose full dates to accessibility even when the visible label is shorter.

**The Native Type Rule.** Use semantic text styles and allow wrapping or stacking before shrinking words or introducing a fixed text size.

## Layout

The app uses Home, Calls, Messages and More native tabs, each daily destination within a NavigationStack. Lists use inset grouping, a 60-point minimum row default, 28-point section spacing, the shared Surface background and a 16-point bottom safe-area padding. Native rows grow to fit their content. ShieldGroup supplies Card behind a native Section; ShieldSection additionally supplies a sentence-case serif section heading.

The six shared spacing steps are in frontmatter. Sign-in and onboarding use page padding and a readable column capped at 560 points, centered in the available width. ScrollViews preserve room for text and the keyboard. There is no custom viewport breakpoint scale or app-specific iPad split layout.

Shared app actions have a 52-point minimum target, not a fixed clipping height. Cancel and Close toolbar actions use a 44-point minimum height and 52-point minimum width with an opaque Card capsule; their ToolbarItem hides its shared translucent background. Native platform controls retain native dimensions. The ordinary-size person Menu has a local 44-point minimum; these toolbar exceptions do not replace the shared action minimum. Contacts removal has a full-width 52-point app-owned target.

From `.xxxLarge`, call titles and times stack, outcomes and numbers separate, message metadata stacks and Calls replaces its segmented filter with a full-width menu. At accessibility sizes, CallRow, VoicemailRow and ActionRow omit their decorative leading symbol slot; outside those sizes the symbol scales with semantic text. PersonContextSection moves the selected person's context into the scrolling page. Busy primary labels can stack their spinner above the words. ViewThatFits stacks short action groups when they cannot fit horizontally. The message-check editor scales its base height with body text.

Home's large native navigation title shares the Surface canvas at rest. Shared lists hide native scroll-edge fading, clip to their visible bounds and extend Surface through the vertical safe areas; the collapsed navigation background matches Surface. Menus, sheets and alerts retain platform geometry. The remaining edge diagnostics are evidence limits, not permission to fade reading text.

At standard text sizes onboarding keeps a bottom inset completion button. At accessibility sizes the same action is in the scrolling content after the explanation, full-row switch and any relevant disclosure. Forwarding consent also places Agree and continue after its full content and disclosure at accessibility sizes; other forwarding steps retain their existing bottom actions. Back retains the unsaved selection; advancing returns to the page top and requests focus for the new heading. Real VoiceOver delivery remains unverified.

**The Room for Words Rule.** Stack metadata, move person context into the page and remove decorative row symbols before reducing readable text.

## Elevation & Depth

Shield uses flat, opaque adaptive surfaces and native grouping rather than custom shadows or blur. Ground, reading groups and quiet symbol backings provide separation. Native menus, sheets, alerts, control materials and pressed/disabled feedback provide interaction depth. Cancel/Close use an opaque control surface with the native shared translucent background hidden. Playback and standard-size onboarding actions use bottom safe-area insets with opaque Surface behind them. The sample marker has its own persistent region rather than floating over rows. No custom shadow, motion-duration or easing tokens are defined; operating-system motion and Reduce Motion behavior remain authoritative and require direct verification.

**The Native Surface Rule.** Use the shared adaptive surfaces with native grouping and state feedback before introducing custom elevation or motion.

## Shapes

Primary and reusable secondary buttons use native large capsule controls. The shared card helper uses the card radius and padding in frontmatter. Sign-in fields and introduction symbol tiles use the field-and-intro radius; repeated call, message and action symbol backings use the symbol radius. Native inset list groups keep their own platform corners and separators, rather than inheriting the custom card helper's geometry.

Outcome labels have no added badge capsule. Icons use SF Symbols, not character glyphs or a separate icon font. ShieldBrand clips the existing identity mark with continuous app-icon corners using a width ratio of 0.2237; this identity-specific shape does not establish a general container. The three existing identity rasters have repository-origin metadata; no image-generation prompt or licensed reference imagery is inferred.

## Components

### Buttons

`shieldPrimaryButton` gives a native prominent capsule its Action tint. ShieldActionLabel supplies full-width wrapping headline text, adaptive Action ink and the minimum target. Loading names the work and uses ProgressView; disabled actions prevent incomplete or duplicate submissions. `shieldSecondaryButton` gives native large bordered capsule treatment. Native focus, pressed and disabled appearances remain authoritative.

Visible Remove, Allow calls again, Call and recovery actions supplement swipe/menu shortcuts. Contacts uses Remove from iPhone on a full-width target; its redundant swipe shortcut is removed. Native alerts name the selected contact, helper or saved number where relevant, explain consequential scope and visibly offer Keep contact, Keep sharing, Keep number, Keep message, Keep blocking, Not now or Cancel as appropriate. Destructive actions retain native roles. Nearby text explains unavailable service actions.

Cancel and Close use `shieldToolbarAction`: a plain button with adaptive Action text on an opaque Card capsule, horizontal compact padding, a 52-point minimum width and 44-point minimum height. Its ToolbarItem hides the shared native background so Dark Mode does not place another translucent layer over the label.

**The Named Safe Choice Rule.** Name the selected person or item when an action affects one, and keep a visible safe choice in consequential alerts before the action runs.

### Switches

ShieldSwitchStyle keeps the familiar native switch and makes the entire wrapping labeled row tappable. The visual switch is excluded from hit testing and accessibility; one native Toggle accessibility representation exposes the label and value. RootView applies the style throughout the app. Source semantics do not establish a real VoiceOver pass.

### Inputs / Fields

Sign-in has a persistent visible label, explicit accessibility label, keyboard/content type and a rounded Card field. Its resting boundary is FieldBorder; focus uses Action, and focus/increased contrast use the stronger stroke. Email entry grows vertically, and a labeled Clear action appears during editing. Long names, numbers and invitation codes also grow rather than forcing a single line.

Native Forms retain fields, Picker and Toggle. Add number's bottom action is Done while editing and Save number afterward; validation and working states gate submission. Check a text has a labeled editor, an accessibility-hidden placeholder, native Paste and Picture actions and explicit agreement before sending. Editing clears stale errors. Save failures in entry flows scroll the notice into view and request accessibility focus where implemented. These are source behaviors, with assistive-technology delivery still unverified.

### Sign-in and choices

Sign-in leads with a small Shield identity, one serif purpose heading, a brief explanation, bounded email field and Send sign-in link or Send email code. The sent-link state names Check your email, shows the complete wrapping address and gives Resend link and Change email room to stack. Working states name sending/signing in and prevent duplicates. Privacy has a full-width 52-point target. The sample action leaves the sent state so the next task stays clear.

Protection onboarding asks one choice at a time: Help while you talk, then Let a helper know when both are required. Next advances and Save my choice commits. Standard-size completion stays at the bottom; accessibility-size completion follows the selected choice in scrolling order. Back retains the choice. Optional detail uses DisclosureGroup, and failed saving gives a native retry/cancel alert. Consent and the limits of call checks remain readable.

### Navigation

Home, Calls, Messages and More use native TabView symbols and ordinary sans labels. Messages contains both Voicemail and Saved notice. More leads to Check a text, Family & friends, Get help and Settings. Native navigation rows push focused tasks. Sheets preserve Cancel and task-specific confirmation, and ordinary Back remains visible. Person context moves from a toolbar Menu into the page at accessibility sizes.

### Call and message rows

CallRow leads with purpose/name and time, then outcome and optional number. Its scaled outcome symbol sits on QuietSurface at ordinary sizes; accessibility sizes devote that space to words. Unheard messages always show New message text. Home omits the number; Calls/detail retain it. Metadata stacks from `.xxxLarge`. One actionable accessibility element describes purpose, outcome, shown number, new-message state and complete date; child time labels do not repeat a separate full spoken date.

OutcomeBadge is an unboxed symbol-and-word label. Keep Checking call, Phone rang, Answered, Stopped, Check first, Message and Missed distinct; CallRow expands Missed to Missed call and identifies voicemail kind where appropriate. Check first remains uncertain.

VoicemailRow leads with purpose, followed by kind, New/Kept/Removed state and date. Inbox rows carry no paragraph summary excerpt. Metadata stacks at larger sizes, and one actionable spoken description includes the complete date. Full authorized summary remains in detail. Helpers without listening permission receive neither summary nor audio. Message detail leads with a readable summary and keeps playback as its main action; the caller's claims remain explicitly unverified. Full transcripts are not saved, returned or displayed.

Listen to message, Getting message…, Pause message and Resume message name playback state. Native progress provides elapsed/total time, with monospaced digits and a visible Start over action. Playback failure offers Try again. A failed played-status update preserves listening, scrolls its explanation into view, requests accessibility focus and offers Update played status. Leaving detail, backgrounding, changing person or losing permission stops playback and cancels pending work; stale results cannot restart it. Sample speech remains labeled Hear sample message / Stop sample.

Clear scam messages offer no audio, readable content or restoration. Legacy removed-message detail uses a wrapping Message removed panel, tentative explanation and deadline. Bring back message appears only with permission and eligibility, preserving confirmation, expiry and sample-disabled guards.

### Home historical count

Calls stopped, a positive serif numeral, Total and See calls share one opaque Action row. It opens recent retained held/review-needed history. Zero uses None so far on Card; missing optional total uses Total unavailable. Neither missing context nor a failed read becomes zero. Real phone status and actionable warnings precede the historical panel; pure sample Home relies on its persistent sample marker.

The persistent stopped total includes review-needed calls and can exceed retained recent history. It cannot reconstruct already-deleted history, prove every caller was malicious or prove that current checks are on. Deployment and storage evidence belongs outside the visual system.

**The Historical Count Rule.** Keep the persistent total distinct from current protection and retained recent history; unavailable data is never zero or a weekly fallback.

### Status and recovery

Home distinguishes current, stale, missing, expired, paused and disconnecting status. ShieldNotice pairs a readable headline and explanation; at accessibility sizes it removes the decorative symbol. ShieldLoadFailure gives a visible Try again action, and failed refreshes may keep existing rows visible while explaining the failure.

Quiet hours names loading, unsaved, saving and saved states; Save only applies an edited loaded choice. Failed responses say Hours not confirmed or Save not confirmed, preserving uncertainty about server receipt. Contacts distinguishes a successful iPhone save from an unconfirmed Shield update. Sign out retains the forwarding reminder. Technical recovery detail is disclosed only when needed for the person's task.

**The Recoverable State Rule.** Name loading, unsaved, unavailable and failed states in words; offer visible recovery and never turn a failed read into an empty-state or active-protection claim.

### Person context and sharing

Show the viewed person and whether Calls only or Calls and messages are shared. Owner actions remain conditional on ownership. Include messages, invitation and Stop sharing preserve explicit permission and confirmation. Changing the person stops audio, dismisses the old call detail and resets the old context.

Sharing explicitly labels Your helper’s name, describes the currently selected Calls only or Calls and messages scope, and offers Make invitation. The helper-alert explanation identifies helpers as family or friends the participant invites. Share invitation becomes the main action after creation; the code is behind See invitation code, while its single-use/two-day limit stays visible. Use an invitation accepts a copied message or code through native Paste/entry. Extracting a token never proves that it is valid or grants access.

**The Visible Context Rule.** Show the person and sharing scope in words, and keep participant ownership distinct from helper access.

### Phone setup and disconnection

Assisted setup retains readable Step … of … progress, serif task headings, numbered native Phone instructions and one clearly named action. Steps reset scrolling and request heading focus; Back and Close remain available outside working states. Codes are copied for manual Phone handoff, with See copied code, Copy code again, Show Phone again and Need help? recovery.

Returning from Phone or Settings changes guidance, not verification. Carrier result, each Phone setting, ordinary call and voicemail require explicit checks. Done dismisses completed setup; Disconnect Shield is a separate confirmed option. Detailed privacy/provider context stays within More before you agree.

**The Explicit Confirmation Rule.** Keep action and proof separate: returning from another app never confirms a carrier or Phone-setting change, and ending a call test never disconnects the phone.

### Sample-only features

The persistent Sample app or Test account · Sample data marker establishes fixture context. Sample summary identifies authored text; Hear sample message is on-device speech, not a caller recording. Sample Keep/filter actions only affect memory. Real messages retain service expiry/deletion and have no permanent Keep action. Permissions still gate listening and owner controls. Sample text-check results retain the explicit example/not-checked explanation without a repeated Sample answer eyebrow.

The sidecar's self-contained HTML/CSS is a schematic browser preview of the native patterns, not a native pixel specification. Browser fonts, symbols, corner metrics, hover/focus feedback and sizing are illustrative; SwiftUI source is authoritative. No unresolved audit diagnostic, hidden or partially exposed text target, or intermediate low-contrast toolbar rendering is canonized as a design rule.

## Do's and Don'ts

### Do:

- Do use the shared adaptive navy/neutral palette and preserve its Dark Mode and increased-contrast variants.
- Do reserve native serif for content hierarchy and keep ordinary controls and navigation native sans.
- Do pair call outcomes with plain words and familiar SF Symbols while preserving uncertainty.
- Do keep semantic Dynamic Type, wrapping text, 52-point shared app action minima and 60-point native row defaults.
- Do stack metadata from `.xxxLarge` and move person context into the scrolling page at accessibility sizes.
- Do place accessibility-size onboarding and forwarding-consent completion after the explanation, choice and relevant disclosure.
- Do name unsaved choices and failed loads, with a visible retry/save action for the affected task.
- Do retain explicit privacy, sharing, setup and disconnection confirmations, naming the affected entry and showing a safe choice.
- Do show historical totals, current phone status, sample state and message permission as separate readable facts.
- Do verify the running app with VoiceOver, Reduce Motion, large text, both appearances and increased contrast before claiming accessibility approval.

### Don't:

- Don't restore the rejected bright-blue/public-library visual world or make all native navigation titles serif.
- Don't describe a checked, offered or answered caller as verified, authenticated or safe.
- Don't infer active call checks from stale, missing, paused or expired status.
- Don't present Calls stopped as confirmed scams or complete recovery of already-deleted history.
- Don't treat helper access as ownership or extend message access implicitly.
- Don't present sample summaries, speech or keeping as real-message services.
- Don't treat an app return, test completion, sign-out or deletion as proof that forwarding is disconnected.
- Don't shrink text to preserve a fixed row or keep a consent-completion action visually ahead of its accessibility-size choice.
- Don't reintroduce paragraph excerpts into the daily inbox or repeated decorative headings above an existing purpose.
- Don't treat schematic sidecar HTML/CSS as a native pixel specification or its tonal ramps as app colors.
- Don't extend a scoped fix verdict into whole-surface approval or claim a clean native audit, real VoiceOver approval, older-person usability, deployment or real-call evidence from source extraction or simulator captures.
