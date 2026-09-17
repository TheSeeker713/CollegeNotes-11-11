# Grok Build OAuth protocol attribution

The CollegeNotes Grok device-login adapter is a TypeScript adaptation of the OAuth device authorization protocol in the Apache-2.0-licensed Grok Build source, Copyright 2023–2026 SpaceXAI. The full license is in [grok-build-LICENSE.txt](grok-build-LICENSE.txt). No upstream NOTICE file was present at the reviewed root.

Reviewed upstream revision: `482711333c7195dc16a272777f86086d615e2afb`.

- [Device authorization and polling](https://github.com/xai-org/grok-build/blob/482711333c7195dc16a272777f86086d615e2afb/crates/codegen/xai-grok-login/src/device_code.rs)
- [Public native client configuration](https://github.com/xai-org/grok-build/blob/482711333c7195dc16a272777f86086d615e2afb/crates/codegen/xai-grok-login/src/config.rs)
- [Refresh-token protocol](https://github.com/xai-org/grok-build/blob/482711333c7195dc16a272777f86086d615e2afb/crates/codegen/xai-grok-login/src/oidc/protocol.rs)

The client identifier is public OAuth configuration, not a secret. CollegeNotes identifies itself in the HTTP user agent and explains that xAI's consent page uses the Grok Build client. It does not claim an independently registered CollegeNotes OAuth application or endorsement by xAI. Provider eligibility and consent remain enforced by xAI; this integration does not unlock subscriptions or bypass service limits.

Modifications: native macOS Keychain storage replaces auth.json; every connection has an independent credential ID; only the visible user code and validated HTTPS verification URL reach the UI; strict deadlines, bounded response sizes, cancellation, redacted errors and serialized refresh are added. No CLI home, shared login, API key fallback, arbitrary endpoint override or unverified identity claim is used. Conversation/workspace scopes are omitted because login does not need those tools. No claim of successful live authentication is made by synthetic tests.

The public discovery document at `https://auth.x.ai/.well-known/openid-configuration`, retrieved without authentication on September 17, 2026, advertises device authorization at `/oauth2/device/code`, tokens at `/oauth2/token`, and revocation at `/oauth2/revoke`. CollegeNotes fixes all three to the verified HTTPS issuer and refuses redirects; it does not retrieve arbitrary runtime endpoints from settings. Local sign-out and explicit provider revocation are separate actions. A failed provider revocation clears local access but reports remote revocation as unconfirmed.
