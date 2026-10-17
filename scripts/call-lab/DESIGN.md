---
name: Shield Call Lab
description: A restrained operator utility for local rehearsals and separately approved isolated live tests.
colors:
  ink: "#172924"
  muted: "#52625c"
  accent: "#21634c"
  line: "#d6ddd5"
  paper: "#f6f8f3"
  white: "#fff"
  accent-hover: "#174d3a"
  secondary-hover: "#e7eee7"
  select-border: "#8e9e93"
  secondary-border: "#a8b7ae"
  focus: "#ae5c22"
  selection: "#d4e7db"
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "17px"
    lineHeight: 1.55
  display:
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-.035em"
  headline:
    fontSize: "22px"
    fontWeight: 650
    letterSpacing: "-.02em"
  title:
    fontSize: "17px"
    fontWeight: 650
  label:
    fontSize: "15px"
    fontWeight: 600
  detail:
    fontSize: "14px"
rounded:
  control: "8px"
spacing:
  label-gap: "8px"
  action-gap: "10px"
  section-gap: "32px"
  column-gap: "44px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  select:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    width: "100%"
---

# Design System: Shield Call Lab

## Overview

**Creative North Star: "Local rehearsal"**

This record applies to the local call-lab rehearsal and its separate, approved isolated live-test screen. Both extend Shield’s restrained green and native-system typography for an Operate workflow; they do not redefine the application brand. Plain controls, spacious divisions and explicit mode labels distinguish local simulation from paid provider evidence. The existing visual world remains unchanged.

**Key Characteristics:**
- Calm green-white field with dark readable text.
- Native forms and explicit operational states.
- Flat, divided sections with no decorative imagery.

Source of truth: `web/index.html`, `web/app.js`, `web/live.html`, `web/live.js`, shared `web/style.css` and `PRODUCT.md`. Rehearsal screenshots in the repository’s `.impeccable/review/call-lab/` retain their ship/no-fixes disposition. Live screenshots are `.impeccable/review/call-lab-live/desktop-final.jpg` (final stopped state) and `mobile-final.jpg` (final mobile capture). The earlier `mobile.jpg` is layout evidence captured before the latest state fixes. Live review resolved the three UI fixes and reached a ship disposition at that scope. Two sequential paid attempts completed October 16, 2026, using synthetic tones and fixed screening; no phone number was purchased. This records provider transport/control work, not AI screening, carrier forwarding or iPhone delivery verification. Another paid run requires fresh approval.

## Colors

The primary accent is restrained forest green, used for the main actions, mode labels and passed rehearsal results. The darker accent and pale green secondary fill provide hover feedback. Pale paper, white control surfaces and gray-green dividers keep the page quiet; ink and muted text provide the hierarchy. Warm brown marks keyboard focus, and pale green marks selected text. Frontmatter preserves the exact implemented values.

## Typography

All roles inherit the native system stack. The compact, tightly tracked display heading establishes the task. Section headings and medium-weight labels organize controls and results; small muted text carries limitations and detail. Introductory prose has a maximum measure of 65 characters. Cost values use tabular numerals. The header wordmark is plain text, not a replacement logo asset.

## Layout

The centered container is at most 1120px wide, with 28px top, 40px horizontal and 36px bottom padding. The desktop workspace uses 1.35fr / 1fr columns with a 44px gap. The rehearsal cost proposal or live approved-scope list sits beside its form with a left divider and 32px inset. Results span the full width below.

At 700px and below, the container uses 20px padding, columns stack with a 30px gap, and the proposal’s left divider becomes a top divider. Form action buttons become full width. The rehearsal sequence action remains next to its explanatory text. The live screen keeps endpoint connection, test start and stop controls in that order, followed by the status message. Long routing and result details wrap within the page.

## Elevation & Depth

There are no shadows, raised cards or overlays. Thin borders and whitespace separate sections; white selects distinguish editable controls from the paper field.

## Shapes

