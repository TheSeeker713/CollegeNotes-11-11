# Phase 12 — owner manual tests

Engineering checks are complete. These steps are **owner-only**. Agents must not run browser, VoiceOver, screenshot, or usability acceptance. UI/UX acceptance is pending here, not passed.

## Prerequisites

1. Local service and web app running (`npm run dev` or your usual launch).
2. Create or open a course; enable **Subject visuals** (and optionally Tutoring for tutor-action checks).
3. Do **not** expect any COMM 110, syllabus, or assignment content to appear automatically.

## Process sequence (12.1)

1. Open Visuals. Start a process sequence. Confirm step labels and units (e.g. “step 1 of N”) are visible without relying on motion.
2. Use Next/Previous and arrow keys. Confirm selection and explanation text update predictably and clamp at the ends.
3. Follow at least one source link. Reset and confirm return to the first step.
4. Reload the app; confirm the experiment restores if you left it mid-sequence (or recreate and verify serialize/restore behavior via export).

## Coordinated exploration (12.2)

1. Start coordinated exploration. Confirm it can be understood while paused (motion not required).
2. Scrub the process; select annotations; switch Overview / Detail / Timeline. Confirm views stay synchronized.
3. Enter a prediction, then Compare. Confirm the comparison text reflects your prediction and an outcome explanation.
4. Confirm depth is only a hierarchy cue and does not hide the readable explanation.

## Legibility inspector (12.3)

1. Start the audience-view legibility inspector. Confirm a readable no-GPU explanation is always present.
2. Adjust audience distance, text size, and contrast. Confirm the summary updates.
3. Activate rendering only when you want the instructional WebGL view; deactivate and confirm it stops (no background spin while inactive).
4. If WebGL is unavailable on your machine, confirm the text alternative remains usable.
5. Confirm this aid is separate from the decorative shell glass behind the app chrome.

## Tutor + save/export (12.4)

1. With Tutoring enabled, exercise only approved aid actions (step next, scrub, etc.). Invalid or code-like payloads must be rejected if exposed.
2. Confirm narration matches the actual step/explanation after an action.
3. Export visual experiments and confirm your prediction/state is preserved.
4. Disable Subject visuals; confirm the workspace is gated. Re-enable and confirm experiments remain.

## Theme / reduced motion (owner visual)

1. Switch Botanical/Brutalist and light/dark while an experiment is open. Confirm labels and no-GPU alternatives stay legible in all four combinations and the active experiment is not remounted/reset.
2. Enable reduce-motion / reduce-transparency preferences and confirm aids remain usable.
3. Confirm instructional aid surfaces feel distinct from decorative card glass.

## Record your result

Mark each area pass/fail with notes. Engineering does **not** invent acceptance from this guide.
