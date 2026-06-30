---
name: stars-cash-flow
description: >
  Order and manage Telegram Stars CPA / SMM services (channel subscribers,
  boosts, bot starts, Stars transfers) through the Stars Cash Flow reseller API.
  Use when the user wants to buy/check/cancel Telegram promotion orders or check
  their reseller balance. The API is JustAnotherPanel/Perfect-Panel compatible.
---

# Stars Cash Flow — reseller API skill

A universal skill for driving the **Stars Cash Flow** reseller API from any AI
agent (Claude Code, Claude Desktop via MCP, a ChatGPT Custom GPT Action, or a
self-hosted agent). It is a CPA exchange for real Telegram actions — subscribers,
boosts and bot starts are fulfilled by real people who verify on Telegram's side,
not bots.

## Endpoint & auth

- **Endpoint:** `POST https://api-stars.ros.media/api/v2` (form-encoded:
  `application/x-www-form-urlencoded`).
- **Auth:** every action except `services` needs an API key passed as the `key`
  field. Get a key from `@StarsCashFlowbot` → *Reseller* section. The key is tied
  to a **USD balance**.
- **Rate limit:** 60 requests / minute / key.
- **Compatibility:** drop-in for JustAnotherPanel — same actions and response
  shapes, only the URL and key differ.

> Read the key from a secret/env var (`STARS_CASH_FLOW_API_KEY`). Never hardcode
> or print it.

## Operations

All requests are `POST` with an `action` field.

| action | fields | returns |
| --- | --- | --- |
| `services` | — | array of services (id, name, rate USD/1000, min, max, …) |
| `balance` | `key` | `{ balance, currency }` |
| `add` | `key, service, link, quantity` | `{ order }` — **spends balance** |
| `status` | `key, order` *or* `orders` (csv, ≤100) | `{ charge, start_count, status, remains, currency }` |
| `cancel` | `key, orders` (csv) | `{ canceled: [ids] }` — refunds remainder |

`status` values: `In progress`, `Partial`, `Completed`, `Pending`, `Canceled`.

Errors come back as `{ "error": "message" }` with HTTP 200 — always check for an
`error` field before trusting the payload.

## 🔴 Money rules (must follow)

`add` debits real USD from the reseller's balance. Before placing an order:

1. **Always price first.** Call `services`, find the service, and compute the
   cost: `cost_usd = rate * quantity / 1000`. Validate `min ≤ quantity ≤ max`.
2. **Confirm the spend with the user.** State the service, link, quantity and
   exact USD cost, and get an explicit "yes" before calling `add`. Never place an
   order the user did not approve in this turn.
3. **One order per intent.** The API is idempotent for ~120s on identical
   `(service, link, quantity)`, but do not rely on it — do not retry `add` blindly
   on a timeout; check `status`/balance first.
4. `cancel` refunds only the *unfulfilled* remainder; already-delivered units are
   not refunded. Confirm before cancelling.

If you are an MCP host using the `stars-cash-flow` MCP server, `create_order` and
`cancel_order` are already two-step: the first call returns a preview (cost
estimate / what would be cancelled), and you must repeat it with `confirm: true`.
Surface the preview to the user and get approval before confirming.

## Typical flow

1. `services` → pick `service` id, note `rate`, `min`, `max`.
2. Compute cost, check the user's `balance`.
3. Tell the user: "Order N units of <service> for <link> = $X. Proceed?"
4. On explicit yes → `add` → keep the returned `order` id.
5. `status` to track until `Completed`. `cancel` if needed.

## Examples

Price + order 1000 channel subscribers (service 1) for `@mychannel`:

```bash
# 1. discover + price
curl -s -X POST https://api-stars.ros.media/api/v2 -d action=services
# service 1 rate "21.2500" → 1000 units = 21.25 * 1000 / 1000 = $21.25

# 2. (after user approval) place the order
curl -s -X POST https://api-stars.ros.media/api/v2 \
  -d action=add -d key="$STARS_CASH_FLOW_API_KEY" \
  -d service=1 -d link="https://t.me/mychannel" -d quantity=1000

# 3. track
curl -s -X POST https://api-stars.ros.media/api/v2 \
  -d action=status -d key="$STARS_CASH_FLOW_API_KEY" -d order=12345
```

Python:

```python
import os, requests
API = "https://api-stars.ros.media/api/v2"
KEY = os.environ["STARS_CASH_FLOW_API_KEY"]

def call(**data):
    r = requests.post(API, data=data, timeout=15).json()
    if isinstance(r, dict) and "error" in r:
        raise RuntimeError(r["error"])
    return r

services = call(action="services")
balance = call(action="balance", key=KEY)
# ...after user approval...
order = call(action="add", key=KEY, service=1, link="https://t.me/mychannel", quantity=1000)
status = call(action="status", key=KEY, order=order["order"])
```

## Notes per service mode

- **Task-exchange** services (subscribers / boosts / bot starts) are fulfilled by
  real users via the bot. For channel subscribers, bot `@StarsCashFlowbot` must be
  an admin of the target channel.
- **Manual** services (premium mixes, global subscribers) are fulfilled by the
  operator; `status` moves through `Pending` → `Partial`/`Completed`.
