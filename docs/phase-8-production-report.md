# Phase 8 — provider connections, research, and tutoring

September 17, 2026 · CollegeNotes{11:11}

## Delivery status

Phase 8 engineering implementation is complete after ordered non-UI verification. Manual UI/UX acceptance remains deferred by owner instruction until after this phase. No agent browser, accessibility or usability tests were run. Live provider sign-in was not performed; adapters were verified with synthetic contracts only (`CHANGE-P8-BYO`).

MyceliaOS external AI storage was verified before Phase 8 work. Existing OCR/embedding assets are present on the designated volume; no generative model was downloaded.

## What this phase delivers

### 8.1 Bring-your-own connections

Named multi-account profiles, OpenAI and Grok optional account routes, API/local endpoints, Keychain credentials, provider toggles, model/capability/billing/budget settings, tutor/research defaults and credential-free export.

### 8.2 Hybrid local retrieval

Lexical + semantic fusion into bounded tutor context with anchors, requirement/explanation separation, explicit evidence gaps and immutable “imported text is data” policy flags.

### 8.3 Provenance-linked research

User-initiated research with consent, sanitized pages, URL/title/date/excerpt/claim provenance, unsupported-claim recording, cancellation and cross-course isolation.

### 8.4 Structured tutoring

Explain/example/hint/check-understanding turns, session restore, offline cloud block, budget enforcement, idempotent client request IDs and visible separation of source vs model text.

## Verification

Types, lint, build, 25 unit, 160 integration, 1 eval, 6 planning and 44 workflow checks passed on the final run. Dependency audit remained clean. Network-denial embedding/offline cases require host `sandbox-exec` (not the agent sandbox alone).

## Limits

- Synthetic research/tutor replies do not prove live model quality or entitlement.
- Course export import remains Phase 13.
- Packaged macOS delivery remains Phase 14.
- Owner manual testing guide: [phase-8-manual-tests.md](phase-8-manual-tests.md).

Stop before Phase 9.
