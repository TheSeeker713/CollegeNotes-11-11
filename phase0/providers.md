# Provider strategy and budget boundaries

Choose the documented local Codex app-server route for subscription-connected tutoring. The official protocol supports embedding authentication and streamed conversations. The installed CLI exposes app-server (experimental); pin its observed version 0.153.3 as the integration reference and revalidate protocol compatibility before implementation. Its open-source implementation is Apache-2.0; hosted service access is separately governed. [App-server](https://learn.chatgpt.com/docs/app-server), [authentication](https://learn.chatgpt.com/docs/auth), [source license](https://github.com/openai/codex/blob/main/LICENSE).

The companion owns a stdio child and performs initialize/initialized. Use managed ChatGPT login via account/login/start, then account/read, account/rateLimits/read and account/logout. Browser UI receives availability, never tokens. In Phase 8, verify login, minimal real request, sign-out, account limits and rejected credentials. Recheck changes since the pinned CLI. Do not disturb this development session's credentials to simulate application login.

This is documentation validation, not an implemented or tested account integration. No general ChatGPT memories/history or speech entitlement is established. API-key usage is separate paid access. If the selected route becomes unsupported, resolve the mandated requirement with the user before production; no silent API replacement.

| Capability | Selected route / candidate | Network | Offline boundary / verification phase |
|---|---|---|---|
| Fresh source-grounded text tutoring | Codex app-server managed ChatGPT | Required | No fresh cloud response offline; real account and course-grounding evals in 8 |
| Reading, search, notes, prepared activities | Local files + SQLite + browser cache | No after setup | Must work disconnected; 7 and 13 |
| Prepared natural narration playback | Locally saved audio | No | No regeneration on replay; 10 and 13 |
| New local natural narration | Kokoro-82M v1.0 candidate | Download needed first | Runtime/voice audition in 10.1; not installed or yet accepted |
| Local speech recognition | whisper.cpp base.en candidate | Download needed first | Actual microphone and accuracy/latency in 10.3 |
| Optional paid speech generation | OpenAI speech API candidate | Required for new audio | Separate API budget and adapter approval; not enabled |
| Optional live cloud voice | Realtime candidate | Required | Separate paid route; not needed merely to connect local STT, tutor and cached speech |
| Fresh local tutoring | Deferred optional model | Model download first | Not required v1; separate selection and actual 13.1 evaluation if added |

New paid API budget: $0 authorized. No purchases, credits, pay-as-you-go fallback or API request. Existing ChatGPT subscription allowance may support the chosen route subject to the actual account's limits; no unlimited access assumption. A future API request needs a user ceiling, usage estimate, hard preflight cap and explicit consent; block only that paid adapter, preserve required narration via auditioned local candidates. [Authentication billing distinction](https://learn.chatgpt.com/docs/auth), [speech API](https://developers.openai.com/api/docs/guides/text-to-speech).

Model candidates are documented, not approved downloads. Kokoro revision f3ff3571791e39611d31c381e3a41a3af07b4987 contains kokoro-v1_0.pth (Apache-2.0 weights). whisper.cpp base.en is the initial English recognition candidate; published base model guidance estimates 142 MiB disk and ~388 MB memory, with Apple Silicon support. Before Phase 10 downloads, pin the runtime release/commit and exact model hash, enumerate all runtime/voice assets and licenses, agree total storage, then measure. Qwen3-TTS is not selected for the initial 16 GB device budget. No model is silently installed in Phase 3. [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M), [whisper.cpp](https://github.com/ggml-org/whisper.cpp).

Initial engineering envelope: one local speech job at a time, no local language model competing with 3D, speech worker RSS at most 2 GiB and total application/browser processes at most 4 GiB in the defined workload. Reserve at least 20 GiB free disk; proposed combined model/runtime allowance at most 2 GiB requires agreement before download. These are conservative targets inferred from reference memory and small model candidates, not measured guarantees. Naturalness still requires user listening; if no local candidate meets it, pause the affected Phase 10 criterion for a concrete provider/budget decision.
