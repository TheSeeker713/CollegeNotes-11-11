# Phase 4 report — CollegeNotes{11:11}

- **Pass:** `PASS-2026-09-09-P4`
- **Authorization:** AUTH-P4 — owner: “implement phase 4”
- **Phase 5:** not authorized

## What Phase 4 is

The first **real application shell**: navigation, appearance, local SQLite, original-file ownership, loopback jobs, and resume. Import/OCR/study products are still later phases. Empty lists stay empty.

## Checkpoints

| Step | Title | SHA |
|---|---|---|
| 4.1 | Navigable glass shell | `c86bb6b7bc75dd7a03ddf9042c0dfe45332dc528` |
| 4.2 | Local persistence | `22e16ca220d828444d295e545dd0fb0a965d77f0` |
| 4.3 | Service boundaries and jobs | `4e2b407877fafa22dc017794a81d38257894126a` |
| 4.4 | Session resumption | `2997861407d6a6e8a4b455e99f141ebd0be1027f` |

## Behavior

- Seven destinations: Home, Sources, Study, Practice, Requirements, Progress, Settings
- Empty home: **Add your first course** (name required). No invented COMM 110 facts until you type them.
- Botanical Light default, even if the OS is dark. Theme and Dark mode are independent. Reset appearance does not reset card layouts.
- Keyboard card arrange: Enter starts, arrows move, Enter places, Escape cancels, pin/reset
- Authoritative data directory: `~/Library/Application Support/CollegeNotes-11-11` (or `COLLEGENOTES_DATA_DIR`). Never the git checkout.
- Jobs: ingest copies originals with checksum; duplicate fingerprint does not rerun; cancel keeps files; interrupted running jobs requeue on startup

## How to run

```sh
export PATH="$PWD/.local/runtime/node/bin:$PATH"
npm ci
npm run build
npm run dev
```

Open `http://127.0.0.1:5173`. Service: `http://127.0.0.1:4781/health`.

## Stop

Do not begin Phase 5 until you explicitly authorize it.
