# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
