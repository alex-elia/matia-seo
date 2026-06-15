# Contributing to Matia

Matia is in early development (v0.1). Thank you for your interest.

## Development setup

```bash
npm install
npm run build
npm run typecheck
```

## Repository layout

```text
packages/
  core/     @matia/core — types and shared contracts
  next/     @matia/next — Next.js adapter
  cli/      @matia/cli  — matia command-line tools
docs/       GitHub Pages site (EN + FR)
```

## Principles

- Strategy before execution — `SiteStrategyProfile` drives actions
- Approve before ship — agents propose; humans approve
- Host apps own rendering — Matia provides tools, not a centralized runtime

## GitHub Pages

Enable **Settings → Pages → Deploy from branch → main → /docs**.

Published URL: `https://alex-elia.github.io/matia-seo/`
