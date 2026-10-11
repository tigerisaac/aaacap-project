# Carriers

Researched October 10, 2026, from carrier support pages. **Nothing here has been tested on a real line except Tello's code registration.** Today Shield supports only Tello. The codes are hardcoded in `backend/src/cloud/forwarding-api.ts`, the reset codes in `ForwardingRestoreView.swift`, and "Tello" appears on 25 lines across 12 iOS files.

Each claim below is marked:
- **Documented:** the carrier's own support page says so.
- **Secondhand:** third-party guides or community posts only.
- **Verified:** tested on a real line, with the date.

## What Shield needs from a carrier

Shield works only when the carrier forwards these calls to the person's Shield number and keeps ringing their phone for everything else:
- **Rejected or busy calls.** This is the important one. Apple says *Screen Unknown Callers → Silence* "sends them to voicemail". On the network that's expected to look like a rejected call, which carriers forward under the busy condition; Tello's page calls its busy code "Busy (Rejected Calls)". This hasn't been confirmed on a real forwarded call yet.
- **Unanswered calls.** Contacts the person misses, and Shield's own offer calls when they aren't picked up.
- **Unreachable calls** (phone off or no signal). Useful, but not essential.

**Unconditional forwarding is never usable.** It sends contacts to Shield too. Worse, when Shield calls the person to offer a call, that call is forwarded straight back to Shield.

## Network families

US carriers fall into three groups, plus brands that can't be supported. Codes are set per network, so a prepaid brand usually behaves like the network it runs on.

### T-Mobile network: standard 3GPP codes

Covers T-Mobile, Metro by T-Mobile, Mint, Tello, and lines from multi-network brands that run on a T-Mobile SIM. UScellular customers are also moving onto T-Mobile.

| Purpose | Code | Source |
|---|---|---|
| No answer | `**61*1NNNNNNNNNN#` | Documented: T-Mobile, Mint, Tello |
| No answer with a ring time (5–30 s) | `**61*1NNNNNNNNNN**30#` | Documented: T-Mobile |
| Busy or rejected | `**67*1NNNNNNNNNN#` | Documented: T-Mobile, Mint, Tello |
| Unreachable | `**62*1NNNNNNNNNN#` | Documented: T-Mobile, Mint, Tello |
| Reset all forwarding to default (voicemail) | `##004#` | Documented: T-Mobile |
| Check status | `*#61#`, `*#67#`, `*#62#` | Secondhand |

- **Success looks like** an on-screen message. On Tello it was "Setting Registration Succeeded".
- **Wi‑Fi Calling can block codes.** T-Mobile's voicemail troubleshooting page says to turn Wi‑Fi Calling off when resetting forwarding.
- **Tello needs data.** Tello requires a plan that includes data before forwarding works.
- **Forwarded minutes count.** On Tello, forwarded minutes come out of the plan or the pay-as-you-go balance.
- **Verified (October 10):** Tello returned registration success for all three codes. No forwarded call has been confirmed end to end.

### AT&T network: the same codes, undocumented

Covers AT&T, AT&T Prepaid, Cricket, and lines on an AT&T SIM from multi-network brands. Consumer Cellular uses AT&T or T-Mobile depending on the SIM.

- **Codes.** AT&T doesn't publish the conditional codes. Its wireless page says forwarding is set on the phone and "can't be managed online". Third-party guides list the same `**61`, `**67` and `**62` codes. These are 3GPP-standard, so they're expected to work, but that's secondhand.
- **Voicemail.** AT&T documents that call forwarding "overrides your wireless voicemail."
- **Restoration is the riskiest unknown.** I found no AT&T documentation that `##61#` or `##004#` brings carrier voicemail back. Secondhand reports suggest it can leave a line with no voicemail until someone calls 611.
- **Forwarding caps in the terms:** 750 forwarded minutes a month on AT&T Prepaid and 1,000 on Cricket. Both are far above Shield's expected use.
- **Long distance.** AT&T says calls forwarded outside the home calling area may incur long-distance charges.

### Verizon network: one code covers busy and no answer

Covers Verizon (postpaid and prepaid), Visible, Total Wireless, Spectrum Mobile, Xfinity Mobile and Lively. Straight Talk and Tracfone lines on a Verizon SIM belong here too.

| Purpose | Code | Source |
|---|---|---|
| Busy or no answer after "three or four rings" | `*71NNNNNNNNNN` (10 digits) | Documented: Verizon, Spectrum, Xfinity |
| Turn off; voicemail resumes | `*73` | Documented: Verizon, Spectrum, Xfinity |
| Unreachable | No separate code | Not documented |
| Check status | None | Not documented |

