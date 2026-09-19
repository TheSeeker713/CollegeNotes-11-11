# CollegeNotes{11:11} full-project audit — 2026-09-18

## Audit identity and boundary

- Audited local `main` at `87ee1abd04d7da29946c14ac95cdcd4b945533c2`; a fresh read-only `git ls-remote origin refs/heads/main` returned the same SHA. The checkout was clean before this report was written.
- Scope authority: `PROJECT-PLAN.md`. State and approvals record Phase 12 engineering as complete and Phase 13 as unauthorized. Owner-rendered UI/UX acceptance remains pending; this audit does not grant it.
- Read the phase manifests, approval/state records, latest Phase 12 receipt, main service/storage/provider/domain/web paths, and representative integration tests. Compared documented claims with production wiring and used an isolated synthetic course to reproduce lifecycle behavior.
- No browser, screenshot, accessibility, usability, live provider, actual credential, or owner-course test was performed. Phase 13 portability/restore and Phase 14 packaged delivery were not expected to be implemented.

## Overall assessment

The repository has a coherent local-first foundation, course-scoped database, import/reading/study/practice/visual modules, provider credential boundaries, and extensive automated non-UI coverage. The production build and all permitted verification suites pass. The recorded engineering completion for Phases 8–12 nevertheless overstates some user-facing behavior: research/tutoring and recognition still run synthetic paths, and the course lifecycle does not reliably export or erase all later-phase data. These are source and behavior findings, not an inference from a failed test suite.

## Findings, ordered by impact

### F1 — Critical: course export omits data and course deletion leaves private files

`packages/storage/src/course-transfer.ts:26-36` exports selected database tables and original source bytes, but omits `research_claims`, `tutor_sessions`, `tutor_turns`, and `study_sources`; it exports only metadata for `practice_media` and `narration_assets`, with no media/audio bytes. The UI describes this as an export of the course and its saved material (`apps/web/src/CourseManager.tsx:103`). In an isolated synthetic replay, a course with a tutor session and practice recording exported neither the tutor session nor the recording bytes.

The same file's deletion path (`:59-70`) unlinks only `source_documents` originals. It never removes `practice/<courseId>/` or `narration/<courseId>/` files created by `packages/storage/src/practice.ts:171-180` and `packages/storage/src/narration.ts:76-92`. After successfully deleting the synthetic course, its practice recording remained on disk. This violates the complete course delete/privacy lifecycle in `PROJECT-PLAN.md:42-45,116` and makes an export unsuitable as a complete copy. Full portable restore is correctly deferred to Phase 13, but current export is already presented as covering saved course material.

**Recommended repair:** inventory every course-owned table and file class; include required records and file bytes in a versioned export, with checksum and isolation checks. Deletion should preflight and remove all owned files safely, then remove/verify all database rows, with interrupt/retry tests. Do not ask the owner to trust existing exports as complete backups until this is repaired.

### F2 — High: a tutor session blocks permanent course deletion

`packages/storage/src/migrations.ts:136-145` gives `tutor_sessions.course_id` a restrictive foreign key. `deleteCourse` never deletes tutor sessions before deleting `courses` (`packages/storage/src/course-transfer.ts:65-70`). In the isolated replay, the confirmed deletion returned `deletion_incomplete_retry`; deleting the synthetic tutor session directly and retrying made course deletion succeed. This is an ordinary state created by `openTutorSession` (`packages/storage/src/research-tutor.ts:165-184`), not a malformed database. The course is also marked trashed before the failing delete, so the user can be left with a hidden, undeleted course. Existing course-transfer tests cover older rows but do not construct a tutor session.

**Recommended repair:** delete or cascade tutor sessions and turns in the same audited deletion workflow, and add a course with active tutor history to the deletion/restart test matrix.

### F3 — High: production research and tutoring are synthetic despite connection selection

The production service registers `learningRoutes` without a transport override (`apps/local-service/src/index.ts:83-89`). Its default transport returns a fixed `example.com/synthetic-research` page independent of the query (`apps/local-service/src/learning.ts:86-95`; `packages/providers/src/inference.ts:12-20`). Tutor turns use `structuredTutorReply`, a deterministic string formatter, with no provider/model request (`apps/local-service/src/learning.ts:65-82`; `packages/providers/src/inference.ts:40-57`). The tutor turn is nevertheless stored with `kind: 'model'` (`packages/storage/src/research-tutor.ts:229-242`) and associated with the selected connection. `resolveCapabilityConnection` also changes every catalog entry's `implementation` to `installed` while checking eligibility (`packages/storage/src/research-tutor.ts:35-53`), although the catalog marks OpenAI, xAI, Anthropic, and Google `not_implemented` (`packages/providers/src/contracts.ts:41-55`).

This does not satisfy the actual internet-research and provider-backed tutoring behavior required by `PROJECT-PLAN.md:68-110,182-186`. The Phase 8 report does disclose synthetic replies, and the connection UI says AI requests are unavailable, but the research/tutor workflows can still label synthetic output with a chosen provider. The tests intentionally inject fixture transports and assert synthetic responses, so their pass does not establish live adapter behavior.

**Recommended repair:** keep the synthetic transport test-only, fail closed in production until a real supported adapter is available, and label non-model output accurately. Before enabling any provider, verify its current primary documentation as the plan requires; implement a real request route with explicit transmission scope, cancellation, provenance, and cost enforcement.

### F4 — High: microphone recognition fabricates a transcript

