# Setup guide — Phase 1 placeholder

The repository contains planning/scaffold only. There is no application launcher or development server yet. Read AGENTS.md, project-state/current.json, and phase0/installation-manifest.json before work.

Existing Node can run the dependency-free planning checks directly: `node scripts/validate-project.mjs` and `node scripts/rehearse-workflow.mjs`. These do not install packages or test application functionality. The pinned product runtime is Node 24.21.0/npm 12.0.2 and will be installed/configured in Phase 3 after explicit authorization.

Phase 3 will document runtime isolation, dependency installation, native SQLite/FTS5 and parser workers, real lockfile/license inventory, startup/port/shutdown behavior and clean reinstall. Do not run package installation, scaffold generators or model downloads during the current pass.

Private data destination and backup settings are resolved in their implementation phases. The original thirteen screenshots are not a setup requirement; repeatable imports will let the user supply future course materials.
