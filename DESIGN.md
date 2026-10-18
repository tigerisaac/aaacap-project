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
    letterSpacing: "-0.7pt"
  title:
    fontFamily: "ui-serif"
    fontWeight: 400
    letterSpacing: "-0.5pt"
  section:
    fontFamily: "ui-serif"
    fontWeight: 500
    letterSpacing: "-0.25pt"
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

**Invitations removed (October 14, 2026):** The app no longer creates or accepts invitations. Get started says "Ask your helper to set up your phone." and keeps Ask for setup help (when a support email exists) and Sign out. Family & friends gives the owner one Your helpers row; that screen lists who has access, with Stop sharing, and the helper-alert setting when it is available. The backend sharing endpoints are unchanged, so linked helpers keep working. Simulator evidence (iPhone 18 Pro, iOS 27):
- `npm run check` passed.
- SeniorPolish (22/22), SeniorDesign (5/5), the VoiceOver sharing walkthrough and the helper-view switch passed.
- RedesignUITests passed 16 of 19. `testCoreScreensAccessibilityAudit` and `testWelcomeAccessibilityAudit` are the known failures below; `testGuidedFlowsAccessibilityAudit` flags contrast on the setup Close button and fails the same way on 79bf06d.
- SeniorAccessibility had 4 passing raw audits, 1 skip and 8 failures. The same 8 fail on 79bf06d, and none of the reported elements is on Get started, Family & friends or Your helpers.

**Onboarding refinement (October 14, 2026):** Sign-in reads down one left edge, under a larger hero headline, with the email label kept close to its field. Both choice steps share one order. Every wrapped disclosure label keeps its left edge. Pinned actions align with the 24-point text column, the invitation note is a footer, and Cancel/Close use the native toolbar glass. Short field placeholders ("Email", "Code") were restored because longer ones were reported as clipped at the largest text size. Simulator evidence (iPhone 18 Pro, iOS 27):
- The app builds, and the screens were checked visually in Light, Dark, small and accessibility sizes.
- A full UI run was stopped partway at the owner's request.
- Before the stop, SeniorAccessibility audits reported placeholder clipping (since fixed) alongside the recorded native diagnostics. A ContactSync storage check failed in an unchanged harness.
- No complete UI-suite result exists for this pass.

**Calls and Home refinement (October 14, 2026):** Calls is grouped under serif day headings, with calm two-line rows: the colored symbol tile carries the outcome, and "New voicemail" is the one accent. Call detail opens with headline, outcome, explanation and number · date. Home now aligns to two measured inner edges, and the status card, rows and More rows share one symbol tile. See the [before/after sheet](docs/images/ios-calls-home-refinement.jpg). Simulator evidence (iPhone 18 Pro, iOS 27):
- `npm run check` passed.
- 68 of 70 UI tests passed across HomeReadability, Redesign, SeniorDesign, SeniorPolish and ShieldUITests.
- The two failures are the same pre-existing audits described below. The core audit now flags one element of the Calls row behind the tab bar, where the previous commit flagged two.
- One later CallRow change keeps a non-voicemail outcome beside "New voicemail". It renders the sample data identically and was checked in the simulator, but not re-run through the UI suites.

**Typography pass (October 14, 2026):** Serif large titles on tab roots, tighter serif tracking, middot-joined row metadata, page-ground detail headings, a quiet sample tag and consistent footers and name/number pairs. See the before/after sheets for [daily screens](docs/images/ios-typography-daily.jpg) and [settings](docs/images/ios-typography-settings.jpg). Simulator evidence (iPhone 18 Pro, iOS 27):
- `npm run check` passed.
- HomeReadability (4/4) and SeniorDesign (5/5) UI tests passed.
- RedesignUITests passed 17 of 19. The two failures, `testCoreScreensAccessibilityAudit` (edge contrast on the Calls row half-hidden under the tab bar) and `testWelcomeAccessibilityAudit` (no navigation bar for its capture name), fail the same way on the unchanged previous commit. The Calls audit now names three elements of that edge row instead of two because the row sits about 3 points higher.

No physical-phone, VoiceOver or older-participant check was made.

**Earlier evidence (October 14, 2026):** The [gesture and recovery review](docs/IOS-SENIOR-GESTURE-REVIEW.md) and its [test ledger](.impeccable/review/gesture-continuation/test-evidence.json) record additional email keyboard recovery, large-text Messages filtering and step-focus corrections. Device Hub pointer gestures exercised the app-owned journeys with VoiceOver continuously enabled, including ten setup steps and seven disconnection steps with synthetic confirmations. A standalone native SwiftUI footer also reproduces a named iOS 26.5 clipping report; the separate unnamed Shield report remains unexplained. The [earlier finish report](docs/IOS-SENIOR-FINISH.md) retains the broad screen matrix and twelve corrected XCTest spoken-focus methods. Physical iPhone gestures, older-person usability and real phone handoffs remain outside this simulator evidence.

**Historical evidence boundary (October 13, 2026):** This document records the current local SwiftUI source and the code-led direction in `.impeccable/surfaces/ios-shield-app-rootview-swift.md`. In the earlier visual-redesign pass, the [full finish review](.impeccable/review/visual-redesign/final/finish-review.md) returned **fix** for accessibility-size onboarding completion order and the stale design documentation. The same reviewer's [bounded final verdict](.impeccable/review/visual-redesign/verdict/finish-verdict.md) resolved both fixes with **disposition: ship**. That result covers the two scored fixes; it did not reopen or certify the complete surface. No regression was identified in the requested recaptures or inspected correction.

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

Like the America.gov reference, serif headings are set slightly tight: `shieldHeading(_:)` applies the serif style with about 2% negative tracking, scaled with Dynamic Type through `@ScaledMetric`. Always use it (or `shieldPageHeading()`) for serif headings rather than `.font(ShieldTheme.Typography.…)` alone.

### Hierarchy

- **Hero** (display scaled by 1.2, about -1 point tracking): full introductions; retained by the legacy email simulator fixture. Current phone sign-in uses Display.
- **Display** (`Font.system(.largeTitle, design: .serif)`): tab-root large titles, phone sign-in's short welcome/code heading and full Shield brand.
- **Title** (`Font.system(.title, design: .serif)`): page purpose, status and call-detail headings.
- **Section** (`Font.system(.title3, design: .serif).weight(.medium)`): reusable section headings and focused introductions. Medium weight keeps 20-point serif headings from reading lighter than the semibold row titles beneath them.
- **Headline** (native `.headline` or `.body.weight(.semibold)`): buttons, call/message titles and actionable labels.
- **Body** (native `.body` or default Text): instructions, form content and ordinary choices.
- **Supporting** (native `.subheadline`): dates, outcomes, numbers, sharing scope, explanations and section footers. ShieldGroup sets footers to `.subheadline`, so they match supporting text inside groups instead of the smaller native footnote.
- **Label** (native `.subheadline.weight(.semibold)`): unboxed outcome and sample identity.

