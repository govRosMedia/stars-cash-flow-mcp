# Error reference

The API never uses HTTP error codes for application errors — it returns HTTP `200`
with a JSON body `{ "error": "message" }`. Always check for an `error` field before
trusting a response.

```json
{ "error": "Invalid API key" }
```

## Message reference

| Message | Action(s) | Cause | Fix |
| --- | --- | --- | --- |
| `Missing API key` | any but `services` | No `key` field sent. | Pass `key=...`. |
| `Invalid API key` | any but `services` | Key not recognised. | Re-check the key from the bot's Reseller section. |
| `Rate limit exceeded. Max 60 requests per minute.` | any | >60 req/min on this key. | Back off; batch with `orders=` for status. |
| `Incorrect service ID` | `add` | `service` not in the catalog. | Call `services` for valid IDs. |
| `Service temporarily disabled` | `add` | Service turned off by the operator. | Pick another service or retry later. |
| `Link is required` | `add` | Service needs a target `link`. | Pass `link=https://t.me/...`. |
| `Quantity must be between MIN and MAX` | `add` | Quantity outside the service range. | Use a value within `min`…`max` from `services`. |
| `Insufficient balance` | `add` | Order cost exceeds the key balance. | Top up, or lower the quantity. |
| `API key must be linked to Telegram advertiser account` | `add` | Task-exchange service needs a linked TG account. | Link the key to your advertiser account in the bot. |
| `Invalid parameters` | `add` | `service`/`quantity` not integers. | Send numeric values. |
| `Incorrect order ID` | `status` | Order not found for this key. | Use an order ID returned by your own `add`. |
| `Provide 'order' or 'orders' parameter` | `status` | Neither field sent. | Pass `order=` or `orders=`. |
| `Internal server error` | any | Unexpected server error. | Retry with backoff; if it persists, contact support. |

## How the clients in this repo surface errors

- **TypeScript client / MCP server** — any `{ error }` is thrown as a
  `StarsCashFlowError`. MCP tools return it as an `isError` tool result, so the
  model sees the message.
- **Python CLI** — prints `API error: <message>` to stderr and exits non-zero.

## Network vs application errors

- **Application error** → HTTP 200 + `{ "error": "..." }` (table above).
- **Network / transport error** (DNS, TLS, timeout, non-JSON body) → the clients
  raise a distinct error (`StarsCashFlowError` with a "Network error" / "Non-JSON
  response" message). These are safe to retry with backoff; application errors
  generally are not (fix the request first).
