# Matia — SEO/GEO Agent Platform

> **Repo:** [`matia-seo`](https://github.com/alex-elia/matia-seo) · **Brand:** Matia (Greek μάτια — *eyes*)

**Greek: μάτια (*eyes*)** — the visibility watch for your Next.js sites.

Matia is an AI agent platform that defines your SEO/GEO strategy (goals, ICP, intents), proposes actions, and executes technical + content work **after you approve**.

> Most SEO tools emit tags. **Matia watches, plans, and ships.**

## What Matia does

1. **Strategy** — goals, ICP, positioning, intent map per website
2. **Action planning** — gap analysis between strategy and current pages
3. **Approve** — nothing runs until you approve strategy and actions
4. **Execute** — metadata, sitemaps, GEO surfaces (`llms.txt`, `facts.json`), content, indexing

## Packages

| Package | Description |
|---------|-------------|
| [`@matia/core`](./packages/core) | Strategy types, entity model, action queue types |
| [`@matia/integrations-google`](./packages/integrations-google) | GSC + Indexing API (ported from EliaGo SEO_Component) |
| [`@matia/next`](./packages/next) | Next.js App Router metadata and crawler helpers |
| [`@matia/cli`](./packages/cli) | `matia` CLI for agents and automation |

## Quick start

```bash
git clone https://github.com/alex-elia/matia-seo.git
cd matia-seo
npm install
npm run build
npx matia help
```

### Google Search Console (ported from EliaGo)

```bash
# Public example (fictional domain)
npm run matia -- sync-gsc --config configs/sites/example-site.json

# Your real sites — local only (gitignored private/ folder)
npm run matia -- sync-gsc --config private/sites/elia-studio.json
```

Place service account JSON at `.secrets/gsc-service-account.json`. See [configs/sites/README.md](./configs/sites/README.md) and [docs/oss-private-split.md](./docs/oss-private-split.md).

### Host app integration (Next.js)

```bash
npm install @matia/core @matia/next
```

```ts
import { buildPageMetadata, buildRobotsFromAgents } from "@matia/next";

export const metadata = buildPageMetadata({
  siteUrl: "https://example.com",
  locale: "en",
  pathname: "/services",
  title: "Services",
  description: "What we offer.",
  locales: ["en", "fr"],
  defaultLocale: "en",
  siteName: "Example",
  withHreflang: true,
  ogImage: "https://example.com/og.png",
});

// robots.ts
export default function robots() {
  return buildRobotsFromAgents({ siteUrl: "https://example.com" });
}
```

Validate host SEO layer:

```bash
matia check --root /path/to/your-next-app
```

Per-app strategy file (agent-maintained):

```text
src/seo/
  matia.config.json  # in each host app (recommended), not in public matia-seo
  strategy.yaml      # intentMap, geoEntities, signalDetection, benchmarkSites
  registry.ts
  policies.ts
  entity-maps.ts
```

GEO signal detection (operator machine):

```bash
matia signals detect --config src/seo/matia.config.json --root . --cockpit true
```

See [GEO signal detection v1 spec](./docs/specifications/geo-signal-detection-v1-spec.md).

For local Matia development, real configs may live in gitignored `private/sites/` — see [docs/oss-private-split.md](./docs/oss-private-split.md).

## Project status

**v0.1.0 — early foundation**

- [x] Core types (`SiteStrategyProfile`, `SeoAction`, `SeoGeoEntity`)
- [x] Google integrations — GSC sync, indexing submit, analyze (ported from EliaGo)
- [x] Next.js metadata + robots helpers (`buildPageMetadata`, `buildRobotsFromAgents`)
- [x] CLI: `sync-gsc`, `submit-indexing`, `analyze not-indexed`, `check`
- [x] Cursor strategist rule template (`.cursor/rules/matia-strategist.mdc`)
- [ ] Inventory scanner (`matia inventory`)
- [ ] Action queue + Supabase ops store
- [ ] OVH execution worker

## Documentation

- **GitHub Pages (EN):** [Project site](./docs/index.html) — enable Pages from `/docs` in repo settings
- **GitHub Pages (FR):** [Site FR](./docs/fr/index.html)
- **ADR 0003 — GEO signal detection:** [docs/adr/0003-geo-signal-detection.md](./docs/adr/0003-geo-signal-detection.md)
- **GEO signal detection v1 spec:** [docs/specifications/geo-signal-detection-v1-spec.md](./docs/specifications/geo-signal-detection-v1-spec.md)
- **Cockpit v1 spec:** [docs/specifications/cockpit-v1-spec.md](./docs/specifications/cockpit-v1-spec.md)

## Why "Matia"

From Greek **μάτια** (*eyes*). SEO and GEO are about being seen — by search engines and AI systems. Matia is the watch over your visibility: it sees gaps, proposes fixes, and executes after approval.

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

Early stage. Issues and discussions welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).
