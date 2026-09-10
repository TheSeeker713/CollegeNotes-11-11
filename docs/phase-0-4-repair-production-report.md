# CollegeNotes — Phase 0–4 repair production report

September 10, 2026 · implementation candidate **86d27aaceef689f6747924203fb1165961a6456d**

The authorized repair implementation through Phase 4 is finished and pushed. Engineering verification passes for the candidate described below. **Owner design/UI/UX acceptance is pending; Phase 5 has not started.** This is a report on the repaired foundation, not a declaration that the complete product is ready for production use.

## Authority and scope

The full PROJECT-PLAN.md, repository AGENTS.md and agent guides, project state/approval records, applicable manifests, latest receipts and Phase 0–4 impact plan were read. The owner's numbered instruction authorized the repair pass through Phases 0–4, a production report in docs, user-only UI/UX testing and a stop before Phase 5 until green light. The owner's subsequent “yes do it, do not ask again” authorized pushes to the existing repository.

These decisions are recorded as AUTH-REPAIR-0-4 and AUTH-REPAIR-PUSH. Earlier planning-only restrictions remain historical. PROJECT-PLAN.md and the impact plan are byte-for-byte unchanged from the supplied baseline commit; no agent-authored change to official scope, providers, phase boundaries, privacy or acceptance criteria was made.

## Repair results by phase

| Phase | Repair delivered | Status |
|---|---|---|
| 0 | Existing requirement IDs retained and rewritten as a subordinate projection of the official plan; empty courses, complete material lifecycle, removable provider system, provenance and owner authority made explicit; provider documentation rechecked | Implemented and checkpointed |
| 1 | Agent entry points reconciled; obsolete class-policy instructions removed; older manifests marked historical/subordinate; neutral entity, export/deletion, provider-removal and isolation acceptance specifications added | Implemented and checkpointed |
| 2 | Fifteen-state desktop design gallery covering course/material lifecycles, authentication, provider controls, billing/removal, research/provenance and recovery; existing Botanical/Brutalist Light/Dark styling retained | Candidate delivered; owner review pending |
| 3 | Provider/auth/capability/model/billing/health contracts; unavailable credential-store boundary; synthetic OAuth callback protections; source-hashed non-UI verification runner | Implemented and checkpointed; no live account claim |
| 4 | Forward-only schema migration, lifecycle/provenance/index contracts, connection registry, cleanup coordination, foundation routes, service protections and local startup/recovery fixes | Implementation checkpointed; owner UI/UX acceptance pending |

Repair artifacts are recorded in docs/phases/repair-0.md through repair-4.md and docs/phases/repair-0-4.json. The latter scopes this repair pass; it does not authorize future feature phases.

## Product and design alignment

Application/package source contains no embedded COMM 110, PQP or Presentation-class content or policy. A fresh database contains no courses, materials, registered providers or connected accounts. Courses still start with a name entered by the user. The revised course list allows opening another user-created course without assuming a subject.

The design candidate is docs/design/repair/index.html, with its state specification in states.json. It covers import and cancellation, correction without original mutation, export scope, recoverable/permanent deletion, backup disclosure, derivative cleanup, provider/API/verified-account choices, independent capability controls, model/default choices, costs, limits, disconnect/removal failures, research consent and evidence provenance. All examples are explicitly synthetic. Only gallery navigation, theme/mode selectors and disclosure panels are interactive.

The 35 private image references remain untouched and gitignored. No images were generated, browser automation performed, rendered layouts inspected or UI/UX tests conducted by an agent. Visual quality, keyboard usability, VoiceOver behavior, desktop resizing and 200% zoom require owner review. Historical design acceptance was not reused to accept this new candidate.

## Phase 4 data foundation

Migration **9** appends to the original eight migrations; those eight remain byte-identical. Migration execution is transactional and rejects future or noncontiguous schema histories. A failed migration rolls back both schema changes and its migration receipt. Startup closes the database handle on migration failure.

