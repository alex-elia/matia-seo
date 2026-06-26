# Matia Next.js host integration — v1 standard

**Status:** Active  
**Template source:** `templates/next-host/`  
**Enforced by:** `matia check --root <host>`

Every Next.js app that depends on `@matia/core` and `@matia/next` must follow this contract so **local dev**, **Vercel**, and **cockpit approve → execute** behave the same.

## Why this exists

Matia ships as a **monorepo clone** at `./matia-seo` during `preinstall`, not as a published npm tarball (v1 personal operator model). Without the rules below, CI hits:

- preinstall infinite loops
- host `next build` running inside preinstall
- stale Vercel cache leaving empty `./matia-seo/`
- TypeScript scanning `matia-seo/apps/cockpit` and failing the host build

These are **host wiring** requirements, not bugs in `@matia/core`.

## Quick bootstrap

From matia-seo repo:

```bash
cp templates/next-host/scripts/*.mjs /path/to/host/scripts/
# Merge fragments: package.json, tsconfig exclude, next.config, .gitignore
# Copy src/seo/* from examples/next-host or an existing pilot (elia-studio)
```

Then:

```bash
cd /path/to/host && npm install && npm run seo:check
```

## Required files

| Path | Purpose |
|------|---------|
| `scripts/ensure-matia.mjs` | Clone/link/build `./matia-seo` before deps link |
| `scripts/run-matia.mjs` | CLI wrapper for `seo:*` scripts |
| `scripts/generate-seo-manifest-snapshot.mjs` | Build-time manifest for `/api/seo/manifest` |
| `scripts/matia-execute.mjs` | Cockpit approve executor (host-specific content model) |
| `src/seo/strategy.yaml` | Approved strategy |
| `src/seo/registry.ts` | Page inventory (**quoted `url:` strings** for gap parser) |
| `src/seo/matia.config.json` | GSC property, priority URLs, execution, LLM (no secrets in git) |
| `src/seo/policies.ts` | Re-export `AI_CRAWLER_AGENTS` from `@matia/next` |
| `src/app/api/seo/health/route.ts` | Live surface audit |
| `src/app/api/seo/manifest/route.ts` | Deploy drift fingerprint |

## package.json (required)

```json
{
  "scripts": {
    "preinstall": "node scripts/ensure-matia.mjs",
    "prebuild": "node scripts/generate-seo-manifest-snapshot.mjs",
    "build": "next build --webpack"
  },
  "dependencies": {
    "@matia/core": "file:./matia-seo/packages/core",
    "@matia/next": "file:./matia-seo/packages/next"
  },
  "devDependencies": {
    "@matia/cli": "file:./matia-seo/packages/cli"
  }
}
```

- **`--webpack`** — required for `file:` linked packages on Next.js 16 (Turbopack may not resolve them).
- **`preinstall`** — must use canonical `ensure-matia.mjs` (do not inline a custom clone).

## tsconfig.json (required)

```json
{
  "exclude": ["node_modules", "matia-seo"]
}
```

The cloned monorepo includes `apps/cockpit` with its own `@/` aliases. Excluding `./matia-seo` prevents the host TypeScript pass from failing on unrelated apps.

## next.config.ts (required)

```typescript
transpilePackages: ["@matia/core", "@matia/next"],
// Optional dev watch ignore:
webpack: (config) => {
  config.watchOptions = { ...config.watchOptions, ignored: ["**/matia-seo/**", "**/node_modules/**"] };
  return config;
},
```

**Do not use** `experimental.externalDir: true` — it pulls the full clone into the host build graph.

See `templates/next-host/next.config.matia.fragment.ts`.

## .gitignore (required)

```
matia-seo/
.matia/
src/seo/manifest.snapshot.json
```

`matia-seo/` is cloned or junction-linked at install time — never commit it.

## ensure-matia.mjs invariants

Canonical copy: `templates/next-host/scripts/ensure-matia.mjs`

| Rule | Reason |
|------|--------|
| Exit immediately when `MATIA_ENSURE_SKIP=1` | Breaks preinstall recursion |
| Validate `./matia-seo/package.json`, not just directory exists | Vercel cache can restore empty folders |
| `npm install --ignore-scripts --prefix ./matia-seo` | Never run host lifecycle from nested install |
| `npm run build --prefix ./matia-seo` | Never run host `next build` from wrong cwd |
| Set `MATIA_ENSURE_SKIP=1` on all nested npm calls | Nested preinstall no-op |

### Vercel environment (optional)

| Variable | Purpose |
|----------|---------|
| `MATIA_SEO_REPO` | Override clone URL (default: `https://github.com/alex-elia/matia-seo.git`) |
| `MATIA_SEO_REF` | Pin branch/tag/commit for reproducible builds |

## registry.ts and gap analysis

`matia gap` parses **literal quoted** `url:` / `slug:` fields from `registry.ts` source — not runtime-only builders.

```typescript
// ✅ gap parser sees this
{ slug: "/book", url: "https://example.com/book", ... }

// ❌ invisible to gap parser
{ slug: "/book", url: `${base}/book`, ... }
```

Use a `STATIC_REGISTRY` with quoted URLs, then spread localized/news entries for runtime inventory.

## Content layout variants

| Layout | `matia.config.json` | Output path |
|--------|---------------------|-------------|
| Blog per locale (elia-studio) | default | `content/{locale}/blog/{slug}.md` |
| News per locale (onira, konaki) | `"content": { "articleLayout": "news-per-locale", "defaultAuthor": "..." }` | `content/news/{slug}.{locale}.md` |

## Cockpit registration

Add host to `~/.matia/cockpit/sites.json`:

```json
{
  "slug": "your-project",
  "name": "Your Site",
  "siteUrl": "https://example.com",
  "hostRoot": "/absolute/path/to/repo",
  "configPath": "src/seo/matia.config.json"
}
```

## Verification

```bash
npm run seo:check          # strategy + registry + integration wiring
npm run build              # full Vercel-like path
```

`matia check` fails on missing integration pieces (scripts, tsconfig exclude, transpilePackages, etc.).

## Pilot hosts (reference)

| Slug | Repo |
|------|------|
| `elia-studio` | blog layout, messages patches |
| `onira` | news-per-locale, property advisory |
| `konaki-analipsi` | news-per-locale, vacation rental |

When updating the standard, change **template first**, then sync pilot hosts, then run `matia check` on each.
