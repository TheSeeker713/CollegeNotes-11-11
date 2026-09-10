# Provider-neutral foundation

Subordinate to [PROJECT-PLAN.md](../../PROJECT-PLAN.md). Definitions separate provider identity, authentication evidence, model/capability selection and connection state. Catalog capabilities are planned adapter surfaces, not verified account entitlements; every catalog adapter is unimplemented and every new connection disabled.

The credential-store interface is server-only. Its production placeholder fails closed; no Keychain integration is claimed. OAuthAttempt tests loopback/state/PKCE/expiry/replay boundaries without creating a callback listener or logging in. Real auth, vendor revocation, cancellation and paid accounting remain Phase 8. No SDK or dependency added.

Connection summaries use allowlists. Request eligibility never selects fallback providers; it blocks absent adapters, credentials, model/capability selection, unknown billing and unapproved paid usage. Callers must reserve actual metered cost atomically when live requests are implemented.
