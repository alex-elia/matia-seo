# Matia — agent notes

Early foundation monorepo. Run `npm install && npm run build` from root.

Packages: `@matia/core`, `@matia/next`, `@matia/cli`.

When editing public SEO contracts, update types in `packages/core` first.

## Host app vs local cockpit (v0.2)

**Client app repo** (elia-studio, nemrut, …) — ships to production:

- `src/seo/strategy.yaml`, `registry.ts`, `matia.config.json` (no secrets in git)
- Public routes: `sitemap.xml`, `robots.txt`, `llms.txt`, `/api/facts.json`, `/api/seo/health`
- Page copy (`messages/`, pages) after you approve actions
- `@matia/next` metadata and robots (includes Bingbot for EU)

**Local cockpit** (`~/.matia/cockpit/<project>/` or `MATIA_COCKPIT_DIR`) — operator only:

- GSC snapshot history (`matia cockpit import`, `seo:sync` reports)
- Gap analysis and GEO probes (`matia gap`, `matia probe-geo --cockpit true`)
- Action queue (`proposed` → `approved` → implement in host repo → `done`)
- Service account path stays on your machine, never deployed

**Search engines:** Google via GSC + Indexing API. Bing: same sitemap + manual Bing Webmaster submit; no Bing API in v0.2.

**Cockpit (planned v1):** [ADR 0001](docs/adr/0001-matia-cockpit-repository-placement.md) — build in this repo as `apps/cockpit`, not a separate repo, not in host apps. See [spec](docs/specifications/cockpit-v1-spec.md) and [plan](docs/plans/cockpit-v1-plan.md).
