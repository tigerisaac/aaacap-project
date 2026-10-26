# Shield marketing website

Mode: Persuade. This surface carries Shield's established navy/serif identity. The first viewport introduces the product through the latest App Store artwork, with a short headline and coming-soon action. This document governs `website/` only, not the native app.

## Palette and typography

- Paper `#f7f7f2`; navy `#002664`; primary ink `#10283f`; secondary text `#56616c`; dividers `#d8ddd9`; pale section `#eef0ea`; white `#fff`.
- Georgia/Times serif headings at weight 400, system sans body and controls. No external fonts.
- H1: fluid 42–64px, 1.08 line height, −.035em tracking. Each short phrase stays together. H2: fluid 32–44px, 1.17 line height; H3: 26px. Body: 17px/1.65.
- Navy CTA, white text, 6px corners, minimum height 54px. Hover is `#153d78`. Links and native disclosure use a 3px green `#64873b` focus outline, offset 6px. Text selection is pale green `#cbdcc9` with navy ink.

## First viewport and gallery

The 108px header leads into a paper-colored hero. Headline sits left, short description and CTA right. Below, all five v3 App Store compositions appear in one equal-width row: Home, Calls, Call explanation, Messages, Caretakers. Complete images are preserved with 8px corners, their original 1320:2868 ratio, and no overlays or invented app UI. The chair artwork is removed, including from social metadata.

The wrapper is `min(1280px,100% - 96px)`. Hero top padding is 30px; the headline/action row has `20px 0 48px` padding and a 48px gap. Gallery gap is 18px, with 7px padding for keyboard focus rings. A 12px caption identifies sample activity and the enlarge interaction. Selecting a screenshot opens its 960px-wide WebP in a new tab; labels disclose that behavior.

## Responsive behavior

At ≤1050px, outer gutters become 32px and gallery gaps 12px. At ≤900px, the headline row stacks and the gallery becomes a native horizontal scroll region with 280px columns, scroll snapping, a visible next-image edge, and keyboard focus. The caption adds “Swipe to explore.” No carousel JavaScript or automatic movement.

At ≤700px, gutters become 18px, header 84px, wordmark 130px, H1 46px, and the CTA follows its description. Gallery columns are `min(76vw,290px)`, gaps 14px. Captions stack. At ≤370px, H1 is 40px and the wordmark 112px. Keep all five screenshots reachable; don't hide any based on viewport.

## Supporting sections

Introduction and how-it-works retain two-column desktop grids with 80px gaps, changing to one column on mobile. The pale how-it-works band uses open rows, small line icons, 26px serif subheadings and 16px supporting text. No feature cards or shadows.

The centered release section retains its 72px app icon, coming-soon explanation and support link. A native details/summary disclosure provides carrier, forwarding, subscription and screening limitations. The quiet footer provides Privacy and Support links.

## Behavior and constraints

- A keyboard-visible skip link leads to main content; navigation and text links have 44px minimum height.
- Only desktop hero copy settles upward 12px over 750ms. Reduced motion disables motion and smooth scrolling.
- `site.json` remains the release/link authority. `appStoreLive: false` targets the coming-soon section, not an unavailable listing.
- Artwork source hashes and conversion details live in `assets/app-store/provenance.json`. All app activity is fictional; pictured people are fictional AI models, not customer endorsements.
- No browser JavaScript, external fonts, tracking, backend calls, guaranteed protection claims or unverified carrier promises.
