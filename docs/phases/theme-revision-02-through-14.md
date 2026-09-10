## Theme revision — applies from Phase 2 through completion

> **Desktop scope correction (CHANGE-DESKTOP-CONNECTED):** references below to “narrow,” 390px, responsive multi-device layouts or touch review are superseded. Preserve the same visual system in the single-user macOS desktop app, test the 1440×900 reference window, the agreed minimum usable desktop window (initial target 1024×700), and 200% zoom/reflow. No phone, tablet, touch or 290/390px capture is required. Phase 8 additionally includes explicit OAuth connections, local-embedding hybrid retrieval and provenance-linked internet research; Phase 14 packages a Mac app rather than a hosted/multi-device product.

The user selected four generated references: Botanical Organic Glass (images 1 and 3) and Brutalist Glass Lab (images 2 and 4). These represent two selectable themes, not four separate themes. This amendment supersedes earlier A/B/C and Neo Retro-only proposals wherever they conflict. Phases 0 and 1 and their completed records are unchanged.

**Planned default:** Botanical Organic Glass in Light mode. Choosing Botanical as the default is a planning decision based on the selected references; the user explicitly required Light as the default but did not rank the two themes.

**Theme and mode are independent settings.** Offer Botanical Organic Glass and Brutalist Glass Lab, each in Light and Dark. First launch always uses Botanical + Light, including when the operating system uses dark mode. Provide an accessible labeled Dark mode toggle and a theme selector in Settings → Appearance. Apply changes immediately, preserve them across restart and offline use, and retain the chosen mode when changing theme. Reset appearance returns to Botanical + Light. Preferences are application-wide; per-course card layouts are stored separately.

**Botanical:** cream/mineral canvas, sage Notes cards, clay Study cards, pale-blue Listen cards, softly rounded thick glass, restrained contour backgrounds and expressive serif headings with readable sans-serif prose. Use image 3 as the primary layout reference and image 1 for labeled navigation and material details.

**Brutalist:** light grid canvas, clear squared glass rims, strong black title bars, condensed typography, electric-blue selection and orange arrangement guides. Use image 4 for orderly composition and image 2 for lifted-card depth. Black title bars are compatible with Light mode; they do not make the entire application dark. Coordinates, height measurements and stacking diagnostics belong in an optional Arrange view, not permanent reading clutter.

**Dark variants:** design and review intentional dark palettes for both themes, preserving their identities, readable text surfaces, visible borders, focus and depth. Do not simply invert reference pixels. The supplied references establish appearance directions; full dark layouts, supported desktop resizing/zoom, and required error/offline states still need design review.

**Shared interaction:** movable Source, Notes/Tutor, Study and Listen cards; visible handles, pinning, free placement or snap, keyboard Move controls, Undo move and Reset layout. Use a coherent upper-left light, contact shadows at rest, and wider/softer/displaced shadows on lift, including overlap on lower cards. Keep reading and editing independent of dragging. Theme/mode changes preserve positions, drafts, source anchors, focus, playback and study state. Supported desktop window sizes and zoom retain every function; reduced motion and reduced transparency retain every function. Bound and recover off-screen cards.

**Reference fidelity:** images guide materials, spacing and hierarchy, not source facts or feature removal. In particular, the generated “27% higher scores” claim is not verified course content. Preserve the existing complete navigation and source-grounding requirements. Avoid copying illegible icons or unsupported claims into production.

**Scope:** this is a plan revision only. It does not implement later phases or declare Phase 2 complete. Existing acceptance gates remain.

### Phase 2 additions

Work: revise Steps 2.1–2.2 around the two selected themes, independent mode control, shared movable-card interaction and application-wide appearance persistence. Define semantic tokens for all four theme/mode combinations, including text backing, glass, focus, borders, status and shadow elevation. In Steps 2.3–2.4 produce and review the full desktop screen/state family and Appearance settings at the reference/minimum desktop windows and 200% zoom. Retain the selected image references and identify remaining discrepancies.

Deliverables: revised design system, four-variant token specification, theme/mode switching flow, drag/keyboard/recovery specification and reviewed images/prototype.

Required added checks: default Botanical + Light is explicit; dark OS preference does not override a fresh default; all four combinations have readable text and control contrast; resting/lifted shadows are distinct; switching preserves tasks and layout; reduced-motion/transparency, supported desktop resizing and zoom are specified. Selected reference images do not substitute for complete state coverage or final design acceptance.

### Phase 3 additions

Work: in Steps 3.1–3.2 plan/install only approved support for shared semantic styling and accessible movable cards, and configure component/browser fixtures for both themes × both modes. In Step 3.4 verify theme assets and fonts are available locally. This amendment does not itself authorize installation.

Deliverables: reusable appearance test fixtures and locally bundled theme resources.

Required added checks: test discovery includes all four combinations; default-mode and saved-preference fixtures are meaningful; no theme needs a runtime CDN or paid service; glass fallback can be tested without optional GPU support.

### Phase 4 additions

