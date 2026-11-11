# Chrome: analyze visible tab

Start here: run `glance serve`, then load this folder in Chrome.

1. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, select this folder. No build step.
2. Open extension **Details → Extension options**. Paste token from `~/.glance/token` (Windows: `%USERPROFILE%\.glance\token`), then **Save token**.
3. Open a web page. Click the Glance toolbar button or press **Alt+Shift+G**. Change conflicting shortcuts at `chrome://extensions/shortcuts`.
4. Read clarity in the result tab. Toggle heatmap and gaze order. **Retry analysis** repeats the local request.

Only the visible viewport is captured. Token lives in extension-local storage; capture lives temporarily in extension session storage and the result tab's session storage. Close the result tab to discard its capture. Nothing is uploaded externally.

**Start Glance, then retry**: run `glance serve`, return to the result tab, click **Retry analysis**. Token rejected: update options. Restricted pages may refuse capture; use a normal web page.

The API receives multipart `image` with `Authorization: Bearer <token>` at `http://127.0.0.1:7878/v1/analyze`. Gaze positions assume image-pixel coordinates; confirm against the implemented API. Host permission is limited to this loopback endpoint; no content scripts.

Reference: [Chrome captureVisibleTab API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab).
