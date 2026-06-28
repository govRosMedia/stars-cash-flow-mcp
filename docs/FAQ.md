# FAQ

### What is Stars Cash Flow?

A CPA exchange for **real Telegram actions** — channel subscribers, boosts and bot
starts performed by real users who verify on Telegram's side, not bots. The
reseller API lets you resell these actions from your own panel, agent or app.

### Is the API really JustAnotherPanel compatible?

Yes. The actions (`services`, `balance`, `add`, `status`, `cancel`), the field
names and the response shapes match the JustAnotherPanel / Perfect-Panel v2
standard. If you already integrate an SMM panel, change only the URL and key.

### How do I get an API key?

Open [`@StarsCashFlowbot`](https://t.me/StarsCashFlowbot), go to the **Reseller**
section, and create a key. The key holds a **USD balance**; `add` debits it.

### How is an order priced?

Each service has a `rate` in **USD per 1000 units**. The cost of an order is:

```
cost = rate × quantity ÷ 1000
```

For example, 1000 units of a service with `rate: "21.2500"` cost `$21.25`. Always
call `services` to read the live rate before ordering.

### Why does `create_order` refuse the first time?

Because ordering spends real money. The MCP `create_order` tool (and the CLI
`order` command) are **two-step by design**: the first call returns a cost
estimate and validation; you must call again with `confirm: true` (`--confirm`) to
actually place the order. This forces the cost into the conversation before any
spend. See [money safety](../README.md#-money-safety).

### Can I cancel an order and get a refund?

Yes — `cancel` refunds the **unfulfilled remainder** to your balance.
Already-delivered units are not refunded. Completed orders can't be cancelled.

### What do the order statuses mean?

`Pending` (accepted), `In progress` (being delivered), `Partial` (paused, some
delivered), `Completed` (done), `Canceled` (refunded remainder). See
[API.md](./API.md#status).

### Is there a rate limit?

Yes — **60 requests per minute per key**. Exceeding it returns
`{ "error": "Rate limit exceeded. Max 60 requests per minute." }`.

### My channel-subscriber order isn't moving. Why?

For task-exchange channel subscribers, **`@StarsCashFlowbot` must be an admin of
the target channel** so it can verify subscriptions. Add the bot as an admin and
the order will progress.

### Is the order endpoint idempotent?

Identical `(service, link, quantity)` requests within ~120 s return the same order
instead of duplicating. Treat this as a safety net, not your primary guard — don't
blind-retry `add` on a timeout; check `balance`/`status` first.

### Do I need the Node package to use the API?

No. The API is plain HTTP — `curl`, Python `requests`, or the dependency-free CLI
in [`hermes/scripts/stars_cash_flow.py`](../hermes/scripts/stars_cash_flow.py) all
work. The Node package is for MCP hosts and TypeScript projects.

### Where do I keep the API key?

In an environment variable (`STARS_CASH_FLOW_API_KEY`) or your MCP host's `env`
block / secret store. Never commit it, never print it, never put it in public GPT
instructions.

### How do I report a security issue?

See [SECURITY.md](../SECURITY.md). Please disclose responsibly — don't open a
public issue for vulnerabilities.
