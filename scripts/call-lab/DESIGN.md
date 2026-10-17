---
name: Shield Call Lab
description: A restrained local operator utility for simulated call-control rehearsals.
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

This record applies only to the local call-lab web utility. It extends Shield’s restrained green and native-system typography for an operator workflow; it does not redefine the application brand. The implemented surface uses plain controls, spacious divisions and a visible distinction between local evidence and a proposed paid run.

**Key Characteristics:**
- Calm green-white field with dark readable text.
- Native forms and explicit operational states.
- Flat, divided sections with no decorative imagery.

Source of truth: `web/index.html`, `web/style.css`, `web/app.js` and `PRODUCT.md`. Desktop and mobile review screenshots in the repository’s `.impeccable/review/call-lab/` show the built surface. Review disposition: ship, no fixes. This record captures that implementation, not a new visual direction.

## Colors

The primary accent is restrained forest green, used for the main action, local mode and passed results. The darker accent and pale green secondary fill provide hover feedback. Pale paper, white control surfaces and gray-green dividers keep the page quiet; ink and muted text provide the hierarchy. Warm brown marks keyboard focus, and pale green marks selected text. Frontmatter preserves the exact implemented values.

## Typography

All roles inherit the native system stack. The compact, tightly tracked display heading establishes the task. Section headings and medium-weight labels organize controls and results; small muted text carries limitations and detail. Introductory prose has a maximum measure of 65 characters. Cost values use tabular numerals. The header wordmark is plain text, not a replacement logo asset.

## Layout

The centered container is at most 1120px wide, with 28px top, 40px horizontal and 36px bottom padding. The desktop workspace uses 1.35fr / 1fr columns with a 44px gap. The cost proposal sits beside the form with a left divider and 32px inset. Results span the full width below.

At 700px and below, the container uses 20px padding, columns stack with a 30px gap, and the proposal’s left divider becomes a top divider. Form action buttons become full width. The sequence action remains next to its explanatory text. Long routing and result details wrap within the page.

## Elevation & Depth

There are no shadows, raised cards or overlays. Thin borders and whitespace separate sections; white selects distinguish editable controls from the paper field.

## Shapes

Selects and buttons use gently rounded corners. Selects are at least 48px tall; buttons are at least 46px tall. Section rules remain straight and unboxed. Keyboard focus uses a 3px outline with a 4px offset.

## Components

- **Header:** home link and a persistent “Local rehearsal” mode label.
- **Rehearsal form:** labeled native recipient and scenario selects, a filled run button and an outlined routing-preview button. “Run all 8” is a separate outlined action.
- **Cost proposal:** a definition list with right-aligned values. Current proposal is two sequential calls, at most 60 seconds each, about $0.13 estimated cost and a $0.25 proposed budget. It is informational; there is no live executor.
- **Results:** bordered rows with a title, textual “Passed” state and muted synthetic command details. New successful runs replace the result rows and update the count. The status region announces ready, running, success and failure text.
- **Routing preview:** an inline explanation names the fictional recipient and expiring signed-header mechanism without displaying the token. A new run hides the preview.
- **Unavailable and busy states:** buttons remain disabled while initial configuration is unavailable and are temporarily disabled during work. Failures appear in status text; existing result evidence may remain visible.
- **Interaction:** button backgrounds transition for 120ms with ease-out only when reduced motion is not requested. Disabled buttons use 55% opacity and a wait cursor.

## Do's and Don'ts

- Do keep local-only status and the limits of rehearsal evidence visible.
- Do use native labeled selects, visible keyboard focus and announced status text.
- Do retain the single-column mobile order: controls, cost proposal, results, release context.
- Don’t imply that a passing rehearsal verifies real audio, carrier forwarding or iPhone delivery.
- Don’t add a live-call action, credential entry or microphone request to this utility.
- Don’t introduce decorative cards, imagery or a new brand identity.
