# Collaborator setup for Codex

## Confirmed project and current limits

The repository is [tigerisaac/aaacap-project](https://github.com/tigerisaac/aaacap-project). The existing Firebase project is `shield-calls-isaac`. On the owner's Mac the application checkout is `/Users/isaaczhang/Developer/aaacap project`; a ChatGPT project mirror under `.codex/.chatgpt-projects/` is a different folder. On a collaborator's machine, clone the repository into their own directory and open that directory as the Codex project.

Firebase collaborator grants and the dedicated OpenRouter configuration secret have been provisioned and read back for verification. GitHub access remains pending the collaborator's account/invitation; the collaborator must create their own Twilio trial. A deployment from the collaborator's identity has not yet been performed. The specification and FTC benchmark are proposed work. The repository already has a local test suite, a Firebase emulator suite, and a 16-case model smoke evaluation. The FTC families and two-turn benchmark runner still need implementation.

## Agreed access arrangement

| Service | Collaborator access | Owner setup |
|---|---|---|
| GitHub | Their own GitHub account with repository collaboration access | Invite through repository Settings → Collaborators. Personal repositories support email invitations, so the username is not required initially. |
| Firebase / Google Cloud | Their own Google identity, with approved function-development roles in `shield-calls-isaac` | Roles were granted and verified; validate the first actual deployment under the collaborator's login. |
| OpenRouter | The owner's existing inference key, as explicitly requested | Share only the OpenRouter configuration through `SHIELD_COLLABORATOR_OPENROUTER`, then fetch it into an ignored local file. No separate budget or key is created. |
| Twilio | The collaborator's own trial account, verified phone, and trial number | Collaborator completes signup and verification; run the local trial against that account without replacing the owner's hosted webhook. |

Use the collaborator email supplied by the owner when assigning access; keep contact details in access management rather than in source files.

Provisioned project roles: Firebase Viewer, Cloud Functions Developer, Logs Viewer, and Service Usage Consumer. Service Account User was granted on the existing `shield-runtime` and default Compute build identities only. The build identity currently has project Editor privileges; the owner explicitly approved using it. Runtime-secret access is metadata-only for the human collaborator; the dedicated OpenRouter secret grants Secret Accessor. As a deployer, the collaborator can run code using the runtime's permissions and secrets. Project IAM administration and direct Auth/Firestore administration were not separately granted. Use emulators or the authenticated app for normal tests; scripts that directly edit shared records or IAM may still require an owner.

The intended daily experience is: open the repo in Codex, ask it to run checks or improve a benchmark, and use already configured development access. Initial account sign-in and access grants are still necessary. `AGENTS.md` gives Codex project context automatically; it does not transfer the owner's logins or permissions. [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

### GitHub

After the owner invites the collaborator and the invitation is accepted, authenticate GitHub on the collaborator's machine, clone the repo, and open that checkout in Codex. Use feature branches and pull requests for application changes. [GitHub invitations](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository)

### Firebase and runtime credentials

Firebase console membership, backend deployment rights, and permission to read secret values are different capabilities. Select roles after confirming whether the collaborator needs to view logs, edit test data, deploy functions, or retrieve a development secret. Function deployment needs permissions beyond basic Firebase visibility. Grant Secret Manager access at an individual development secret when local retrieval is required. [Firebase permissions](https://firebase.google.com/docs/projects/iam/permissions), [Secret Manager IAM](https://docs.cloud.google.com/secret-manager/docs/access-control)

The committed runtime binds the `SHIELD_RUNTIME` secret to its functions using `defineSecret`. A collaborator can test an already running endpoint without receiving that secret. Deploying code under a secret-enabled runtime identity is nevertheless powerful access: deployed code can read the runtime's secrets. Do not treat deployment access as a way to conceal production credentials from an untrusted deployer. [Firebase secret bindings](https://firebase.google.com/docs/functions/config-env)

Prefer emulators for ordinary development and a separate staging Firebase project for unrestricted iteration. Access to `shield-calls-isaac` can still be granted for agreed shared-trial operations. Changing projects requires adapting the hardcoded project and service-account references in the code and scripts; merely adding a Firebase alias is insufficient.

### OpenRouter

The owner requested reuse of the existing inference key. Its usage and credit limit are shared with the owner's calls; revoking access to Secret Manager does not revoke a key already downloaded. Rotate the shared key if a downloaded copy must be invalidated. No OpenRouter management key is needed. A separate capped key remains an optional future change, not this setup. [OpenRouter key management](https://openrouter.ai/docs/guides/overview/auth/management-api-keys)

After the owner provisions the dedicated secret and grants access, sign in and fetch the configuration without displaying its value:

```sh
npx firebase login
npm run collaborator:setup
npm run collaborator:check
npm run collaborator:check -- --online
```

Setup writes only the four OpenRouter fields to `.env.openrouter` with mode `0600`. It refuses to replace existing files or symlinks. The secret must not contain the owner's Twilio credentials, participant data, or encryption key. Existing configurations can instead use `.env.openrouter.example`. The hosted runtime has its own secret path and does not read this local file.

The offline check prints presence flags only. `--online` additionally checks Firebase project visibility and provider authentication using read-only requests; it makes no inference request, phone call, deployment, or trial-window change. A successful check does not establish model funding or complete deployment permissions.

### Twilio and real calls

Twilio test credentials cannot make real telephone connections or trigger call status callbacks, so they cannot establish the audio, timeout, or private-acceptance requirements. Real call validation needs live credentials and a real development number. Subaccount credentials isolate access to that subaccount's resources, while charges remain on the parent account. [Test credentials](https://www.twilio.com/docs/iam/test-credentials), [Subaccounts](https://www.twilio.com/docs/iam/api/subaccounts)

The shared Firebase trial accepts the owner's configured verified phone and uses a bounded trial window. It remains separate from the collaborator's local phone tests. Firebase project membership does not grant access to the owner's Twilio account.

For the collaborator's own trial:

1. Create a Twilio account and complete its current trial/signup and phone-verification steps personally.
2. Copy `.env.twilio-trial.example` to the ignored `.env.twilio-trial`. Enter the collaborator's account SID, Auth Token, trial number, and verified calling phone privately. Keep `TRIAL_SCREENING_ENABLED=false` for the first connection check.
3. Follow the HTTPS tunnel and inbound webhook instructions in [TWILIO-TRIAL.md](TWILIO-TRIAL.md), using the collaborator's console and local port 3001. Use Twilio speech, the default; no Soniox key is needed.
4. Run `npm run trial:voice`, call the collaborator's trial number, and confirm the synthetic introduction is received. Once OpenRouter configuration works, enable screening in that local configuration and restart the receiver.
5. Run the FTC-inspired synthetic caller situations, record case IDs and outcomes, and keep audio/transcripts private. Stop the listener and tunnel after the session.

The current Voice trial's Custom scenario excludes `<Dial><Number>` and `<Record>`. It can test speech collection and screening, but cannot validate Shield's full private acceptance, bridging, or voicemail flows. Those require a suitable live account and a separately authorized telephone test plan. [Twilio Voice trial](https://www.twilio.com/docs/usage/trials/try-out-voice)

The existing local trial expects an account SID and Auth Token in `.env.twilio-trial`; do not assume an API-key secret can be substituted for the webhook-validation token. Scope credentials to the development environment. The trial's compatibility webhook contains a secret and must never be included in a report or pasted into Codex chat. See [TWILIO-TRIAL.md](TWILIO-TRIAL.md).

## What the collaborator can run

Start with the repository's Node requirement (22.14 or later), install dependencies, and run local checks:

```sh
npm ci
npm run check
```

The Firebase CLI is a pinned development dependency installed by `npm ci`; use `npx firebase` rather than relying on a global install. The helper resolves that local dependency and still uses CLI internal APIs, so upgrades need compatibility checks. For Firestore integration, install the current Java emulator prerequisites, then use:

```sh
npm run test:firebase
```

That script targets the local `demo-shield` emulator project. It does not demonstrate the shared hosted deployment or real call behavior. Follow the [Firebase emulator installation guide](https://firebase.google.com/docs/emulator-suite/install_and_configure) for prerequisites.

With the development OpenRouter key privately configured and model calls authorized:

```sh
npm run eval:model
```

This makes billable requests and writes reports under ignored `artifacts/evaluations/`. It currently evaluates single transcripts, not the new FTC or two-turn suites. Use [caller-evaluation-plan.md](caller-evaluation-plan.md) to extend it.

For local UI/demo work, follow the [root README](../README.md). For controlled phone tests, follow [TWILIO-TRIAL.md](TWILIO-TRIAL.md) and [PHONE-VALIDATION.md](PHONE-VALIDATION.md). The Firebase trial does not implement the full transfer/voicemail service; backend test coverage is not proof that every v1.1 feature can already be exercised by telephone.

## Deployment and remaining setup

- Firebase roles and shared-secret access have been provisioned. GitHub invitation, the collaborator's Google sign-in, their own Twilio trial, and their first deployment/test run remain outstanding. Permissions were verified through owner-side policy reads, not by impersonating the collaborator.
- Deploy only reviewed changes, explicitly targeting `shield-calls-isaac`. Follow [FIREBASE-SERVERLESS-PLAN.md](FIREBASE-SERVERLESS-PLAN.md). Do not run `provision-firebase.mjs` as onboarding: it can rewrite the owner's enrollment and runtime configuration. An existing hosted runtime does not need to be reprovisioned to run local tests.
- `finalize-firebase.mjs` changes service IAM; `activate-cloud-trial.mjs` changes the shared trial window. Neither is a preflight check or routine prerequisite for local phone testing.
- Make the Firebase project and runtime identity selectable without silently defaulting mutations to the shared project.
- Implement the FTC fixtures, reviewed labels, multi-turn evaluation runner, and private result reporting.

Suggested first Codex prompt:

> Read AGENTS.md and docs/COLLABORATOR-SETUP.md. Verify this checkout's upstream, install dependencies, run collaborator:check and the local tests, then help me sign into Firebase and run collaborator:setup without printing secrets. Guide me through creating my own Twilio trial and wiring the local test listener. Report which FTC and multi-turn evaluations are implemented and run those available. Use a feature branch and keep shared deployment changes explicit.

Validation: 95 backend tests, 10 Firebase emulator tests, and 4 onboarding tests passed; type checking and build passed. The portable Firebase adapter authenticated successfully, and secret setup was exercised without printing credentials. Production dependency audit reported zero known vulnerabilities. The pinned Firebase development toolchain reports seven moderate advisories; it is not packaged into the production runtime. No new OpenRouter key, purchase, live phone call, or backend deployment was made by this onboarding work.
