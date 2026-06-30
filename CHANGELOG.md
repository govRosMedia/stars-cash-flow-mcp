# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **`cancel_order` (MCP) is now confirm-gated.** Previously it refunded the
  unfulfilled remainder on the first call; it now returns a preview and only
  cancels when called again with `confirm: true`, symmetric with `create_order`.
  (Found by independent cross-review.)

### Added

- `smithery.yaml` so the server can be listed and launched from the
  [Smithery](https://smithery.ai) MCP registry, with the reseller API key
  collected via `configSchema` and mapped to the server's environment.
- Optional `mode` / `requires_link` / `enabled` fields on the `Service` type and
  OpenAPI schema, matching the live catalog.

### Changed

- Published under the `@rosmedia` npm organization (`@rosmedia/stars-cash-flow-mcp`).
- The npm package now ships `skill/`, `hermes/`, `docs/` and `examples/` so README
  links resolve and skill/CLI users get the files on install.
- CLI `status`/`cancel` reject invalid `--orders` tokens instead of silently
  dropping them (`123,abc` now errors rather than becoming `123`).

### Fixed

- Python CLI now raises a clear error (instead of an uncaught traceback) on a
  non-JSON `200` response, matching the TypeScript client and the documented
  behaviour.

### Changed

- `create_order` (MCP) and `order`/`price` (CLI) accept an optional `link`; the API
  validates per-service `requires_link` and rejects when a required link is missing.
- The confirm path reports `estimated_cost_usd` (quote-time figure) rather than
  `spent_usd`; the authoritative charge is on the order via `status`.
- Test files are excluded from the published `dist/` (separate `tsconfig.build.json`).

## [0.1.0] — 2026-06-28

### Added

- **MCP server** (`@modelcontextprotocol/sdk`) exposing five tools:
  `list_services`, `get_balance`, `create_order`, `order_status`, `cancel_order`.
- **Two-step money guard** on `create_order`: the first call returns a cost
  estimate and only places the order when called again with `confirm: true`.
- **Typed TypeScript client** (`StarsCashFlowClient`) over the `/api/v2` reseller
  API, exported for direct use.
- **Universal AI skill** — `skill/SKILL.md` (agentskills.io) for Claude Code and
  `skill/openapi.yaml` (OpenAPI 3.1) for ChatGPT Custom GPT Actions.
- **Hermes Agent skill** — `hermes/SKILL.md` plus a dependency-free Python CLI
  (`hermes/scripts/stars_cash_flow.py`) with `--confirm` gates on spend.
- **Documentation** — API reference, quickstart, FAQ and error reference under
  `docs/`; runnable examples under `examples/`.
- **Tests** (vitest) and CI (build + test) via GitHub Actions; Dependabot for npm
  and Actions.

[Unreleased]: https://github.com/govRosMedia/stars-cash-flow-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/govRosMedia/stars-cash-flow-mcp/releases/tag/v0.1.0
