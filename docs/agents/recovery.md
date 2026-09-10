# Recovery

Failed check: preserve failing output, mark repairing, fix the cause, repeat required checks and audit. Missing tool/evidence: mark the affected step blocked and identify the concrete input; do not reduce the obligation. Unresolved flaky case: incomplete until explained and fixed.

Failed push: keep checkpoint_pending. Inspect remote/auth/network, repair non-destructively and compare SHA again. Do not begin the next step or force-push away history. A partial/WIP handoff commit is not a completed-step receipt.

Interrupted session: read state/approvals, latest local evidence and Git/remote. Compare source fingerprints before reusing any result. Resume the unfinished step; do not invent approval or rerun finished work without cause. If the bounded pass has ended, its one-time authorization cannot be silently reused for new scope.

Lost source/evidence: recover private originals/logs from the owner if essential. Do not reconstruct a fabricated history. This does not revive the superseded thirteen-screenshot requirement.

User defect or rejected design: reopen the current phase, record the defect and exact candidate, repair/retest/audit and checkpoint. Phase boundary: stop unless a recorded user exception explicitly covers this transition. Use the current authorization, not historical restrictions, for repair transitions.

Future import/restore failure: preserve originals/existing database, identify partial job, validate checksum and schema, retry through a resumable job; never replace user data because a notification says success.

## Current repair pass

[PROJECT-PLAN.md](../../PROJECT-PLAN.md) is the sole scope authority. AUTH-REPAIR-0-4 and AUTH-REPAIR-PUSH authorize the bounded repairs through Phase 4 and existing-repository pushes. Older pass restrictions are historical. UI/UX testing and rendered-design review belong exclusively to the owner; agents perform source audits and non-UI engineering checks. Manual acceptance remains pending through the repair implementation. Phase 5 needs the owner's green light. See [repair manifest](../phases/repair-0-4.json).
