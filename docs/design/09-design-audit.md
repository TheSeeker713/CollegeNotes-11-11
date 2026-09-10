# Design audit — glass-review-1

Candidate: [prototype](prototype/index.html) at Step 2.3 commit `09a040eb7322bcede2ffe7eb6715e28c95f5d7fc`. Authority: AUTH-P2-FINISH, CHANGE-35-IMAGES. This is not a product build.

## Walkthrough (CHK-2.4-01)

Inspected Home, Add a course, Sources, Correction, Reading, Study, Practice (PQP and Rehearsal), Requirements, Progress, Settings/Appearance, Visual aid, States, Gallery. Linked hash routes, no extra initiation tour. Resume is the dominant Home action.

Private screenshots: `.local/verification/p2-finish/prototype-inspect/` (1440-home/read/study/practice/settings/gallery/firstuse/sources/correct/requirements/progress/visual/states; narrow-500-home/read/settings/study).

## Information consistency (CHK-2.4-02)

Canonical navigation is Home, Sources, Study, Practice, Requirements, Progress, Settings. Image labels such as Materials, Library or Dashboard are not adopted. Course subtitle is Presentational Skills, not generated slogans. Source fixture is `example-page.png` / “Speaking with clear examples” / Section 2 of 6. COMM 110 own-writing policy appears on Practice and Requirements. Generated “27% higher scores” copy is rejected (IMG-108 keep-reason).

## Critical states (CHK-2.4-03)

Seventeen components each have empty, loading, error, offline, success and interrupted copy on the States screen. Interactive examples: course-name validation, correction save failure, tutor offline, microphone denial, PQP save failure, corrupt backup, import cancel/duplicate.

## Window sizes (CHK-2.4-04)

Desktop 1440×900: sidebar, two-column home, four-card reader. Narrow below 768: Menu, stacked cards, Move up/down. Headless Chrome would not size to 390px (minimum ~500px); 500×844 still uses the 767px layout. CSS already contains the 390 rules.

## Phase 2 requirements (CHK-2.4-05)

IA from 2.1 (nine screens, fourteen flows, F13/F14 appearance and cards) is present. Visual system from 2.2 (four palettes, 44px targets, focus, reduced motion/transparency) is applied in CSS tokens. Prototype is the 2.3 review artifact. 3D is a 2D storyboard only.

## Owner image review (CHK-2.4-06)

CHANGE-35-IMAGES: owner directed that 35 of 111 images are full scope, the rest removed, Design/ gitignored and not pushed. Feedback addressed in receipts, gallery and `.gitignore` (`/Design/` root-only so `docs/design/` remains tracked).

## Four-variant preservation (CHK-2.4-T01)

Theme and Dark mode are independent. Reset appearance returns Botanical Light without resetting layout. Preview localStorage keeps drafts, route, audio offset and per-course card positions. Selftest applied all four variants and confirmed pin/cancel.

## Hypotheses (not clinical)

- Dense generated foliage behind prose would hurt reading; prototype uses opaque card backings.
- Arrange diagnostics (coordinates, ΔH) belong only in Arrange, as already specified.
- Narrow 390px should be re-checked in a real window; headless capture cropped at 390.
- Visual-aid storyboard still needs an explicit owner yes/no before Phase 12.

Phase 3 installation is not authorized.
