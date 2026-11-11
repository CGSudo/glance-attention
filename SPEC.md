# Glance — spec v1

Free, open-source, offline attention-prediction desktop app (Windows + macOS). Predicts where people look in the first ~3 s of free viewing. Every score shows its research backing; no unvalidated "memory/emotion" scores.

## Principles
- Honest: each metric shows formula + benchmark source. Accuracy shown as raw metric (AUC/CC) next to human ceiling. Never "94% accurate".
- Offline + private: images never leave the machine.
- Light: Tauri 2 (Rust + system webview). Target installer < 25 MB, idle RAM < 150 MB. Models downloaded on first use, not bundled.
- One core, many front doors: desktop UI, CLI, local HTTP API, MCP server, integrations all call `glance-core`.

## Repo layout
```
crates/glance-core/   Rust lib: model registry, ONNX inference (ort), pre/post-processing, metrics, scanpath, video
crates/glance-cli/    `glance` binary: analyze | compare | serve | mcp | models
app/                  Tauri 2 app; app/src-tauri depends on glance-core; app/ui = React+TS+Vite
models/registry.json  model catalog (url, sha256, license, citation, benchmark)
tools/export/         Python: PyTorch -> ONNX export + parity check per model
integrations/         sharex/, chrome-extension/, figma-plugin/
docs/                 GitHub Pages site (landing, how-it-works, science, compare pages)
samples/              CC0 test images + expected outputs
CITATIONS.md          every paper/model/dataset with institution + license
```

## Models (registry.json entries)
| id | task | license | source |
|---|---|---|---|
| sum | image heatmap; natural/UI/e-commerce | MIT | Hosseini et al., WACV 2025 (github Arhosseini77/SUM) |
| transalnet | image heatmap | MIT | Lou et al., Neurocomputing 2022 (LJOVO/TranSalNet) |
| unisal | image + video heatmap | Apache-2.0 | Droste et al., ECCV 2020 (rdroste/unisal) |
| eyeformer | UI scanpath | NO LICENSE -> excluded unless authors grant; user-import only | Jiang et al., UIST 2024 |
| deepgaze-iie | reference only | NO LICENSE -> user-import only | Linardos et al., ICCV 2021 |
Rule: ship only assets with a license that allows redistribution. Anything else = "bring your own .onnx" import.
Fallback if a model cannot export to ONNX (e.g. Mamba selective-scan): drop it from v1, record why in CITATIONS.md.

registry.json entry shape:
```json
{"id":"unisal","name":"UNISAL","tasks":["image","video"],"input":{"w":384,"h":224,"layout":"NCHW","mean":[0.485,0.456,0.406],"std":[0.229,0.224,0.225]},
 "output":"logit|prob","url":"https://...onnx","sha256":"...","size_mb":16,"license":"Apache-2.0",
 "citation":"Droste, Jiao, Noble. Unified Image and Video Saliency Modeling. ECCV 2020. University of Oxford.",
 "benchmark":{"dataset":"MIT300","AUC":0.0,"CC":0.0,"NSS":0.0,"source":"saliency.tuebingen.ai"}}
```
Unknown benchmark values = null, never guessed.

## Core outputs (glance-core)
- `heatmap`: f32 W×H, sums to 1 (probability of fixation).
- `scanpath`: first N=7 fixations. If no scanpath model: greedy peak picking with inhibition-of-return (Gaussian suppression, sigma = 2° ≈ 4% of image width) + center-bias prior. Labeled "approximation (Itti & Koch 1998 IOR)".
- Metrics (all documented in docs/science):
  - `aoi_share`: % of heatmap mass inside each user polygon/rect.
  - `clarity`: 1 − H(heatmap)/log(N_pixels) on 64×64 downsample (low entropy = focused). 0–100.
  - `first_glance`: rank of each AOI by scanpath order.
  - `fog`: image dimmed where heatmap < 25th percentile mass (what gets ignored).
  - `agreement`: when ensemble mode, per-pixel std across models -> uncertainty map + scalar mean CC between models.
  - `compare` (A vs B): per-AOI share delta, clarity delta, CC between heatmaps.
- Video: frames sampled at 5 fps (UI decodes via <video>+canvas, CLI via image sequence), per-frame heatmap + per-AOI share over time. UNISAL temporal mode.

## Local API (glance serve, 127.0.0.1:7878 only, bearer token in ~/.glance/token)
```
GET  /v1/models                          -> [{id,name,tasks,license,installed}]
POST /v1/models/{id}/install             -> {ok}
POST /v1/analyze   multipart: image, model?=default, aois?=JSON
     -> {model, width, height, heatmap_png_b64, overlay_png_b64, fog_png_b64,
         scanpath:[{x,y,order}], metrics:{clarity, aoi_share:[{id,share}], agreement?}}
POST /v1/compare   multipart: a, b, model?, aois?  -> {a:<analyze>, b:<analyze>, delta:{...}, cc}
POST /v1/video     multipart: frames[] | video  -> {fps, frames:[{t, heatmap_png_b64, aoi_share}]}
```
CLI mirrors it: `glance analyze img.png --model sum --aoi aois.json --out out/ --json`.
MCP (stdio, `glance mcp`): tools `analyze_image`, `compare_images`, `list_models`, same JSON.

## Desktop UI (enterprise-grade)
Screens: Home (drop zone + recent), Analyze (canvas with layer toggles: heatmap / gaze order / fog / uncertainty; AOI draw; metrics side panel with "how is this computed?" popovers), Compare A/B, Video, Models (install/switch/import, license + citation + benchmark card), Batch (folder -> CSV/PDF), Learn (kid-level animated explainer), Settings.
Model switcher always visible in the toolbar. Keyboard-first; WCAG AA; screen-reader labels; light/dark; no purple gradients.
Exports: PNG overlays, JSON, PDF report (client-side), CSV for batch.

## Integrations (thin wrappers over CLI/API)
- ShareX: custom "Action" (`glance analyze "$input" --open`) + docs/screens.
- Chrome extension (MV3): capture visible tab -> POST /v1/analyze -> overlay in new tab.
- Figma plugin: export selected frame -> local API (dev network access to localhost; caveat documented).
- Agents: MCP server + CLI JSON; one-line setup for Claude/Codex/Cursor in README.

## Testing
- Rust: unit tests for metrics with hand-computed fixtures; integration test with tiny ONNX in tests/fixtures.
- Export parity: ONNX vs PyTorch max abs diff < 1e-3 on 3 samples.
- E2E: analyze samples/*.png with each installed model; outputs land in samples/expected/.
- CI: GitHub Actions matrix windows-latest + macos-latest builds + tests; tauri-action release artifacts (unsigned; Gatekeeper note in README).

## Roadmap
- v1.1 Android: Tauri 2 mobile target, UNISAL only, simplified flow: camera/photo -> heatmap -> compare. Buildable on Windows.
- v1.2 iOS: same app; needs a Mac with Xcode + Apple Developer account ($99/yr) for App Store.

## Out of scope v1
Cloud accounts, telemetry, Photoshop/Adobe plugins, training new models, mirroring eye-tracking datasets (licenses forbid; we link them).
