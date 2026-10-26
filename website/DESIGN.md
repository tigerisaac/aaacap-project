---
name: Shield marketing website
description: A little more peace when the phone rings.
colors:
  paper: "#f7f7f2"
  navy: "#002664"
  ink: "#10283f"
  secondary: "#56616c"
  line: "#d8ddd9"
  soft: "#eef0ea"
  white: "#fff"
  hero-base: "#081622"
  hero-copy: "#e1e5e5"
  hero-note: "#d8dedf"
  button-hover: "#e0e8d7"
  focus: "#64873b"
  selection: "#cbdcc9"
  scrollbar: "#a0adaf"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(58px, 5.5vw, 78px)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-.035em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "17px"
    lineHeight: 1.65
rounded:
  button: "6px"
  app-icon: "16px"
components:
  button-light:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "13px 21px"
  button-light-hover:
    backgroundColor: "{colors.button-hover}"
---

# Design System: Shield marketing website

## Overview

**Mode: Persuade.** This bounded marketing surface carries Shield's existing navy serif identity into a quiet, photographic introduction. A sunlit armchair and phone anchor the promise of an ordinary, less interrupted day. Short blurbs explain screening and recipient control; the current CTA says “Coming soon to iPhone.”

This file describes `index.html`, `styles.css`, `site.json`, and their build substitutions. It does not govern the native app or replace the repository's root design system. Key characteristics: pale backgrounds, generous whitespace, serif headings, a single reused photograph, and restrained line icons.

## Colors

Navy marks links, icons, and the wordmark; ink is the default text. Paper is the page and hero-button background, soft is the full-width how-it-works band, secondary is supporting copy, and line separates steps, disclosure, and footer. The dark hero base supports pale copy. This is a light-only surface. Focus uses green; selection uses pale green with navy text.

## Typography

All headings use the serif stack at weight 400 with balanced wrapping; body and controls use the system sans stack. No external fonts are loaded. H2 is `clamp(32px,3.2vw,44px)` / 1.17 / `-.025em`; H3 is 26px / 1.3 / `-.015em`. Hero copy is 19px / 1.6. Steps use 16px / 1.65, supporting labels 15px, footer 13px, and hero note 12px. Body line lengths are bounded: introduction 47ch, steps 43ch, release 49ch.

## Layout

- First viewport: 108px header with a 160px wordmark and two right-aligned links, followed by a 620px-minimum photographic hero. The three-line heading, two-line blurb, and pale CTA sit left; a small note sits at bottom left. Hero content padding is `69px 64px 94px`, capped at 660px wide. The photograph covers the frame at `center 58%`.
- The shared wrapper is `min(1280px,100% - 96px)`. Introduction and how-it-works use equal two-column grids with 80px gaps; introduction padding is `96px 64px 100px`, how-it-works `80px 64px 82px`. Step rows have 29px vertical padding. Release is centered with `90px 24px 77px` padding; its disclosure is at most 640px wide. Footer minimum height is 110px.
- At ≤1050px: outer gutters become 32px, hero minimum height 590px, hero content width 540px and left padding 44px, H1 66px, photograph position `53% center`, section horizontal padding 24px, and grid gaps 45px.
- At ≤700px: gutters become 18px; header is 84px with a 130px wordmark. Hero minimum height is 730px, content padding `40px 27px 180px`, H1 61px / 1.03, copy 17px, and photo position `66% bottom`. The dark vertical gradient preserves text contrast above the image; the bottom note has a dark backing. Content sections become one column with `56px 10px` padding and 25px/35px gaps. H2 becomes 36px, H3 25px, release padding `62px 10px 50px`, and footer wraps.
- At ≤370px: wordmark becomes 112px, navigation 12px, H1 54px, hero horizontal padding 22px, button text 13px, and footer navigation occupies its own row.

## Elevation & Depth

No shadows or blur. Depth comes from the photograph and alternating paper/soft backgrounds. The mobile hero's dark gradient is a readability treatment; thin borders divide supporting content.

## Shapes

Hero and section surfaces are rectangular. The CTA has 6px corners and the 72px app icon has 16px corners. SVG icons use 1.5px strokes with rounded caps and joins; the default icon box is 24px. Content rows remain open rather than enclosed in cards.

## Components

- **CTA and navigation:** the pale hero link is at least 54px high, with a phone icon and 15px medium text; hover changes its background over 200ms ease-out. Navigation links and the release text link are at least 44px high. Navigation gains an underline on hover; the release arrow moves 3px right over 200ms ease-out. Mobile CTA uses 14px text and 16px horizontal padding.
- **Availability disclosure:** native `details`/`summary`, with top/bottom rules, 20px vertical summary padding, and 15px copy. Its 18px chevron rotates 180° when open over 200ms ease-out. The content explains eligibility, forwarding, subscription, and screening limitations.
- **Accessibility and motion:** a keyboard-visible skip link leads to main content. Links and summary show a 3px green focus outline offset 6px. Anchors scroll smoothly with 32px top padding. Only at ≥900px with no reduced-motion preference does hero content settle upward 12px over 750ms using `cubic-bezier(.16,1,.3,1)`. Reduced motion disables animations/transitions and restores instant anchor scrolling.
- **Current release state:** `appStoreLive: false` makes the hero CTA and “For iPhone” navigation link target `#iphone`; “Contact Shield” opens the configured support page. The site uses no browser JavaScript, tracking, external fonts, or backend access.

## Do's and Don'ts

- **Do** preserve the existing photograph, wordmark, icon, quiet palette, minimal blurbs, and recipient's final say. Asset provenance is recorded in `README.md`.
- **Do** keep external destinations and availability controlled by `site.json`; the website does not itself release the app or enable service.
- **Don't** imply public availability while the coming-soon setting is active, guaranteed scam prevention, verified caller identity, automatic text filtering, or support beyond documented eligible carriers.
- **Don't** apply this website's layout or typography rules to the separate native app.
