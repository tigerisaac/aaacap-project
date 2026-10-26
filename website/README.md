# Shield website

A small, static marketing website. No browser JavaScript, trackers, external fonts, dependencies or backend access.

## Local preview

From this directory, run `npm run dev` and open http://127.0.0.1:4173. Restart after editing source files. `npm run build` emits only public website files to `dist/`.

## Vercel

Live: **https://shield-call-protection.vercel.app**. Project: `shield-call-protection` in `tigerisaacs-projects`, connected to `tigerisaac/aaacap-project`, production branch `main`, **Root Directory** `website`, framework **Other**. The checked-in `vercel.json` supplies the build command (`npm run build`) and output directory (`dist`). No environment variables or secrets are required. GitHub pushes trigger Vercel deployments. Do not deploy the repository root or the Firebase application as this website.

First production deployment verified October 25, 2026 (Central): `dpl_J8CNXzGYAEsw3Np6ZXpQfm9nRkK5`, source `e99ec33d149683a1e63319039dd382160c563e75`. The public homepage, CSS and photograph return HTTP 200; source-only `site.json` and `package.json` return 404. The homepage serves the configured security headers and coming-soon state. No Firebase service or app-release setting changed.

## App Store release

`site.json` is the single source for external links. `appStoreLive` remains `false` at the owner's request until the app is publicly released. The CTA opens the coming-soon section, with a working support link. After independently confirming App Store availability, set `appStoreLive` to `true` and push to `main`. The build then enables the known App Store destination and changes both CTAs, the release copy, and search/social descriptions. This website setting does not release the app or enable the service.

## Asset provenance

The photograph is an optimized copy of Shield's existing `ios/Shield/Resources/Assets.xcassets/PaywallCalm.imageset/PaywallCalm.png`; its exact generation prompt is recorded in `ios/Shield/Resources/PaywallCalm.provenance.json`. The wordmark and icon are derivatives of the owner-selected identity in `artwork/identity/manifest.json`. No customer data, call audio or transcripts are included.

## Content boundary

Copy follows `docs/APP-STORE-LISTING.md`. The website does not claim guaranteed scam prevention, verified caller identity, public availability, automatic text filtering or support for unverified carriers. Existing Firebase privacy/support pages remain the policy and support destinations.

## Verification — October 25, 2026

Desktop (1440px) and mobile (390px) were visually reviewed; 320px also passed an overflow check. Both release states build correctly, and the privacy/support URLs return HTTP 200. Independent design review: ship. `npm run check` passed 401 unit tests plus typecheck/build. The required Firestore suite passed 326 tests using separate local emulator ports and `METADATA_SERVER_DETECTION=none`. These checks do not establish live Vercel deployment, App Store release, or real-call behavior.
