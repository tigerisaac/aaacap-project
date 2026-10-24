# Dependency security — October 18, 2026

**October 24 update.** CI on `bc212a3` failed its production audit gate: advisories published after October 18 affect five runtime packages. Fixed in source with patch and minor updates only, lockfile regenerated with npm 11.4.2: `fastify` 5.12.5 → **5.12.7** and `zod` 4.6.5 → **4.6.7** (both pinned in `package.json`), plus in-range transitive updates `undici` 6.28.1 → 6.29.1 (via `openai`), `body-parser` 2.3.0 → 2.4.0, `fast-uri` 4.2.1 → 4.2.3 and 3.1.8 → 3.1.9, and `qs` 6.16.0 → 6.16.1. The production audit is back to **zero**; the `gaxios@6` → UUID 11.1.1 override is unchanged and `npm ci` accepts the lockfile. **Not deployed:** serving functions and the bridge still run the older packages until a scoped, approved rollout.

The root dependency audit initially reports **18 affected packages: nine high and nine moderate**. All affected lockfile nodes are development dependencies. A separate production-only audit reports **zero known vulnerabilities**. The passing caretaker CI retained these warnings; passing tests did not clear them.

The scoped update pins `firebase-tools` from 15.10.1 to **15.34.0** and refreshes compatible development dependencies, including MCP SDK 1.32.1, source-map-js 1.2.2 and optional RE2 1.27.0. The final audit reports **five affected development packages: three high and two moderate**, representing the two advisory chains below. Production-only audit remains zero. This is a dated registry result, not proof that a package has no defects.

All **339 production or optional lock entries** retain their versions, integrity values and dependency edges. Only development/optional classification changes for `p-limit`, `undici` and `yocto-queue`. Runtime dependency declarations and the existing scoped `gaxios@6` → UUID 11.1.1 override are unchanged. No iOS source, production code, frozen rollout package, live service or deployment configuration changes in this checkpoint.

## Remaining findings

| Advisory chain | Current evidence | Remaining work |
|---|---|---|
| `firebase-tools` → `chokidar` 3.6.0 → `braces` 3.0.3 | High-severity recursive-pattern denial of service; no patched braces release is published in the checked registry. The inspected Firestore emulator passes the repository's rules-file path to its watcher. | Retain the finding. Do not accept untrusted watch patterns as safe merely because these tests use a fixed local path. Review an upstream fix or compatible watcher replacement before expanding tooling exposure. |
| `firebase-tools` → `@google-cloud/pubsub` 5.3.1 → `@opentelemetry/core` 1.30.1 | Moderate-severity baggage-header allocation issue. The inspected Pub/Sub tracing module instantiates the trace-context propagator; no baggage-propagator reference was found in the CLI or Pub/Sub source searched. The published fix is in core 2.8.0. | Retain the dependency finding. A major-version override across the tracing stack was not applied without compatibility evidence. Recheck the parent library's supported update; this bounded source search does not prove every tooling path unreachable. |

The audit's three high counts include the affected parent packages, not three independently established exploits. These packages are outside the checked production dependency set. Their presence is still tracked rather than suppressed or hidden with an audit threshold.

## Toolchain and verification boundary

Local verification uses the already-installed **Node 22.23.1 / npm 11.4.2** through task-local executable links; no system installation is changed. npm 11.4.2 is now the minimum declared package-manager version. CI uses Node 24 and additionally fails on moderate-or-higher production audit findings.

The isolated candidate exposed two resolution problems before application: older Node omitted the newer optional RE2 binding, and npm 10.9.2/10.9.8 replaced the existing UUID override with vulnerable UUID 9.0.1. An attempted manual lock correction failed clean installation and was rejected. Regenerating with the compatible installed Node/npm combination retains RE2 1.27.0 and UUID 11.1.1 and passes a clean install. Those intermediate logs remain private evidence; their lower audit counts are not accepted results.

Both the isolated candidate and application checkout install cleanly with lifecycle scripts disabled. The existing Firebase adapter retains its required interfaces. A single authenticated, masked GET of an operational health record returned 200 through the unchanged adapter with the new CLI; no project setting, worker or message was changed. This checks the adapter's read path, not a production deployment or every CLI command.

Final local typecheck/build and **382 unit + 284 Firestore + 12 account checks** pass. The Firestore suite uses isolated loopback ports with the same rules/indexes; the account suite retains its dedicated demo project and synthetic verification. All 580 pinned source inputs match after verification. First-attempt [independent CI for `655ce76`](https://github.com/tigerisaac/aaacap-project/actions/runs/39159513148) also passes all three suites and the new production audit gate, with the same counts. Its receipt retains fourteen metadata-probe warnings, three deprecation warnings, three install-script approval warnings and the five development findings. Exact outcomes and file/log hashes are recorded in [the verification manifest](../.impeccable/review/release-2026-10-18/dependency-security/verification.json). Remaining `node-domexception`, `json-ptr` and `glob` deprecation warnings are retained. A separate read-only follow-up audits copies of the retained runtime locks: all fifteen function candidate/baseline pairs share the same lock and report zero known vulnerabilities, and the inherited bridge smoke lock also reports zero. Their hashes and audit responses are retained. This does not re-download serving images, inspect operating-system packages, build the proposed bridge or audit the final Apple distribution archive; those final artifact boundaries remain open.

## Primary references

- [Firebase CLI 15.34.0 release](https://github.com/firebase/firebase-tools/releases/tag/v15.34.0): removes unused dependency paths and includes CLI correctness fixes.
- [MCP SDK OAuth advisory](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-6qxp-vccf-f47h): patched in SDK 1.31.0; the new lock resolves 1.32.1.
- [source-map-js 1.2.2 release](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2) and [RE2 1.27.0 release](https://github.com/uhop/node-re2/releases/tag/1.27.0).
- [Braces upstream issue](https://github.com/micromatch/braces/issues/70): the recursive-pattern finding and maintainer discussion; no patched release was available in the checked registry.
- [OpenTelemetry advisory](https://github.com/open-telemetry/opentelemetry-js/security/advisories/GHSA-8988-4f7v-96qf): affected baggage extraction, impact limits and the 2.8.0 fix.