Tab roots (Home, Calls, Messages, More) use `shieldLargeTitle(_:)` with the native navigation title. Shared navigation appearance supplies the preferred large-title font descriptor with the serif design and -0.7-point tracking. UIKit owns title transitions, scrolling and accessibility; no custom large-title toolbar item competes with the destination's title. Pushed destinations, inline titles, tabs and toolbars retain the platform sans face. Some functional headings, including Calls stopped, remain native sans; serif is a content hierarchy, not a replacement for every label. Compact Shield identity uses native serif `.title2`. Carrier codes and listed phone numbers use monospaced digits. Row times keep proportional digits so a long title does not wrap early beside them.

Short metadata reads as one line joined by middots (`MetadataLine.joined`): "New saved notice · Today", "Answered · (512) 555-0124". A no-break space holds each separator to the word before it, and `PhoneDisplay.unbroken` keeps a number on one line, so a long line wraps like a sentence rather than splitting a number. Visible copy uses sentence case, curly apostrophes and a real ellipsis.

The historical stopped count alone uses the display style scaled by 1.6 with monospaced digits. This focused numeral is not a general display-size token. Call and message dates expose full dates to accessibility even when the visible label is shorter.

**The Native Type Rule.** Use semantic text styles and allow wrapping or stacking before shrinking words or introducing a fixed text size.

## Layout

The app uses Home, Calls, Messages and More native tabs, each daily destination within a NavigationStack. Lists use inset grouping, a 60-point minimum row default, 28-point section spacing, the shared Surface background and a 16-point bottom safe-area padding. Native rows grow to fit their content. ShieldGroup supplies Card behind a native Section; ShieldSection additionally supplies a sentence-case serif section heading. ShieldPageHeader places a page heading on the Surface ground, aligned with the text inside the groups below it: call and message detail titles with their date, the Get help statement and Welcome to Shield. A heading is never boxed alone in a card. Guided setup keeps each step heading closer to its own content (20 points) than to the progress above it (28 points). Pages that open with a page header start it directly under the bar (`contentMargins(.top, 0)`) instead of below an empty first section.

Call detail reads like the top of an article on the page ground: the serif headline, the outcome badge when the title does not already say it, the plain explanation, then the selectable number and date line. The disclosure below keeps the call's details and limits.

Home reads on two inner left edges. Section headings, the stopped-calls panel and browse links such as All messages sit on the group's content edge (32 points from the screen on iPhone 18 Pro). Every row's text, including the phone-status card, starts on the row-text edge (82 points), because all of them lead with the same `ShieldRowSymbol` tile and 14-point gap. The stopped numeral pulls back its serif side bearing, so its ink sits on the content edge with the label above it. Browse links draw the native grey disclosure chevron, so stacked rows share one chevron column.

The six shared spacing steps are in frontmatter. Sign-in and onboarding use page padding and a readable column capped at 560 points, centered in the available width. ScrollViews preserve room for text and the keyboard. There is no custom viewport breakpoint scale or app-specific iPad split layout.

Shared app actions have a 52-point minimum target, not a fixed clipping height. Cancel and Close are native toolbar buttons on the system glass, matching neighboring toolbar items such as Options. Native platform controls retain native dimensions. The ordinary-size person Menu has a local 44-point minimum; these toolbar exceptions do not replace the shared action minimum. Contacts removal has a full-width 52-point app-owned target.

From `.xxxLarge`, call titles and times stack and Calls and sample Messages replace their large segmented filters with full-width menus. Middot metadata keeps wrapping as a sentence until accessibility sizes, where outcome, number, state and date each take their own line. At accessibility sizes, CallRow, VoicemailRow and ActionRow omit their decorative leading symbol slot; outside those sizes the symbol scales with semantic text. PersonContextSection moves the selected person's context into the scrolling page. Busy primary labels can stack their spinner above the words. ViewThatFits stacks short action groups when they cannot fit horizontally. The message-check editor scales its base height with body text.

Home's large native navigation title shares the Surface canvas at rest. Shared lists hide native scroll-edge fading, retain native scroll clipping and extend Surface through the vertical safe areas; the collapsed navigation background matches Surface. Menus, sheets and alerts retain platform geometry. The remaining edge diagnostics are evidence limits, not permission to fade reading text.

At standard text sizes onboarding keeps a bottom inset completion button whose edges line up with the page's 24-point text column; when that action moves into the content at accessibility sizes it drops the pinned padding and spans the same column. At accessibility sizes the same action is in the scrolling content after the explanation, full-row switch and any relevant disclosure. Forwarding actions likewise follow the full step content and disclosures in the scrolling reading order at accessibility sizes; ordinary sizes retain the bottom safe-area action. Back retains the unsaved selection. New rendered headings request focus. Forwarding keeps its scroll container and pinned action container mounted while replacing the step content, then explicitly resets to the top and requests heading focus. Disconnection focuses numbered progress and then the completion heading. Device Hub reading gestures verified the earlier transitions in the documented simulator scope; current carrier viewport evidence is linked in its component record below.

**The Room for Words Rule.** Stack metadata, move person context into the page and remove decorative row symbols before reducing readable text.

## Elevation & Depth

Shield uses flat, opaque adaptive surfaces and native grouping rather than custom shadows or blur. Ground, reading groups and quiet symbol backings provide separation. Native menus, sheets, alerts, control materials and pressed/disabled feedback provide interaction depth. Cancel/Close use the native toolbar glass. Playback and standard-size onboarding actions use bottom safe-area insets with opaque Surface behind them. The sample marker has its own persistent region rather than floating over rows. It is a quiet QuietSurface tag in medium-weight supporting text, so it never reads as the screen title beneath it; it grows with Dynamic Type up to the first accessibility size, then holds. No custom shadow, motion-duration or easing tokens are defined; operating-system motion and Reduce Motion behavior remain authoritative and require direct verification.

**The Native Surface Rule.** Use the shared adaptive surfaces with native grouping and state feedback before introducing custom elevation or motion.

## Shapes

Primary and reusable secondary buttons use native large capsule controls. The shared card helper uses the card radius and padding in frontmatter. Sign-in fields and introduction symbol tiles use the field-and-intro radius; repeated call, message and action symbol backings use the symbol radius. Native inset list groups keep their own platform corners and separators, rather than inheriting the custom card helper's geometry.

Outcome labels have no added badge capsule. Icons use SF Symbols, not character glyphs or a separate icon font. ShieldBrand clips the owner-selected rounded, integrated S-shield with continuous app-icon corners using a width ratio of 0.2237; this identity-specific shape does not establish a general container. The app icon, sign-in mark and launch mark share the approved revision-one artwork. Source PNGs, generation prompts, selection and hashes are preserved in `artwork/identity/manifest.json`; these are raster assets made with the built-in image generator. `scripts/generate-ios-assets.mjs` copies the approved icon and derives the rounded launch mark without changing the semantic colors. The UI wordmark remains native serif text.

## Components

### Buttons

