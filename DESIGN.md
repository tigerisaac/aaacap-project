---
name: Shield
description: A colorful native call companion for participants and people they choose to share with.
colors:
  action-light: "#224CC5"
  action-dark: "#9BB3FF"
  held-light: "#B53742"
  held-dark: "#FF9B9C"
  connected-light: "#076C5C"
  connected-dark: "#74DDC6"
  message-light: "#7244B9"
  message-dark: "#CAAEFF"
  surface-light: "#F3F5FB"
  surface-dark: "#151820"
typography:
  display:
    fontFamily: "system-ui"
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
  outcome-control: "16pt"
  call-symbol: "14pt"
spacing:
  tight: "4pt"
  compact: "6pt"
  small: "8pt"
  medium: "12pt"
  row: "14pt"
  inset: "16pt"
components:
  button-primary:
    backgroundColor: "{colors.action-light}"
  button-primary-dark:
    backgroundColor: "{colors.action-dark}"
  button-secondary:
    textColor: "{colors.action-light}"
  input-email:
    typography: "{typography.body}"
  navigation:
    textColor: "{colors.action-light}"
  outcome-held:
    textColor: "{colors.held-light}"
    rounded: "{rounded.outcome-control}"
    padding: "{spacing.inset}"
  outcome-connected:
    textColor: "{colors.connected-light}"
    rounded: "{rounded.outcome-control}"
    padding: "{spacing.inset}"
  outcome-message:
    textColor: "{colors.message-light}"
    rounded: "{rounded.outcome-control}"
    padding: "{spacing.inset}"
  outcome-badge:
    typography: "{typography.label}"
    padding: "6pt 9pt"
  call-symbol:
    rounded: "{rounded.call-symbol}"
    width: "46pt"
    height: "46pt"
  call-row:
    padding: "6pt 0"
  person-picker:
    textColor: "{colors.action-light}"
  demo-banner:
    textColor: "{colors.action-light}"
    typography: "{typography.label}"
    padding: "0 20pt"
---

# Design System: Shield

## Overview

**Creative North Star: "Public-library wayfinding"**

Shield uses short, familiar labels and distinct colors to help someone find a call, understand its outcome, and choose a next step. Native navigation and system typography carry the interface. The direction appears through tint, SF Symbols, and lightly colored outcome controls rather than a literal library theme.

Participants and caregivers use the same four destinations. A visible person selector and explicit sharing labels establish whose activity is in view. Copy stays brief in ordinary use; consent, call uncertainty, and service restoration retain the explanation needed to make a decision.

**Key Characteristics:**

- Native tabs, navigation stacks, lists, forms, sheets, and confirmation dialogs.
- Adaptive action blue, held-call red, connection teal, and message violet on quiet surfaces.
- System text styles, symbol-and-text outcomes, and layouts that can stack when space is tight.
- Explicit participant control, sharing scope, and sample-data labels.

**Evidence boundary:** Extracted from the current `ios/Shield` SwiftUI source and `Assets.xcassets` on 2026-09-21, after source review corrections. This is code-led documentation, with no approved visual comp. A subsequent Xcode simulator build and launch passed; rendered, Dark Mode, Dynamic Type, VoiceOver, and device review remain outstanding. Native behavior and final geometry still require that pass. The frontmatter records source values; `pt` means native layout points. The sidecar's browser snippets are schematic documentation previews, not screenshots or replacements for SwiftUI.

## Colors

Color identifies actions and outcomes while system primary and secondary foreground styles maintain reading hierarchy. Asset variants, not independently chosen screen colors, supply Light and Dark Mode values.

### Primary

- **Action blue** (`Action`; `action-light` / `action-dark`): the application tint, standard actions, selected navigation, person controls, and setup context. Screening and offered calls use this color too.

### Secondary

- **Held-call red** (`Held`; `held-light` / `held-dark`): held calls, requests that need checking first, and refused message-check results. The same attention color marks pending restoration or supervised-test notices; it is not a claim that a caller is malicious.
- **Connection teal** (`Connected`; `connected-light` / `connected-dark`): connected-call outcomes and their count control. It describes a connection, not a verified identity.

### Tertiary

- **Message violet** (`Message`; `message-light` / `message-dark`): voicemail outcomes, message counts, shared people, and sharing context.

### Neutral

