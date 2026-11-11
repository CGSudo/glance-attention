# Glance integrations

Choose your entry point. Install Glance first; browser/Figma integrations also need `glance serve` and the token from `~/.glance/token`.

| Integration | Status | Setup |
|---|---|---|
| [ShareX](sharex/) | Setup + config example; runtime unverified | Add after-capture Action: `glance analyze "$input" --open`. |
| [Chrome](chrome-extension/) | MV3 source; runtime unverified | Load unpacked, save token in options, click Glance or press Alt+Shift+G. |
| [Figma](figma-plugin/) | Development plugin; runtime unverified | Import manifest, select frame, paste token, analyze. |
| [MCP](mcp/) | Client config examples; runtime unverified | Register stdio command `glance mcp` with your client. |

Images stay on the machine during analysis. MCP results may enter agent conversations. See [verification limits](NOTES.md) before distribution.

Developer check from repository root: `node integrations/check.cjs` (syntax, JSON, mocked API/UI behavior); `npm run check --prefix integrations/figma-plugin` (types); `npm run build --prefix integrations/figma-plugin` (refresh compiled plugin).
