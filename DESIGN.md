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
    typography: "{typography.headline}"
    height: "52pt"
  button-primary-dark:
    backgroundColor: "{colors.action-dark}"
    typography: "{typography.headline}"
    height: "52pt"
  button-secondary:
    textColor: "{colors.action-light}"
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

**Evidence boundary:** Extracted from current local SwiftUI source on October 12, 2026. This document records implemented styles and behavior, not final visual approval, accessibility certification, deployment, or real-call performance. Repository checks reported by the implementation pass passed typecheck/build and 157 unit tests, 86 Firebase emulator tests, and 13 forwarding UI tests. Final simulator review and accessibility diagnostics are still pending at extraction; the dated results belong in [the senior-design record](docs/IOS-SENIOR-DESIGN.md). No live service, owner phone, carrier setting, or real call changed as part of this documentation pass.

## Colors

Color gives actions and call outcomes a consistent identity while opaque supporting text and native grouped surfaces carry the reading hierarchy.

### Primary

- **Action blue** (`Action`; `action-*`): application tint, selected navigation, primary actions, setup context, and calls being checked or offered.

### Secondary

- **Stopped-call red** (`Held`; `held-*`): Stopped and Check first outcomes, warning context, and text checks that need caution. It never authenticates a caller or independently proves wrongdoing.
- **Answered-call teal** (`Connected`; `connected-*`): Answered outcomes. It describes a connected call, not a verified identity.

### Tertiary

- **Voicemail violet** (`Message`; `message-*`): voicemail outcomes, the unheard-message dot, and sharing context.

### Neutral

- **Opaque supporting text** (`ShieldTheme.secondaryText`; `secondary-*`): key headings, footnotes, timestamps, placeholders, and supporting explanations. The increased-contrast variants strengthen foreground separation without lowering opacity.
- **Native grouped surfaces:** `ShieldTheme.surface` is `systemGroupedBackground`; `ShieldTheme.card` is `secondarySystemGroupedBackground`. Lists and Forms retain native separator and selection behavior. These are adaptive system colors, not the earlier fixed Surface asset values.
- **Native foregrounds:** `.primary` remains the ordinary reading color; a missed-call outcome can use `.secondary`. `ShieldTheme.actionInk` adapts primary-button text to appearance. Native Paste has its own deep `PasteFill` asset so its system white label stays readable in both appearances.

Small symbol backgrounds may use a role tint at low opacity, such as ScreenIntro's 10% fill. Outcome labels themselves are unboxed. The sample marker sits on an opaque system surface.

**The Outcome Truth Rule.** Pair color with a familiar outcome label or symbol; a call being checked, offered, or answered never implies an authenticated caller.

The sidecar's synthesized tonal strips only illustrate hue in the documentation panel. The app uses the asset and foreground variants above; intermediate ramp colors are not native tokens.

Source: `ios/Shield/Design/ShieldTheme.swift`, `ios/Shield/Models/CallOutcome.swift`, and `ios/Shield/Resources/Assets.xcassets`.

## Typography

Native system fonts supply interface text and SF Symbols supply iconography. The frontmatter's `system-ui` is a portable family description; SwiftUI's semantic text styles and Dynamic Type are authoritative. There is no custom fixed-size type ramp or line-height scale.

| Role | Implemented style | Use |
| --- | --- | --- |
| Display | Native navigation title; `.largeTitle.bold()` for Shield | Screen identity and sign-in brand |
| Title | `.title2.bold()` or `.title3.bold()` | Call-detail title, results, focused introductions |
| Headline | `.headline`; `.body.weight(.semibold)` in call rows | Voicemail titles, section headings, action labels, call purposes |
| Body | `.body` or default Text | Instructions, form content, explanations, More choices |
| Supporting | `.subheadline` | Call time, outcome, number, sharing scope, sample marker |
| Label | `.subheadline.weight(.semibold)` | OutcomeBadge and sample-data identity |

Invitation and carrier codes use native monospaced text where appropriate. They are task-specific content, not a display face. Call timestamps expose full dates to accessibility even when visible text uses a local time, Yesterday, or a short date.

