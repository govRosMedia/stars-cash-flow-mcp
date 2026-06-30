# Contributing

Thanks for your interest in improving the Stars Cash Flow MCP server, skill and
Hermes tool. This guide keeps contributions smooth and the published package
trustworthy.

## Development setup

```bash
git clone https://github.com/govRosMedia/stars-cash-flow-mcp.git
cd stars-cash-flow-mcp
npm install
npm run build      # compile TypeScript → dist/
npm test           # run the test suite
npm run typecheck  # type-check without emitting
```

Node 18+ is required.

## Project layout

```
src/          TypeScript: client.ts (API client) + index.ts (MCP server)
skill/        Universal skill: SKILL.md + openapi.yaml
hermes/       Hermes skill: SKILL.md + scripts/stars_cash_flow.py (stdlib CLI)
docs/         API reference, quickstart, FAQ, errors
examples/     Runnable curl / Python / Node examples
```

All three surfaces wrap the **same** five API actions. If you change behaviour,
update **every** surface and the docs so they stay in sync.

## Guidelines

- **Keep it typed.** No `any` in `src/` without a clear reason. `npm run typecheck`
  must pass.
- **Test what you add.** New client behaviour needs a test in `src/client.test.ts`.
  `npm test` must be green.
- **Respect money safety.** Any path that can spend balance must remain gated
  behind explicit confirmation. Do not remove or weaken the `confirm` gates.
- **Never commit secrets.** No API keys, tokens or `.env`. The key is read from
  `STARS_CASH_FLOW_API_KEY` at runtime.
- **Document user-facing changes** in `CHANGELOG.md` under `[Unreleased]`.

## Commit & PR

- Write clear, imperative commit messages (`add ...`, `fix ...`, `docs: ...`).
- Open a PR against `main`. CI (build + test) must pass.
- Describe what changed, why, and how you verified it.

## Releasing (maintainers)

Releases are published to npm **from GitHub Actions with provenance** (the verified
"Published from this repo" badge), not from a laptop.

One-time setup: add a repo secret `NPM_TOKEN` — an npm *granular access token*
(automation type) with publish rights on `@rosmedia/stars-cash-flow-mcp`.

To cut a release:

```bash
# update CHANGELOG.md [Unreleased] → a new version section
npm version patch     # or minor / major — bumps package.json and creates a git tag
git push --follow-tags
```

Pushing the `v*` tag triggers `.github/workflows/publish.yml`, which builds, tests,
and runs `npm publish --provenance --access public`. The published version then
shows a provenance attestation linking it to the exact commit and workflow run.

## Reporting bugs / requesting features

Use the GitHub issue templates. For **security** issues, follow
[SECURITY.md](./SECURITY.md) instead of opening a public issue.
