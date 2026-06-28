# Security Policy

## Reporting a vulnerability

Please report security issues **privately** — do not open a public GitHub issue.

- Use [GitHub Security Advisories](https://github.com/govRosMedia/stars-cash-flow-mcp/security/advisories/new)
  (preferred), or
- Contact the maintainers through [`@StarsCashFlowbot`](https://t.me/StarsCashFlowbot).

Please include: a description, reproduction steps, affected version/commit, and the
impact you observed. We aim to acknowledge reports within a few business days and
will keep you updated on the fix.

## Scope

This repository ships client-side software: an MCP server, a TypeScript API
client, an AI skill, and a CLI. The most relevant risks are:

- **API key handling.** The key is read from `STARS_CASH_FLOW_API_KEY` and sent to
  the API only. It is never logged or printed. Reports of any path that leaks the
  key are in scope.
- **Money-safety gates.** `create_order` / `order` / `cancel` must not spend or
  refund without explicit confirmation. A bypass of these gates is in scope.

Vulnerabilities in the upstream API service itself (`api-stars.ros.media`) should
also be reported through the channels above.

## Handling secrets

- Never commit API keys, tokens or `.env` files.
- Store the key in your MCP host's `env`/secret store or a shell environment
  variable — not in source, not in public GPT instructions.
- Rotate a key immediately if you suspect it has been exposed (create a new one in
  the bot's Reseller section).
