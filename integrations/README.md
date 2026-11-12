# Glance integrations

Choose your entry point. The browser extension runs independently. Desktop integrations need Glance; Figma and optional extension server mode need the local server and its config-directory token, `glance/token`.

| Integration | Status | Setup |
|---|---|---|
| [ShareX](sharex/) | Setup + config example; runtime unverified | Add after-capture Action: `glance analyze "$input" --open`. |
| [Chrome + Firefox](browser-extension/) | MV3; bundled UNISAL, optional desktop server | Build with `npm run build:ext` in `app/ui`, then load `dist/chrome` or `dist/firefox`. Click Glance or press Alt+Shift+G. |
| [Figma](figma-plugin/) | Development plugin; runtime unverified | Import manifest, select frame, paste token, analyze. |
| [MCP](mcp/) | Client config examples; runtime unverified | Register stdio command `glance mcp` with your client. |

Images stay on the machine during analysis. MCP results may enter agent conversations. See [verification limits](NOTES.md) before distribution.

Developer check from repository root: `node integrations/check.cjs` (syntax, JSON, mocked API/UI behavior); `npm run check --prefix integrations/figma-plugin` (types); `npm run build --prefix integrations/figma-plugin` (refresh compiled plugin).
