# Site configs (public examples)

Generic templates for the open-source repo. **Do not put your real domains here.**

## Public example

Copy and edit [`example-site.json`](./example-site.json) for your own setup, or — recommended — add `src/seo/matia.config.json` in each **host app** repo.

## Your real projects (private)

Real configs for Elia Go, Elia Studio, etc. live in the gitignored [`private/sites/`](../../private/README.md) folder on your machine. That folder is not published.

## Setup

1. Copy `example-site.json` → your config (or use `private/sites/` locally).
2. Place Google service account JSON at `.secrets/gsc-service-account.json` (gitignored).
3. Add the service account to Search Console for your property.
4. Enable Search Console API + Indexing API in Google Cloud.

## Commands

```bash
npm run build
npm run matia -- sync-gsc --config configs/sites/example-site.json
npm run matia -- analyze not-indexed --config configs/sites/example-site.json
npm run matia -- submit-indexing --config configs/sites/example-site.json --dry-run
```

Reports: `reports/<slug>/<yyyy-mm-dd>/` (gitignored).
