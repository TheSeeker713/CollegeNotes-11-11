# Phase 9 owner-only manual UI/UX guide

All checks below are pending. Agents must not execute them. Record your result and the build SHA from the Phase 9 final receipt. Use a throwaway course so deletion checks do not affect valued material.

## Start the build

1. Restart your usual CollegeNotes launcher after updating to the recorded checkpoint. From the repository, the existing development command is `npm run dev`; the local UI is at `http://127.0.0.1:5173`.
2. Create a throwaway course and enable Study and Reading. You do not need an AI connection or MyceliaOS models for prepared study.
3. In Sources, import a small text file: “Water freezes at zero degrees Celsius under standard conditions. Ice is solid. Steam is gas.” Review and approve its extracted text.

## Create and use the six activity formats

1. Open the course's Study screen and expand Create an activity. Select the approved source and an exact excerpt; changing its wording should fail validation.
2. Create a multiple-choice item: question “Which state is ice?”, choices `solid` and `gas` on separate lines, prepared answer `solid`. Add a rationale, rubric criterion and two graduated hints. Save.
3. Create a classification item with items `ice` and `steam`, choices `solid` and `gas`, and answers `solid` then `gas`, one per line.
4. Create evidence matching with two items and matching evidence choices; provide one answer per item in the same order.
5. Create ordering with items `second` then `first`, and prepared answer `first` then `second`, one per line. Use the labeled Move earlier/later buttons when attempting it.
6. Create short recall and prediction items with a prepared reference answer. Prediction requires a written explanation at submission. Both should report “needs review,” include the rubric, and never claim a grade.
7. Mark an objective item ambiguous; a matching answer must still require review.

## Attempts, hints and teach-back

1. Start an attempt. Confirm the answer and rationale are not displayed initially.
2. Enter a response and teach-back text. Wait for “Saved locally.” Open another screen, return, and use Open attempt; confirm both texts remain.
3. Request one hint at a time. Confirm only the requested hints appear.
4. Submit, inspect feedback, then explicitly reveal the prepared answer and rationale. Reload and reopen; submission and reveal state should remain.
5. Try a fresh attempt. It should have a new empty response (or original item ordering), no revealed hints/answer, and retain the previous attempt in history.
6. Open the same attempt in two windows and edit it. A conflicting write must show an error instead of silently replacing newer saved work. Preserve/copy your text before reloading a conflicted window.

## Review and history

1. Open Progress. Confirm submitted attempts, unassisted objective correctness, assisted attempts and explanations awaiting review are distinguished. Reading a page must not award recall credit.
2. Change the daily workload; reload and confirm persistence. Values outside 1–50 must be refused.
3. Reset a prepared activity's review schedule. It should become due without deleting attempts. Undo should restore the prior schedule; submitting new work after reset should make the old undo unavailable.
4. Confirm the UTC workload-day explanation is visible. Overdue work should remain available after missed days without a streak penalty.

## Short sessions and offline use

1. Reset several prepared activities to due and choose a session length of two or three.
2. Start a session, write an unfinished answer and explanation, request a hint, wait for save, then Pause.
3. Reload or restart the local app. Resume and confirm the same activity, response, explanation and hint are restored.
4. Submit, reveal, then continue. Each continuation should advance once and retain prior history. Finish and confirm the app allows you to stop.
5. Disconnect internet while leaving the local service running. Prepared study, feedback, pause/resume and saved history should continue without a provider prompt.
6. Stop the local service while editing. Confirm a save error appears; your current-window text must stay visible. Restart and retry saving. Do not close the window while unsaved work remains.

## Source lifecycle, export and modules

1. Export the throwaway course and inspect the JSON for study activities, attempt text, schedules and sessions. Credentials must not be included.
2. Correct a source. Its old activities must say they need rebuilding and refuse new use. Create replacement activities from the newly approved source; historical attempts should not count as current-source recall evidence.
3. Delete the source permanently using the existing confirmation. Dependent study content should disappear; an open session should offer to continue past the unavailable item.
4. Disable Study, then enable it again. Retained course study data should return. A different course must not show this course's attempts.
5. Delete the throwaway course after exporting anything you want to retain.

## Desktop review — CHK-9.4-03 and theme additions

1. Review Botanical and Brutalist, each in Light and Dark, at 1440×900, 1024×700 and 200% zoom.
2. Use keyboard only for authoring, choices, ordering, hints, reveal, pause/resume and schedule controls. Ordering must not accidentally move a glass card.
3. Use VoiceOver to inspect labels, groups, feedback and save/error announcements. Record any missing or confusing labels.
4. Confirm status and correctness use words rather than color alone. Review reduced motion and reduced transparency.
5. Switch appearance during an unfinished attempt and after reveal. Confirm text, hints, reveal state and schedules remain unchanged.
6. Record defects with the build SHA and exact steps. Do not mark visual acceptance until you have reviewed the rendered app.