The listening UI obtains microphone permission, immediately stops the stream, and sends a hard-coded `expectedText` string to the recognition endpoint (`apps/web/src/ListenWorkspace.tsx:90-117`). The endpoint uses `synthesizeOfflineTranscript`, which copies `expectedText` or `audioHint` rather than recognizing audio (`packages/providers/src/transcription.ts:5-26`). A user pressing “Start then stop capture” receives a transcript of a sentence they did not speak. `docs/phase-10-production-report.md` openly calls STT synthetic, but the workflow still presents the output as editable recognition. This falls short of `PROJECT-PLAN.md:192-194` and risks false learning records.

**Recommended repair:** do not create a recognition transcript from a fixture in the live UI. Show unavailable status until a real local or selected-provider STT path consumes captured audio. Preserve explicit permission, correction, provider, and cost handling.

### F5 — Moderate: Study is implemented but labelled “Planned”

`packages/domain/src/modules.ts:4` sets Study `available: false`. `apps/web/src/CourseManager.tsx:102` therefore displays “Planned · selection saved for later,” while `apps/web/src/App.tsx:337-341` routes to a working Study workspace and progress panel once the module is enabled. This contradicts the Phase 9 delivery claim and may deter the owner from using implemented study work. Mark available only after deciding how to represent the current engineering-versus-owner-acceptance state consistently across modules.

### F6 — Moderate: status and check evidence can mask incomplete acceptance

`PROJECT-PLAN.md:7,227-229` still calls itself a “proposed governing revision” and describes only historical Phases 0–4, while state and receipts record Phase 12 engineering. `project-state/current.json:471` points its verified remote tip at `8638fb5`, whereas current `origin/main` is `87ee1ab`; later commits are documentation-only state adjustments, so this is bookkeeping drift rather than proof of untested app source. The Phase 10 production report has a blank 10.4 SHA (`docs/phase-10-production-report.md:36`) even though the final receipt records completion. Manual owner acceptance is pending for later phases. These documents should clearly distinguish engineering checkpoints, current remote tip, deferred manual review, and unimplemented/live-provider limitations.

### F7 — Low: visual source links are generic references, not course provenance

The Phase 12 visual aid states attach fixed Wikipedia overview links (`packages/domain/src/visuals.ts:176-210,250-259,278-295`). That is suitable for course-neutral demonstration, but it does not link a given visual explanation to a user-imported source or revision. `PROJECT-PLAN.md:200-204` and the Phase 12 manifest ask for source-linked educational explanations. Treat the present links as generic background, and add course-source provenance before claiming a visual is grounded in the user's material.

## Verification performed

- Passed: type check, lint, production build; 32 unit, 256 integration, 2 evaluation, 6 planning, and 44 workflow checks. All discovered cases in those runs passed.
- Initial integration attempt had 3 environment-blocked cases: the tool sandbox denied the nested macOS `sandbox-exec` network-denial harness. The full integration suite was rerun with execution access and passed 256/256. The first run is not represented as a product pass.
- Build emitted a large client-chunk warning (1.25 MB output) and an ineffective dynamic-import warning. These are performance/packaging review items, not build failures. The `three` CommonJS deprecation warning appeared during tests.
- A fresh package-registry advisory query did not return before the audit timeout and was stopped. Current third-party vulnerability status is therefore unverified by this audit; this is not a claim that the dependencies are clean or vulnerable.
- Read-only remote check confirmed `origin/main` SHA `87ee1abd04d7da29946c14ac95cdcd4b945533c2` at audit time.
- Synthetic lifecycle replay used only a temporary directory under `.local`, then removed it. It observed: `exportIncludesTutorSessions=false`, `exportIncludesMediaBytes=false`, `deleteWithTutor=deletion_incomplete_retry`, `deleteAfterTutorRemoval=succeeded`, `mediaExistsAfter=true`.

## Traceability and next boundary

Phases 0–7 provide the application foundation, course/material lifecycle, import/reading and local retrieval; their non-UI code paths and current regressions build and pass, but the lifecycle defect above crosses these foundations. Phase 8 provider/research/tutor wiring remains synthetic in the production path. Phase 9 study mechanics have passing domain/integration tests, with an availability-label defect. Phase 10 has real macOS speech synthesis and playback contracts but synthetic recognition. Phases 11–12 have course-neutral practice and visual implementations with passing non-UI checks, while media deletion/export and source-grounding limitations remain. Phase 13 backup/restore hardening and Phase 14 packaged delivery are future work and are not authorized by this audit.

Repair the F1–F4 defects within the applicable existing phase scope before relying on complete backup/deletion, internet research, provider tutoring, or spoken teach-back. Owner-only UI/UX review and live account use remain separate from this source audit. This report does not change the official plan, approval state, or phase boundary.

## Repair follow-up — course lifecycle

The owner subsequently directed repair of the course lifecycle issue (F1–F2). `packages/storage/src/course-transfer.ts` now includes research claims, tutor history, and study-source links in the course export, and embeds checked narration/practice media bytes with per-file checksums. Confirmed course deletion now removes tutor rows and all files in the course's owned narration/practice directories, including orphan files from interrupted writes. Unsafe media paths are rejected before deletion; an interrupted media deletion remains retryable after restart. Other courses remain untouched.

Regression tests were added to `tests/integration/course-transfer.test.ts` for complete later-phase export, cross-course isolation, full deletion, symlink rejection, and interrupted-media retry. Post-repair verification passed: type check, lint, build, 32 unit tests, 260 integration tests, 2 evaluations, 6 planning checks, and 44 workflow checks. No owner UI test or live provider request was made. Findings F3–F7 are outside this repair and remain open as described above.
