# Phase 11 — owner manual tests

Engineering checks are complete. These steps are **owner-only**. Agents must not run browser, VoiceOver, screenshot, or usability acceptance. UI/UX acceptance is pending here, not passed.

## Prerequisites

1. Local service and web app running (`npm run dev` or your usual launch).
2. Create or open a course; enable **Presentation practice**.
3. Do **not** expect any COMM 110, PQP curriculum, syllabus, or assignment content to appear automatically.

## Observations / feedback (11.1)

1. Open Practice. Write a Praise entry and save. Confirm your exact wording is kept (spacing/punctuation).
2. Switch to Question. Try submitting a non-question statement — expect a clear requirement for an actual question. Submit a real question successfully.
3. Confirm word-count feedback shows a count without inventing a maximum.
4. Confirm the UI does not inject class-specific curriculum text.

## Speech review (11.2)

1. Import a supported audio or video practice file. Confirm unsupported types fail clearly.
2. Open the transcript, seek, and add an annotation at a timestamp. Edit the transcript text; reload the app and confirm annotations and corrections remain.
3. For audio-only media, attempt any “visual delivery” style claim if exposed — expect refusal rather than invented visual analysis.
4. Confirm media stays local (no upload/cloud claim in the UI).

## Rehearsal and cues (11.3)

1. Add cue cards with your own titles/notes. Confirm notes are not rewritten by the app.
2. Start a rehearsal. Confirm the timer advances, and that stop/cancel behave as labeled.
3. Advance/select cues during rehearsal without losing your notes.
4. If no speech duration is configured, confirm the UI does **not** invent one.
5. Optional: run slide readability inspection on a short user-supplied text sample and note clipping/reflow messaging.

## History and export (11.4)

1. Complete at least one observation, checklist item, and rehearsal. Open practice history and confirm distinct entries.
2. Set or clear an assignment status only if you supply it yourself — the app should not invent graded assignment state.
3. Export practice records. Confirm the export matches your writing and does not add prohibited outlines/citations.
4. Disable the practice module and confirm Practice is gated until re-enabled.

## Theme / Practice card (owner visual)

1. Switch Botanical/Brutalist and light/dark. Confirm Practice controls remain usable and readable.
2. Confirm practice surfaces feel consistent with the glass shell without hiding user content.

## Record your result

Mark each area pass/fail with notes. Engineering does **not** invent acceptance from this guide.
