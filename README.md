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

### Host app integration (Next.js)

```bash
npm install @matia/core @matia/next
```

```ts
import { buildLocaleMetadata } from "@matia/next";

export const metadata = buildLocaleMetadata({
  siteUrl: "https://example.com",
  locale: "en",
  pathname: "/services",
  title: "Services",
  description: "What we offer.",
  locales: ["en", "fr"],
  defaultLocale: "en",
});
```

Per-app strategy file (agent-maintained):

```text
src/seo/
  strategy.yaml    # approved goals, ICP, intent map
  registry.ts      # page inventory
  policies.ts      # indexability rules
  entity-maps.ts   # GEO facts schemas
```

## Project status

**v0.1.0 — early foundation**

- [x] Core types (`SiteStrategyProfile`, `SeoAction`, `SeoGeoEntity`)
- [x] Next.js metadata helper
- [x] CLI scaffold
- [ ] Quality gates (`matia check`)
- [ ] Inventory scanner (`matia inventory`)
- [ ] Strategist agent skill for Cursor
- [ ] Action queue + Supabase ops store
- [ ] OVH execution worker

## Documentation

- **GitHub Pages (EN):** [Project site](./docs/index.html) — enable Pages from `/docs` in repo settings
- **GitHub Pages (FR):** [Site FR](./docs/fr/index.html)

## Why "Matia"

From Greek **μάτια** (*eyes*). SEO and GEO are about being seen — by search engines and AI systems. Matia is the watch over your visibility: it sees gaps, proposes fixes, and executes after approval.

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

Early stage. Issues and discussions welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).
