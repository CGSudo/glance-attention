# Connect an agent to Glance

Start here: install `glance`, then run `glance mcp` to confirm the executable exists. It waits for stdio input; press Ctrl+C to stop.

MCP clients launch their own `glance mcp` subprocess. No `glance serve` or HTTP bearer token required. Replace `glance` with an absolute executable path if the client cannot find it on PATH. On Windows, JSON paths need doubled backslashes, for example `C:\\Users\\you\\AppData\\Local\\Glance\\glance.exe` (installer path unverified).

## Claude Desktop

1. Open **Settings → Developer → Edit Config** (`claude_desktop_config.json`).
2. Merge this entry into existing `mcpServers`:

```json
{
  "mcpServers": {
    "glance": { "command": "glance", "args": ["mcp"] }
  }
}
```

3. Restart Claude Desktop. Check that Glance tools appear.

## Claude Code

```sh
claude mcp add glance -- glance mcp
claude mcp list
```

Restart the session if tools do not appear.

## Cursor

1. Open project `.cursor/mcp.json` (or `~/.cursor/mcp.json` for all projects).
2. Merge the same `mcpServers` JSON shown above.
3. Enable Glance in Cursor's MCP settings. Check its tools list.

## Codex

1. Add to `~/.codex/config.toml`:

```toml
[mcp_servers.glance]
command = "glance"
args = ["mcp"]
```

2. Restart Codex. Check Glance appears in its MCP tools.

## Try one prompt

- “Use Glance list_models. Show installed image models.”
- “Use Glance analyze_image on `/absolute/path/landing.png`. Report clarity and the first predicted fixation; label scanpath approximation.”
- “Use Glance compare_images on `/absolute/path/a.png` and `/absolute/path/b.png`. Report clarity delta and heatmap correlation; do not claim conversion lift.”

Use paths visible to the local Glance process. Images are analyzed locally; tool responses can enter the agent conversation. Missing model: install one with Glance before retrying.

References: [Claude Code MCP](https://code.claude.com/docs/en/mcp), [Cursor MCP](https://cursor.com/docs/context/mcp), [Codex MCP](https://developers.openai.com/codex/mcp/).
