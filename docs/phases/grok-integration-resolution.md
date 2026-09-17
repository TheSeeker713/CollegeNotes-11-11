# Grok account integration resolution

September 17, 2026. Owner instruction: “resolve the integration” (`AUTH-P8-GROK-INTEGRATION`). **The account integration is implemented; Phase 8 as a whole remains in progress.**

CollegeNotes no longer depends on the installed Grok CLI's auth.json for sign-in. The app adapts xAI's published device-authorization protocol and stores its resulting credentials directly in macOS Keychain, under a separate connection ID for every named account. The installed CLI, its configuration and its existing credentials remain untouched.

## What the user does

In Connections, choose xAI / Grok, Account sign-in, and a name. Save the profile, then choose **Sign in with Grok**. Open the official xAI page and enter the displayed temporary code. The provider's consent screen uses the **Grok Build** OAuth client; this is disclosed in the app. A separate CollegeNotes OAuth client registration is not claimed.

Multiple named Grok accounts can be added and selected. Sign-out removes only that profile's locally stored access. **Revoke Grok authorization** explicitly contacts xAI's revocation endpoint, then removes local credentials. If xAI cannot confirm revocation, the app clears local access and tells the user that remote revocation is unconfirmed. xAI controls account eligibility, provider-side authorization semantics and service limits.

## Why this resolves the storage mismatch

The official source separates the OAuth protocol from auth.json persistence and describes displaying device authorization in a TUI/IDE sidebar. Its Apache-2.0 license permits adaptation. CollegeNotes implements that protocol in its local service and replaces file persistence with its native Keychain helper. This is an app integration change, not a modification or security fix to the user's Grok CLI.

The reviewed upstream revision and license are recorded in [third-party attribution](../third-party/grok-build.md). The public discovery document was retrieved without authentication and confirmed the device-code, token, refresh grant and revocation routes. No device code was requested from the live provider and no existing login or API key was read, entered or tested.

## Security and lifecycle behavior

- Fixed HTTPS issuer and endpoints; redirects and untrusted sign-in destinations are rejected. Provider responses are size-limited and requests have a deadline. Provider error bodies never reach logs or the UI.
- Only the temporary human code and verification link reach the browser. Device codes, access tokens and refresh tokens stay in the local service and Keychain. No CLI process, home-directory credential file, API fallback or course-content transmission is involved.
- Scope is limited to the published identity/offline/Grok/API access scopes; conversation and workspace tools are not requested. Token identity claims are not decoded or trusted as application permissions.
- Each account has an independent Keychain reference. Refresh is serialized per account, persists rotated tokens and preserves the previous refresh token when no rotation is returned. Status polling performs no provider request.
- Cancellation waits for in-progress credential saves to finish cleanup. Incomplete saves retain durable cleanup state; after restart they cannot revive an abandoned login. Failed removal remains retryable. Metadata and export paths exclude credentials.
- Native Keychain output is consumed after the helper closes its output stream, avoiding partial-response parsing.

## Verification boundary

The synthetic account tests cover success and restart, two-account isolation, pending/slow polling, denied and expired codes, malformed responses, strict sign-in destinations, cancellation during save, cleanup failure, refresh rotation, revoked/expired credentials, empty revocation responses, remote-revocation failure, metadata/export exclusion and application-route integration. They substitute an in-memory credential store and simulated HTTP; they do not exercise real keys or prove a user's provider entitlement.

The required full non-UI suite is recorded in `.local/verification/phase8/8.1`, with prior runs preserved. Manual UI review, real provider sign-in and real Keychain interaction remain owner work after Phase 8, per the existing testing schedule. The research, tutoring and broader Phase 8 inference work are not represented as complete by this account integration.

## Verified engineering checkpoint

All ten required commands passed: type checks, lint, native Keychain helper compilation, application build, 25 unit tests, 151 integration tests (including 30 Grok-specific synthetic cases), one existing synthetic evaluation, six planning checks, 44 workflow checks and six gate-harness checks. No tests were skipped. The source manifest remained unchanged during the run.

The separate source audit checked token data flow, per-account storage, cancellation/save races, restart recovery, refresh rotation, revocation failure, export exclusion and the distinction between local sign-out and provider revocation. It repaired cancellation cleanup and incomplete-save recovery before the final passing run. This is a Grok integration checkpoint, not the completion checkpoint for all of step 8.1 or Phase 8.
