# Browser model verification

2026-11-14, Windows, Edge 157.0.4341.46 headless, Playwright 1.56.1, Intel Core Ultra 5 225H, 16,357,621,760 bytes RAM.
Production web build at `/glance-attention/app/`, `samples/webpage.png`, SUM UI condition matching its reference. Initial proof used incognito contexts, UI checks use persistent profiles.
Image seconds include preprocessing, inference and output rendering. Proof request wall also includes download, SHA-256, cache and session creation. UI requests follow explicit download.

| Model | Provider configuration | Session + inference | Image seconds | Request wall seconds | Reference CC | Clarity | Peak sampled renderer bytes |
|---|---|---|---|---|---|---|---|
| SUM | WASM forced | pass | 18.034 | 26.714 | 0.999974 | 13.658502 | unmeasured |
| TranSalNet | WASM forced | pass | 6.910 | 12.932 | 0.989068 | 5.204634 | unmeasured |
| SUM UI | WebGPU + WASM fallback | pass | 19.662 | 27.529 | 0.999974 | 13.658502 | 2086064128 |
| TranSalNet UI | WebGPU + WASM fallback | pass | 7.484 | 12.653 | 0.989068 | 5.204634 | 1672785920 |
| SUM UI | WASM forced | pass | 42.499 | 52.967 | 0.999974 | 13.658502 | 1772269568 |
| TranSalNet UI | WASM forced | pass | 7.227 | 13.305 | 0.989068 | 5.204634 | 1586954240 |

CC compares heatmap alpha against 16-bit `samples/expected/<model>/webpage.png`. Both exceed 0.98 and finish under 120 seconds.
Memory samples sum browser renderer working sets once per second, including WASM and tab overhead. GPU allocations and worker-only JS heap unmeasured.
Both eligible for web. UI verifies explicit download, cached inference, reload, low-memory warning, SUM choices and 320/768/1024/1440 px toolbar. UNISAL stays default.
Private-context storage rejected TranSalNet and intermittently lost SUM cache. Recovery offers retry, UNISAL or desktop. Other devices unverified.
Reproduce from `app/ui` with `npx --yes --package=playwright@1.56.1 -c "node scripts/check-web-models.mjs"`, add `--gpu` for default providers or `--proof` for direct worker checks.
