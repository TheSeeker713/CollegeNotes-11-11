# Phase 8.1 progress — bring-your-own AI

September 17, 2026. **Partial implementation; not a Phase 8 completion receipt.** Owner authority: AUTH-P8 and CHANGE-P8-BYO. Manual testing remains owner-only and deferred until after Phase 8.

## Implemented

- Inspected the designated external AI drive before implementation. Existing small OCR/embedding assets were copied and hash-verified in the app's external model directory. Missing external storage fails closed. No generative model was downloaded, installed or invoked; existing shared local-AI services were not changed. Detailed device inventory and copy evidence remain private.
- Added an optional OpenAI-first onboarding prompt with skip, and a Connections module with separate named profiles for multiple accounts of the same provider. Users can select, rename, disconnect and remove connections independently of courses.
- OpenAI account profiles use separate local app-server homes with mandatory Keychain storage, official sign-in links, cancel and logout. The transport exposes authentication only; no agent tools or course transmission. Tests use synthetic app-server responses, not live account access.
- OpenAI and xAI are the two account-sign-in choices. Anthropic and Google are API-only. API/local-model profiles accept explicit endpoint and model configuration without contacting the endpoint. Unsupported HTTP destinations, URL credentials/query strings, unexpected secret fields and unsupported sign-in types are rejected.
- Added a compiled native macOS Keychain helper and end-user credential save/removal controls. No secret is passed in process arguments, metadata, exports or browser persistence. Failed saves retain cleanup intent; failed removal retains the configuration for retry. Development did not enter or test API keys or exercise the real Keychain with credentials.
- Connection mutations are serialized. Removing a profile clears its selection. Synthetic tests cover independent account homes, reconnect/removal, unsupported routes and credential cleanup failures.

## Verification and separate source audit

The latest full run passed all ten commands: type checks, lint, native helper compilation, application build, 25 unit tests, 121 integration tests, one existing synthetic evaluation, planning verification, 44 workflow tests and six gate-harness checks. There were no skipped cases. Source hashes were unchanged during the run. Evidence and earlier failed runs are retained under `.local/verification/phase8/8.1`.

The separate source audit checked authentication isolation, credential handling, mutation ordering, removal after reconnect, export boundaries and honest unavailable states. It found and repaired the reconnect/removal revocation issue and re-ran the full suite. These engineering results do not prove actual provider access, native Keychain behavior with a real credential, model response quality or manual UI acceptance.

## Outstanding work

Phase 8.1 is still open. Capability assignments and complete connection availability controls remain; inference adapters and the ordered retrieval/research/tutoring steps have not been completed. No phase-complete flag or subsequent-phase authorization is implied by this partial checkpoint.

xAI documents OAuth for Grok Build and an ACP tool integration, including an isolated `GROK_HOME`. The installed CLI and current documentation describe persistent `auth.json` storage. A supported Keychain-backed route has not been established. The UI therefore allows separately named Grok profiles but accurately marks sign-in unavailable. No existing Grok credentials were read, copied or used. Do not resolve this by silently allowing plaintext token persistence or inventing OAuth client credentials.

Relevant primary documentation:

- [OpenAI app-server authentication](https://learn.chatgpt.com/docs/app-server)
- [OpenAI credential storage](https://learn.chatgpt.com/docs/auth)
- [Grok tool integration](https://docs.x.ai/build/cli/headless-scripting)
- [Grok configuration and isolated home](https://docs.x.ai/build/settings/reference)
- [Grok OAuth and storage behavior](https://docs.x.ai/build/enterprise)
- [Apple Keychain item insertion](https://developer.apple.com/documentation/security/secitemadd(_:_:))

All AI is bring-your-own. The developer must not ask for API keys, enter them or test them. Future live setup belongs to the user in the application. Keep fixtures and real-provider evidence distinct.