- **Cool surface** (`Surface`; `surface-light` / `surface-dark`): the sign-in canvas and the Today, Calls, Check, People, and call-detail list backgrounds.
- **System foregrounds and containers:** `.primary`, `.secondary`, and native List/Form surfaces remain semantic SwiftUI styles. Missed calls use `.secondary`. Settings and forms keep their system backgrounds; do not substitute a sampled hex for an adaptive system color.

Outcome controls and the demo banner use their accent at 10% opacity. Outcome badges and call-symbol backgrounds use 12%; the Today setup row and call-detail summary use 8%. These are transparent overlays, not separate palette primitives.

The sidecar's tonal strips are synthesized OKLCH illustrations for the documentation panel. The app implements only the paired asset colors above; the intermediate strip colors are not app tokens.

**The Outcome Truth Rule.** Color always accompanies an outcome label or symbol, and a connection or screening result never implies an authenticated caller.

Source: `Design/ShieldTheme.swift`, `Models/CallOutcome.swift`, and the five color sets in `Resources/Assets.xcassets`.

## Typography

The native system font supplies all interface text. In the portable frontmatter, `system-ui` denotes this choice; implementation uses SwiftUI text styles and San Francisco. There is no custom font, fixed body size, custom tracking, or custom line-height scale.

| Role | Source style | Use |
| --- | --- | --- |
| Display | Native navigation titles; `.largeTitle.bold()` on sign-in | Screen identity and Shield wordmark |
| Title | `.title2.bold()` | Outcome counts and call-detail title |
| Headline | `.headline` | Call names, person names, section content emphasis, primary action labels |
| Body | Default text / `.body` | Call explanations, form content, next steps |
| Supporting | `.subheadline`, with semibold only for emphasized actions | Numbers, person-sharing scope, short supporting copy |
| Label | `.caption.weight(.semibold)`; ordinary `.caption` for timestamps | Outcome badges and demo state; secondary time information |

SF Symbols use the surrounding system style, commonly `.title3`; they are not a second icon font. Outcome counts use monospaced digits. Invitation codes use `.body.monospaced()` and allow text selection.

**The Native Type Rule.** Preserve semantic text styles and allow wrapping or stacking before introducing a fixed type size.

## Layout

Each top-level destination has a native NavigationStack. Today, Calls, Check, and People are a TabView; lists organize most content into system sections. Detail and settings screens explicitly use inline navigation titles. Focused entry tasks use a sheet containing its own navigation stack and Form. No custom breakpoint grid or iPad-specific split view is present in this source.

Reusable spacing is modest: tight supporting stacks, compact row padding, and a larger gap between the icon and text. Outcome controls have the inset padding token and use the medium gap internally and between controls. Call rows use the row gap with the compact vertical padding token. Leave normal list insets and safe-area handling to native containers.

Today uses `ViewThatFits` to change its three outcome controls from a horizontal row to a vertical stack. Call rows use the same mechanism for the badge and time, changing to a stacked badge/date when a horizontal arrangement does not fit. These are content-based adaptations, not device-width breakpoints.

Custom text actions such as Exit, See all, person selection, invitation actions, and pagination explicitly use a minimum height of 44 points; Exit also sets a minimum width of 44 points. Native controls provide their own layout. Treat 44-by-44-point hit areas as the target and verify them on device; source inspection does not establish every final hit area. The message editor has a 160-point minimum height and can grow. Sign-in uses a scroll view instead of fixing its form to the viewport.

## Elevation & Depth

The app defines no custom shadow or blur tokens. Low-opacity color distinguishes the main outcome controls and summary rows; native grouped surfaces separate supporting content. Navigation bars, sheets, menus, and dialogs retain the operating system's materials and depth. There is no custom motion curve or duration: pushes, sheets, and control feedback use platform behavior. Reduced Motion behavior remains unverified because the app has not run locally.

## Shapes

The two repeated custom shapes are the softly rounded outcome control and call-symbol tile, recorded in the frontmatter. Outcome badges use SwiftUI's Capsule, so their ends remain rounded as content grows. Native buttons, fields, menus, lists, and sheets retain system corner geometry. Do not copy a preview's browser radius into those controls.

The sign-in emblem's larger enclosure is specific to that screen and is not a reusable container token. The asset catalog contains a single universal app-icon raster; it does not establish an illustration system. In-app iconography uses SF Symbols.

## Components

### Buttons

