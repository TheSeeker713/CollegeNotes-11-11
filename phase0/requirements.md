# Requirement register

Subordinate projection of [PROJECT-PLAN.md](../PROJECT-PLAN.md), repaired under AUTH-REPAIR-0-4. Requirement identifiers remain stable for historical traceability. Future-phase mappings express scope ownership only, not implementation authorization.

## R-LOCAL

Single-user macOS desktop app for this MacBook; local-browser UI is an interim development surface; daily launcher; actual Mac Developer source

Acceptance: Interim loopback browser launch and final Mac-app cold launch, local origin protection, occupied port and runtime recovery; no hosted/mobile/tablet requirement; user acceptance

Owner phases: 0, 1, 2, 3, 4, 14.

## R-COURSES

Empty user-created courses: create, rename, edit, archive, restore, export, permanently delete; enable reusable modules; no built-in real course.

Acceptance: Full lifecycle and cross-course isolation; originals, local writing and backups handled explicitly.

Owner phases: 5, 13.

## R-INPUTS

Repeated batch screenshots, pasted text, notes, native/scanned PDF, DOCX, DRM-free EPUB imports

Acceptance: Known-answer fixtures for every format; repeated imports, duplicates and updates; cancellation and corrupt/oversized files

Owner phases: 6.

## R-ORIGINALS

Immutable originals, checksums, source versions and page/paragraph/region/ebook anchors

Acceptance: Hashes unchanged; every derived item opens the correct source version and location

Owner phases: 6, 7.

## R-CORRECTION

Every material supports viewing original, note edits or extracted-text correction, source versions, individual/selection/course/backup export, recoverable deletion where practical and permanent deletion; backups are separate copies.

Acceptance: Source checksum unchanged; edit/delete invalidates search, embeddings, activities and AI context; deleted and other-course material cannot be retrieved; interrupted cleanup is recoverable.

Owner phases: 6, 9.

## R-READING

Original and reflowed reading, search, annotations, bookmarks, density and source navigation

Acceptance: Reading-order/table limitations visible; repeated phrase anchors; keyboard and large-document checks

Owner phases: 7.

## R-TUTOR

Optional, toggleable, disconnectable and removable source-grounded tutoring through provider-neutral connections.

Acceptance: Choose provider per capability; OpenAI removal preserves local learning data; API and verified account routes tested separately.

Owner phases: 0, 8.

## R-GROUNDING

Course-scoped lexical and local semantic-embedding retrieval; separate instructor requirements, source text, internet research, user writing and tutor explanations

Acceptance: Versioned local embedding index and grounding rubric; correction/model-version invalidation; hybrid retrieval quality, unknown/conflicting evidence, correct-course isolation and navigable anchors

Owner phases: 6, 7, 8, 9, 13.

## R-LEARNING

College-level explanation, application, prediction, retrieval, hints, teach-back and spaced review

Acceptance: Independent recall/application exercises; meaningful scoring; assumptions and caveats retained

Owner phases: 9, 12.

## R-PROGRESS

Save attempts, schedules, unfinished drafts and exact reading/audio/activity positions

Acceptance: Interrupt/close/reopen; no duplicate credit; no mastery inferred solely from reading time

Owner phases: 4, 7, 9, 10.

## R-NARRATION

Natural narration of exact extracted text, distinct from paraphrased explanation

Acceptance: Real long-passage audio; source fidelity/pronunciation and human listening acceptance

Owner phases: 10.

## R-PLAYBACK

Pause, seek, speed, sentence replay/alignment, bookmarks, listening queues and cached audio

Acceptance: Seek/restart offsets; timing alignment; offline replay makes zero generation requests

Owner phases: 10.

## R-VOICE

Explicit microphone, editable recognition, spoken teach-back, interruption then passage resume

Acceptance: Actual microphone grant/deny/revoke, device loss, self-trigger prevention, cancel/network failure

Owner phases: 10.

## R-OFFLINE

Prepared local reading, lexical and embedding search, notes, activities, audio, visual assets and saved progress without network

Acceptance: Disconnected cold launch, local semantic retrieval from a versioned prepared index, readiness manifest, incomplete pack rejected and local-service outage recovery

Owner phases: 7, 10, 13.

## R-INFERENCE

