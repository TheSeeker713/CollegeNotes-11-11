# Foundation contracts and acceptance specification

Subordinate to [PROJECT-PLAN.md](../../PROJECT-PLAN.md); AUTH-REPAIR-0-4 implements foundations only. Full course operations belong to Phase 5, material operations/embeddings to Phase 6, and live connection/research flows to Phase 8. The repaired shell must say what is unavailable rather than simulate these features.

| Entity | Foundation fields and invariants | Required verification |
|---|---|---|
| Course | Identity, name, description, created/updated timestamps, archive and trash timestamps; module settings versioned per course | Empty database; legacy rows retained; archive/trash excluded from active listing; future rename/edit/archive/restore/export/delete preserve isolation |
| Material | Immutable original metadata/checksum; kind; current text revision; trash/deletion state; corrections distinct from original | Legacy original bytes unchanged after upgrade; revision anchors course-scoped; no deleted/stale/cross-course derivative eligible for context |
| Derivative | Course/source ID, source revision, kind, status, index model version | Edit/delete invalidates derivatives; model changes require controlled rebuild; originals never replaced by index data |
| Export/deletion | Item, selection, course or backup request; originals/revisions/manifest/checksums; explicit recoverable/permanent intent | Preview scope, backups separate, resumable cleanup, secrets excluded, failed cleanup visible; full user operations in owner phases |
| Provider | ID, label, independent capabilities, supported API/OAuth methods, model catalog, documentation/data-policy URLs | OpenAI optional; xAI/Anthropic OAuth unverified; no adapter implies live access |
| Connection | ID, provider ID, label, auth method, credential reference, enabled state, capability settings, billing/limit, health and revocation state | Default disabled, capability toggles independent; no implicit paid fallback; unknown credential-store implementation fails closed |
| Capability assignment | Capability plus connection and model selection | Disabled/disconnected/removed connections cannot serve requests; no automatic replacement |
| Credential store | Server-only opaque reference; put/read/remove interface | No browser access, logs, SQLite secret values or exported credential references; synthetic tests are not a Keychain claim |
| OAuth attempt | Bound connection/provider, exact loopback redirect, random state, PKCE, expiry and one-use consumption | Reject wrong origin/path/state, expired/replayed callbacks, error/duplicate parameters; no vendor login performed |
| Research session/source | Course, provider, user query/time, approved private context categories; URL/title/publisher/date/excerpt/claim links/conflicts | Explicit user initiation; retained provenance even after provider removal; web/model text is data; edit/export/delete later |
| Embedding index | Course, model/version/hash, source revision set, local status and rebuild reason | No model download here; invalid/stale/deleted/cross-course items excluded; model-change rebuild is explicit |

Disconnect/removal ordering: block future requests first, cancel or invalidate pending work, remove local credentials, retain an explicit retryable failure if cleanup fails, then remove connection configuration and assignments. Vendor revocation may fail offline; preserve a nonsecret retry record and disclose that remote access was not revoked. Never cascade connection deletion into learning data. Export settings use an allowlist and omit secrets and credential references.

Migration acceptance: create fresh schema; upgrade the real v8 schema with a synthetic course/source/draft/layout/job/session; reopen; preserve all original bytes and IDs; reject future unsupported schemas; transactionally roll back schema changes on failure. Use temporary directories only, never the owner's real database.

Non-UI regression suite: planning validation, workflow rehearsal, build, types, lint, domain/provider unit cases, storage/service/parser integration, and synthetic learning evals. Existing browser and accessibility suites are retained for owner execution but agents must not run them. No missing manual check is reported as passed. Source audit must inspect modified files and assertions separately from test execution.
