# Scaffold and data ownership

There is one project root: the verified CollegeNotes child of the native Mac Developer directory. Packages are npm workspaces, not nested projects or independent Git repositories. No dependency install or runnable product is implied.

Phase 0 pins remain authoritative; package manifests deliberately contain no installed dependencies. Phase 3 distributes approved direct dependencies to workspaces and creates a real lockfile. The existing system Node can run dependency-free planning checks; it is not a claim that the pinned application runtime is installed.

Source is public. Original reference documents and detailed verification live under ignored .local/. Future personal application data defaults to a separately resolved user-local Application Support directory in Step 4.2; recordings, source files and backups do not belong inside the repository. Environment paths stay private.
