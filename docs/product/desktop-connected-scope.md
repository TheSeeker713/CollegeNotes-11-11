# Desktop and connected-capability scope amendment

Authority: `CHANGE-DESKTOP-CONNECTED`, owner direction dated September 9, 2026.

CollegeNotes{11:11} is a **single-user macOS desktop application for this MacBook**. The current React interface may run in a local browser during development and may remain the first usable app surface, but a hosted website, mobile app, tablet layout, cross-platform client, or multi-user service is not the product target. The final daily-use experience must launch and behave like a local Mac app without requiring the user to operate a development server manually.

The source remains in the Mac's Developer folder. Authoritative learning data, source files, indexes, credentials and model assets remain in appropriate user-local application-data and credential locations outside Git. The browser layer is a local UI surface, not an authority boundary and not a cloud deployment.

Required connected capabilities are:

- local semantic embeddings and retrieval over user-approved, course-scoped material;
- rebuildable local vector indexes tied to source versions and anchors;
- explicit OAuth connections for approved internet services where OAuth is supported;
- internet research initiated by the user, with source URLs, retrieval dates, quotations/claims traceability, uncertainty and clear separation from imported course requirements;
- revocable connections, least-privilege scopes, visible online/offline status and no silent paid fallback;
- no transmission of private course material unless the user explicitly chooses the material, provider and action.

Local embeddings do not imply a local generative language model. Fresh local generation remains a separate model/storage/performance decision. Internet research does not grant arbitrary shell, filesystem, account or browser authority; imported pages and model output remain untrusted data.

Desktop UI verification uses the actual MacBook display and supported desktop window sizes. The design reference remains 1440×900. Test at the agreed minimum usable desktop window and at 200% zoom/reflow, but do not require 290px, 390px, phone, tablet or touch layouts. Keyboard, focus, screen-reader, contrast, reduced-motion and reduced-transparency requirements remain.
