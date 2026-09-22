# Collaborator setup for Codex

## Confirmed project and current limits

The repository is [tigerisaac/aaacap-project](https://github.com/tigerisaac/aaacap-project). The existing Firebase project is `shield-calls-isaac`. On the owner's Mac the application checkout is `/Users/isaaczhang/Developer/aaacap project`; a ChatGPT project mirror under `.codex/.chatgpt-projects/` is a different folder. On a collaborator's machine, clone the repository into their own directory and open that directory as the Codex project.

This guide documents setup to complete; it does not claim invitations, new keys, or permissions have been provisioned. The specification and FTC benchmark are proposed work. The repository already has a local test suite, a Firebase emulator suite, and a 16-case model smoke evaluation. The FTC families and two-turn benchmark runner still need implementation.

## Recommended access arrangement

| Service | Collaborator access | Owner setup |
|---|---|---|
| GitHub | Their own GitHub account with repository collaboration access | Invite through repository Settings → Collaborators. Personal repositories support email invitations, so the username is not required initially. |
| Firebase / Google Cloud | Their own Google identity; product-specific project roles for the work they perform | Grant project visibility and required development permissions. Grant deployment or data-editing roles deliberately; do not default to project Owner. |
| OpenRouter | A dedicated inference key under the owner's funded account for development evaluations | Give it a finite credit limit and descriptive name. Store it privately in `.env.openrouter` on their machine or a scoped development secret. |
| Twilio | A dedicated development account/subaccount and test number where feasible | Use credentials belonging to that environment; configure consenting test phones and a development webhook. Retain an explicit owner for the existing shared number. |

Use the collaborator email supplied by the owner when assigning access; keep contact details in access management rather than in source files.

The intended daily experience is: open the repo in Codex, ask it to run checks or improve a benchmark, and use already configured development access. Initial account sign-in and access grants are still necessary. `AGENTS.md` gives Codex project context automatically; it does not transfer the owner's logins or permissions. [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

### GitHub

After the owner invites the collaborator and the invitation is accepted, authenticate GitHub on the collaborator's machine, clone the repo, and open that checkout in Codex. Use feature branches and pull requests for application changes. [GitHub invitations](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository)

### Firebase and runtime credentials

Firebase console membership, backend deployment rights, and permission to read secret values are different capabilities. Select roles after confirming whether the collaborator needs to view logs, edit test data, deploy functions, or retrieve a development secret. Function deployment needs permissions beyond basic Firebase visibility. Grant Secret Manager access at an individual development secret when local retrieval is required. [Firebase permissions](https://firebase.google.com/docs/projects/iam/permissions), [Secret Manager IAM](https://docs.cloud.google.com/secret-manager/docs/access-control)

The committed runtime binds the `SHIELD_RUNTIME` secret to its functions using `defineSecret`. A collaborator can test an already running endpoint without receiving that secret. Deploying code under a secret-enabled runtime identity is nevertheless powerful access: deployed code can read the runtime's secrets. Do not treat deployment access as a way to conceal production credentials from an untrusted deployer. [Firebase secret bindings](https://firebase.google.com/docs/functions/config-env)

Prefer emulators for ordinary development and a separate staging Firebase project for unrestricted iteration. Access to `shield-calls-isaac` can still be granted for agreed shared-trial operations. Changing projects requires adapting the hardcoded project and service-account references in the code and scripts; merely adding a Firebase alias is insufficient.

### OpenRouter

Use a separate development inference key funded by the owner's account so access can be capped and revoked independently. Do not share an account-management key. OpenRouter supports per-key credit limits. [OpenRouter key management](https://openrouter.ai/docs/guides/overview/auth/management-api-keys)

The existing `.env.openrouter.example` names the required variables. Copy it to the ignored `.env.openrouter`, enter the development key privately, and restrict file permissions. Keep the explicit model configuration consistent with the benchmark run. The hosted Firebase runtime already has its own secret path; it does not automatically read this local file.

### Twilio and real calls

Twilio test credentials cannot make real telephone connections or trigger call status callbacks, so they cannot establish the audio, timeout, or private-acceptance requirements. Real call validation needs live credentials and a real development number. Subaccount credentials isolate access to that subaccount's resources, while charges remain on the parent account. [Test credentials](https://www.twilio.com/docs/iam/test-credentials), [Subaccounts](https://www.twilio.com/docs/iam/api/subaccounts)

The current shared Firebase trial accepts the configured verified phone and uses a bounded trial window. Aarav's phone must be explicitly configured and verified as required by the account before he can call it successfully; repository or Firebase access does not do that. Do not replace the shared caller or webhook as an incidental setup step. Prefer a separate test configuration for concurrent work.

The existing local trial expects an account SID and Auth Token in `.env.twilio-trial`; do not assume an API-key secret can be substituted for the webhook-validation token. Scope credentials to the development environment. The trial's compatibility webhook contains a secret and must never be included in a report or pasted into Codex chat. See [TWILIO-TRIAL.md](TWILIO-TRIAL.md).

## What the collaborator can run

Start with the repository's Node requirement (22.14 or later), install dependencies, and run local checks:

```sh
npm ci
npm run check
```

For Firestore integration, install the Firebase CLI and its current emulator prerequisites, then use:

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

## Remaining work for seamless onboarding

- Replace the owner-specific `/opt/homebrew/lib/node_modules/firebase-tools/package.json` dependency in `scripts/firebase-client.mjs` with a portable, supported authentication/client setup. Until then, the hosted helper scripts are not portable onboarding commands.
- Make the Firebase project and runtime identity selectable without silently defaulting mutations to the shared project.
- Provision the collaborator's access, development inference key, and agreed Twilio test configuration. Record resource names and owners without secret values.
- Add a preflight command that reports only credential presence, selected project/account, and connectivity; it must not dump credentials or activate a trial window.
- Implement the FTC fixtures, reviewed labels, multi-turn evaluation runner, and private result reporting.

Suggested first Codex prompt:

> Read AGENTS.md and docs/COLLABORATOR-SETUP.md. Verify this checkout's upstream, inspect the current scripts, and run the local checks. Tell me which development access is missing without printing secrets. Then implement the next unmet caller-evaluation milestone on a feature branch. Keep shared deployment changes separate from local tests.

References were checked while preparing this guide. No provider access grants, key creation, purchases, live calls, or deployment changes were performed by this documentation update.