`shieldPrimaryButton` gives a native prominent capsule its Action tint. ShieldActionLabel supplies full-width wrapping headline text, adaptive Action ink and the minimum target. Loading names the work and uses ProgressView; disabled actions prevent incomplete or duplicate submissions. `shieldSecondaryButton` gives native large bordered capsule treatment. Native focus, pressed and disabled appearances remain authoritative.

Visible Remove, Allow calls again, Call and recovery actions supplement swipe/menu shortcuts. Contacts uses Remove from iPhone on a full-width target; its complete title wraps beside the symbol at large text sizes, and its redundant swipe shortcut is removed. Native alerts name the selected contact, helper or saved number where relevant, explain consequential scope and visibly offer Keep contact, Keep sharing, Keep number, Keep message, Keep blocking, Not now or Cancel as appropriate. Destructive actions retain native roles. Nearby text explains unavailable service actions.

Cancel and Close are plain native toolbar buttons on the system glass, matching Options beside them. The earlier opaque Card capsule (`shieldToolbarAction`) was removed on October 14, 2026 because it never matched its glass neighbors. Its Dark Mode contrast has not been re-measured since.

**The Named Safe Choice Rule.** Name the selected person or item when an action affects one, and keep a visible safe choice in consequential alerts before the action runs.

The Privacy details link inside the call-protection disclosure uses explicit native borderless styling and the shared 52-point minimum target. Its touch scope stays independent of the composite Form row, so expanding or collapsing the native disclosure does not open the external link.

**The Independent Row Action Rule.** Give embedded links their own explicit native button style and touch target so disclosure and other sibling interactions remain independent.

### Switches

ShieldSwitchStyle keeps the familiar native switch and makes the entire wrapping labeled row tappable. The visual switch is excluded from hit testing and accessibility; one native Toggle accessibility representation exposes the label and value. RootView applies the style throughout the app. Source semantics do not establish a real VoiceOver pass.

### Inputs / Fields

Sign-in has a persistent visible label, explicit accessibility label, keyboard/content type and a rounded Card field. Its resting boundary is FieldBorder; focus uses Action, and focus/increased contrast use the stronger stroke. Email entry grows vertically, and a labeled Clear action appears during editing. Long names and numbers grow.

Native Forms retain fields, Picker and Toggle. Add number's bottom action is Done while editing and Save number afterward; validation and working states gate submission. Check a text has a labeled editor, an accessibility-hidden placeholder, native Paste and Picture actions and explicit agreement before sending. Editing clears stale errors. Save failures in entry flows scroll the notice into view and request accessibility focus where implemented. These are source behaviors, with assistive-technology delivery still unverified.

### Sign-in and choices

Sign-in reads down one left edge in every state: the compact Shield identity, the hero heading and its explanation, the email label sitting 8 points above its field, the primary action, then Try sample app and Privacy as left-aligned full-width targets. Nothing in the flow is centered, so Check your email and Finish signing in keep the identity on the same edge as their headings. The sent-link state names Check your email, shows the complete wrapping address and gives Resend link and Change email room to stack. Working states name sending/signing in and prevent duplicates. Privacy has a full-width 52-point target. The sample action leaves the sent state so the next task stays clear.

The email field remains single-line so the native Send key submits. Sending dismisses the keyboard; a failed send brings its complete notice into view after dismissal and retains the email. At accessibility sizes, an unfocused long email also wraps below the field for visual review; that duplicate is hidden from VoiceOver because the native field reads the full value.

Email sign-in presented from phone sign-in has an explicit native Close toolbar action, including while the keyboard is visible. Close is disabled during submission; the standalone sign-in root keeps its existing navigation treatment.

Protection onboarding asks one choice at a time: Help while you talk, then Let a helper know when both are required. Next advances and Save my choice commits. Standard-size completion stays at the bottom; accessibility-size completion follows the selected choice in scrolling order. Back retains the choice. Both choices read in the same order: heading, explanation, the optional-detail disclosure, then the full-row switch. Failed saving gives a native retry/cancel alert. Every string-titled disclosure in the app uses `ShieldDisclosure`, whose label keeps one left edge when it wraps. The native label centers each wrapped line outside a List. Consent and the limits of call checks remain readable.

### Navigation

Home, Calls, Messages and More use native TabView symbols and ordinary sans labels. Messages contains both Voicemail and Saved notice. More leads to Check a text, Family & friends, Get help and Settings. Native navigation rows push focused tasks. Sheets preserve Cancel and task-specific confirmation, and ordinary Back remains visible. Person context moves from a toolbar Menu into the page at accessibility sizes.

### Call and message rows

CallRow leads with purpose/name and time, then outcome and optional number. Its outcome symbol sits on the shared `ShieldRowSymbol` tile, centered on the text block, at ordinary sizes; accessibility sizes devote that space to words. The tile carries the outcome color and the outcome word stays in medium supporting ink, so the one colored phrase in a list is what still needs attention: an unheard message reads "New voicemail" or "New saved notice" in Message violet in place of its kind, with no extra line. Home omits the number; Calls/detail retain it. Metadata stacks at accessibility sizes.

Calls groups history under serif day headings (Today, Yesterday, then "Sunday, October 12", with the year when it differs), keeping the service's order so paging extends the last day. Rows under a day heading show only the time; Home's unheaded recent rows keep Today/Yesterday/date. The four-way filter uses the large segmented control. The native CallNavigationRow owns the title label, outcome/number/new-message/date value, hint and action. Its visual CallRow supplies layout without replacing the navigation control’s traits. Child time labels do not repeat a separate full spoken date.

