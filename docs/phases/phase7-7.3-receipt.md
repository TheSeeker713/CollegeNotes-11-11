# Phase 7.3 engineering receipt

Explicit selected-source preparation stores originals, reading text, annotations, position and versioned vectors in browser IndexedDB. Production build emits a versioned local-only shell cache. Browser-only mode identifies read-only snapshots, unavailable inference/saving/cloud features and offers recovery. Local-service lexical and semantic search use approved current course versions. Source mutations invalidate this browser's pack; startup/reconnection reconcile cached ownership and revisions. Separate browsers/backups are disclosed.

Nine engineering gates passed: 25 unit, 104 integration, 1 evaluation, 6 planning, 44 workflow and 6 gate harness cases. Private evidence: `.local/verification/phase7/7.3/`. First shell test caught omitted HTML; plugin ordering repaired and entire suite rerun. Non-UI worker simulation verifies cold navigation with network fetch denied; a separate macOS network-denied subprocess verifies local read/lexical/vector search and annotation writes. Existing real MiniLM network-denied inference tests pass. Browser cold-open remains an owner test, not a claimed automated UI result.

Source audit covered API/cache boundaries, no runtime CDN, current revision/model checks, private-data scope, browser cleanup and cross-course isolation. CHK-7.3-01 through 05 have non-UI evidence; actual disconnected browser workflow is deferred by AUTH-P7. Production preview port 4173 is required to prepare app-shell assets. Development port 5173 deliberately reports that it cannot prepare the shell. Browser storage may be evicted; persistence is requested and its result disclosed. Maximum pack is 100 MiB with 50 selected sources.

Commit/push and independent remote confirmation precede 7.4.
