# Stars Cash Flow — MCP server, AI skill & Hermes tool

Drive the **Stars Cash Flow** reseller API from any AI agent. Stars Cash Flow is
a CPA exchange for real Telegram actions — channel subscribers, boosts and bot
starts fulfilled by verified real users (not bots). The API is
[JustAnotherPanel](https://justanotherpanel.com/) / Perfect-Panel compatible.

This repo ships one API contract behind three surfaces:

| Surface | Path | For |
| --- | --- | --- |
| **MCP server** (TypeScript) | `src/` → `dist/` | Claude Desktop, Claude Code, any MCP host (Hermes is MCP-compatible too) |
| **Universal skill** | `skill/SKILL.md` + `skill/openapi.yaml` | Claude Code skills, ChatGPT Custom GPT Actions (import the OpenAPI) |
| **Hermes skill + CLI** | `hermes/SKILL.md` + `hermes/scripts/` | self-hosted [Hermes Agent](https://github.com/nousresearch/hermes-agent), or any shell |

## API at a glance

`POST https://api-stars.ros.media/api/v2` — form-encoded, dispatched on `action`:

| action | fields | returns |
| --- | --- | --- |
| `services` | — | catalog (id, name, USD rate /1000, min, max) |
| `balance` | `key` | `{ balance, currency }` |
| `add` | `key, service, link, quantity` | `{ order }` — **spends balance** |
| `status` | `key, order` / `orders` | `{ charge, start_count, status, remains, currency }` |
| `cancel` | `key, orders` | `{ canceled: [ids] }` — refunds remainder |

Get an API key from [`@StarsCashFlowbot`](https://t.me/StarsCashFlowbot) →
*Reseller*. Everything except `services` needs the key; the key holds a USD
balance. Rate limit: 60 req/min/key.

## 🔴 Money safety

`add` debits real USD. Every surface here prices the order first and refuses to
spend without explicit confirmation:

- **MCP** — `create_order` is two-step: the first call returns a cost estimate;
  it only places the order when called again with `confirm: true`.
- **CLI** — `order` / `cancel` print an estimate and do nothing unless `--confirm`
  is passed.
- **Skill** — instructs the agent to price, show the cost, and get a "yes" before
  ordering.

Never hardcode or print the key — read it from `STARS_CASH_FLOW_API_KEY`.

## MCP server

```bash
npm install
npm run build
```

Register in an MCP host (Claude Desktop / Claude Code `mcp.json`):

```json
{
  "mcpServers": {
    "stars-cash-flow": {
      "command": "node",
      "args": ["/abs/path/to/stars-cash-flow-mcp/dist/index.js"],
      "env": {
        "STARS_CASH_FLOW_API_KEY": "your-key",
        "STARS_CASH_FLOW_API_BASE": "https://api-stars.ros.media/api/v2"
      }
    }
  }
}
```

Tools: `list_services`, `get_balance`, `create_order` (confirm-gated),
`order_status`, `cancel_order`.

## Universal skill (Claude Code / ChatGPT)

- **Claude Code:** copy `skill/SKILL.md` into `.claude/skills/stars-cash-flow/`.
- **ChatGPT Custom GPT:** create a GPT → *Actions* → import `skill/openapi.yaml`;
  add the key as an auth header or instruct the user to supply it.

## Hermes Agent

Copy the skill into Hermes' skills tree and set the key when prompted:

```bash
mkdir -p ~/.hermes/skills/telegram/stars-cash-flow
cp -r hermes/SKILL.md hermes/scripts ~/.hermes/skills/telegram/stars-cash-flow/
export STARS_CASH_FLOW_API_KEY=your-key
```

Then `/stars-cash-flow price 1000 subscribers for @mychannel`. Hermes is also
MCP-compatible, so the MCP server above works there too.

## License

MIT — see [LICENSE](LICENSE).
