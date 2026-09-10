# Setup — Phase 3

Pinned runtime: Node **24.21.0** and npm **12.0.2**. This repository does not change your other Node installs. A project-local copy lives at `.local/runtime/node/` (gitignored).

```sh
export PATH="$PWD/.local/runtime/node/bin:$PATH"
node -v   # v24.21.0
npm -v    # 12.0.2
npm ci
npm run build
npm run dev
```

`npm run dev` starts the loopback service on `127.0.0.1:4781` and Vite on `127.0.0.1:5173`. `npm run dev:stop` sends SIGTERM to those PIDs. If 4781 is taken, the service exits 2 with an occupied-port message; set `COLLEGENOTES_PORT`.

Copy `.env.example` to `.env` locally if you need to override the port. Never put credentials in Git.

Theme fonts are system-ui / Georgia / Impact — no CDN. Design images stay under gitignored `/Design/`.
