# Phase 12 production report

**Authorization:** AUTH-P12 · **Pass:** PASS-2026-09-18-P12  
**Engineering status:** complete (owner UI acceptance pending)  
**Stop boundary:** before Phase 13

## What shipped

Phase 12 adds a versioned visual-aid interface and a small set of course-neutral educational 2D/3D examples any user-created course may enable. Visuals are optional and never replace readable text or keyboard-accessible controls.

| Area | Implementation |
| --- | --- |
| Domain | `packages/domain/src/visuals.ts` — versioned aid states, approved actions only, serialize/restore, narration, tutor action parsing (rejects arbitrary code) |
| Module | Subject visuals module `available: true` |
| Storage | `visual_experiments` migration; create/action/restore/export; course-transfer inclusion; `requireVisuals` gate |
| Service | `apps/local-service/src/visuals.ts` — experiments, actions, narration, tutor-action, export |
| UI | `VisualsWorkspace` — process sequence, coordinated exploration, legibility inspector; keyboard bindings |
| Instructional R3F | `packages/visuals/src/LegibilityAid.tsx` — distinct from decorative `GlassAtmosphere` |
| Theme | `visuals` semantic token across Botanical/Brutalist × light/dark; theme switch must not remount experiment identity |

## Aids

1. **Process sequence (2D)** — generic observe/relate/sequence/check relationship diagram with sources and keyboard step controls.
2. **Coordinated exploration** — selectable annotations, linked views, scrub/pause, prediction vs outcome comparison; motion not required.
3. **Audience-view legibility inspector (R3F/WebGL2)** — course-neutral distance, text size, and contrast inspector with no-GPU text alternative and inactive render stop.

## Constraints honored

- Course-neutral only: no COMM 110, syllabus, or assignment content embedded
- Decorative shell glass ≠ instructional WebGL aid
- Tutor may only invoke approved component actions through validated data
- No live API keys, paid provider requests, or model downloads
- No agent browser/UI/accessibility tests
- Synthetic fixtures only in Git

## Ordered checkpoints

| Step | Theme | Remote SHA |
| --- | --- | --- |
| 12.1 | Visual-aid contract + process sequence | `6da90b854aad17946c5859fa0c7246dd4d567a07` |
| 12.2 | Coordinated exploration | _(this delivery)_ |
| 12.3 | Legibility inspector | _(this delivery)_ |
| 12.4 | Tutor + saved activities + delivery | _(this delivery)_ |

## Non-UI verification

- `check:types`, `check:lint`, `build` — passed
- Unit: 32
- Integration: 256 (includes CHK-12.1–12.4)
- Evaluations: 2
- Planning: 6
- Workflow: 44

Private evidence: `.local/verification/phase12/` (gitignored).

## Pending owner-only

- Rendered Visuals workspace UX across Botanical/Brutalist × light/dark
- Keyboard and VoiceOver review of aid controls
- Human judgment of instructional R3F legibility vs no-GPU alternative
- Confirm theme switching does not reset an active experiment in the live UI

## Out of scope / next phase

Phase 13 (portability, resilience, extension) is **not** authorized.