Primary submission uses `.borderedProminent` with the application tint. Sign-in also uses `.controlSize(.large)`; Check supplies a full-width label with a minimum height. Secondary actions use `.bordered` or standard native text buttons. Loading labels and ProgressView explain busy states, while `.disabled` blocks duplicate or incomplete submissions. Destructive actions use `role: .destructive` and native confirmations. Hover, keyboard focus, pressed treatment, and disabled appearance are system owned.

### Inputs / Fields

Sign-in uses rounded-border TextField controls with email and one-time-code content types and keyboard choices. Entry sheets and Sharing use Form fields, native Picker and Toggle controls. Check uses a labeled TextEditor and PhotosPicker; the placeholder is hidden from accessibility because the editor already has an explicit label. Focus is managed with FocusState where needed. Validation disables submission; errors appear in the root native alert. There is no custom error-border system.

### Navigation

The four tab labels are **Today**, **Calls**, **Check**, and **People**, each with an SF Symbol. Calls uses a menu-style filter with All, Held, Connected, and Messages. Native NavigationLink rows push into detail or settings. Add number and Join someone are sheets with Cancel; Add number also has a confirmation-position Save. Standard native back navigation remains in place.

### Outcome controls and badges

The three Today controls show a symbol, a bold count, and a short label: Held, Connected, Messages. They are buttons that open the corresponding Calls filter. Their accessibility label combines count, category, and “this week”; the hint explains that activating them shows calls.

`OutcomeBadge` combines a system symbol and caption label inside a lightly colored capsule. The actual call labels are Screening, Offered, Connected, Held, Check first, Message, and Missed. Held and Check first share the raised-hand symbol and color. The Held filter includes both states; Messages includes calls with voicemail. Preserve these distinctions instead of inventing a safety score or replacing uncertainty with “safe.”

### Call rows and detail

Call rows show a colored symbol tile, call title, caller number, outcome badge, and time. The tile is decorative for accessibility, and row children combine into one element. NavigationLink supplies the row affordance. Detail starts with a tinted outcome summary, then native sections for what happened, voicemail when present, next step, and a timeline when available. Voicemail uses an explicit play/stop action and visible loading state. Playback controls require sharing permission; unavailable or unshared audio is labeled as such.

### Person context and sharing

The toolbar PersonPicker uses a native Menu with the current name and a selection checkmark. Its accessibility label names the viewed person and says the person can be changed. People rows state “Your phone,” “Call history shared,” or “History & voicemail shared,” with an explicit selected mark. Selecting a person clears the previous context, resets the Calls filter, and recreates the tab roots for that person.

Participant-only setup and sharing actions are conditional on ownership. Caregiver views explain that phone settings stay with the participant. The native Include voicemail toggle makes sharing scope explicit, and invitation/revocation actions use confirmation dialogs. Color supports that distinction; it does not carry access meaning alone.

**The Visible Context Rule.** Show the selected person and sharing scope in words, and keep participant ownership distinct from caregiver access.

### Demo, loading, and empty states

The persistent DemoBanner says **Demo · sample activity** and provides an Exit action. Setup and sample results also identify demo content. System ProgressView, ContentUnavailableView, pull-to-refresh, and the root alert provide loading, empty, retry, and error feedback. Sample voicemail explicitly says it has no recording. Keep evidence labels as visible content rather than relying on a color or developer-only indicator.

## Do's and Don'ts

### Do:

- Do use adaptive asset colors through ShieldTheme and semantic system colors for ordinary text and native containers.
- Do pair outcome color with a concise label and SF Symbol, preserving the exact call-state distinctions.
- Do preserve native navigation, system text styles, and the content-based stacking used by outcome controls and call rows.
- Do make the selected person, sharing scope, and demo state explicit in visible copy and accessibility labels.
- Do keep ordinary copy short while retaining meaningful consent, uncertainty, and restoration explanations.
- Do verify Light and Dark Mode, large Dynamic Type, VoiceOver, hit areas, and Reduced Motion in the running native app.

### Don't:

- Don't describe a screened or connected caller as verified, authenticated, or safe.
- Don't turn a schematic sidecar preview into a pixel specification for a native control.
- Don't treat caregiver access as ownership or hide the limits of shared voicemail access.
- Don't replace system foreground colors with sampled fixed colors or add a custom type scale based on screenshot measurements.
- Don't promote sign-in-only decoration or preview-only styles into global design tokens.
- Don't claim compilation, visual approval, or accessibility validation from this source extraction.