**The Native Type Rule.** Preserve semantic text styles and allow wrapping or stacking before introducing a fixed text size.

## Layout

The four native tabs are Home, Calls, Voicemail, and More. Each destination owns a NavigationStack. Lists use `.insetGrouped`, hide the scroll-content background in favor of the shared system surface, and set the default minimum row height to 60 points. Native hard scroll-edge effects keep boundaries distinct from scrolling content. Sheets and dialogs retain platform behavior.

`ShieldTheme.Spacing` defines the six spacing tokens in frontmatter. Sign-in has a centered readable column capped at 560 points and page padding; it scrolls as content and the keyboard require. There is no custom viewport breakpoint system or app-specific iPad split layout.

`ShieldTheme.Layout.minimumTarget` is 52 points for shared primary-action labels and many app-owned actions; this is a minimum, never a fixed clipping height. The frontmatter's component `height` values express this minimum. Grouped rows use the 60-point default and grow with their content. Platform-owned controls keep native sizing. PersonPicker currently has a separate explicit 44-point minimum; this local exception does not establish the general app target.

At accessibility text sizes, call titles and times stack, and busy primary-action labels can put the spinner above the words. `ViewThatFits` stacks short action groups when their content does not fit horizontally. ActionRow's icon-column width scales relative to `.title3` through `ScaledMetric`; text can wrap. The text-check editor scales its 120-point base height relative to `.body`.

## Elevation & Depth

Shield defines no custom shadow, blur, motion-duration, or easing tokens. Native grouped rows and system surface layering provide depth. Navigation bars, menus, sheets, dialogs, and pressed feedback use operating-system materials and motion. The sample-data marker occupies its own opaque area above the TabView content; it does not float over scrolling rows. Voicemail's listening control uses a bottom safe-area inset with an opaque system surface.

**The Native Surface Rule.** Use grouped system surfaces and native control feedback before introducing custom elevation or viewport geometry.

## Shapes

Primary buttons are native large `.borderedProminent` controls with capsule borders. Sign-in fields and introduction symbol tiles share the rounded field-and-intro geometry. The reusable `shieldCard` helper uses the card radius and card padding; ordinary list sections remain native grouped containers. No custom badge capsule surrounds outcome labels.

The existing ShieldMark image retains its continuous app-icon enclosure. Its geometry is specific to the identity asset and does not establish a general-purpose container. In-app icons use SF Symbols, not character glyphs or a separate icon font.

## Components

### Buttons

`shieldPrimaryButton` sets native prominent styling, large control size, capsule shape, and Action tint. `ShieldActionLabel` supplies a full-width, wrapping headline and the shared minimum target, with adaptive `actionInk` foreground. Loading states name the work and show ProgressView; disabled controls prevent duplicate or incomplete submissions. Secondary actions use native text or bordered controls. Destructive actions use native roles and explicit confirmation. Native focus, pressed, and disabled appearances remain authoritative.

### Inputs / Fields

Sign-in uses email and one-time-code fields with keyboard/content types, explicit accessibility labels, rounded card-colored containers, and a focus border. Sharing and entry sheets use native Form fields, Picker, and Toggle. Check a text uses a labeled TextEditor with an accessibility-hidden placeholder, native Paste and Picture actions, and explicit agreement before sending text. Routine errors use ShieldNotice near the affected content; the root alert handles shared errors. There is no global custom error-border system.

### Navigation

The tabs are **Home**, **Calls**, **Voicemail**, and **More**, with house, phone, recording-tape, and ellipsis SF Symbols. More lists **Check a text**, **Family & friends**, **Get help**, and **Settings**. Its Check a text row has no explanatory subtitle. Focused tasks push through native NavigationLink rows; entry sheets retain Cancel and task-specific confirmation controls. Standard back navigation remains visible.

### Call and voicemail rows

CallRow follows Phone's Recents pattern: purpose or name and time, followed by outcome and optional number. The call symbol is paired with an outcome word unless the title already supplies it. An adaptive violet dot marks unheard voicemail. Home hides the number while Calls and detail retain it. There is no decorative outcome tile or weekly-count dashboard in the daily view.

