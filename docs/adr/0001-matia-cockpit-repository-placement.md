# ADR 0001: Matia Cockpit — repository placement

**Status:** Accepted  
**Date:** 2026-06-24  
**Deciders:** Elia Studio / Matia platform  
**Related:** [Cockpit v1 spec](../specifications/cockpit-v1-spec.md), [Cockpit v1 plan](../plans/cockpit-v1-plan.md)

## Context

Matia v0.2 introduced:

- Strategy operator (`matia gap`)
- GEO measurement (`matia probe-geo`)
- Signal detection (`signalDetection` in strategy YAML; automated via `matia signals detect` since v0.3 — see [ADR 0003](../adr/0003-geo-signal-detection.md))
- A **file-based local cockpit store** (`~/.matia/cockpit/<project>/`)

Host applications (e.g. elia-studio) must ship crawlable SEO/GEO surfaces to production. Operator workflows need GSC credentials, snapshot history, action queues, and approval state — none of which belong on a public Vercel deployment.

We must decide where the **cockpit application** (UI + persistent store) lives:

1. **Same repo as matia-seo** (`apps/cockpit` in the monorepo)
2. **Separate repository** (`matia-cockpit`)
3. **Inside each client host repo** (e.g. `elia-studio/apps/cockpit`)

## Decision

**Build the cockpit in the matia-seo monorepo as `apps/cockpit`. Do not create a separate repository for v1. Do not place cockpit code in client host repos.**

CLI and file-store primitives remain in existing packages:

| Layer | Location |
|-------|----------|
| Types, gap analysis, file store | `packages/core` |
| Operator commands | `packages/cli` (`matia cockpit …`) |
| Local UI + SQLite (v1) | `apps/cockpit` (new) |
| Public SEO surfaces | Client host repo (`src/seo/`, routes) |

## Rationale

### Why not in client host repos (elia-studio, nemrut, …)

- Cockpit is **multi-site** (one operator, many clients).
- Stores GSC snapshot history and action queues — **operator-private**, not site content.
- Would duplicate cockpit code per client and blur the host vs operator boundary already documented in `AGENTS.md`.
- Host repos deploy to Vercel; cockpit must **never** deploy with them.

### Why same monorepo (not a new repo) for v1

- `@matia/core` already owns cockpit types and the v0.2 JSON file store.
- `@matia/cli` already exposes `matia cockpit import|status|queue|approve`.
- Shared versioning: gap/probe/cockpit UI evolve together.
- Simpler local dev: `npm run cockpit:dev` from matia-seo root.
- OSS boundary stays clear: packages + examples public; operator data stays in `~/.matia/` (gitignored).

### When a separate repo would make sense (defer)

- Cockpit UI becomes **private** while matia-seo stays public OSS.
- Different release cadence or access control (agency operators vs library contributors).
- Heavy desktop packaging (Tauri) with its own CI — extract only if `apps/cockpit` becomes a maintenance burden.

## Consequences

### Positive

- Single clone for contributors: `matia-seo` + host app side by side.
- Host apps only depend on `@matia/core` and `@matia/next`; CLI is a devDependency.
- Clear deploy split: Vercel = host; localhost = cockpit.

### Negative / trade-offs

- Monorepo grows beyond libraries; need workspace wiring for `apps/cockpit`.
- Public matia-seo repo will contain cockpit **source** (acceptable — no secrets in source; data stays local).

### Migration from v0.2 file store

- v0.2 store at `~/.matia/cockpit/<project>/` remains valid.
- v1 cockpit app will import existing JSON artifacts and migrate to SQLite on first run.

## Compliance

- No service account JSON in matia-seo git history.
- Cockpit default bind: `127.0.0.1` only.
- Bing/Google credentials paths configured per machine, not committed.