- **Plans.** Verizon says call forwarding is "available on all plans."
- **Charges.** Without unlimited minutes, forwarded calls are billed by the plan.
- **No success message.** Verizon says the confirmation tone "may sound like a busy signal". There's no on-screen message, so setup copy must say exactly that.
- **Coverage needed.** Forwarding can't be set up outside Verizon coverage.
- **Alternative to codes.** Spectrum Mobile can also set this in the My Spectrum app (Call Forwarding → "Busy Line & Missed Calls"), but only the account holder can. Verizon's articles disagree about whether My Verizon can.
- **Restoration is simple.** `*73` turns forwarding off. Spectrum's page says forwarding is what stops unanswered calls reaching voicemail, so turning it off should bring voicemail back.
- **Unknown: rejected calls.** It isn't confirmed that a call silenced by iOS triggers `*71`. Verizon's main article says busy. Xfinity's page and some guides describe `*71` as no-answer only, and a few mention `*90` for busy. **Test this before the first Verizon-family user.**
- **Ring time can't be changed.** It's fixed at three or four rings, roughly 18–24 seconds.
- **Brand pages differ.** Straight Talk's own pages document only `*72`/`*73` and say forwarding is "only available in select areas and on select handsets". Lively runs on Verizon and accepts unlocked iPhones on iOS 17 or later, but publishes no forwarding codes.

### Not supported

| Carrier | Why |
|---|---|
| Google Fi | It sets forwarding only in the Fi app or website. The options are "Ring all numbers" (simultaneous ring) and "Always forward" (unconditional), with no busy or no-answer option. Documented. |
| Boost Mobile | It documents only `*72` (all calls) and `*720`. A Boost representative said conditional forwarding isn't available. Community knowledge base. |

The person's iPhone *Call Forwarding* switch is unconditional only on every carrier, so setup must keep it off.

## Which carriers matter for the pilot

The area AAACAP serves (around Austin) is Spectrum's cable territory, so Spectrum Mobile is likely to come up. Xfinity mostly isn't present there. Older adults often use Consumer Cellular, Lively, the Big Three's 55+ plans, and Straight Talk or Total from Walmart. Those all fall into the three families above, so **three code paths cover almost everyone, and only Google Fi and Boost are excluded.**

## What else changes when forwarding is on

These apply on every carrier, and affect real users more than the codes do.

1. **Voicemail moves into Shield, including messages from contacts.** Every carrier says forwarding replaces carrier voicemail. A missed call from family now leaves its message in the Shield app, not in Phone's Voicemail tab. The backend reports `notificationsAvailable: false` (`backend/src/cloud/api.ts`), so nothing tells the person a message arrived. Before real users, add push notifications for new voicemails, or at least say this plainly during setup.
2. **Callers without a +1 number are hung up with no voicemail.** `forwarding-voice.ts` rejects any `From` that isn't `+1` and ten digits. That includes:
   - blocked or private caller ID, which clinics, hospitals and pharmacies often use
   - international family

   iOS silences these callers, the carrier forwards them, and Shield hangs up. Before Shield, they'd have reached carrier voicemail.

   **Fixed and deployed October 11:** these callers are now screened like anyone else, and history shows "No caller ID". One supervised call will show what Telnyx puts in `From` for a withheld number.
3. **Shield's offer can be cut short by the carrier's ring time.** Shield rings the person for 20 seconds (`<Dial timeout: 20>`). If the carrier forwards unanswered calls sooner, the offer bounces back to the Shield number. The loop guard then hangs up, so the person has less time to pick up. Seniors answer slowly, so two fixes help:
   - **T-Mobile and AT&T lines:** add the 30-second ring time to the no-answer code (`**61*1N**30#`). This also gives contacts longer to ring.
   - **Verizon-family lines:** keep the offer under about 18 seconds.

   Consider TeXML `<Reject>` instead of `<Hangup>` for loop and invalid calls. Telnyx documents that `<Reject>` as the first verb "will prevent the call from being answered", so a bounced offer would read as busy rather than answered.
4. **Plans that charge by the minute count minutes twice.** The carrier bills the forwarded leg as airtime, and Shield's offer is a second incoming call. A connected 10-minute call can use about 20 plan minutes. That matters for Tello pay-as-you-go, minute-based Tracfone plans and some Lively or Consumer Cellular plans. Ask about the plan during setup.
5. **iPhone details staff should check:**
   - **Unknown callers:** *Screen Unknown Callers* must be **Silence**, not *Ask Reason for Calling*.
   - **Live Voicemail:** must be off, or the iPhone answers before forwarding.
   - **Two lines:** with two lines, dial codes from the right line.
   - **Signal:** dial codes with cellular bars showing.
   - **When Apple stops screening:** while roaming, and for 24 hours after an emergency call. Unknown callers then ring normally, which is harmless.
6. **Carrier spam blocking helps.** T-Mobile Scam Shield, Verizon Call Filter and AT&T ActiveArmor block calls before they reach the phone, so Shield never pays to screen them. Leave them on.

## Recommendations, in order

### Before the first real user

