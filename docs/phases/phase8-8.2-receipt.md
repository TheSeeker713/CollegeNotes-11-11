# Phase 8.2 hybrid retrieval receipt

September 17, 2026. AUTH-P8. Owner live sign-in and UI/UX testing remain deferred.

Hybrid reciprocal-rank fusion of lexical and semantic hits builds a bounded tutor context with navigable source anchors, instructor-requirement vs explanation separation (filename heuristics plus notes), explicit evidence-gap messaging, and immutable policy flags that imported text is data and cannot alter permissions.

## Checks

- CHK-8.2-01/05: course isolation and deleted-source exclusion
- CHK-8.2-02: supporting passage retrieved for paraphrase queries
- CHK-8.2-03: explicit `no_supporting_passage` gap
- CHK-8.2-04: injection-like syllabus wording cannot change policy flags

Route: `POST /courses/:id/tutor-context`. UI: hybrid tutor-context search beside lexical/semantic controls.