OutcomeBadge is an unboxed symbol-and-word label with inline spacing (it does not take a List row's icon column). Keep Checking call, Phone rang, Answered, Stopped, Check first, Message and Missed distinct; CallRow expands Missed to Missed call and identifies voicemail kind where appropriate. Check first remains uncertain.

VoicemailRow leads with purpose, followed by kind (or "New voicemail" while unheard), Kept/Removed state and date. Inbox rows carry no paragraph summary excerpt. Metadata stacks at accessibility sizes, and the native MessageNavigationRow owns the title label and kind/state/date value, including the complete date. Full authorized summary remains in detail. Helpers without listening permission receive neither summary nor audio. Message detail leads with a readable summary and keeps playback as its main action; the caller's claims remain explicitly unverified. Full transcripts are not saved, returned or displayed.

Listen to message, Getting message…, Pause message and Resume message name playback state. Native progress provides elapsed/total time, with monospaced digits and a visible Start over action. Playback failure offers Try again. A failed listened-state update preserves listening and says “You can listen. It may still show as new.” Mark as listened retries that update. At accessibility sizes and with VoiceOver, playback begins in the reading flow. Recovery keeps its warning and playback control in one scrolling block, brings the whole block into view and requests warning focus. Ordinary-size playback retains its pinned action. Leaving detail, backgrounding, changing person or losing permission stops playback and cancels pending work; stale results cannot restart it. Sample speech remains labeled Hear sample message / Stop sample.

Clear scam messages offer no audio, readable content or restoration. Legacy removed-message detail uses a wrapping Message removed panel, tentative explanation and deadline. Bring back message appears only with permission and eligibility, preserving confirmation, expiry and sample-disabled guards.

### Home historical count

Calls stopped, a positive serif numeral, "in total" and See calls share one opaque Action row. It opens recent retained held/review-needed history. Zero uses None so far on Card; missing optional total uses Total unavailable. Neither missing context nor a failed read becomes zero. Real phone status and actionable warnings precede the historical panel; pure sample Home relies on its persistent sample marker.

The persistent stopped total includes review-needed calls and can exceed retained recent history. It cannot reconstruct already-deleted history, prove every caller was malicious or prove that current checks are on. Deployment and storage evidence belongs outside the visual system.

**The Historical Count Rule.** Keep the persistent total distinct from current protection and retained recent history; unavailable data is never zero or a weekly fallback.

### Status and recovery

Home distinguishes current, stale, missing, expired, paused and disconnecting status. Continuous screening is read from the service’s alwaysOn flag, separately from a timed test window; it still requires fresh status, setup, consent and live screening. Its explanation retains quiet-hour and daily-limit qualifications. ShieldNotice pairs a readable headline and explanation; at accessibility sizes it removes the decorative symbol. ShieldLoadFailure gives a visible Try again action, and failed refreshes may keep existing rows visible while explaining the failure.

Quiet hours names loading, unsaved, saving and saved states; Save only applies an edited loaded choice. Its From and Until rows stay mounted and become disabled when quiet hours is off, retaining the selected times. The unsaved-help line reserves its layout space while hidden. The bottom action reserves the largest native label geometry across Saved, Save quiet hours and Saving… so a changed or working state does not move the form viewport; hidden sizing labels and hidden help stay outside accessibility. Failed responses say Hours not confirmed or Save not confirmed, preserving uncertainty about server receipt. Contacts distinguishes a successful iPhone save from an unconfirmed Shield update. Sign out retains the forwarding reminder. Technical recovery detail is disclosed only when needed for the person's task.

Secondary screens reuse the shared deferred initial-loading helper: fast reads omit the temporary loading group, while an initial read still pending after 250 milliseconds shows named progress. Attach the helper to the stable screen; completion clears progress, and a cancelled pending delay never inserts the loading group. A failed load still shows the existing error and recovery; the delay does not change what an empty result means.

**The Stable Layout Rule.** Keep the active control and surrounding viewport steady across local state changes; preserve view identity, reserve changing-label space where needed and keep hidden sizing content outside accessibility.

**The Recoverable State Rule.** Name loading, unsaved, unavailable and failed states in words; offer visible recovery and never turn a failed read into an empty-state or active-protection claim.

### Person context and sharing

Show the viewed person and whether Calls only or Calls and messages are shared. Owner actions remain conditional on ownership. Stop sharing asks for confirmation, with Keep sharing as the safe choice. Changing the person stops audio, dismisses the old call detail and resets the old context.

The app does not create or accept invitations. Your helpers (More → Family & friends, owner only) lists who has access, names each helper’s scope as Calls only, Calls and messages or Waiting for them to join, and offers Stop sharing. Helpers who are already linked keep their access until the owner stops sharing. Get started asks the person to have their helper set up the phone, with Ask for setup help when a support email exists. The helper-alert explanation identifies helpers as family or friends who help the participant.

**The Visible Context Rule.** Show the person and sharing scope in words, and keep participant ownership distinct from helper access.

### Phone setup and disconnection

Assisted setup retains readable Step … of … progress, serif task headings, numbered native Phone instructions and one clearly named action. Steps reset scrolling and request heading focus; Back and Close remain available outside working states. Carrier codes use the deliberate copy and Phone handoff described below; restoration retains its separate manual handoff and confirmations.

Inline setup guides pause their instruction clock while the scene is inactive and resume from the watched position, excluding time spent in another app. Reduce Motion and post-return guidance retain their existing static target treatment; this does not change the separate steady floating reminder or its explicit handoff confirmations.

Normal Phone-settings setup uses the same Shield Easy Setup helper to select Silence and open beside Live Voicemail. The remaining manual task is explicit: Turn off Live Voicemail. Returning replaces the inline animation with its static target and offers Silence has a checkmark, followed by the separate Live Voicemail is off confirmation before the existing carrier steps. The visit carries navigation to that second confirmation; it does not verify either setting. Need help? retains the previous manual guide for both adjacent controls, written steps and a route back to Settings. Restoration keeps its separate guides and confirmations.

If the floating reminder cannot start, Shield stays open and focuses the existing scrollable error explanation, which names the required action or both actions for the combined visit. The sole primary action becomes Open Settings anyway; a deliberate further tap continues without the reminder. Back and Close remain available. This recovery uses the page rather than a native alert whose message clipped at the largest text size.

Returning from Phone or Settings changes guidance, not verification. Carrier result, each Phone setting, ordinary call and voicemail require explicit checks. Done dismisses completed setup; Disconnect Shield is a separate confirmed option. Detailed privacy/provider context stays within More before you agree.

**The Explicit Confirmation Rule.** Keep action and proof separate: returning from another app never confirms a carrier or Phone-setting change, and ending a call test never disconnects the phone.

**The Visible Setup Help Rule.** Keep the remaining manual action visible during the helper handoff, and both adjacent actions visible in the manual guide. A failed floating reminder leaves Shield open with a readable, scrollable explanation; only Open Settings anyway deliberately continues without it.

### Guided exits and completion receipts

Guided exits extend the existing onboarding system: serif task headings, native sans instructions, adaptive page ground and Action controls. Show readable progress above the task heading after each advance. At accessibility sizes, place instruction numbers above full-width text and put the primary action after the instructions in the scrollable reading order; ordinary sizes retain the bottom safe-area action. Keep external handoffs separate from explicit confirmations and saved progress. A recovered refresh clears the stale failure notice, while a failed save leaves the task and its recovery action available.

**The Saved Progress Rule.** Keep the current task, progress and recovery readable together; refreshing successfully clears stale errors, and returning from another app never substitutes for a saved confirmation.

Consequential removal uses a neutral explanation and a separate native confirmation with a named safe choice. Use the existing adaptive Held color for the destructive label; restoration or another prerequisite finishing does not itself authorize deletion. Loading and working states remain visible, and repeated submissions are disabled while work is in progress.

**The Separate Deletion Rule.** Finishing a prerequisite leads to a fresh deletion choice, with consequences and a safe cancellation action visible before removal begins.

Background completion receipts distinguish an unconfirmed request, an accepted request still processing and confirmed completion in their headings and explanations. Keep Check progress and readable failure recovery available while completion is unknown. State local cleanup separately from server acceptance, and explain what closing the status screen does without claiming that closing cancels accepted work.

**The Honest Receipt Rule.** Distinguish request submission, server acceptance and completion; a missing response or closed status screen is not evidence that work finished or was cancelled.

The [guided-exit review](.impeccable/review/disconnect-2026-10-16/final-review.md) returned **ship** for six scored corrections after inspecting 56 simulator captures. This supports the recorded layout and state patterns within that scope; it does not establish whole-app quality, VoiceOver, physical carrier restoration, production deletion or senior usability. Flow-specific steps and acceptance gates remain in the [surface contract](.impeccable/surfaces/ios-disconnect.md) and [offboarding record](docs/ACCOUNT-OFFBOARDING.md).

### Carrier-code handoff

The carrier step first names its purpose, Connect calls to Shield, and explains that missed calls go to Shield for checking. Its primary action is Copy setup code. The deliberate tap produces Ready to paste in Phone and native success feedback, then the primary action becomes Open Phone. Directions name Apple's extra Open button on the native Phone banner and say to tap Keypad if needed. Phone's landing tab remains system-owned. Returning after the requested handoff changes the purpose heading to Check [carrier]’s result and offers the explicit carrier-result confirmation; the return itself does not advance carrier progress or pass the forwarding probe.

Read the steps, See setup code and Need help? disclose the numbered Open Keypad / Paste your code / Tap Call instructions, selectable monospaced code and manual recovery. After return, Watch the guide again retains the demonstration. Open Phone again and Copy code again remain reachable in help. Copying or reopening clears the previous return gate. One, two or three returned codes determine the route, progress and Back destination; Code … of … appears only for multiple codes, and each new code starts uncopied. Missing codes keep Get my code recovery.

The external keypad reminder is a steady navy card (960×400 artwork) with four short rows: drag to a clear corner, paste above the keypad numbers, tap Call and wait, then return to Shield. It is separate from the inline keypad demonstration and its Reduce Motion target. iOS owns the floating window's size and position; the drag instruction remains necessary. The compact artwork dimensions are local to this reminder, not a general layout or typography token.

**The Deliberate Carrier Handoff Rule.** Name each carrier-code action in order: Copy setup code, Open Phone, then the carrier-result confirmation after return. A copy or an unrelated return does not satisfy the Phone visit, and each new code starts uncopied.

The [scoped ship review](.impeccable/review/carrier-phone-handoff/finish-review.md) and [dated evidence](.impeccable/review/carrier-phone-handoff/evidence.json) cover the native refinement on October 16, 2026. They record main and compact simulator viewports plus one physical iPhone's copy, native Open, first/repeat Phone visits and unconfirmed return using synthetic codes. No code was pasted or dialed. Remembered Keypad selection and a previously dragged floating-window position establish no cross-device promise. Carrier qualification, the deferred T-Mobile direct-line test, native PiP restoration, novice/older-adult usability, deployment and real-call behavior remain outside this evidence.

### Shortcut-assisted Phone settings

The owner-approved normal setup integration (October 16, 2026) reuses the pinned navy/neutral surfaces, serif purpose headings and native sans controls. It promotes the existing helper from the earlier Debug trial without adding a new palette, type token or second shortcut. Release includes the session/importer, signed helper and seventh-guide resources; the standalone development preview remains Debug-only. The same native helper selects Silence Unknown Callers On and opens the adjacent Live Voicemail section. Live Voicemail remains the person's explicit manual task; the app does not claim to read its current value.

Each state has one primary action: Add to iPhone, Open Phone settings, Silence has a checkmark, then Live Voicemail is off. Add to iPhone opens Apple's public native Add Shortcut screen directly, followed by the native Shield return; the person need not choose a destination or search the Shortcuts library. Installation explains those two native actions without a competing Settings demonstration. Opening the public link, returning to Shield or remembering a ready-to-try choice does not establish that Add Shortcut was accepted. Need help? retains re-import, the signed saved helper file and Use the step-by-step guide. Each helper-recovery label owns its full-width 52-point minimum touch frame.

Floating help stays absent during native import. Only the explicit Open Phone settings action starts the steady AVKit reminder, arms automatic native Picture in Picture through intermediate Shortcuts and hands off after confirming a nonsuspended floating window. A suspended window is not visible-help success. Return and import reset the shortcut player's handoff and stop floating help. That player is separate from the automatic Phone-banner player, so import cannot inherit its automatic floating behavior. Reopening from Check Silence explicitly prepares the Live Voicemail guide again. The original inline demonstration shows its switch becoming gray; the steady reminder says only Live Voicemail / Turn it off / Gray = off / Return to Shield, with the native restore symbol. Its 60-second player item avoids frequent item replacement around native controls. Returning changes the guidance and leaves both setting confirmations unaccepted.

At standard text sizes the primary action uses the existing bottom safe-area surface. At accessibility sizes it moves into the scrollable reading order and wraps. Phase changes restore the task heading to view. A failed reminder stays in Shield, scrolls to and focuses its explanation, and requires a deliberate Open Settings anyway action before continuing without help. A failed Shortcuts handoff keeps retry and the existing manual guide available.

**The Native Setup Handoff Rule.** Keep direct native Add Shortcut import quiet, start and arm the steady floating reminder only from Open Phone settings, and reset it on return or import. Keep both setting confirmations explicit; a remembered helper choice, opening the public link or returning to Shield establishes neither Add Shortcut acceptance nor a changed switch.

The fresh [scoped ship review](.impeccable/review/setup-shortcut-production/finish-review.md) covers this normal-setup integration, with no material fixes established. It opened all 23 required captures and matched them and the reviewed source/media to the [evidence packet](.impeccable/review/setup-shortcut-production/evidence.json). The scope includes both simulator classes, one installed iPhone 12 Pro Max / iOS 27.2 build and Release inclusion. Hardware showed native public import/return, the short guide at the destination, unconfirmed return and the corrected repeat handoff. Silence was already On and Live Voicemail already Off, so no toggle transition was observed; the current native PiP restore control was not tested in this turn. The Phone-section URL remains undocumented and tested on one phone. Cross-device compatibility, App Store acceptance, older-adult usability and the original intermittent missing-guide cause remain unproven. No new frame/hitch or duration measurement, backend deployment or real-call evidence is established.

The earlier [trial ship review](.impeccable/review/setup-shortcut-install/finish-review.md) and [trial evidence](.impeccable/review/setup-shortcut-install/evidence.json) remain historical. Public installation and replacement of the prior helper passed on that phone; the instrumented guide remained active through Shortcuts and Settings for 440.8 seconds until intentional return, and that build showed the guide in the target Settings area. The owner's original disappearance did not reproduce, so this was a hardening observation rather than a proven root cause or universal resolution. Native restore taps were unreliable through Mirroring; that follow-up verified return through Home/Spotlight, leaving earlier-build native restore evidence separate in the [prior packet](.impeccable/review/setup-shortcut-section/input.md). Its Debug-only restriction is superseded by the owner's explicit approval to integrate the method into actual setup; its timing and restore observations are not new measurements of this integration.

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
- Do keep shortcut-assisted setup's native import quiet, its current primary action clear and its accessibility-size action in the scrollable reading order.
- Do keep guided progress visible, give accessibility-size instructions the full text width and clear obsolete errors after successful recovery.
- Do separate prerequisite completion, destructive confirmation and the receipt's unconfirmed, accepted and completed states.

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
- Don't treat helper readiness or app return as setting verification, or claim cross-device reliability or novice-user success from one-phone setup evidence.
- Don't present a submitted request, lost response or closed status screen as confirmed completion or cancellation.

Home’s All calls and All messages actions share a full-width 52-point minimum target, medium-weight text and a decorative native chevron.

Home follows the [October 18 Home status rules](#october-18--home-status-as-an-editorial-figure): checks on is a serif figure paired with Calls stopped, and other states use a row tile with full-width native primary/secondary buttons. Title and supporting copy align within their text column; at accessibility sizes, the badge gives way to full-width text. The empty Home inbox retains the plain All messages browse action.

Shared disclosures, browse rows and full-width button labels keep a 52-point minimum target and allow text to wrap, retaining the native style appropriate to each role. Status details, row metadata, playback time and section footers use the shared adaptive supporting-text color. Keep nested native buttons and links independently activatable: explicit borderless styling separates resource links from their disclosures and playback actions from neighboring controls.

Switch rows preserve the familiar native switch and expose the entire labeled target as one accessible toggle. Available width determines the layout: keep the whole label beside the switch when it fits; otherwise give the wrapping label the full width and place the switch beneath it, aligned to the trailing edge. Keep the 52-point minimum target without shrinking text or splitting words around the switch. See the [October 17 follow-up](docs/IOS-MOTION-AUDIT.md#october-17--design-consistency-follow-up) for scope and verification.


## October 14 — phone sign-in and optional trusted contacts

Preserved the rounded S-shield, serif purpose headings, navy actions, semantic surfaces and Dynamic Type. Phone number → code replaces email as the main entry; existing email-link users retain a secondary route. After verified phone setup, equal-weight Add a trusted contact / Continue without one choices replace the assumed helper switch. Adding someone requires name and mobile number (native single-contact picker or manual entry), and shows Waiting for confirmation. Alert consent is separate from call-history access. Recipients choose text/app/both and can decline or stop.

The owner rejected the first browser acceptance layout as too verbose and spacious. The replacement renders one compact state, removes the brand eyebrow and repeated headings, puts actions side by side, and moves secondary explanations into About these alerts. The standard one-person acceptance state was measured at 390×844 with no horizontal or vertical overflow. The same compact direction removes the repeated heading and introductory paragraphs from the native recipient screen, and trims the add-contact form to the picker, name, number and send action. Secondary data-sharing explanations are expandable. Forms use the established field-border and readable placeholder colors. No new imagery was generated.

Simulator verification uses the existing iPhone 18 Pro only. Native light, Dark Mode, largest text, validation/recovery, contact data entry, optional decline and recipient channel choice were exercised. The carrier flow keeps separate settings and carrier confirmations plus real-call-result gates; its introduction now mentions all handoffs and distinguishes a setup test from always-on service. Detailed test results are in Status. No physical-device install or new real-call verification occurred.


## October 14 — compact phone setup

Phone setup now presents four brief overview bullets, two consent headlines, a single contact preview, larger call instructions, and one Phone setting per page. The separate settings steps guide Screen Unknown Callers → Silence and Live Voicemail → Off; visiting the first setting does not mark the second as visited. Returning from Settings still requires the person’s explicit confirmation. Carrier pages retain three manual instructions and disclosed recovery; the current labels and deliberate copy sequence are recorded in Carrier-code handoff above. “Don’t answer” uses the existing held accent plus large bold text. The completion page shows the two recorded check results and optional help without a trial countdown or implied temporary service.

The simulator-only Demo header is removed from the product view; review galleries label their synthetic data outside the phone. Normal-size default steps should fit without scrolling. Expanded help and accessibility-size text remain scrollable rather than shrinking. Provider/privacy details remain available before consent in More before you agree. The setup window and 90-second probe deadlines remain backend controls; they are not the duration of always-on screening. This revision changes presentation and settings navigation, not live service configuration.

## October 14 — floating setup guidance

Phone setup and disconnection now pair the existing explicit confirmations with offline, silent visual guides. AVKit carries the same guide into Picture in Picture before Settings opens and automatically when the Phone banner opens Phone. The artwork isolates the actual control labels and tap targets in a readable three-step loop. The system window can move and resize. Written steps, playback controls and a static Reduce Motion version retain access without watching motion. At accessibility text sizes, guide controls stack and setup actions scroll with the instructions, avoiding an oversized pinned action over the reading area. Watching or returning never confirms a phone/carrier change. Implementation and dated verification are in [the setup-guide record](docs/IOS-SETUP-GUIDES.md). This historical entry's carrier sequence and looping external keypad guide are superseded by Carrier-code handoff above.


## October 15 — simpler setup demonstrations

Settings steps now use a single action heading (Choose Silence / Turn off Live Voicemail), a close-up demonstration, compact playback controls and one Read the steps disclosure. Reopening, manual confirmation, and detailed help stay available there. A different Settings landing page still gets visible recovery directions. Restoration removes its repeated instruction card. The video shows the actual inline caller choices, the inline Live Voicemail switch changing position/color, and a keypad with the empty paste target; each tap gets prompt visual feedback and a pause to inspect the result. Captions are large and only one instruction appears at a time. Real-phone inspection corrected the voicemail switch’s inline placement and added the native Keypad tab before the paste demonstration. Already-correct switch states are explicitly left alone. A floating-only reminder explains moving the video; PiP skips are disabled to keep the instructions in order. Static variants retain the written alternative. The original artwork is generated by scripts/generate-setup-guides.swift; no user video pixels or personal data are included. Dated validation is in the [setup-guide record](docs/IOS-SETUP-GUIDES.md).


## October 15 — original GIFs and a shorter Settings route

Owner screenshots overturned the earlier setup-guide approval: the timed video said to return before the setting was found. The inline demonstration is now an original GIF, separate from a steady Wispr-style floating reminder. In-app playback/float controls are removed. The public CallKit shortcut replaces the private Phone-root URL and, on the tested iOS 27.2 phone, opens near Call Filtering. The demonstration teaches a downward finger gesture and names the exact stopping section above it; voicemail uses the adjacent caller section as a landmark. Manual fallback reverses the navigation direction, uses a static target image and stops the incompatible floating reminder. Explicit confirmation, written recovery, Dynamic Type and Reduce Motion remain. No owner phone pixels or supplied video footage ship as assets.


## October 15 — remove the identification detour and sharpen the artwork

The owner’s screenshot supersedes the previous route approval: CallKit first opens an unrelated Shield identification switch. No back-arrow scene or instruction ships. The primary handoff now attempts Phone directly. The inline demonstration uses original 1440×960 raster artwork and upward finger gestures on close-ups of the starting rows and Announce Calls landmark, followed by the exact target. The floating reminder is steady: direction, landmark, stop heading, action, conditional return. No extra play/float controls appear. Written help covers overshooting and a manual route; Reduce Motion shows the target result. This is a best-effort undocumented Phone-page shortcut, not an exact-section API. Explicit confirmations and privacy boundaries remain.

The real Reduce Motion check exposed AVPlayerLayer above a SwiftUI image; the final static target uses a native image view in the same stack as the GIF. Restoration removes repeated general context and places Open Phone settings before the demonstration, so the next action is visible above the separate confirmation at normal text size. Already-done instructions remain in Read the steps.


## October 15 — one Phone-settings visit

The October 15 setup superseded the separate-visit and playback-control descriptions above while preserving Shield's navy actions, serif task headings and native reading surfaces. The combined guide shows Live Voicemail off and Silence immediately below in one visit. A larger steady Picture in Picture reminder holds both tasks on screen instead of advancing instructions on a timer. The best-effort direct Phone-settings handoff remains undocumented and cannot guarantee a landing section or scroll position. Landmark excerpts and Read the steps cover reopening, overshooting and the manual Settings → Apps → Phone route. Settings return and the two explicit confirmations remain separate events. The October 16 helper integration above makes this the retained manual recovery route.

The October 15 build used six original 1440×960 GIFs on a 30 fps timeline, with five prepared frames and decoding in batches of at most two. This bounds the decoded runway rather than retaining the whole animation. Playback pauses outside the active scene; Reduce Motion and the post-return state use a static target above the native video layer. There were no in-app Play/Float controls, Shortcuts installation or screen-sharing recognition. The authored artwork uses shapes and system labels, with no owner screenshot pixels or captured screen content.

Failed PiP startup stays on the scrollable Shield page, focuses its explanation and changes the sole primary action to Open Settings anyway. Choosing that action deliberately proceeds without a reminder. Reopening follows the same recovery and clears the returned state so the confirmation cannot masquerade as the fallback action. The native-alert experiment was removed after its message clipped at the largest text size.

This is an implementation record. The [October 15 review input](.impeccable/review/setup-one-visit/input.md), [dated evidence](.impeccable/review/setup-one-visit/evidence.json) and [setup-guide record](docs/IOS-SETUP-GUIDES.md) retain the scoped source, synthetic captures, measured artwork timing and physical handoff observations. They do not establish universal smoothness, older-adult usability or real-call behavior. The [final verdict](.impeccable/review/setup-one-visit/finish-verdict.md) scored the sole missing-reminder recovery finding resolved with disposition ship; its scope is that correction and directly introduced regressions. Two final main-phone and three compact-phone recovery checks passed.


## October 16 — page-by-page cleanup

Every reachable sample and fixture screen was captured on the iPhone 18 Pro simulator (iOS 27) and reviewed against the brief: less text, no repeated headings, one text edge per group. Changes:

- **Fewer words.** Trusted contacts drops its second heading and paragraph for a one-line footer. Get started, Get help, Message alerts, the trusted-contact choice and phone sign-in say the same facts in shorter sentences. Get help's heading is one line, with "You can check it later." as supporting text.
- **One text edge.** Phone setup details, the trial options and Message alerts no longer mix bare icons, tiles and plain rows. Status icons move to the trailing side, and tiled rows use `ActionRow`, which now dims when disabled. Home's "Phone setup needs attention" row and the Contacts share row use the shared symbol tile.
- **Clear choices.** Alerts for others puts Accept in a primary button with Decline beneath it. The trusted-contact onboarding choices are tiled cards with a short line each. Phone sign-in groups its secondary links like the email screen.
- **Setup pages.** The overview and consent points lead with symbol tiles instead of dots and bare bold lines. The sound check pairs its icon tile with the instruction. The carrier-code and restore steps share one order: copied state, guide, then evenly spaced optional help. `ShieldDisclosure` labels now have a 44-point minimum target.
- **Small fixes.** Quiet hours moves its explanation into the group footer. Message detail labels its duration ("Length"). Check a text's Choose picture button is sized nearer to the native Paste button.

See the [before/after sheet](docs/images/ios-page-cleanup.jpg). The behavior, confirmations, consent text and setup handoffs are unchanged. This is simulator evidence only; no physical phone, VoiceOver session or older-adult test was run.


## October 17 — consistency and accessibility sweep

Follows the [motion audit](docs/IOS-MOTION-AUDIT.md) and applies its one open diagnostic. Captured on the iPhone 17 Pro simulator (iOS 26.5, the app's minimum OS) in Light, Dark and the largest accessibility size.

- **Keyboard Done.** SwiftUI's keyboard toolbar reports "Invalid frame dimension (negative or non-finite)" whenever it is installed on a pushed or presented screen, even with a single item. Check a text, Add trusted contact and the email sheet now show Done in the navigation bar while a field is focused, like Notes and Contacts. Phone sign-in no longer has a keyboard Done. The test-only standalone email screen has no navigation bar, so `shieldKeyboardDone` shows a glass Done on the bottom safe area there, which the keyboard raises, while a field is focused. It fades without moving and caps its text size like system bars, with the Large Content Viewer. The app no longer uses the `.keyboard` toolbar placement.
- **Fields.** `shieldField(focused:)` gives every bordered text field the same Card fill, FieldBorder edge and 2-point Action edge while focused. Phone sign-in and Add trusted contact previously showed no focus at all.
- **Wrapping actions.** `ShieldWrappingLabelStyle` keeps a wrapped label's second line under its words. At accessibility sizes the decorative icon drops, as rows already do. This fixes "Choose picture" breaking mid-word and "Message kept" wrapping under its icon at the largest size.
- **One loading and error look.** Trusted contacts, Alerts for others, Checks while you talk, Delete account and Get started use `ShieldLoadingView` and `ShieldLoadFailure` instead of bare progress text and plain Try again links. `ShieldLoadFailure` takes a symbol for failures that aren't about the connection. The audio-sync and alert-choice errors use `ShieldNotice`. The duplicate spinner beside Check progress is gone.
- **Rows and icons.** Family & friends uses the shared row tile, and its helper note is a section footer. Filled `person.crop.circle.badge` glyphs became outline ones (`person.badge.minus`, `person.badge.shield.checkmark`, `person.text.rectangle`). Sign out and Leave sample app use the same tiled row as Delete account. Get started's setup link is a tiled row too. Delete my account is a full-width red bordered button rather than a lone text link. Shared 52-point targets replace the remaining 44-point ones. Trusted-contact numbers use monospaced digits, and the copied-code check and Settings gear match setup.
- **Motion.** The sample Keep this message bookmark uses a native symbol replace transition with selection feedback; Reduce Motion is handled by the system. No other motion was added.

See the [before/after sheet](docs/images/ios-consistency-sweep.jpg). iOS 26.5 simulator results: `npm run check` passed (316 tests). Across SeniorDesign, PhoneOnboarding, ShieldUITests, SeniorPolish, Redesign, Disconnect and NavigationRegression, 84 of 88 UI tests passed. The four Redesign failures also fail on unmodified main on the same simulator: the two known audit failures above, a "hit area too small" report for an unnamed SwiftUI node on Call detail, and the largest-text email-error check. Simulator evidence only; no physical phone, VoiceOver session or older-adult test.

**Follow-up (October 17).** Call detail's number-and-date line is no longer selectable. On iOS 26.5 the accessibility audit reported it as an 18-point touch target ("Hit area is too small"). A surrounding frame can't enlarge selectable text, and Shield already asks people not to reuse a caller's number. The number stays visible. The Welcome accessibility audit now names its capture without a navigation bar, so it audits sign-in (no issues) instead of failing first. Two audit reports remain and are not app defects. Setup and restoration's Close contrast measures 14.0:1 from the audit's own element image. The bottom Home and Calls rows report low contrast where they sit under the floating tab bar; an app-free list reproduces that edge report. iOS 26.5 (iPhone 17 Pro): 106 of 107 tests passed across SeniorDesign, PhoneOnboarding, ShieldUITests, SeniorPolish, Redesign, Disconnect, NavigationRegression and Forwarding. The only failure was that tab-bar edge report, and no invalid-frame warning was recorded.

## October 17 — Home status card

The owner asked for a Home status that reads at a glance, like other call-protection apps, instead of a paragraph beside a small check. See the [before/after sheet](docs/images/ios-home-status-card.jpg). The words and logic are unchanged: the same titles ("Call checks are on", "Your phone needs setup"…), no "Protected" claim, and the same rules for stale, failed and paused states.

- **One glance.** A status badge leads: a solid teal circle with a white shield-check when checks are on, navy for setup, a quiet tile otherwise. In Dark Mode the badge is a tinted tile with a teal or pale-navy glyph, so it pops without glowing. The badge is decorative and hidden from VoiceOver; the title says the state in words. A bold `.title2` state and one short line follow.
- **Checks on is its own card.** The status group gets a faint Connected tint over Card (10% in Light Mode, 6% in Dark Mode), distinct from the navy Calls stopped total below it. Every other state uses the ordinary Card.
- **Less text.** At the owner's request (October 17), the on card no longer carries "Quiet hours and daily limits can send some calls to voicemail." This supersedes the earlier rule that Home's explanation retains the quiet-hour and daily-limit qualifications; Quiet hours remains in Settings. Home also omits the saved-status timestamp, so restoring cached settings and refreshing them does not insert and remove a line. Missing or day-old settings still show their connection/reconfirmation guidance.
- **One resolved launch.** Continue the existing 72-point launch mark on the same adaptive surface while restoring the local session, owner history, recordings and phone-status snapshot. A slow restore may show native progress beneath the mark. Do not expose sign-in, an empty account or an unknown phone status between those local reads. A returning owner's Home is usable before network refresh; an uncached account stays in the opening state until its first account/context request finishes. Genuine sign-in, connection failures and reconfirmation remain reachable.
- **One real action.** Set up my phone is the primary button. Resume call checks, Phone options, Try again, and Keep using Shield / Finish disconnecting are bordered buttons. Because a List turns a NavigationLink into a plain row, they are Buttons that open their route with `navigationDestination(item:)`.
- **Accessibility sizes.** The badge drops and the words take the full width, as rows already do. There is no continuous animation, so Reduce Motion needs nothing extra and UI tests can idle.

## October 17 — simpler phone sign-in

The entry screen keeps the compact Shield identity and uses a short Display-size “Welcome” with one sentence about receiving a sign-in code. The field label is “Mobile number”; “US & Canada” aligns opposite it when both fit and stacks below at larger sizes. The field keeps its adaptive Card fill, visible focus outline and native keypad, with monospaced digits and a decorative phone symbol that yields its space at accessibility sizes. Valid numbers format after focus leaves the field, preserving native caret behavior while typing. Message/data-rate disclosure stays beside the form. A compact native primary action and centered, full-width Privacy target form one group beneath it. The verification step shares the same type and spacing, retains one-time-code autofill, resend timing, wrong-code recovery and Change number, and preserves the entered number. No keyboard toolbar or entrance animation is added.

## October 17 — settings, forms, messages, sharing and setup

The owner approved a refinement of all five areas using the new Home and login direction. Keep the neutral/navy surfaces, native navigation, serif headings, shared row symbols and large touch targets.

- **Settings:** Call protection first, then Contacts & sharing, Alerts & messages, and Account. Disconnection remains discoverable with account actions and describes restoring ordinary calls. The text-check row opens the working manual tool directly, without passing through the unavailable automatic-filter page.
- **Phone forms:** Login, Add number and Add caretaker share `ShieldPhoneEntry`: aligned country label, native phone keypad, monospaced digits, clear field boundary and formatting after editing. Add number keeps its labeled source choice, safe-number guidance, separately accessible Clear action and failed-save recovery. Its action follows the fields; native Done dismisses the keyboard. Formatting alone does not erase a failed-save message.
- **Messages:** The outcome and summary lead. Accessibility layouts place playback after the summary; other sizes retain the pinned primary action. Recording storage details are disclosed on request, deletion has a separate group, and unavailable audio explains expiration or the absence of a local/server copy without offering a known-unavailable playback action. A delivery timestamp does not prove that another phone still has the recording. Local saved audio remains playable.
- **Caretakers and call sharing:** Alerts and call access remain separate. Empty access explains privacy; the related caretaker route is explicit. Caretakers explains acceptance and alert scope, with monitoring settings in reach. Unavailable alerts and empty recipient requests offer a clear return. Native empty-state labels and descriptions grow vertically rather than truncating. Reloads show their in-progress state. Failed sharing changes move feedback into view, remain unconfirmed and keep the retryable action.
- **Setup returns:** Reopen Phone or Phone settings is visible beside the returned instructions, including the manual path. Visiting another app never confirms a change. Existing consent, separate confirmations, saved steps, carrier-code count and call checks remain intact. Initial loading/error feedback follows the shared components.

## October 18 — Home status as an editorial figure

Feedback was that the checks-on card looked generated: an icon in a coloured circle on a tinted card. The owner wants Home's two real visuals, checks on and the stopped total, with only the first fixed. Checks on now mirrors the Calls stopped panel:

- **Same structure as Calls stopped.** A white Card with the headline "Call checks" and a `checkmark.shield` symbol on the right, as "Calls stopped" has its hand. Then the state as a serif figure, "On" in Display ×1.3 in Connected teal, then one supporting line. There is no badge circle and no tinted surface. Calls stopped stays the navy panel with its serif numeral, so the pair reads as one editorial set.
- **Accessible wording.** The visual pair reads "Call checks / On"; VoiceOver reads the full title ("Call checks are on") as a heading, and `today-status-title` stays on that text. A timed window keeps its supporting line ("…checked until 10:27 AM").
- **Other states.** Setup, off, paused, disconnecting and unknown use the shared `ShieldRowSymbol` tile (navy for setup, quiet otherwise; "pause.circle" becomes "pause" inside the tile) beside the headline title, then their one button. The circle badge is gone everywhere.

This supersedes the October 17 decorative badge and teal checks-on surface.
