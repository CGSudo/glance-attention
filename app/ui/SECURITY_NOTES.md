# Dependency review — 2026-11-12

`npm audit`: 10 existing findings (7 moderate, 2 high, 1 critical); new ONNX Runtime Web/wasm-pack dependencies have no reported findings.

- jsPDF/DOMPurify: current export uses text, local images and Blob output; HTML, new-window, AcroForm, JavaScript and sanitizer paths are unused. Existing image-decoder advisories still require review before release. A major jsPDF upgrade is deferred from browser wiring; review by 2026-11-19.
- Vite/esbuild: findings concern the development server/editor, absent from deployed static output. Never expose the development server publicly; upgrade separately by 2026-11-19.
- TypeScript ESLint/minimatch: build-time glob denial of service; no user-controlled patterns in the build. Review toolchain upgrade by 2026-11-19.

Install scripts are disabled in `.npmrc`. The pinned wasm-pack binary downloader was inspected before execution; CI invokes that downloader explicitly. Model assets require registry SHA-256 verification before caching or use.
