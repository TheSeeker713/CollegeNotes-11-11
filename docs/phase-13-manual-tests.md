# Phase 13 — owner-only manual checks

These are the owner's UI/UX checks. Engineering has not run a browser, screenshot, VoiceOver, keyboard or usability acceptance test. Use synthetic material first; no real course is preloaded.

1. In a user-created course, add a short source, make an annotation and a study attempt, and prepare an offline pack. Disconnect the local service, reopen the prepared library and confirm reading, saved study content, narration and visuals that were actually listed in the pack remain available. Fresh cloud tutoring should be described as unavailable.
2. In Courses, download a backup with media and optional appearance preferences. Review that the JSON is saved where you expect, keep the file private, and use a clean CollegeNotes data profile for restore. Preview must show the course and counts before Restore. After restore, compare original text, annotation, attempt, narration, visual state, module choices and layout. Rebuild the local index before preparing a new offline pack.
3. Restore the same backup again. The app should show a conflict and preserve the existing course. Try a deliberately corrupted copy; it should be rejected before writing. Do not use irreplaceable material for these destructive trials.
4. Restore once without appearance preferences and once with the explicit preference checkbox. Confirm the first leaves current Botanical/Brutalist and Light/Dark choices alone; the second applies the backed-up choice. Check all four combinations, reduced motion/transparency, keyboard navigation, VoiceOver labels, supported desktop size and 200% zoom.
5. Disable and re-enable a course module. Confirm its saved work remains. Switch between two user-created courses and confirm reading/search/results do not cross courses.
6. Verify Research, Tutoring, microphone recognition and spoken tutor interruption state their current unavailability and do not create synthetic results or request microphone access. Existing local narration playback should still work.
7. Check the generic Visuals background links are not described as evidence from your imported source. Review the no-GPU text alternative and confirm a theme switch does not reset an active experiment.

Record pass/fail and any screenshots or device details privately. The agent cannot count these checks as passed without your result. Phase 14 remains gated.
