# Matia — agent notes

Early foundation monorepo. Run `npm install && npm run build` from root.

Packages: `@matia/core`, `@matia/next`, `@matia/cli`.

When editing public SEO contracts, update types in `packages/core` first.

## Host app vs local cockpit (v0.2+)

**Client app repo** (elia-studio, nemrut, …) — ships to production:

- `src/seo/strategy.yaml`, `registry.ts`, `matia.config.json` (no secrets in git)
- `benchmarkSites[]` and `signalDetection[]` in strategy (pattern benchmarks + hypotheses)
- Public routes: `sitemap.xml`, `robots.txt`, `llms.txt`, `/api/facts.json`, `/api/seo/health`
- Page copy (`messages/`, pages) after you approve actions
- `@matia/next` metadata and robots (includes Bingbot for EU)

**Local cockpit** (`~/.matia/cockpit/<project>/` or `MATIA_COCKPIT_DIR`) — operator only:

- GSC snapshot history (`matia cockpit import`, `seo:sync` reports)
- Gap analysis and GEO probes (`matia gap`, `matia probe-geo --cockpit true`)
- **Signal detection** (`matia signals detect --cockpit true`) — benchmark matrix, auto-validate
- Action queue (`proposed` → `approved` → implement in host repo → `done`)
- Service account path stays on your machine, never deployed

**Search engines:** Google via GSC + Indexing API. Bing: same sitemap + manual Bing Webmaster submit; no Bing API in v0.2.

**Docs:**

- [ADR 0003 — GEO signal detection](docs/adr/0003-geo-signal-detection.md)
- [GEO signal detection v1 spec](docs/specifications/geo-signal-detection-v1-spec.md)
- [Cockpit v1 spec](docs/specifications/cockpit-v1-spec.md) / [plan](docs/plans/cockpit-v1-plan.md)
- [ADR 0001 — Cockpit placement](docs/adr/0001-matia-cockpit-repository-placement.md)