Work: implement the theme selector and labeled Dark mode toggle in Step 4.1, shared glass-card primitives and arrangement controls. Persist versioned appearance preferences and per-course layouts in Steps 4.2/4.4. Resolve the initial palette before first paint and safely fall back from missing or invalid preferences.

Deliverables: two switchable themes, Light default, optional Dark, persistent appearance and accessible card arrangement.

Required added checks: clean profile starts Botanical + Light even under dark OS settings; each of the four combinations renders; stored explicit choice survives restart; theme switching retains mode; appearance reset restores defaults; invalid preferences recover; keyboard move/cancel/pin/reset works; theme changes preserve drafts, focus and card positions without a flash of the wrong mode.

### Phase 5 additions

Work: apply shared appearance primitives to courses, requirements and course home in Steps 5.1–5.4. Keep appearance global and restore layouts independently per course.

Required added checks: all four combinations preserve requirement/source/conflict readability; switching course does not reset appearance or mix layouts; switching theme does not change course facts, deadlines or completion.

### Phase 6 additions

Work: apply themes to import, progress, extraction review and correction in Steps 6.1–6.4. Render original source documents/images faithfully without recoloring their pixels; theme only the surrounding application controls and extracted-text views.

Required added checks: original/extracted distinction, correction focus, error labels and progress remain clear in all four combinations; switching appearance during import/correction preserves jobs and unsaved edits; dragging a card does not intercept file drop or text selection.

### Phase 7 additions

Work: implement themed reading, annotations and controls through Steps 7.1–7.4. Bundle both theme/mode assets for offline startup. Keep source originals faithful while reflowed prose follows accessible theme tokens.

Required added checks: text, selection, highlights, bookmarks and source links remain legible across four combinations, supported desktop windows and 200% zoom; switching preserves exact passage/scroll/annotation state; disconnected cold-start restores the saved appearance; reduced transparency and motion preserve reading and card controls.

### Phase 8 additions

Work: apply shared appearance to OAuth connections, local hybrid retrieval, internet research, tutor, source evidence and availability states in Steps 8.1–8.4. Appearance is local presentation state, independent of provider/account choices.

Required added checks: imported/course source, internet research evidence and model explanation remain distinct; unavailable/error states are clear across four combinations; theme/mode switching preserves unsent questions, research sessions and active responses; it triggers no account change, request replay or extra provider call.

### Phase 9 additions

Work: theme all activity templates, hints, attempts, feedback and history in Steps 9.1–9.4. Use consistent semantic states rather than theme-specific color meaning.

Required added checks: each activity/state remains usable across four combinations; correctness and status do not rely on color alone; switching preserves attempts and reveal state without changing scores or review scheduling; keyboard ordering works independently of card dragging.

### Phase 10 additions

Work: theme playback, transcript highlighting, voice settings and microphone states in Steps 10.1–10.4. Keep the Listen card movable and pinnable with transport controls independent of its handle.

Required added checks: controls, waveform, seek and live recording indicators are readable across four combinations; changing theme/mode or moving Listen does not restart audio, change speed, lose offset, stop capture unexpectedly or request duplicate generation; reduced motion retains explicit recording status.

### Phase 11 additions

Work: apply both themes and modes to PQP, media review, cue cards, rehearsal and course history in Steps 11.1–11.4. Preserve original media colors and user-authored content; keep rehearsal cues readable at larger sizes.

Required added checks: all four combinations support practice/rehearsal and error states; switching preserves writing, timer, cue position and recording; exported content remains faithful and printable rather than inheriting decorative glass backgrounds.

### Phase 12 additions

Work: use shared semantic appearance in visual-aid controls and explanations in Steps 12.1–12.4. Keep decorative card glass/shadows separate from the optional instructionally justified WebGL2 aid. Changing theme must not remount or reset an active experiment.

Required added checks: labels/legends and 2D/no-GPU alternatives remain legible in all four combinations; state and narration survive switching; reduced-motion/transparency work; combined glass/audio/visual workloads meet the agreed device budget; stop inactive rendering.

### Phase 13 additions

Work: cover theme assets and saved appearance in offline readiness (13.1), and add an explicit optional application-preferences section to backup/restore (13.2). Default course-only restore leaves current appearance unchanged; restoring preferences requires an explicit preview selection. Include extension and resilience coverage in 13.3–13.4.

Required added checks: offline cold-start and offline switching work for all four combinations; preference restore round-trips when selected, course-only restore preserves current preference, unknown theme IDs fall back safely, and interrupted restore keeps existing state; new modules consume shared tokens; combined workload and accessibility checks cover both themes/modes.

### Phase 14 additions

Work: package both themes and all local assets in 14.1; document theme selection, mode toggle, default/reset, arrangement and accessibility options in 14.2. Add appearance coverage to release acceptance (14.3) and final manual testing (14.4).

Required added checks: a fresh packaged macOS install launches Botanical + Light even on a dark OS; explicit Dark and theme choices survive restart/offline use; verify all four combinations, supported desktop resizing/zoom and accessibility fallbacks; user switches theme/mode during reading/audio, confirms state retention, and tests reset and backup preferences. Completion requires passing these added checks and explicit final acceptance.
