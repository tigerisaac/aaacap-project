# October 17 iPhone motion review

This refinement retains Shield’s native SwiftUI design system. Fresh independent agents substituted for the unavailable named Impeccable reviewer/documenter roles, using their role contracts. The primary agent implemented the corrections.

## Independent review scope

- The screen reviewer inspected all 126 exported compact captures in 21 contact sheets and the relevant original images. It identified one material SharedContacts finding: the destination in “Remove from iPhone” truncated at maximum text size. A preview-only trusted-contact root title crop was not treated as evidence of the inline pushed route.
- The motion reviewer inspected Quiet hours source, original simulator captures and final normal/Reduce Motion recordings. It rejected an ineffective implicit-animation attempt, then identified a separate one-line/two-line save-action height change. Final disposition: **ship**, scoped to the two listed Quiet hours findings, both **resolved**.
- The screen reviewer scored the contact-action correction **resolved**, with final disposition **ship** at that scope. Both fresh captures show the whole label; XXXL wraps into three readable lines, the full action is above Search, and native semantics remain intact. Normal/XXXL confirmation-cancellation passed on iOS 27. The synthetic contact captures stay in the private audit directory rather than being committed. No reviewer’s bounded fix score is represented as whole-app approval.

## Quiet hours fix scores

| Finding | Final score | Evidence |
| --- | --- | --- |
| Conditional time rows jump during switch motion | Resolved | Keep rows mounted/disabled; From position retained through reversal at standard/XXXL, with Reduce Motion on/off |
| Saved/Save/Saving changes the bottom action and viewport height | Resolved | Native label envelope reserves the tallest variant; hidden sizing content is inaccessible; measured action top edge stays within one point through four-second Saving |

The committed [normal-motion frames](final/quiet-hours-normal.png) and [Reduce Motion frames](final/quiet-hours-reduce-motion.png) are synthetic reference montages from the final recordings. Original videos, per-frame captures, test attachments and source manifests remain in the ignored private audit directory. Montage assembly artifacts were checked against original individual frames; no visual verdict relies on an assembly seam.

## Contact-action fix score

| Finding | Final score | Evidence |
| --- | --- | --- |
| Remove destination truncates at maximum text size | Resolved | Final standard/XXXL captures show the complete title and full target above native Search; edge tap opens the named confirmation and Keep contact returns safely. Independent disposition: ship, scoped to this correction. |

## Remaining screen families

A bounded additional broad-run packet covered states absent from the first compact packet. Independent read-only reviews inspected all 58 account/onboarding/disconnection captures in ten sheets and all 74 setup/handoff/recovery captures in thirteen sheets. Both returned **ship** for those static simulator scopes, with no additional material fixes. The primary agent inspected all 91 remaining daily/recovery captures in sixteen sheets. Native scrolling boundaries were not misclassified as permanent clipping. A Safari capture and a falsely passing initial foreground guard exposed a real nested Form-link interaction, rather than a screenshot artifact. The repaired Link is independently scored below. Stills do not certify continuous motion or real operations.

## Nested privacy-link fix score

| Finding | Final score | Evidence |
| --- | --- | --- |
| Collapsing call-protection privacy also opens Safari | Resolved | The embedded Link uses explicit native borderless style and a full target. Native-button expansion/collapse at standard/XXXL passes settled foreground/page assertions. Four final captures show Shield; independent scoped disposition: ship. |

[Standard collapsed](final/disclosure-collapsed-standard.png) · [Largest text collapsed](final/disclosure-collapsed-large.png) · [Standard expanded](final/disclosure-expanded-within-card-standard.png) · [Largest text expanded](final/disclosure-expanded-within-card-large.png)

## Documentation

After the last source correction, a separate fresh documenter merged only durable code-evidenced component rules into DESIGN.md and its existing sidecar. It retained primitive tokens and the incumbent visual world. Runtime warnings, mirroring artifacts, preview-only headings and test flags were deliberately not canonized.

See [the screen and motion audit](../../../docs/IOS-MOTION-AUDIT.md) for the coverage ledger, dated phone observations, test outcomes and limits. No production deployment or real-call qualification is implied.
