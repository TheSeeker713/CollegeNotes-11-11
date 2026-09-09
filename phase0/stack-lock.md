# Stack decision — September 9, 2026

Choose native arm64 Node.js 24.21.0 LTS and npm 12.0.2 workspaces. The Mac meets Node's documented macOS arm64 baseline. The already-installed Node current release is inventory only: Phase 3 must use the pinned project runtime without changing unrelated projects. No packages or runtimes were installed in Phase 0. [Node releases](https://nodejs.org/dist/index.json), [platform matrix](https://github.com/nodejs/node/blob/v24.21.0/BUILDING.md).

React + TypeScript + Vite provide the main interface; semantic HTML/CSS/SVG handle ordinary content. React Three Fiber 9 uses React 19; Three.js provides selected WebGL2 objects. Chrome Stable is the supported browser, with WebGL2 capability detection and a graphics-disabled equivalent. WebGPU is deferred. Existing browser version and hardware details stay in private environment evidence; no actual rendering or performance pass is claimed. [R3F documentation](https://r3f.docs.pmnd.rs/getting-started/introduction), [Vite requirements](https://vite.dev/guide/).

The exact direct dependency list follows; installation-manifest.json is the machine-readable decision, not an installed dependency lockfile. Published metadata is archived privately with engines and peer ranges. 39 applicable Node/peer constraints were checked with the existing npm semver library; all passed. Optional peers for unselected preprocessors, native mobile, compiler extras and alternate test environments are explicitly excluded, not skipped required tests. TypeScript 7.0.2 was rejected because typescript-eslint requires <6.1.0; select 6.0.3. Three.js 0.185.1 matches the 0.185 type family rather than using 0.186 with older declarations.

| Package | Pin | License | Publisher metadata |
|---|---|---|---|
| react | 19.2.8 | MIT | [source](https://registry.npmjs.org/react/19.2.8) |
| react-dom | 19.2.8 | MIT | [source](https://registry.npmjs.org/react-dom/19.2.8) |
| vite | 8.2.2 | MIT | [source](https://registry.npmjs.org/vite/8.2.2) |
| @vitejs/plugin-react | 6.1.1 | MIT | [source](https://registry.npmjs.org/@vitejs/plugin-react/6.1.1) |
| @react-three/fiber | 9.7.0 | MIT | [source](https://registry.npmjs.org/@react-three/fiber/9.7.0) |
| fastify | 5.12.3 | MIT | [source](https://registry.npmjs.org/fastify/5.12.3) |
| better-sqlite3 | 13.0.3 | MIT | [source](https://registry.npmjs.org/better-sqlite3/13.0.3) |
| pdfjs-dist | 6.3.289 | Apache-2.0 | [source](https://registry.npmjs.org/pdfjs-dist/6.3.289) |
| tesseract.js | 7.0.0 | Apache-2.0 | [source](https://registry.npmjs.org/tesseract.js/7.0.0) |
| epubjs | 0.3.93 | BSD-2-Clause | [source](https://registry.npmjs.org/epubjs/0.3.93) |
| mammoth | 1.12.2 | BSD-2-Clause | [source](https://registry.npmjs.org/mammoth/1.12.2) |
| vitest | 5.0.0 | MIT | [source](https://registry.npmjs.org/vitest/5.0.0) |
| @testing-library/react | 16.3.3 | MIT | [source](https://registry.npmjs.org/@testing-library/react/16.3.3) |
| @testing-library/dom | 10.4.1 | MIT | [source](https://registry.npmjs.org/@testing-library/dom/10.4.1) |
| @testing-library/jest-dom | 7.0.1 | MIT | [source](https://registry.npmjs.org/@testing-library/jest-dom/7.0.1) |
| @playwright/test | 1.63.0 | Apache-2.0 | [source](https://registry.npmjs.org/@playwright/test/1.63.0) |
| @axe-core/playwright | 4.13.0 | MPL-2.0 | [source](https://registry.npmjs.org/@axe-core/playwright/4.13.0) |
| eslint | 10.10.0 | MIT | [source](https://registry.npmjs.org/eslint/10.10.0) |
| typescript-eslint | 8.70.0 | MIT | [source](https://registry.npmjs.org/typescript-eslint/8.70.0) |
| @types/react | 19.2.18 | MIT | [source](https://registry.npmjs.org/@types/react/19.2.18) |
| @types/react-dom | 19.2.7 | MIT | [source](https://registry.npmjs.org/@types/react-dom/19.2.7) |
| @types/three | 0.185.4 | MIT | [source](https://registry.npmjs.org/@types/three/0.185.4) |
| @types/better-sqlite3 | 9.6.0 | MIT | [source](https://registry.npmjs.org/@types/better-sqlite3/9.6.0) |
| npm | 12.0.2 | Artistic-2.0 | [source](https://registry.npmjs.org/npm/12.0.2) |
| typescript | 6.0.3 | Apache-2.0 | [source](https://registry.npmjs.org/typescript/6.0.3) |
| three | 0.185.1 | MIT | [source](https://registry.npmjs.org/three/0.185.1) |
| @types/node | 24.13.3 | MIT | [source](https://registry.npmjs.org/@types/node/24.13.3) |
| jsdom | 30.0.1 | MIT | [source](https://registry.npmjs.org/jsdom/30.0.1) |
| playwright-core | 1.63.0 | Apache-2.0 | [source](https://registry.npmjs.org/playwright-core/1.63.0) |
| @eslint/js | 10.0.1 | MIT | [source](https://registry.npmjs.org/@eslint/js/10.0.1) |

Fastify 5 is selected for the loopback service. better-sqlite3 provides SQLite and FTS5; keep synchronous database work short and import/OCR jobs in workers. The binding's engine supports the chosen Node line; native installation, bundled SQLite version/FTS5 and arm64 build are required Phase 3 checks. No system SQLite version is assumed to be the app's version. [Fastify support policy](https://fastify.dev/docs/latest/Reference/LTS/), [SQLite binding](https://github.com/WiseLibs/better-sqlite3), [SQLite public-domain dedication](https://www.sqlite.org/copyright.html).

PDF.js handles native PDFs and renders scans before Tesseract OCR. Tesseract does not directly read PDFs. Bundle workers, WASM and selected language data for offline use. EPUB.js is selected with scripts disabled, sanitized content, network/resource restrictions and sandboxing; its older version requires careful archive/security fixtures. Mammoth is selected for DOCX raw text, with paragraph indexing retained by the importer. It performs no sanitization: do not render arbitrary converted HTML; retain original DOCX and explicitly flag unsupported tables/layout. External file access remains disabled. [Tesseract](https://github.com/naptha/tesseract.js), [EPUB.js](https://github.com/futurepress/epub.js), [Mammoth](https://github.com/mwilliamson/mammoth.js).

Vitest plus jsdom/Testing Library handle logic/components; Playwright targets installed Chrome for actual browser checks, with axe accessibility checks plus manual review. ESLint/typescript-eslint cover static checks. No canvas emulator or mocked provider can establish real GPU/audio/account functionality.

License handling: retain MIT/BSD notices, Apache license and applicable NOTICE files, npm Artistic-2.0 terms, and Node's bundled notices. axe's MPL-2.0 applies to its covered files and modifications; keep its license/source obligations with tooling. SQLite is public domain. Direct publisher license fields were verified; Phase 3 must inventory exact transitive licenses from the real lockfile, check security advisories and resolve blockers before proceeding. Project-source licensing is not inferred from dependency licenses; a project LICENSE choice can wait until distribution.

Phase 3 installation sequence: install isolated pinned runtime/npm; write workspace dependencies from this manifest; resolve exact transitive lockfile; clean reinstall; native SQLite/FTS5 probe; type/lint/build/unit/browser harnesses; parsers against synthetic fixtures with local workers; local startup/port/shutdown checks. Use the installed Chrome channel first; no browser bundle, speech model or paid SDK download is approved here. Any incompatibility requires an explicit decision amendment and renewed checks, never a silent version replacement.