| Foundation | Added representation |
|---|---|
| Course lifecycle | Description, updated time, archive/trash timestamps and versioned per-course module settings |
| Material lifecycle | Imported/note kind, current revision, updated time, trash/deletion timestamps and cleanup state, while retaining original file metadata |
| Source correction | Separate revision text, anchors, author and timestamp records; originals are not overwritten |
| Derivatives | Course/source/revision ownership, derivative kind, readiness/staleness and embedding model version |
| Embedding index | Course, model/version/weights identity, source revisions, status and rebuild reason; no model downloaded |
| Provider registry | Provider definitions and provider-wide enabled state; separate connections, credential references and capability defaults |
| Research | User-initiated session, provider/connection provenance, query/time, approved context categories, sources/excerpts/claim links/conflicts |
| Lifecycle operations | Typed export/trash/restore/permanent-delete intent and resumable operation status |

Composite foreign keys reject cross-course derivative and research-source relationships. Retrieval eligibility excludes archived/trashed courses, trashed/deleted/cleanup-pending materials, stale or wrong-revision derivatives and embedding records for the wrong model version. Source changes mark affected derivatives stale and conservatively invalidate course index metadata; embedding-model changes require a rebuild.

A synthetic v8 database was upgraded and reopened. Course/source IDs, original file bytes, checksums, writing and the saved session were preserved. A deliberately conflicting migration rolled back without changing the original course columns or rows. The owner's normal Application Support database was not used for these tests.

## Provider and credential foundation

Provider identity is distinct from tutoring, research, embeddings, narration, transcription and realtime voice. Four catalog definitions are present, each explicitly unimplemented. Registration and every new connection start disabled. Registered provider-wide disabling turns off associated connections and clears defaults; re-enabling does not silently activate connections or select a fallback. Capability disabling removes only affected assignments.

The credential-store interface accepts opaque references and has an unavailable production implementation that fails closed. **This pass does not implement or claim macOS Keychain integration.** Browser/export summaries use explicit allowlists and exclude secrets and credential references. Removal coordination first persists a disabled cleanup state, then attempts local credential removal and any supplied adapter revocation. Failures remain visible and retryable across restart; remote OAuth revocation is not claimed successful when it fails. Course files, writing and saved research provenance survive connection and provider removal.

Authentication facts were checked against primary documentation:

- OpenAI documents API-key and managed ChatGPT authentication through its local app-server. This does not imply unlimited usage, speech entitlement or access to general ChatGPT history.
- xAI documents API-key inference. First-party Grok Build access does not establish a third-party subscription integration for CollegeNotes.
- Anthropic documents API credentials and workload identity federation. Neither federation nor Claude Code login establishes arbitrary third-party subscription OAuth.
- Google documents Gemini API credentials and desktop OAuth. Endpoint scopes, entitlement and protected token storage still require validation during real adapter implementation.

