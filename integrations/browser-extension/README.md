# Browser extension: analyse a full page

Build first: `cd app/ui` then `npm ci --ignore-scripts` and `npm run build:ext`.

1. Chrome/Edge: open the extensions page, enable Developer mode, load `dist/chrome` from the repository root. Firefox: open `about:debugging`, choose This Firefox, load `dist/firefox/manifest.json` temporarily.
2. Open a normal web page. Click **Analyse this full page** or press **Alt+Shift+G**. Keep the page active while the toolbar badge shows progress.
3. Glance opens the captured image in its bundled app. Run attention analysis there. Capture restores the page's scroll position and fixed/sticky elements.
4. Capture height stops at **20000 image pixels** (device pixels, including browser zoom). A **20k** badge and toolbar tooltip indicate truncation. A **!** badge means capture failed; hover for the reason, then retry.

UNISAL, ONNX Runtime Web and the shared Rust WASM core are bundled locally. Capture and analysis need no network. CSP blocks remote connections. Permissions: `activeTab`, `scripting`, `storage`; no host permissions. Captures use WebP (JPEG fallback), quality 0.85, under session key `glance:capture`, consumed by the app. Data URLs over **8 MB** are resized by 0.8 down to **800 px** wide; narrower captures keep their width. If still oversized, only the top that fits is saved: a **Top** badge and popup explain cropping. Storage errors show a popup without opening an empty analysis tab.

Capture covers the main document's viewport width. Nested scrollers, animations, late-loading content and cross-origin frame headers can affect stitching. Browser-protected pages cannot be scripted. Switching tabs or resizing during capture aborts; retry on the original page.

Artifacts: `dist/chrome.zip`, `dist/firefox.zip`. Validate from the root: `npx -y web-ext@8 lint -s dist/firefox`. Store publication, signing and live Firefox capture require separate verification.