Selects and buttons use gently rounded corners. Selects are at least 48px tall; buttons are at least 46px tall. Section rules remain straight and unboxed. Keyboard focus uses a 3px outline with a 4px offset.

## Components

- **Header:** home link and a persistent mode label: “Local rehearsal” or “Isolated live test”.
- **Rehearsal form:** labeled native recipient and scenario selects, a filled run button and an outlined routing-preview button. “Run all 8” is a separate outlined action.
- **Cost proposal:** a definition list with right-aligned values. Current proposal is two sequential calls, at most 60 seconds each, about $0.13 estimated cost and a $0.25 proposed budget. It is informational on the rehearsal screen; paid execution lives only on the separate approved live screen.
- **Rehearsal results:** bordered rows with a title, textual “Passed” state and muted synthetic command details. New successful runs replace the result rows and update the count. The status region announces ready, running, success and failure text.
- **Routing preview:** an inline explanation names the fictional recipient and expiring signed-header mechanism without displaying the token. A new run hides the preview.
- **Rehearsal unavailable and busy states:** buttons remain disabled while initial configuration is unavailable and are temporarily disabled during work. Failures appear in status text; existing result evidence may remain visible.
- **Live controls and scope:** one labeled native recipient-response select offers press 1 to connect or press 2 for a message. Filled endpoint-connection and test-start buttons precede the outlined “Stop and disable testing” action. The adjacent definition list shows attempts used out of two, one-call concurrency, a 60-second deadline, about 13¢ total planning estimate and a 25¢ outbound spending limit. The visible qualification explains that the provider limit blocks new outbound calls and is not an all-services bill cap. Synthetic tones replace microphone input; screening is fixed.
- **Live ready and registration:** the announced status distinguishes a ready gateway from ready browser endpoints. Test start begins disabled. Connection reports each endpoint in the event list; successful registration enables test start and explicitly states that starting uses a paid attempt. Registration failure says no call was placed and directs the operator to stop before a new run.
- **Live running and completion:** test start and response selection are disabled during a call. The append-only event list records the attempt boundary, endpoint states and recipient digit; completion reports attempts used and the observed outcome, then restores selection. Audio counters reset for each attempt, so received-byte evidence is not carried forward from a previous call.
- **Live exhausted:** after both attempts are used, start is disabled and status directs the operator to stop/disable testing. A new run requires approval.
- **Live stopped and failure:** stop sends the server request independently of browser hangup, disconnect or audio-context errors. The status distinguishes confirmed disabled resources, incomplete cleanup and an unconfirmed stop. Start and connection remain disabled when testing is closed. Startup failure warns that an attempt may have been consumed; gateway loss disables start and names the independent watchdog. Failure and stopping messages are protected from routine ready/exhausted status updates.
- **Live evidence:** plain bordered event rows and muted received-audio counts sit above the footer’s evidence limitation. The UI does not display credentials, signed tokens or private call identifiers. A reloaded stopped screen can show zero browser-local counters; that is not a replacement for the run’s recorded evidence.
- **Interaction:** button backgrounds transition for 120ms with ease-out only when reduced motion is not requested. Disabled buttons use 55% opacity and a wait cursor.

## Do's and Don'ts

- Do keep each screen’s mode and evidence limits visible: local rehearsal or isolated live test.
- Do use native labeled selects, visible keyboard focus and announced status text.
- Do retain the single-column mobile order: controls, cost proposal or approved scope, results, release context.
- Do show paid-attempt exhaustion, cleanup uncertainty and per-attempt audio evidence explicitly on the live screen.
- Don’t imply that a passing rehearsal verifies real audio, or that fixed-screening live tests verify AI quality, carrier forwarding or iPhone delivery.
- Don’t add a paid action to the rehearsal screen; keep approved live controls on the separate isolated surface.
- Don’t add credential entry or a physical microphone request to either screen.
- Don’t introduce decorative cards, imagery or a new brand identity.
