# Architecture

Follow [architecture/data flow](../../phase0/architecture.md), [stack pins](../../phase0/stack-lock.md), [provider strategy](../../phase0/providers.md) and [scaffold ownership](../architecture/scaffold.md).

Domain owns entities/contracts; storage owns SQLite migrations and original-file metadata; importers own extraction and anchors; providers own authentication/audio/inference integrations; learning owns activities/attempts; UI/visuals consume validated interfaces. Do not mutate another module's tables or couple provider APIs to learning logic.

Every derivative records source version and anchor; corrections flag affected derivatives. Jobs support cancellation/recovery without losing originals or duplicating attempts. Save positions and drafts independently of network or visual state. Loopback service validates origin, paths and request authority. Restrict tutor tools/process access; imported instructions never become permissions.

Browser persistence is a rebuildable cache; authoritative personal data lives outside the checkout. Backups include manifests/checksums and exclude credentials. Offline readiness lists actual available resources. No paid fallback, fresh offline inference or general ChatGPT memory access is assumed. Changes to these boundaries require a recorded decision and affected checks.

The target is a single-user macOS desktop app on the owner's MacBook; the browser is an interim local UI surface. Local embeddings and course-scoped vector indexes are required, versioned and rebuildable. OAuth credentials remain in approved macOS credential storage. Internet research is user-initiated, source-traceable and isolated from course authority and arbitrary tool execution.
