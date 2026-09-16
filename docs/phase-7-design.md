# Phase 7 reading design specification

Authorization: AUTH-P7. Rendered review and manual testing are owner-only and deferred until after Phase 8; this specification is not accepted visual evidence.

The Sources workspace links to a dedicated course reader. Its source selector and heading/location list lead to a bounded reflowed passage or original PDF page/EPUB chapter. Previous/next, a location selector, text search and zoom are ordinary labeled controls. Switching source view preserves the selected source location; corrected text explicitly reports when exact original alignment is unavailable. Original PDF/image pixels are never recolored. EPUB active content and remote resources are removed; missing resources are disclosed. Reflowed text is always labeled as an extraction, never a complete reproduction of tables, formulas or figures.

Annotations bind source ID, immutable revision, exact UTF-16 range and quote. Repeated words use offsets, not a first-match heuristic. A keyboard passage/range alternative complements text selection. Historical annotations remain attached to their original revisions. Position and annotation drafts persist locally. A context panel exposes source version and saved notes.

Explicit preparation creates a browser-local snapshot of selected course material, original reading resources and a versioned index. With the local service running, disconnected reading, annotation, lexical and local semantic search remain available. Without that service, cached snapshots are clearly labeled with preparation time, read-only and possibly outdated; lexical snapshot search remains available, while local inference and writes are unavailable. Reconnection validates current ownership and revisions before live use. The user can remove prepared copies. No provider/cloud readiness is inferred from connectivity.

Reading controls include density, font size, line spacing, focus, reduced motion and context visibility. Controls use theme tokens for both themes and modes; original imagery remains faithful. Browser-only assets include all four theme combinations. Manual desktop, minimum-window, 200% zoom, keyboard and VoiceOver verification remains deferred.
