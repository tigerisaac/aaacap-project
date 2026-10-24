# App Store screenshots — October 24, 2026

Captured with `scripts/capture-app-store-screenshots.sh` on the iPhone 17 Pro Max simulator (iOS 26.5), light mode, status bar fixed at 9:41, simulator muted. Source: main at 50be3bf plus the uncommitted October 24 changes (contact-removal fix, version 1.0.0). Every frame is the Debug build's offline sample mode: the "Sample app" tag is visible and all phone numbers are fictional 555-01XX numbers. No account, call or service was involved.

| File | Screen | Size |
|---|---|---|
| `iphone-6.9/01-home.png` | Home: calls stopped, messages, recent calls | 1320 × 2868 |
| `iphone-6.9/02-calls.png` | Calls: stopped, answered and saved calls | 1320 × 2868 |
| `iphone-6.9/03-messages.png` | Messages: saved notices and voicemail | 1320 × 2868 |
| `iphone-6.9/04-caretakers.png` | Caretakers: alerts without call access | 1320 × 2868 |
| `iphone-6.9/05-call-protection.png` | Checks while you talk (connected-call protection) | 1320 × 2868 |

Rejected: the sample call detail (its fixture text reads "Synthetic audio for checking pause and resume") and Phone setup (a placeholder in sample mode). The first Calls capture caught a transient Dynamic Island and was retaken.

These are honest but plain. Recapture after the owner decides on Andrew's design branch, and consider a Check screen and a stopped-call explanation, which need a UI-test-driven capture.
