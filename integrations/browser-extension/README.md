# Browser extension: analyze a visible tab

Build first: `cd app/ui` then `npm ci --ignore-scripts` and `npm run build:ext`.

1. Chrome/Edge: open the extensions page, enable Developer mode, load `dist/chrome` from the repository root. Firefox: open `about:debugging`, choose This Firefox, load `dist/firefox/manifest.json` temporarily.
2. Open a normal web page. Click Glance or press **Alt+Shift+G**. Only the visible viewport is captured.
3. Read clarity in the result tab; toggle heatmap, squint test and gaze order. Gaze positions use 0?100 percentages; gaze order is an approximation.
4. Options: choose SUM or TranSalNet, click **Download full models**, then **Save settings**. Larger models need more memory; desktop mode remains available.

UNISAL, ONNX Runtime Web and the shared Rust WASM core are bundled locally. No remote scripts execute. Full models download from GitHub Releases, with a Pages mirror fallback; SHA-256 must match `models/registry.json` before storage or use. Models stay in IndexedDB; captured images stay in extension session memory, then the result tab. Close the tab to discard its image.

Desktop fallback: run `glance serve` or enable the desktop background server, select **Desktop server**, paste the config-directory token (`glance/token`), save. Screenshots go only to `http://127.0.0.1:7878/v1/analyze`; tokens never sync.

Artifacts: `dist/chrome.zip`, `dist/firefox.zip`. Validate from the root: `npx -y web-ext@8 lint -s dist/firefox`. Store publication, signing and live Firefox capture require separate verification.