Sources: [OpenAI app-server](https://learn.chatgpt.com/docs/app-server), [xAI inference](https://docs.x.ai/developers/rest-api-reference/inference), [Anthropic API authentication](https://platform.claude.com/docs/en/api/overview), [Google desktop OAuth](https://ai.google.dev/gemini-api/docs/oauth).

The OAuth helper verifies exact loopback callback identity, connection/provider binding, random state, PKCE, expiry and one-use consumption. Its tests use synthetic values only. No callback listener, real account login, model request, paid fallback, credential import or model download occurred.

## Shell, service and recovery repairs

Courses, Connections and Research routes now exist independently of a selected course. Their empty states disclose unavailable functionality. The shell does not simulate live provider authentication, research results, imports or the full course lifecycle.

The local service now handles exact allowlisted browser preflights and origins, rejects hostname-prefix spoofing and requires the expected client marker for browser writes. File-path checks reject symlink traversal. Draft writes cannot reassign an existing draft to another course. Corrupt session/layout records recover without deleting local data.

Startup loads the saved route before writing a new session. Course changes isolate displayed draft text and ignore late results from a previous course. Browser writes are serialized to prevent an earlier slow save from overwriting a later one; failed note/layout/appearance saves are disclosed. The skip link preserves routing, and the compact navigation handles Escape focus return. These are source-level repairs; owner UI testing must confirm their behavior.

The launcher now points Vite at apps/web. Workspace runtime exports resolve compiled JavaScript, while types and test aliases resolve source. This repairs compiled service startup without adding external dependencies. The current browser client expects port 4781; startup instructions no longer suggest changing that port alone. A failed child process stops its sibling, and exiting children clean their own PID records.

## Verification and evidence

| Check | Result |
|---|---|
| Type checks | Pass |
| ESLint | Pass |
| Web/service build | Pass |
| Unit tests | 25/25 pass |
| Integration tests | 33/33 pass |
| Synthetic evaluation fixture | 1/1 pass; not a live learning-quality evaluation |
| Planning structure | 6/6 pass |
| Workflow rehearsal | 44/44 pass |
| Verification-harness negative/positive gates | 6/6 pass |
| Isolated process startup/occupied-port/listening checks | 3/3 pass |
| Independent source/document audit | 8/8 pass |
| Browser, rendered design, accessibility and UI/UX acceptance | Pending owner; not executed by an agent |

The nine-command engineering runner captured exit codes, test counts, output hashes and source hashes. All **254 recorded file hashes** matched implementation commit 86d27aaceef689f6747924203fb1165961a6456d with zero mismatches. Raw evidence is gitignored under `.local/verification/repair/`; final command evidence is in phase-4/report.json, with separate runtime and audit records. Older failed runs are retained in timestamped directories.

A state-schema value error and a missing lint declaration for the runtime check were caught and repaired. Neither the schema nor lint obligation was weakened. Subsequent required engineering checks passed. UI checks were kept pending under the owner's instruction, rather than labeled skipped passes or replaced by screenshots.

## Dependency findings and limits

No external dependency version or resolution changed. Existing provider-workspace edges were declared for web/storage, missing storage-to-domain lock metadata was reconciled, and package export metadata was repaired.

A fresh npm audit returned **exit 1: 0 critical, 1 high and 1 moderate package findings**, involving epubjs and its xmldom dependency. This is not a clean security scan. The affected EPUB/XML parser is not imported or invoked by the current foundation; the existing EPUB helper is a synthetic harness, not a production parser. These known advisories must be resolved through the required compatibility/security/license review before real EPUB processing is enabled. See docs/dependency-repair-review.md for the assessment and primary advisory links. No dependency upgrade or vulnerability waiver was invented.

This pass does not implement full course rename/edit/archive/restore/export/delete operations (Phase 5), real material extraction/correction/export/deletion or embedding generation (Phase 6), live provider login/Keychain/research/tutoring (Phase 8), or packaged macOS delivery (Phase 14). Those requirements remain in the official plan; their foundations and designs have been repaired here. No future phase was implemented or redesigned by this repair.

## Checkpoints and handoff

| Repair checkpoint | Commit confirmed at the existing remote |
|---|---|
| Phase 0 | ed1cdc5df68160622bd63c5421b6b958db3f9ed1 |
| Phase 1 | 06f9116e9fe5aecf63b912e2d3aff0b8940830c2 |
| Phase 2 design candidate | 5587f6e35a3662ef236aec2b88d3ef9026407d49 |
| Phase 3 | 1b6cc7c7c9978ce1fc98653b420f50c0d204a8e1 |
| Phase 4 implementation | 86d27aaceef689f6747924203fb1165961a6456d |

Each checkpoint was committed, pushed and compared with remote main before the next repair stage. The initial push restriction was resolved by the owner's explicit authorization. This report and the final state receipt are a later documentation checkpoint; they do not claim that the implementation commit contained its own future SHA.

Use [the manual UI/UX checklist](phase-0-4-repair-manual-tests.md) to review the existing shell and the revised design gallery. Record the tested commit and defects. Defects reopen the repair. Only the owner's green light permits proceeding to Phase 5. No agent UI/UX acceptance or Phase 5 authorization is recorded.