OutcomeBadge is an unboxed subheadline label with an SF Symbol. The labels are **Checking call**, **Phone rang**, **Answered**, **Stopped**, **Check first**, **Voicemail**, and **Missed**. Call rows expand Missed to Missed call. Preserve these distinctions and the uncertainty behind Check first.

VoicemailRow leads with the message purpose, then an optional sample summary and a short New, Kept, or Removed state with a date. The dedicated inbox offers native loading, retry, empty, pagination, and removed-message disclosure states. Listening is the main bottom action on a playable message. More about this call opens additional detail rather than placing it all in the first view.

### Status and notices

Home's real-phone status depends on current forwarding evidence. Loading, unavailable, stale, expired, paused, and disconnection states are handled explicitly. Missing or old status never becomes an active-protection claim. Retry and setup appear when actionable; a healthy ProtectionCheckCard stays out of the daily path. Pure sample Home starts with voicemail and calls, relying on the persistent sample marker rather than another introductory status block.

ShieldNotice combines a headline, supporting explanation, and recognizable symbol. ShieldLoadingView combines a system spinner and a short description. Use ordinary words for the result and reveal technical context only when needed for the person's task.

### Person context and sharing

PersonPicker appears as a native Menu when more than one person is available; a single helper context can show the person's name without a menu. It names the viewed person for accessibility. Selecting someone resets the old context and call filter. Family & friends rows state who owns the phone and whether call history or voicemail is shared.

Owner-only actions remain conditional on ownership. Include voicemail, invitation, and revocation controls preserve explicit permission and confirmation. Setup and disconnection retain their setting confirmations and call checks; returning from Phone or Settings never confirms a change by itself.

**The Visible Context Rule.** Show the viewed person and sharing scope in words, and keep participant ownership distinct from helper access.

### Sample-only features

The persistent marker says **Sample app** or **Test account · Sample data**. Ordinary sample exit lives in More as Leave sample app. The marker has an explicit sample-only accessibility label.

Sample voicemail summaries are authored text. Hear sample message reads an authored sample using on-device speech, not a caller recording. Keep this message and the All/Kept sample filter only change in-memory sample state; they do not change real-message expiry or service data. Permissions still gate listening and owner actions. Real summaries need a service, API fields, consent, processing/error states, and accuracy checks; real keeping needs persistent owner state and explicit retention/deletion rules. See [the senior-design record](docs/IOS-SENIOR-DESIGN.md) for those future requirements.

The sidecar's HTML/CSS is a schematic documentation preview. Browser type metrics, symbols, pixels, corners, and interaction styles do not specify the native implementation.

## Do's and Don'ts

### Do:

- Do use ShieldTheme's adaptive role colors, opaque supporting text, and native grouped system surfaces.
- Do pair outcome color with familiar words and SF Symbols while preserving uncertainty.
- Do keep semantic Dynamic Type, wrapping text, content-based stacking, 52-point shared app action minima, and 60-point grouped-row defaults.
- Do give ordinary tasks one clear next action and reveal less common detail on request.
- Do make person context, voicemail permission, and sample-only state visible in words.
- Do retain explicit privacy, sharing, setup, and disconnection confirmations.
- Do verify the running native app in Light and Dark Mode, increased contrast, large Dynamic Type, VoiceOver, and Reduced Motion before claiming accessibility approval.

### Don't:

- Don't describe a checked, offered, or answered caller as verified, authenticated, or safe.
- Don't infer active call checks from stale, missing, paused, or expired status.
- Don't promote weekly counters, old tab labels, or fixed Surface asset colors from earlier designs into new screens.
- Don't treat schematic sidecar HTML/CSS as a native pixel specification.
- Don't treat helper access as ownership or extend voicemail access implicitly.
- Don't present sample summaries, synthetic speech, or temporary keeping as real-message services.
- Don't claim final visual approval, deployment, or real-call evidence from this source extraction.
