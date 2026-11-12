# Browser verification — 2026-11-12

- Windows, Edge 157.0.4341.46, localhost static server, `/glance-attention/app/`, `samples/webpage.png`, 1600×1000 viewport.
- WebGPU + WASM fallback: load 50.6 ms; cold analyze 2,495 ms; warm analyze 857 ms.
- Forced WASM: load 51.3 ms; cold analyze 1,893 ms; warm analyze 857 ms.
- One run per timing; fresh browser contexts. Load = navigation loadEventEnd; analyze includes preprocessing, inference, metrics, PNG rendering and UI update. Cold includes download/session initialization; these are local measurements, not production-network benchmarks.
- Heatmap, squint, comparison and model Cache Storage passed; zero console errors. Screenshot: `docs/app-screenshot.png`.
- `crossOriginIsolated=false`; one WASM thread; no COOP/COEP. WASM was forced through the worker request for the fallback check.
- Native CPU output through WASM finish wrapper: identical serialized metrics/layers on a gradient fixture; inference providers may differ numerically.
- Edge extension: bundled UNISAL and strict CSP passed; SUM/TranSalNet downloads, SHA-256, IndexedDB reuse and WASM inference passed using registry-matched local download responses.
- `build:web`, `build:ext`, UI tests/lint, native tests/clippy, WASM build and docs link check passed. Firefox lint: 0 errors, 2 runtime-code warnings, 1 data-collection manifest notice.
- Public `models-v1` URLs return HTTP 404. Publish assets before public full-model downloads work; release publication reruns Pages to populate mirrors. Missing full models do not block the UNISAL web build.
- Untested: live Pages deployment/mirror, Firefox runtime, store signing/publication. Existing dependency findings: `SECURITY_NOTES.md`.
- Local smoke harnesses: `%TEMP%/glance-web-qa/check.mjs`, `check-ext.mjs`, `check-full-models.mjs` (Playwright 1.65.0).
