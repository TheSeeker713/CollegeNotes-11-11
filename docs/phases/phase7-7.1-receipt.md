# Phase 7.1 engineering receipt

Original/reflowed reader, source location switching, literal offset search, bounded pagination and safe EPUB chapters implemented. No new dependency or model download.

All nine non-UI gates pass: types, lint, build, 25 unit cases, 94 integration cases, 1 evaluation, 6 planning checks, 44 workflow checks and 6 gate harness checks. Private evidence: `.local/verification/phase7/7.1/`. Source stayed unchanged during verification. Initial invalid phase status was repaired and reverified.

Source audit: course and revision ownership enforced; corrected text never claims original alignment; original PDF pixels unmodified; EPUB uses an element allowlist, no remote fetch, inert iframe, explicit omissions and bounded output; source offsets survive Unicode and large-document pagination. CHK-7.1-01 through 05 have non-UI contract evidence in reading.test.ts. Zoom/keyboard/rendered layout are source-reviewed only, with actual user tests deferred by AUTH-P7. No UI acceptance is asserted.

Commit/push follows this receipt; independently verified SHA is recorded in project state before the next step.