Fresh cloud tutoring requires network; fresh local inference conditional on explicit selection and validated models

Acceptance: Capability matrix distinguishes cached responses; no false availability; selected local model separately tested

Owner phases: 0, 8, 13.

## R-BACKUP

Portable private-data backup/restore with manifest/checksums, preview and conflict recovery; exclude credentials

Acceptance: Clean-directory restore matches records/hashes; corruption, interruption, version and traversal negatives

Owner phases: 13.

## R-ACCESS

ADHD/neurodivergent support: easy start/resume, short optional sessions, adjustable density/motion/audio and pacing

Acceptance: User flows and interrupted-session review; no fixed learning-style or guaranteed grade/clinical claims

Owner phases: 2, 4, 7, 9.

## R-A11Y

WCAG 2.2 AA, keyboard/focus, readable text outside canvas, reduced motion, no required voice or 3D navigation

Acceptance: Automated plus manual keyboard/screen-reader checks; contrast, window sizes, motion-disabled equivalents

Owner phases: 2, 4, 7, 10, 12, 14.

## R-VISUALS

React 2D interface, selective 2.5D and subject-correct interactive R3F/Three.js aids; WebGL2 baseline

Acceptance: Approved instructional purpose; real GPU action/state, 2D equivalent, context loss and reduced-quality performance

Owner phases: 2, 12.

## R-POLICY

Course restrictions come only from user-entered or imported evidence; preserve original source text and user writing.

Acceptance: No hard-coded class rules; untrusted imported instructions cannot change permissions or become application authority.

Owner phases: 5, 8, 11.

## R-COURSE_RULES

Source-linked requirements, conflicts and revisions; missing official details remain unknown

Acceptance: Compare original course evidence, timezone/relative-week fixtures, no invented duration/date/tolerance

Owner phases: 5, 11.

## R-PRESENTATION

Optional course-neutral presentation practice: recording, transcripts, timing, cue cards and user-authored feedback.

Acceptance: User-enabled module with source-linked feedback; no built-in COMM 110, PQP, syllabus or assignments.

Owner phases: 11.

## R-MODULES

Versioned domain contracts and capability registration support future subject modules

Acceptance: Synthetic second module; disable/re-enable and version mismatch; no unrelated table mutations

Owner phases: 1, 4, 12, 13.

## R-PRIVACY

Separate source and private learning data; loopback/origin/path controls; OAuth credentials in approved local storage; documents and webpages are untrusted data; private course text is transmitted only with explicit user intent

Acceptance: No credentials/private course content staged; least-privilege OAuth and revocation; visible transmission scope; reject traversal, embedded scripts, malicious webpages and prompt injection

Owner phases: 1, 4, 6, 8, 13.

## R-PROVIDERS

Provider identity independent of tutoring, research, embeddings, narration, transcription and realtime voice; OpenAI, xAI, Anthropic, Google and approved future adapters. API credentials and officially supported OAuth/account routes; provider/capability toggles, defaults, models, health, billing, limits, disconnect and removal.

Acceptance: Secrets in approved credential store only; settings export excludes credentials; no silent paid fallback; unsupported subscription OAuth unavailable; explicit research query/provider/course/private-context consent and URL/title/date/excerpt/claim/conflict provenance.

Owner phases: 0, 3, 8, 10.

## R-WORKFLOW

PROJECT-PLAN.md is the sole human-readable scope authority; only owner changes requirements, scope, phase boundaries, providers, privacy, design and acceptance. Ordered authorized steps, evidence audits and confirmed remote checkpoints.

Acceptance: Supporting manifests cannot authorize work. Current AUTH-REPAIR-0-4 permits repair transitions through 4; UI/UX tests are user-only and Phase 5 needs green light.

Owner phases: 0, 1, 14.

## R-PERFORMANCE

Responsive study while importing and playing audio; concrete reference-device budgets

Acceptance: Repeatable interaction/launch/frame/audio and concurrent workload measurements

Owner phases: 0, 7, 10, 12, 13, 14.

## R-HISTORY

GitHub only for public source repository and version history; all tests and audits local

Acceptance: Per-step remote commit exists; no CI, hosting, issue/project or PR gate; private evidence excluded

Owner phases: 0, 1, 14.
