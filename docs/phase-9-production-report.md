# Phase 9 production report — study and learning history

## Delivery status

Phase 9 implements the official study and learning-history scope under AUTH-P9. Engineering verification passes; owner UI/UX acceptance remains pending. No browser, screenshot, accessibility or usability tests were run by the agent. Phase 10 is not authorized.

## Delivered behavior

- Six reusable templates: classification, ordering, short recall, multiple choice, evidence matching, and prediction with explanation. Each keeps exact approved source excerpts, revision/offset anchors, prepared answers, rationale, rubric and authorship separately from attempts.
- Local activity authoring from approved course sources. Model-attributed templates require provider and model metadata in the validated contract; this phase does not send generation requests or claim live AI assessment.
- Durable responses and text teach-back, graduated hints, explicit post-submission answer reveal, fresh retries and preserved history. Free-text and ambiguous responses require review; objective formats compare against prepared answers. Prediction requires an explanation.
- Review scheduling with a 1–50 daily workload, elapsed UTC-day intervals, missed-day retention, and reset/undo. Correct unassisted objective attempts expand spacing up to 60 days; errors, hints and unassessed explanations return in one day. Counts describe practice evidence, not mastery, course completion or grades.
- Short sessions of up to ten due activities, bounded by remaining daily workload. Pause, resume, continue and retry persist the current attempt. Duplicate submissions cannot award duplicate credit; conflicting session transitions are rejected.
- Course export includes study templates, attempts, schedules, preferences and sessions. Source correction/trash invalidates dependent activities. Permanent source deletion removes dependent content and safely detaches active sessions; course deletion removes study records.
- Existing glass themes and semantic controls are reused. Ordering uses labeled buttons independently of card dragging. Theme settings do not drive learning changes.

## Architecture and storage

Domain defines versioned neutral contracts; learning owns validation, scoring and spacing; storage owns forward-only SQLite migrations and course/source lifecycle rules; the loopback service validates course/module access; the web app presents activities and saves drafts through the service. The only dependency change is an internal storage-to-learning workspace reference. No external dependency installation, model download, credential entry or live provider request occurred.

Prepared study needs the local service, but no internet, embedding model or AI connection. Existing Phase 8 data upgrades without replacing course writing. The source remains the authority; model output and imported text cannot grant permissions.

## Verification and checkpoint evidence

Ordered checkpoint receipts:

1. [9.1 activity templates](phases/phase9-9.1-receipt.md): `72fb88b8a5bdc04e503df322d6023199c70e95aa`.
2. [9.2 hints and teach-back](phases/phase9-9.2-receipt.md): `862483547c9adf5a31b7f55e2100bee02db2afe7`.
3. [9.3 scheduling and history](phases/phase9-9.3-receipt.md): `3726fece0bb772dd41b9660beb327eb455620f32`.
4. [9.4 sessions and final regression](phases/phase9-9.4-receipt.md): final SHA recorded in the closeout receipt after push confirmation.

Final executed non-UI checks passed: type checking, lint, build, 32 unit tests, 185 integration tests, 2 evaluations, 6 planning checks, 44 workflow checks and 6 gate-harness checks. Dependency audit: zero reported vulnerabilities. Verification records source hashes and command-output hashes. Raw logs and earlier failed runs are retained privately under `.local/verification/phase9/`; summaries are public.

Failures were repaired without relaxing checks: the state status was corrected to the existing schema vocabulary, host network-denial fixtures ran outside the agent sandbox so they could apply their own macOS sandbox, and a test-only unused assignment was removed. No source changes followed the final passing product gate before the documentation checkpoint.

## Acceptance limits and owner review

CHK-9.4-03 and visual/theme/keyboard/VoiceOver/usability checks are pending owner-only. Engineering completion does not claim those checks passed or accept the previous visual shell. Review the [interaction specification](phases/phase9-design.md) and [manual testing guide](phase-9-manual-tests.md).

Wait for “Saved locally” before closing a window. If the local service cannot save, the current window retains text and reports the failure; unsaved text is not guaranteed to survive closing that window. Version conflicts deliberately refuse to overwrite another window's work.

Short recall and prediction use rubric review rather than semantic grading. Source navigation shows the exact excerpt and revision/offset; the reader link opens the course reader, where the source can be selected. Workload days use UTC explicitly. Full portable restore remains Phase 13; packaged macOS delivery remains Phase 14. Stop before Phase 10.