1. **Carrier table in the backend.** Each entry has a brand, a network family, activation codes, reset codes, success-message copy, ring-time support and `verifiedAt`.
   - `/api/forwarding` returns the person's carrier, codes and reset codes.
   - iOS stops hardcoding Tello and `##61#`/`##67#`/`##62#`. The existing `SetupStatus.CarrierProfile` shape already fits; the API sends it as null today.
   - Verizon-family setup is one code instead of three.
2. **Carrier choice in setup.** List brands and map each to a family. Multi-network brands (Straight Talk, Total, Tracfone, Consumer Cellular) need the SIM's network, so staff confirm it. iOS can't read the carrier: `CTCarrier` is deprecated and returns placeholders. Google Fi and Boost get a clear "not available yet" screen before any code.
3. **Restoration by family:**
   - **T-Mobile network:** `##004#`. Check whether today's Tello reset (`##61#`/`##67#`/`##62#`) actually brings voicemail back. A normal call and voicemail after restoration have never been verified.
   - **AT&T network:** before setup, staff record what `*#61#`, `*#67#` and `*#62#` show; a screenshot is fine. Restore by registering those numbers again. The fallback is 611.
   - **Verizon family:** `*73`.
4. **Check that a silenced call really reaches Shield.** Today's forwarding check calls from the Shield number, which is a saved contact. That only tests the no-answer path. Unknown callers take the rejected (busy) path. Add a check that calls from a second, unsaved Telnyx number (about $1 a month, shared by everyone). It proves four things for each person's own line, whatever the brand:
   - Silence is on
   - Live Voicemail is off
   - the busy code took effect
   - caller ID survives forwarding

   It's the main thing that makes rollout across carriers safe.
5. **Voicemail for callers without a +1 number, and voicemail notifications** (items 1–2 above).

### Soon after

6. Add the 30-second ring time to the T-Mobile and AT&T no-answer codes, and size the offer timeout per family. Look at `<Reject>` for loop calls.
7. **Copy for each family:** what success looks like, a Wi‑Fi Calling hint when codes fail, choosing the line on a two-line phone, and a warning for plans that charge by the minute.
8. **Staff fallback for Verizon-family lines:** the account holder can set "Busy Line & Missed Calls" in the My Spectrum app, or call the carrier.

### Verifying a family

The plan says to add a carrier only after one supervised test on a real line. A prepaid eSIM in a spare iPhone does this cheaply:
- **Verizon family:** Visible or Total
- **AT&T family:** Cricket or AT&T Prepaid
- **T-Mobile:** Tello, already in use

For each one, run setup, the two forwarding checks, an ordinary call and voicemail, then restoration. Confirm ordinary voicemail works again before marking the family verified.

Each person's own forwarding checks then verify their line, whatever the brand. So most brands don't need separate sign-off, only their network family.

The owner runs or approves every one of these steps. None of it is automated, and Shield never calls the owner's phones.

## Sources

- **T-Mobile:**
  - [self-service short codes](https://www.t-mobile.com/support/plans-features/self-service-short-codes) (`**61`, `**62`, `**67`, ring time, `##004#`)
  - [voicemail troubleshooting](https://www.t-mobile.com/support/devices/device-troubleshooting/voicemail-troubleshooting) (`##004#`, Wi‑Fi Calling)
- **Tello:**
  - [call forwarding](https://tello.com/help_center/service-issues-troubleshooting/how-can-i-set-up-call-forwarding) (codes, "Busy (Rejected Calls)", data plan, minutes)
  - [voicemail](https://tello.com/help_center/device-settings/how-do-i-set-up-access-my-voicemail)
- **Mint Mobile:** [call forwarding](https://www.mintmobile.com/help/how-to-turn-on-off-call-forwarding/)
- **AT&T:** [call forwarding for wireless](https://www.att.com/support/article/wireless/KM1011513/) (overrides voicemail, set on the phone only, billing)
- **Verizon:**
  - [call forwarding FAQs](https://www.verizon.com/support/call-forwarding-faqs/)
  - [call forwarding article](https://www.verizon.com/articles/call-forwarding-everything-you-need-to-know/) (`*71` busy or no answer, `*73`)
- **Spectrum Mobile:** [call forwarding](https://www.spectrum.net/support/mobile/spectrum-mobile-call-forwarding)
- **Xfinity Mobile:** [call forwarding](https://www.xfinity.com/support/articles/how-to-use-call-forwarding)
- **Google Fi:** [call forwarding](https://support.google.com/fi/answer/6201380)
- **Boost Mobile:** [activating call forwarding](https://community.boostmobile.com/t5/Plans-and-Services-Knowledge/How-do-I-activate-Call-Forwarding/ta-p/10417)
- **Straight Talk:** [call forwarding knowledge base](https://support.straighttalk.com/en/brands/Apple/STAPI7C/faq/1647737/)
- **Lively:** [bring your own phone](https://shop.lively.com/collections/bring-your-own-phone)
- **Apple:** [manage unknown callers](https://support.apple.com/111106)
- **Telnyx:** [TeXML `<Reject>`](https://developers.telnyx.com/docs/voice/programmable-voice/texml-verbs/reject)
