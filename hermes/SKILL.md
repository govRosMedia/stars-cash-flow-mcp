---
name: stars-cash-flow
description: >
  Order and manage Telegram Stars CPA / SMM services (channel subscribers,
  boosts, bot starts) via the Stars Cash Flow reseller API. Use when the user
  wants to buy, price, check or cancel Telegram promotion orders, or check their
  reseller balance.
version: 0.1.0
platforms: [macos, linux]
metadata:
  hermes:
    tags: [telegram, smm, cpa, reseller, payments]
    category: telegram
    requires_toolsets: [terminal]
    config:
      - key: stars_cash_flow.api_key
        description: "Reseller API key (from @StarsCashFlowbot → Reseller). Tied to a USD balance."
        prompt: "Paste your Stars Cash Flow reseller API key"
        env: STARS_CASH_FLOW_API_KEY
      - key: stars_cash_flow.api_base
        description: "API endpoint."
        default: "https://api-stars.ros.media/api/v2"
        env: STARS_CASH_FLOW_API_BASE
---

# Stars Cash Flow — reseller API skill (Hermes)

Drive the **Stars Cash Flow** reseller API — a CPA exchange for real Telegram
actions (subscribers, boosts, bot starts fulfilled by verified real users, not
bots). JustAnotherPanel/Perfect-Panel compatible.

Use the bundled CLI; it needs no dependencies (stdlib only) and reads the key
from `STARS_CASH_FLOW_API_KEY`:

```bash
python3 scripts/stars_cash_flow.py services           # catalog + USD rates (no key)
python3 scripts/stars_cash_flow.py balance            # your USD balance
python3 scripts/stars_cash_flow.py price  --service 1 --link https://t.me/c --quantity 1000
python3 scripts/stars_cash_flow.py order  --service 1 --link https://t.me/c --quantity 1000 --confirm
python3 scripts/stars_cash_flow.py status --order 12345
python3 scripts/stars_cash_flow.py status --orders 1,2,3
python3 scripts/stars_cash_flow.py cancel --orders 1,2,3 --confirm
```

## 🔴 Money rules (must follow)

`order` debits real USD; `cancel` refunds only the unfulfilled remainder.

1. **Always `price` first** and read it back to the user (service, link, quantity,
   exact USD cost). Check `balance`.
2. **Get an explicit "yes"** in this turn before running `order ... --confirm`.
   Without `--confirm` the CLI only prints an estimate — never auto-add `--confirm`
   on the user's behalf without that approval.
3. **Do not blind-retry** `order` on a timeout — check `status`/`balance` first
   (the API dedupes identical orders for ~120s, but don't rely on it).
4. Confirm before `cancel --confirm`.

## API shape (for reference)

`POST https://api-stars.ros.media/api/v2`, form-encoded, dispatch on `action`:
`services` (no key) · `balance` · `add` (spends) · `status` · `cancel` (refund).
Errors arrive as `{ "error": "..." }` with HTTP 200.

## MCP alternative

Hermes is MCP-compatible, so instead of this CLI you can register the
`stars-cash-flow` MCP server (see the repo root). It exposes the same operations
as tools, with `create_order` already gated behind a two-step confirm.
