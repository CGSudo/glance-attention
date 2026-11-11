# Figma: analyze one frame

Start here: run `glance serve`, then import this development plugin in Figma Desktop.

1. In Figma, choose **Plugins → Development → Import plugin from manifest**; select `manifest.json`. Compiled `code.js` is included.
2. Select exactly one frame. Run **Plugins → Development → Glance**.
3. Paste token from `~/.glance/token` (Windows: `%USERPROFILE%\.glance\token`). Click **Analyze selected frame**.
4. Inspect clarity and the overlay. Click **Place heatmap as layer** to add a 55% opacity image layer directly above the analyzed frame. Original frame stays intact. Undo removes the new layer.

Token stays in panel memory; closing the plugin clears it. Frame export uses PNG at 2×. Network requests run in the UI iframe, solely to `http://localhost:7878/v1/analyze`.

## Localhost caveat

This is a development integration. `allowedDomains: ["none"]` blocks production network access; `devAllowedDomains` permits `http://localhost:7878` during development. Published plugins cannot rely on that development permission; localhost support requires separate validation and an approved distribution approach. See [Figma manifest rules](https://developers.figma.com/docs/plugins/manifest/).

The Glance API binds IPv4 `127.0.0.1`; localhost must resolve there. Figma/browser local-network permission may be required. The server must handle CORS preflight for `Authorization`, permit `POST`, and return the appropriate allow-origin header for the Figma iframe (often `null`). These API changes are outside this integration. No remote proxy is used.

## Rebuild after editing code.ts

```sh
npm ci
npm run check
npm run build
```

Run those commands in this folder. Reload the development plugin after rebuilding.
