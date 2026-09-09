# Frozen requirements and acceptance mapping

Baseline: owner request and full plan, September 9, 2026. IDs are stable; Phase 0 specifies evidence, it does not claim product acceptance. Each row must survive into Phase 1 manifests and final Phase 14 acceptance. Detailed acceptance wording is in requirements.json.

| ID | Required behavior | Owner phases |
|---|---|---|
| R-LOCAL | Local Chrome browser interface plus loopback companion; daily launcher; actual Mac Developer source | 0, 1, 3, 4, 14 |
| R-COURSES | Add courses and terms throughout education; edit, archive and reopen; isolate data | 5, 13 |
| R-INPUTS | Repeated batch screenshots, pasted text, notes, native/scanned PDF, DOCX, DRM-free EPUB imports | 6 |
| R-ORIGINALS | Immutable originals, checksums, source versions and page/paragraph/region/ebook anchors | 6, 7 |
| R-CORRECTION | Review and correct extraction; version revisions and mark affected derivatives stale | 6, 9 |
| R-READING | Original and reflowed reading, search, annotations, bookmarks, density and source navigation | 7 |
| R-TUTOR | Documented ChatGPT account connection mediated by local companion; sign-in/out and limits | 0, 8 |
| R-GROUNDING | Selected-course retrieval; separate instructor requirements, source text, user writing and tutor explanations | 8, 9 |
| R-LEARNING | College-level explanation, application, prediction, retrieval, hints, teach-back and spaced review | 9, 12 |
| R-PROGRESS | Save attempts, schedules, unfinished drafts and exact reading/audio/activity positions | 4, 7, 9, 10 |
| R-NARRATION | Natural narration of exact extracted text, distinct from paraphrased explanation | 10 |
| R-PLAYBACK | Pause, seek, speed, sentence replay/alignment, bookmarks, listening queues and cached audio | 10 |
| R-VOICE | Explicit microphone, editable recognition, spoken teach-back, interruption then passage resume | 10 |
| R-OFFLINE | Prepared local reading/search/notes/activities/audio/visual assets and saved progress without network | 7, 10, 13 |
| R-INFERENCE | Fresh cloud tutoring requires network; fresh local inference conditional on explicit selection and validated models | 0, 8, 13 |
| R-BACKUP | Portable private-data backup/restore with manifest/checksums, preview and conflict recovery; exclude credentials | 13 |
| R-ACCESS | ADHD/neurodivergent support: easy start/resume, short optional sessions, adjustable density/motion/audio and pacing | 2, 4, 7, 9 |
| R-A11Y | WCAG 2.2 AA, keyboard/focus, readable text outside canvas, reduced motion, no required voice or 3D navigation | 2, 4, 7, 10, 12, 14 |
| R-VISUALS | React 2D interface, selective 2.5D and subject-correct interactive R3F/Three.js aids; WebGL2 baseline | 2, 12 |
| R-POLICY | COMM 110 prohibits AI-generated outlines and sources/citations; support learning/practice and preserve user writing | 5, 8, 11 |
| R-COURSE_RULES | Source-linked requirements, conflicts and revisions; missing official details remain unknown | 5, 11 |
| R-PRESENTATION | PQP practice, synchronized media review, timer/recording, user-authored cue cards and visual-aid inspection | 11 |
| R-MODULES | Versioned domain contracts and capability registration support future subject modules | 1, 4, 12, 13 |
| R-PRIVACY | Separate source and private learning data; loopback/origin/path controls; documents are untrusted data | 1, 4, 6, 8, 13 |
| R-PROVIDERS | Provider-neutral tutoring/audio contracts; subscription, API billing and speech capabilities distinct | 0, 3, 8, 10 |
| R-WORKFLOW | Approved phases only, ordered steps, 100% required checks, evidence audit, commit/push/remote confirmation, explicit phase stop | 0, 1, 14 |
| R-PERFORMANCE | Responsive study while importing and playing audio; concrete reference-device budgets | 0, 7, 10, 12, 13, 14 |
| R-HISTORY | GitHub only for public source repository and version history; all tests and audits local | 0, 1, 14 |
