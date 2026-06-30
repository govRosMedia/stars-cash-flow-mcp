# Quickstart

Pick the surface that matches your agent. All of them talk to the same API and
follow the same money-safety rules.

- [Claude Desktop / Claude Code (MCP)](#claude-desktop--claude-code-mcp)
- [ChatGPT — Custom GPT Action](#chatgpt--custom-gpt-action)
- [Hermes Agent](#hermes-agent)
- [Plain shell / Python / Node](#plain-shell--python--node)

First, get an API key from [`@StarsCashFlowbot`](https://t.me/StarsCashFlowbot) →
**Reseller**, and top it up. Keep it in an environment variable — never hardcode it.

```bash
export STARS_CASH_FLOW_API_KEY="your-key"
```

---

## Claude Desktop / Claude Code (MCP)

Install and build:

```bash
git clone https://github.com/govRosMedia/stars-cash-flow-mcp.git
cd stars-cash-flow-mcp
npm install && npm run build
```

Or, once published, run it without cloning:

```bash
npx -y @rosmedia/stars-cash-flow-mcp
```

Add it to your MCP host config (`claude_desktop_config.json`, or
`.mcp.json` for Claude Code):

```json
{
  "mcpServers": {
    "stars-cash-flow": {
      "command": "npx",
      "args": ["-y", "@rosmedia/stars-cash-flow-mcp"],
      "env": {
        "STARS_CASH_FLOW_API_KEY": "your-key",
        "STARS_CASH_FLOW_API_BASE": "https://api-stars.ros.media/api/v2"
      }
    }
  }
}
```

(For a local build, use `"command": "node", "args": ["/abs/path/dist/index.js"]`.)

Tools exposed: `list_services`, `get_balance`, `create_order` (two-step confirm),
`order_status`, `cancel_order`. Ask Claude: *"List Stars Cash Flow services and
price 1000 subscribers for @mychannel."*

---

## ChatGPT — Custom GPT Action

1. **Create a GPT** → *Configure* → *Actions* → *Create new action*.
2. **Import** [`skill/openapi.yaml`](../skill/openapi.yaml) (Import from URL or paste).
3. **Auth:** the API takes the key in the request body. Either instruct the GPT to
   ask the user for their key per session, or front the API with a thin proxy that
   injects the key from an API-key header. Never paste the key into the public GPT
   instructions.
4. Paste the contents of [`skill/SKILL.md`](../skill/SKILL.md) (below the
   frontmatter) into the GPT's **Instructions** so it follows the money rules.

---

## Hermes Agent

[Hermes Agent](https://github.com/nousresearch/hermes-agent) uses the
[agentskills.io](https://agentskills.io) standard and is MCP-compatible.

**As a skill (CLI, no dependencies):**

```bash
mkdir -p ~/.hermes/skills/telegram/stars-cash-flow
cp -r hermes/SKILL.md hermes/scripts ~/.hermes/skills/telegram/stars-cash-flow/
export STARS_CASH_FLOW_API_KEY="your-key"
```

Then in a Hermes chat: `/stars-cash-flow price 1000 subscribers for @mychannel`.

**As an MCP server:** register `dist/index.js` the same way as any MCP server in
your Hermes config — the tools above become available directly.

---

## Plain shell / Python / Node

See runnable scripts in [`examples/`](../examples):

```bash
# discover + price (no key)
curl -s -X POST https://api-stars.ros.media/api/v2 -d action=services

# balance
curl -s -X POST https://api-stars.ros.media/api/v2 \
  -d action=balance -d key="$STARS_CASH_FLOW_API_KEY"

# place an order (after you've priced it and the user approved)
curl -s -X POST https://api-stars.ros.media/api/v2 \
  -d action=add -d key="$STARS_CASH_FLOW_API_KEY" \
  -d service=1 -d link="https://t.me/mychannel" -d quantity=1000

# track
curl -s -X POST https://api-stars.ros.media/api/v2 \
  -d action=status -d key="$STARS_CASH_FLOW_API_KEY" -d order=12345
```

You can also import the typed client directly:

```ts
import { StarsCashFlowClient } from "@rosmedia/stars-cash-flow-mcp";

const client = new StarsCashFlowClient(); // reads env STARS_CASH_FLOW_API_KEY
const services = await client.listServices();
const cost = StarsCashFlowClient.cost(services[0], 1000);
```
