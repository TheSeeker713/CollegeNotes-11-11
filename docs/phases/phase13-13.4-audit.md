# Phase 13.4 integrated engineering audit

AUTH-P13 / PASS-2026-09-19-P13. The official plan remains the scope authority. Phase 13's portability, resilience and extension blockers are resolved in the engineering candidate. This does not claim completion of the whole project or owner UI/UX acceptance. No owner UI/UX test, live provider request, credential entry or model download was performed.

## Executed evidence

- CHK-13.4-01: a synthetic workload queued 12 distinct text imports while an approved source was read, with a 15-second engineering bound. It passed locally. This is a reproducible baseline, not an owner-agreed release performance target. The production bundle still reports a 1.26 MB client chunk.
- CHK-13.4-02: interrupted import recovery and simulated `ENOSPC` during backup restore preserved originals and existing courses. The earlier Phase 13.2 test also covers interruption after staging. Pass for the exercised conditions.
- CHK-13.4-03: loopback origin guard and restore path rejection passed. Source audit confirmed `resolveInside` rejects lexical escape and symlink traversal; backup regenerates owned file paths. Pass for the exercised conditions.
- CHK-13.4-04: approved source/revision linkage in restored activities and the offline pack passed. Production research/tutor/speech paths now fail closed instead of generating synthetic provider or microphone content. Existing source-grounding evaluation cases passed. Live provider and STT functionality remains an earlier-phase feature gap, disclosed below.
- CHK-13.4-05: the permitted non-UI source regression passed: labeled controls, status/alert roles, text explanations, four bundled appearance modes, `GlassAtmosphere` 2D fallback and no-GPU aid text were inspected. **Owner-only rendered keyboard, VoiceOver, zoom and theme acceptance has not executed** and remains pending separately.
- CHK-13.4-06: a backed-up course with source-linked study, saved narration and visuals restored; its copied index was correctly stale, then a rebuild yielded a complete offline pack. Pass.
- CHK-13.4-07: no Phase 13 portability/resilience/extension engineering blocker remains after the backup preview hardening and integrated regressions. The defect register below explicitly retains earlier-phase capability gaps and Phase 14 release work; they are not claimed resolved by this Phase 13 checkpoint.

Types, lint, build, 32 unit, 280 integration, 2 evaluation, 6 planning and 44 workflow checks passed on the candidate. Dependency advisory query returned zero current advisories across 402 dependencies. The changed-file credential-pattern scan found zero hits; `.local` evidence is gitignored. No real course data appears in this pass's source/tests/docs. A read-only remote check matched the Phase 13.3 checkpoint before this candidate was committed.

## Defect register

| ID | Status | Evidence and resolution needed |
| --- | --- | --- |
| F1–F2, course export/deletion | Resolved in the prior lifecycle repair; Phase 13 backup/restore regression passed | Full course records/media and deletion retry are covered by existing lifecycle tests. |
| F3, live research/tutoring | Safety defect mitigated; earlier-phase capability open | Production routes return `research_adapter_unavailable` and `tutor_adapter_unavailable`; no synthetic page or formatted reply is attributed to a selected provider. Implement and verify real approved adapters under Phase 8 requirements before claiming this feature. No live owner account was used. |
| F4, speech recognition | Safety defect mitigated; earlier-phase capability open | Live route returns `speech_recognition_unavailable`; Listen no longer requests mic permission and fabricates a transcript. Implement audio-consuming STT with owner permission review under Phase 10 requirements. |
| F5, Study mislabeled planned | Resolved | The implemented Study module is marked available. |
| F6, historical status drift | Partly resolved; plan wording owner-controlled | The Phase 10.4 report SHA is filled. Historical phase SHAs are distinguished from current remote tip here. The official plan still calls itself a proposed revision; agents cannot change its status or scope without owner direction. |
| F7, visual provenance | Claim clarified; source-linked visual grounding open | Visuals now explicitly describe generic links as background, not evidence from imported course material. Per-source/revision visual explanations still need the earlier Phase 12 requirement. |
| P13 bundle size | Open optimization | Build succeeds, but Vite warns about the large client chunk and ineffective dynamic import. |

This audit closes the Phase 13 engineering checks without changing earlier-phase acceptance claims. Owner-only rendered review and the open feature gaps remain visible in the production report. Phase 14 still requires its own explicit authorization and final acceptance gate.
