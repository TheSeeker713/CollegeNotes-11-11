# Phase 10.1 — narration providers

AUTH-P10 / PASS-2026-09-18-P10. CHK-10.1-01 through CHK-10.1-06 are covered by `tests/integration/narration-providers.test.ts`: real macOS `/usr/bin/say` WAV generation, source-text hashing, voice listing without downloads, measured startup/throughput, bad-voice and disabled-module failures, and zero cost/download bounds with cache reuse.

Domain audio contracts, local provider narration/transcription capabilities, `packages/providers/src/narration.ts`, storage `narration_assets` migration, local-service audio routes, Listen UI voice select/generate, and connection-settings narration/transcription assignment are included. No Kokoro/whisper downloads. MyceliaOS was mounted but unused for new model assets. Human listening naturalness remains owner-pending.

Non-UI gate: types, lint, build, 32 unit, 209 integration, 2 evaluation, 6 planning, 44 workflow. Integration `maxWorkers: 2` avoids native onnx/say fork crashes under high parallelism. Private evidence: `.local/verification/phase10/10.1/`.

Checkpoint is pending commit/push confirmation; the next step records the verified SHA without a recursive self-hash claim.
