# Stars Cash Flow — API reference

The Stars Cash Flow reseller API is a single HTTP endpoint that dispatches on an
`action` field. It is **JustAnotherPanel / Perfect-Panel compatible**: if you
already integrate any SMM panel, point your client at this URL and key and the
same five actions work unchanged.

- **Endpoint:** `POST https://api-stars.ros.media/api/v2`
- **Encoding:** `application/x-www-form-urlencoded` (GET with query params also works)
- **Responses:** JSON, always HTTP `200` — including errors (see [Errors](#errors))
- **Auth:** an API key in the `key` field; required for every action except `services`
- **Rate limit:** 60 requests per minute per key

> Get a key from [`@StarsCashFlowbot`](https://t.me/StarsCashFlowbot) → **Reseller**.
> The key is tied to a **USD balance**. `add` debits it.

## Conventions

| | |
| --- | --- |
| Money | All amounts are **USD strings** with 4 decimals, e.g. `"21.2500"`. |
| Rate | `rate` is the price **per 1000 units**. Cost = `rate × quantity ÷ 1000`. |
| IDs | `service` and `order` are integers. `orders` is a comma-separated list. |
| Errors | Any action may return `{ "error": "message" }` with HTTP 200. Always check for `error` before using the payload. |

---

## `services`

List the service catalog with live USD rates. **No key required** — use it to
discover service IDs and price an order before spending.

**Request**

```
action=services
```

**Response** — array of:

| field | type | notes |
| --- | --- | --- |
| `service` | integer | Service ID, used in `add`. |
| `name` | string | Human-readable name. |
| `type` | string | Panel service type (`Default`). |
| `category` | string | Grouping, e.g. `Telegram / Subscribers`. |
| `rate` | string | USD per 1000 units. |
| `min` | string | Minimum quantity. |
| `max` | string | Maximum quantity. |
| `refill` | boolean | Whether refill is supported. |
| `cancel` | boolean | Whether the service can be cancelled. |
| `description` | string | Details / requirements (e.g. bot must be channel admin). |
| `currency` | string | Always `USD`. |

```json
[
  {
    "service": 1,
    "name": "Telegram Channel Subscribers (Task Exchange)",
    "type": "Default",
    "category": "Telegram / Subscribers",
    "rate": "21.2500",
    "min": "10",
    "max": "10000",
    "refill": false,
    "cancel": true,
    "description": "Subscribers via task exchange. Bot @StarsCashFlowBot must be admin in channel.",
    "currency": "USD"
  }
]
```

---

## `balance`

Return the remaining USD balance of the key.

**Request**

```
action=balance&key=YOUR_KEY
```

**Response**

```json
{ "balance": "100.0000", "currency": "USD" }
```

---

## `add`

Place an order. **This debits the key's USD balance.**

**Request**

| field | required | notes |
| --- | --- | --- |
| `action` | yes | `add` |
| `key` | yes | API key |
| `service` | yes | Service ID from `services` |
| `link` | usually | Target channel / post / bot link (required for most services) |
| `quantity` | yes | Within the service `min`…`max` |

```
action=add&key=YOUR_KEY&service=1&link=https://t.me/mychannel&quantity=1000
```

**Response**

```json
{ "order": 12345 }
```

**Behaviour & guarantees**

- **Idempotency:** identical `(service, link, quantity)` within ~120 s returns the
  *same* `order` instead of creating a duplicate. Do not rely on this as your only
  guard — see the money-safety note below.
- **Insufficient funds** → `{ "error": "Insufficient balance" }`.
- **Out-of-range quantity** → `{ "error": "Quantity must be between MIN and MAX" }`.
- **Unknown / disabled service** → `{ "error": "Incorrect service ID" }` /
  `{ "error": "Service temporarily disabled" }`.

> 🔴 **Money safety.** Always call `services` and compute the cost first, surface
> it to the user, and only then `add`. Never blind-retry `add` on a network
> timeout — check `balance`/`status` first.

---

## `status`

Get the status of one or many orders.

**Single order**

```
action=status&key=YOUR_KEY&order=12345
```

```json
{
  "charge": "21.2500",
  "start_count": "0",
  "status": "In progress",
  "remains": "850",
  "currency": "USD"
}
```

**Many orders** (comma-separated, up to 100) — returns a map keyed by order ID:

```
action=status&key=YOUR_KEY&orders=12345,12346,12347
```

```json
{
  "12345": { "charge": "21.2500", "start_count": "150", "status": "In progress", "remains": "850", "currency": "USD" },
  "12346": { "charge": "42.5000", "start_count": "500", "status": "Completed",   "remains": "0",   "currency": "USD" }
}
```

**Status values**

| value | meaning |
| --- | --- |
| `Pending` | Accepted, not started. |
| `In progress` | Being fulfilled. |
| `Partial` | Paused with some units delivered; remainder may be refunded on cancel. |
| `Completed` | Fully delivered. |
| `Canceled` | Cancelled; unfulfilled remainder refunded. |

| status field | meaning |
| --- | --- |
| `charge` | USD charged for the order. |
| `start_count` | Units delivered so far. |
| `remains` | Units still to deliver. |

---

## `cancel`

Cancel one or more orders. The **unfulfilled remainder is refunded** to the key's
USD balance; already-delivered units are not refunded.

**Request**

```
action=cancel&key=YOUR_KEY&orders=12345,12346
```

**Response** — the IDs that were actually cancelled:

```json
{ "canceled": [12345] }
```

Orders that are already completed, already cancelled, or have nothing left to
deliver are silently skipped (they won't appear in `canceled`).

---

## Errors

Errors are returned as a JSON object with an `error` field and HTTP status `200`:

```json
{ "error": "Invalid API key" }
```

See [ERRORS.md](./ERRORS.md) for the full message reference and how each client in
this repo surfaces them.

## Service modes

- **Task-exchange** (subscribers, boosts, bot starts): fulfilled by real users
  through the bot. For channel subscribers, `@StarsCashFlowbot` must be an admin
  of the target channel. Verification happens on Telegram's side.
- **Manual** (premium mixes, global subscribers): fulfilled by the operator;
  `status` moves `Pending` → `Partial`/`Completed`.
