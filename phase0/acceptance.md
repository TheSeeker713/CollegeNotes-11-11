# Measurable acceptance baseline

These are initial acceptance targets, not observed performance. REF-MAC-01 is the actual reference Mac inventoried privately in `.local/verification/environment.json`: hardware, OS, Chrome build, developer tools, disk and observation time. A user-review copy includes the device summary. Record any changes for each test and rerun affected measurements. No benchmarks ran in Phase 0.

Default conditions: AC power, low-power mode off, cool machine, no unrelated compute jobs, dedicated Chrome profile/extensions disabled, production build, service loopback, fixed fixture hashes and exact app/lockfile/browser revision. Record display/DPR, OS and background load. Run each latency workload as specified; nearest-rank p95 is sorted sample at ceil(0.95*N). Preserve all samples, failures and traces. A provider timeout counts as a failure. Required checks cannot be weakened or dropped after a failure.

Fixtures are specifications for Phase 1/3, not existing product fixtures. Use synthetic or redistributable public documents; private course/voice examples stay local. Each fixture needs expected output, hash, source license, size/page count and known failure states before execution. The approved visual's exact scene is frozen in Phase 2; any necessary adjustment to its workload reopens the budget decision before testing.

## P-INTERACT — p95 <=200 ms

Requirement R-PERFORMANCE; phases 7, 13; device REF-MAC-01.

Workload: 100 actions per run, 3 runs: course switch, next passage, saved note, open source, local search; 3 synthetic courses / 100 documents / 10,000 passages / 1,000 attempts.

Method: performance marks from input event to next painted settled result; sort all samples per action, nearest-rank p95; report each run and worst run; no averaging away failed actions.

## P-LAUNCH — p95 <=5 s

Requirement R-LOCAL; phases 14; device REF-MAC-01.

Workload: 20 cold application launches of the installed macOS build with its local companion stopped; prepared 500-page course pack; network disconnected. During the interim browser stage, measure the equivalent launcher-to-local-browser flow separately and do not call it final packaging acceptance.

Method: monotonic time launcher invocation to interactive restored reading position; measure end-to-end, include service startup; OS filesystem cache state documented; final acceptance requires no developer server.

## P-3D — target 60 fps; reduced mode >=30 fps in every rolling 1-second window

Requirement R-VISUALS; phases 12, 13; device REF-MAC-01.

Workload: approved aid, initial ceiling 100k triangles/100 draw calls/32 MiB textures; 120 seconds manipulation after 10 seconds warmup; simultaneous cached narration; rendering viewport 1440x900 CSS px, DPR capped 2.

Method: requestAnimationFrame intervals plus Chrome frame trace; target p95 frame time <=16.7 ms; reduced p95 <=33.3 ms and minimum rolling fps 30; list long stalls; context-loss and no-GPU checks separate.

## P-AUDIO-CACHE — p95 <=200 ms start/pause/seek; resume offset error <=250 ms

Requirement R-PLAYBACK; phases 10, 13; device REF-MAC-01.

Workload: 30 trials each action on local 20-minute narration; with and without approved visual aid.

Method: UI event to measured playback state/audible output using loopback recording where needed; compare saved position after restart, silence detection reviewed.

## P-TTS — p95 <=2 s first local audio; real-time factor <=1.0

Requirement R-NARRATION; phases 10; device REF-MAC-01.

Workload: 20 fixed 150-word passages plus one 2,000-word passage; selected local voice; cached model warm; cold load reported separately.

Method: time submit to first audible chunk and total generation time/audio duration; real audio and user naturalness review; no synthetic provider timings.

## P-STT — p95 <=2 s final transcript after speech ends; WER <=15% on clear standard passage set

Requirement R-VOICE; phases 10; device REF-MAC-01.

Workload: 20 recorded 15–30 second passages with known reference text and 20 live microphone trials; quiet room, technical vocabulary list; transcripts editable.

Method: monotonic end-of-speech to final text; WER from reviewed reference transcript; separately report technical-term errors and spontaneous-speech limitations; do not infer success from simulated microphone.

## P-VOICE-TURN — p95 <=10 s first spoken answer; interruption stops output <=200 ms

Requirement R-VOICE; phases 10; device REF-MAC-01.

Workload: 20 spoken source-grounded questions, bounded context <=8,000 tokens, answer <=120 words, selected account model, local STT/TTS, stable network; 20 interruptions.

Method: speech end to first audible answer across all stages; record RTT/downlink and rate limits; timeout/error trials reported as failures, not discarded; unavailable/offline state checked independently.

## P-MEMORY — total app+dedicated Chrome processes <=4 GiB peak RSS; each speech worker <=2 GiB

Requirement R-PERFORMANCE; phases 10, 12, 13; device REF-MAC-01.

Workload: 15-minute mixed reading/search, 20-page 150dpi OCR batch, cached audio plus approved visual; only one inference worker; no local LLM.

Method: sample per-process RSS once/second including children and dedicated Chrome profile; report peak and memory pressure; activity monitor cross-check; do not call this all-system RAM.

## P-DISK — retain >=20 GiB free before large jobs; model/runtime proposal <=2 GiB only after agreement

Requirement R-BACKUP; phases 3, 10, 13; device REF-MAC-01.

Workload: download preflight with exact artifacts and backup/import estimates; low-disk synthetic scenarios.

Method: compare statfs free bytes with expected staging+final sizes and reserve; reject safely before write; show exact download sum; no present download authorization.

## P-SAVE — 0 lost committed records; 0 duplicate attempts; explicit unsaved state on failure

Requirement R-PROGRESS; phases 4, 7, 9, 10, 13; device REF-MAC-01.

Workload: 10 restart/interruption trials per reading/draft/activity/audio state; abrupt companion termination after commit acknowledgement.

Method: compare exported IDs/content/offsets and SQLite integrity after restart; acknowledged durability verified from storage, not just UI toast.

## P-IMPORT — 100% required known facts correct or explicitly awaiting correction; 100% original hashes retained

Requirement R-INPUTS; phases 6; device REF-MAC-01.

Workload: synthetic native and scanned PDF, PNG screenshot, text/notes, DOCX, EPUB; 20-page 150dpi OCR, duplicates/updates/malformed archives; anchors ground-truthed.

Method: fixture expected text and anchors vs output; review uncertain OCR numbers/reading order; corrupted input rejected; byte hashes before/after; UI still meets interaction budget.

## P-A11Y — all applicable WCAG 2.2 AA criteria pass; zero unresolved required manual cases

Requirement R-A11Y; phases 2, 4, 7, 10, 12, 14; device REF-MAC-01.

Workload: 1440x900 reference window, agreed minimum usable desktop window (initial target 1024x700 CSS px), and 200% zoom/reflow; keyboard-only, VoiceOver, reduced-motion, reduced-transparency and graphics-disabled core flows. Phone, tablet, touch and 290/390px captures are not required.

Method: axe plus criterion-by-criterion manual review, contrast calculation and focus/reflow inspection; automated zero violations alone is insufficient.


Voice and model budgets are engineering targets informed by the actual 16 GB reference device and the documented small speech candidates, not vendor guarantees or measured throughput. Phase 10 must satisfy real audio, physical microphone and human naturalness checks together. A failed audition cannot be relabeled optional; repair or resolve the blocking provider choice with the user.

Additional functional acceptance remains in all 28 requirement rows and controlling phase checks: local embedding retrieval, source-grounded and provenance-linked internet research, prohibited-outline behavior, offline cold start, backup hash/record equality, migration, policy conflicts, recovery, modules and real account/OAuth authentication. This performance register supplements, rather than replaces, those obligations.
