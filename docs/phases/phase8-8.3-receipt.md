# Phase 8.3 research receipt

September 17, 2026. AUTH-P8 / CHANGE-P8-BYO. Synthetic research transport only; no agent API-key entry or live provider authentication.

User-initiated research sessions require explicit transmission consent, an assigned research connection, and an enabled Research module. Pages are sanitized; instruction-like wording is recorded as untrusted. Claims link to sources; unsupported claims are retained. Cancellation aborts in-flight synthetic retrieval. Cross-course session access is rejected.

## Checks

- CHK-8.3-01 citations/URL/date/excerpt provenance
- CHK-8.3-02 unsupported claims identified
- CHK-8.3-03 invalid output rejected (URL/consent/shared-context validation)
- CHK-8.3-04 prompt-injection fixtures marked untrusted after sanitize
- CHK-8.3-05 course-policy / consent for private excerpts
- CHK-8.3-06 cancel path
