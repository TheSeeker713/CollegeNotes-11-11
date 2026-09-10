# Provider decision record — repair baseline

Subordinate to [PROJECT-PLAN.md](../PROJECT-PLAN.md). Primary documentation rechecked September 10, 2026. Documentation verification is not a real account test or an integration license determination. No connections, requests, SDKs or model downloads are made in this repair.

| Provider | API route | Account route classification | Required gate |
|---|---|---|---|
| OpenAI | Verified documentation: API key | Verified documentation: managed ChatGPT login through local Codex app-server; external-token mode experimental | Phase 8 must recheck permitted embedding, protocol/version, isolated credential storage, cancellation/logout and actual account limits |
| xAI | Verified documentation: bearer API key | API-only for this foundation; third-party subscription OAuth unverified | First-party Grok Build access does not establish permission for CollegeNotes; prove official route before offering sign-in |
| Anthropic | API credential route planned; verify exact header/version during adapter implementation | API-only for this foundation; arbitrary third-party subscription OAuth unverified | Claude Code login must not be reused as evidence of a CollegeNotes account entitlement |
| Google | Verified documentation: Gemini API keys | Verified documentation: desktop OAuth client flow | Register correct desktop client/scopes; verify endpoint entitlement and protected credential storage in Phase 8 |
| Future adapters | Awaiting approved adapter definition | Awaiting documented route and owner decision | No arbitrary endpoint, account reuse or new dependency enabled automatically |

Sources: [OpenAI app-server](https://learn.chatgpt.com/docs/app-server), [xAI inference authentication](https://docs.x.ai/developers/rest-api-reference/inference), [Grok Build enterprise](https://docs.x.ai/build/enterprise), [Claude Code setup](https://code.claude.com/docs/en/getting-started), [Google desktop OAuth](https://ai.google.dev/gemini-api/docs/oauth), [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key).

OpenAI supports managed account login and API login in the documented app-server protocol. This supports retaining both planned routes, not assuming access to ChatGPT history, unlimited usage, speech or arbitrary product APIs. xAI inference documentation explicitly uses bearer API keys. The other first-party product documents do not prove subscription access for a separate app. Google's tutorial documents desktop client registration; its example scopes and gcloud token storage are not a blanket prescription for CollegeNotes.

Provider definitions describe independent capabilities, supported authentication, models, costs/limits, policy links and health. Every connection starts disabled and untested. The local service owns credential references; the browser receives only safe connection summaries. Capability defaults never choose a fallback provider implicitly. Disabling stops requests; disconnect removes credentials and blocks future use; remove additionally deletes configuration and assignments while preserving course/source/research provenance. OAuth revocation failure remains visible and retryable.

The credential-store boundary is an interface in this pass; production Keychain and real vendor adapters belong to Phase 8. No fake credential store is used in production. Tests may use explicitly synthetic in-memory adapters. No secret belongs in browser persistence, logs, SQLite payloads, exports or Git.

Local course-scoped embeddings are required after a separately approved model download. Fresh cloud requests require explicit provider and transmission scope; prepared local work does not. Local generative inference is a separate optional decision. Preserve the existing stack pins and model-candidate decisions; no download or paid budget is authorized by this repair. Existing speech/storage/performance budgets remain in the acceptance and stack records.

Retained resource constraints: new paid API budget is $0; no purchase or paid fallback. One local speech job at a time; proposed speech worker RSS at most 2 GiB, combined application/browser at most 4 GiB, at least 20 GiB free disk, and proposed combined model/runtime allowance at most 2 GiB requires owner agreement before download. These are targets, not measured guarantees. Historical Kokoro-82M v1.0 and whisper.cpp base.en remain candidates only; revalidate versions, hashes, licenses and storage before Phase 10. No provider or model is selected by this repair.
