# Phase 8.1 connection engineering receipt

September 17, 2026. AUTH-P8 / CHANGE-P8-BYO. This is the connection step, not Phase 8 completion. Owner sign-in and UI/UX testing remain deferred until after Phase 8.

Named multiple OpenAI and Grok account profiles, optional OpenAI-first onboarding, API/local endpoint profiles, Keychain credential storage, disconnect/removal, provider toggles, model/capability selection, separate tutor/research defaults, billing declarations, optional app budgets and credential-free settings export are implemented. Endpoint changes require credential removal and disable the connection. Changing model/capabilities or disabling a provider invalidates affected defaults. Provider/model access and prices are not inferred from a user-entered identifier or billing choice. Inference and budget enforcement belong to the following research/tutor implementation; saving/enabling configuration makes no request.

OpenAI uses its isolated managed app-server account route. Local logout must confirm loss of access; remote authorization management remains with the provider. Grok uses the published native device flow with per-profile Keychain storage, refresh, cancellation, local sign-out and explicit remote revocation. See [integration details and limits](grok-integration-resolution.md). No credentials were read from existing CLI installations.

## Verification and separate source audit

Ten commands passed: types, lint, native helper compilation, build, 25 unit cases, 155 integration cases, one existing evaluation, six planning checks, 44 workflow cases and six gate-harness cases. No skipped cases; source hashes remained unchanged. Private timestamped evidence: `.local/verification/phase8/8.1/report.json` and preserved prior runs.

After verification, the source audit checked profile isolation, metadata allowlists, error/log handling, endpoint-change protection, cleanup intent, defaults invalidation, disabled-provider behavior and credential-free exports. An earlier test correctly exposed that providers begin disabled; the fixture now explicitly enables the provider, matching the intended user flow. A separate audit added a logout-confirmation safeguard and repeated all checks.

CHK-8.1-01: synthetic account and connection tests cover independent accounts, persistence and removal. CHK-8.1-02: account tests cover sign-out, failed confirmation and Grok revocation. CHK-8.1-03: Grok tests cover expired/denied authorization and refresh failures. CHK-8.1-04: missing account executable, rejected/unavailable operations and unknown limits remain explicit. CHK-8.1-05: tests and source review cover no secret metadata/export/logging, isolated storage and cleanup failures. CHK-8.1-06: no inference or API fallback occurs through authentication/configuration routes.

Synthetic tests do not prove live provider access, real Keychain credential behavior, billing entitlement or model quality. No API keys were entered or tested. No UI/browser/accessibility tests were run. Ordered commit, push and remote confirmation must precede 8.2.
