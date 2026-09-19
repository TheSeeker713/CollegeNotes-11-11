# Phase 10 — owner manual tests

Engineering checks are complete. These steps are **owner-only**. Agents must not run browser, VoiceOver, screenshot, or live mic acceptance. Human listening naturalness is pending here, not passed.

## Prerequisites

1. Local service and web app running (`npm run dev` or your usual launch).
2. Create or open a course; enable the **Audio** module.
3. Import a short text source, review, and approve it.
4. Optional: enable a local connection with Narration/Transcription capabilities — generation uses macOS Say regardless of cloud keys.

## Listen / narration (10.1–10.2)

1. Open the course home with Audio enabled. Confirm the Listen panel lists system voices.
2. Choose an approved source and a voice. Generate narration. Confirm a WAV plays and timing appears in the status line.
3. Generate again with the same voice/source. Status should indicate reuse (no new generation).
4. Play, pause, change speed, seek. Confirm the highlighted sentence tracks the playhead.
5. Reload the app and reopen the saved narration. Playback should resume near the last offset without regenerating.
6. **Naturalness (owner judgment):** listen to a full paragraph. Note whether the voice is acceptable for study; this criterion is not claimed by engineering.

## Microphone / recognition (10.3)

1. Start capture once. Grant or deny the system prompt as you choose.
2. If denied: try Start again — there should be **no** repeated permission popup loop; you should see a clear message.
3. If granted: confirm capture stops/releases after the control finishes; the transcript is editable.
4. Enter a technical-term correction (from → to), save, and confirm the edited text updates.
5. Unplug or disable the mic if practical and confirm a missing-device style message (or skip if you cannot safely test hardware).

## Interrupt / teach-back (10.4)

1. While narration is playing, use **Ask a question (interrupt)**. Confirm audio pauses and an offset is saved.
2. Confirm the UI reports echo suppression while a tutor-audio turn would be active.
3. Resume narration and confirm playback continues from the saved offset.
4. Optionally cancel an interrupt and confirm status becomes cancelled without a duplicate tutor response.
5. With tutoring available (optional), ask a source-grounded question after interrupt and confirm the reply cites course material rather than inventing authority.

## Theme / Listen card (owner visual)

1. Switch Botanical/Brutalist and light/dark. Confirm Listen controls remain usable and theme changes do not restart audio or force re-generation.
2. Move/pin the Listen card if shown in the workspace grid; transport should stay independent of the move handle.

## Record your result

Mark each area pass/fail with notes. Engineering does **not** invent acceptance from this guide.
