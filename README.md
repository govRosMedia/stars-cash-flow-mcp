# Stars Cash Flow — MCP server, AI skill & Hermes tool

[![CI](https://github.com/govRosMedia/stars-cash-flow-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/govRosMedia/stars-cash-flow-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/stars-cash-flow-mcp.svg)](https://www.npmjs.com/package/stars-cash-flow-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-8A2BE2.svg)](https://modelcontextprotocol.io)
[![smithery](https://smithery.ai/badge/stars-cash-flow-mcp)](https://smithery.ai/server/stars-cash-flow-mcp)

Drive the **Stars Cash Flow** reseller API from any AI agent. Stars Cash Flow is a
CPA exchange for **real Telegram actions** — channel subscribers, boosts and bot
starts fulfilled by verified real users, not bots. The API is
[JustAnotherPanel](https://justanotherpanel.com/) / Perfect-Panel compatible, so
it drops into any existing SMM-panel integration.

One API contract, three first-class surfaces:

| Surface | Path | For |
| --- | --- | --- |
| **MCP server** (TypeScript) | [`src/`](./src) → `dist/` | Claude Desktop, Claude Code, any MCP host |
| **Universal skill** | [`skill/SKILL.md`](./skill/SKILL.md) · [`openapi.yaml`](./skill/openapi.yaml) | Claude Code skills, ChatGPT Custom GPT Actions |
| **Hermes skill + CLI** | [`hermes/`](./hermes) | [Hermes Agent](https://github.com/nousresearch/hermes-agent), or any shell |

## Documentation

- 📘 **[API reference](./docs/API.md)** — every action, field and guarantee
- 🚀 **[Quickstart](./docs/QUICKSTART.md)** — set up each surface in minutes
- ❓ **[FAQ](./docs/FAQ.md)** — common questions
- ⚠️ **[Error reference](./docs/ERRORS.md)** — every error message and fix
- 🧪 **[Examples](./examples)** — runnable curl / Python / Node

## The API in 30 seconds

`POST https://api-stars.ros.media/api/v2` — form-encoded, dispatched on `action`:

| action | fields | returns |
| --- | --- | --- |
| `services` | — | catalog (id, name, USD rate /1000, min, max) |
| `balance` | `key` | `{ balance, currency }` |
| `add` | `key, service, link, quantity` | `{ order }` — **spends balance** |
| `status` | `key, order` / `orders` | `{ charge, start_count, status, remains, currency }` |
| `cancel` | `key, orders` | `{ canceled: [ids] }` — refunds remainder |

Get an API key from [`@StarsCashFlowbot`](https://t.me/StarsCashFlowbot) →
**Reseller**. Everything except `services` needs the key; the key holds a USD
balance. Rate limit: 60 req/min/key.

## 🔴 Money safety

`add` debits real USD. Every surface here **prices the order first and refuses to
spend without explicit confirmation**:

- **MCP** — `create_order` is two-step: the first call returns a cost estimate; it
  only places the order when called again with `confirm: true`.
- **CLI** — `order` / `cancel` print an estimate and do nothing unless `--confirm`.
- **Skill** — instructs the agent to price, show the cost, and get a "yes" first.

Never hardcode or print the key — read it from `STARS_CASH_FLOW_API_KEY`.

## Install — MCP server

### Via Smithery (one-click registry)

Once listed, install into any MCP client straight from the
[Smithery registry](https://smithery.ai/server/stars-cash-flow-mcp) — it collects
your reseller API key in the UI and wires it in. Or via the CLI:

```bash
npx -y @smithery/cli install stars-cash-flow-mcp --client claude
```

### Via npm / npx

Once published:

```bash
npx -y stars-cash-flow-mcp
```

Or from source:

```bash
git clone https://github.com/govRosMedia/stars-cash-flow-mcp.git
cd stars-cash-flow-mcp
npm install && npm run build
```

Register in an MCP host (`claude_desktop_config.json` / `.mcp.json`):

```json
{
  "mcpServers": {
    "stars-cash-flow": {
      "command": "npx",
      "args": ["-y", "stars-cash-flow-mcp"],
      "env": {
        "STARS_CASH_FLOW_API_KEY": "your-key",
        "STARS_CASH_FLOW_API_BASE": "https://api-stars.ros.media/api/v2"
      }
    }
  }
}
```

**Tools:** `list_services`, `get_balance`, `create_order` (confirm-gated),
`order_status`, `cancel_order`.

See the [Quickstart](./docs/QUICKSTART.md) for ChatGPT and Hermes setup.

## Use the typed client directly

```ts
import { StarsCashFlowClient } from "stars-cash-flow-mcp";

const client = new StarsCashFlowClient(); // reads STARS_CASH_FLOW_API_KEY
const services = await client.listServices();
const cost = StarsCashFlowClient.cost(services[0], 1000); // USD
```

## Development

```bash
npm install
npm run build      # tsc → dist/
npm test           # vitest
npm run typecheck  # tsc --noEmit
```

CI runs build + tests on Node 18/20/22. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Stars Cash Flow
