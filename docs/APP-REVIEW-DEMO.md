# Shield reviewer demo

Prepared October 26, 2026 for version 1.0.0 build 4. This describes the local
demo implementation; App Store upload, Apple transactions and live carrier
verification are separate release checks.

## Entry

On the welcome screen, choose **Explore demo**. No phone number, verification
code or purchase is needed. The same button is available after signing into
an account that has no connected phone, including the existing reviewer login.

Every demo screen retains **Demo · No live calls**. **Home → About this demo**
and **More → About this demo** explain the limits and link to the features.

## Walkthrough

1. Open **Messages**, then **Appointment message**. Read the summary, choose
   **Listen**, pause, resume and use **Start over**. The bundled voice message
   explicitly identifies itself as fictional. An automated account notice and
   callback message are also available.
2. Open **Calls** and inspect the stopped, connected and message examples.
   **Call ended after a warning** includes a prerecorded spoken warning.
3. Open **More → Settings → Blocked numbers**. Allow the fictional blocked
   number again. The change persists while exploring this demo.
4. Open **More → Settings → Caretakers** to inspect two fictional caretakers,
   change the alert choice, add a fictional contact or remove one. No invitation
   or alert is sent. **About this demo → See a caretaker alert** shows a sample
   inbox event.
5. Open **More → Settings → Checks while you talk**. Change the local demo
   choice and play the sample warning. This does not monitor or end a real call.
6. Choose **More → Leave demo** to return to sign-in. Reentering restores the
   original sample data. Closing and reopening the app also ends the demo.

## Boundaries

The demo is a disposable, on-device session, not a provisioned telephone line.
It uses fictional names and reserved fictional numbers. Its audio comes from
local text-to-speech, not real calls. A request guard prevents demo API calls;
it does not grant a backend entitlement or enable purchasing. Contacts,
forwarding, call-directory state and notification delivery are not changed.

Live service needs a subscription, a supported US carrier and verified phone
setup. The existing reviewer login alone currently has no enrolled phone.
Actual Apple sandbox purchase/restore tests and live call-screening access
remain outstanding. Disclose these limits in App Review notes; do not present
this demo as proof those paths have been tested or as approval to submit.

## Verification record

The five focused Release demo UI methods passed on iPhone Duo / iOS 27.1.
After the native-navigation correction, three Light methods and two Dark
methods passed again; the settled Dark guide capture passed separately. These
checks cover local state/reset, guide navigation and audio-control state. They
are not evidence of audible output quality, Apple transactions or real calls.

The [bounded visual verdict](../.impeccable/review/reviewer-demo-2026-10-26/finish-verdict.md)
resolved the native-tab clipping defect and confirmed settled demo identity
in Light and Dark. Signed build 4 and its App Store export passed packaging,
resource and signature checks. See the release checklist for upload status.
