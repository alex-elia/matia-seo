# Specification: Matia Cockpit v1

**Version:** 1.0-draft  
**Status:** Planned  
**Repository:** `matia-seo` → `apps/cockpit`  
**ADR:** [0001 — Cockpit repository placement](../adr/0001-matia-cockpit-repository-placement.md)  
**Related:** [GEO signal detection v1 spec](./geo-signal-detection-v1-spec.md)

## Purpose

Matia Cockpit is a **local-only operator console** for managing SEO/GEO across multiple client sites. It consumes Matia CLI outputs (GSC snapshots, gap analysis, GEO probes) and exposes an approval workflow before changes land in host application repos.

## Non-goals (v1)

- Hosted SaaS or multi-user cloud deployment
- Autonomous content publishing without human approval
- Bing Webmaster API integration (manual submit documented per site)
- Storing GSC service account keys inside the cockpit database (file path reference only)

## Users

| Persona | Need |
|---------|------|
| SEO operator (you) | Weekly sync, gap review, approve actions |
| Cursor agent | Read approved actions + strategy; propose diffs in host repo |
| Client stakeholder | Optional read-only export (HTML/Markdown report) — v1.1 |

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ apps/cockpit (localhost:4040)                               │
│  UI: sites · snapshots · gap · queue · signals              │
│  SQLite: ~/.matia/cockpit/cockpit.db                        │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
        @matia/cli (subprocess)        fetch public URLs
                │                             │
┌───────────────▼──────────────┐   ┌──────────▼──────────────┐
│ Host app repo (elia-studio)  │   │ Production site         │
│ src/seo/strategy.yaml      │   │ /sitemap.xml            │
│ src/seo/registry.ts        │   │ /api/seo/health         │
│ src/seo/matia.config.json  │   │ /llms.txt               │
│ messages/ + pages          │   │ /api/facts.json         │
└────────────────────────────┘   └─────────────────────────┘
```

## Data model (SQLite)

### `sites`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | slug, e.g. `elia-studio` |
| name | TEXT | Display name |
| site_url | TEXT | Canonical production URL |
| host_root | TEXT | Absolute path to host repo on disk |
| config_path | TEXT | Path to `matia.config.json` |
| created_at | TEXT ISO | |

### `snapshots`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| site_id | TEXT FK | |
| type | TEXT | `gsc` \| `gap` \| `probe` \| `signals` |
| captured_at | TEXT ISO | |
| payload_json | TEXT | Full artifact JSON |

### `actions`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | From `SeoAction.id` |
| site_id | TEXT FK | |
| type | TEXT | `SeoAction.type` |
| status | TEXT | proposed → approved → executing → done \| rejected |
| rationale | TEXT | |
| target_url | TEXT nullable | |
| payload_json | TEXT | |
| proposed_at | TEXT | |
| approved_at | TEXT nullable | |
| executed_at | TEXT nullable | |
| outcome | TEXT nullable | |

### `signals`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | From strategy `signalDetection.id` |
| site_id | TEXT FK | |
| hypothesis | TEXT | |
| source | TEXT | gsc \| sales \| geo-probe \| manual |
| status | TEXT | hypothesis \| validated \| rejected |
| evidence_json | TEXT | Array of evidence strings + optional links |
| updated_at | TEXT | |

## CLI integration

Cockpit v1 wraps existing commands (does not reimplement GSC):

| Operator action | CLI / API |
|-----------------|-----------|
| Sync GSC | `matia sync-gsc --config <path>` |
| Run gap | `matia gap --config <path> --cockpit true` |
| Probe GEO | `matia probe-geo --config <path> --cockpit true` |
| Detect signals | `matia signals detect --config <path> --cockpit true` |
| Import snapshot | `matia cockpit import --config <path>` |
| Approve action | `matia cockpit approve --project <slug> --id <id>` |

Cockpit UI may call these via `child_process` or import `@matia/core` + `@matia/integrations-google` directly for read paths.

## UI surfaces (v1)

### 1. Dashboard

- Per-site cards: last sync date, intent coverage %, open actions, health overall from latest probe
- Warning if GSC snapshot older than 7 days

### 2. Site detail — Indexing

- Table from latest GSC snapshot: URL, coverage state, last crawl
- Filter: priority URLs, unknown, not indexed

### 3. Site detail — Strategy gap

- Intent map table: intent, status, target pages, linked actions
- Signal list: hypothesis vs validated

### 4. Action queue

- Tabs: Proposed | Approved | Done | Rejected
- Actions: Approve, Reject, Mark done, Open in host repo (file hint from payload)
- Bulk approve for same `type` (v1.1)

### 5. GEO probe

- Last probe: health summary, entity mention matrix (llms / facts)
- Re-run probe button

### 6. Signal detection (v0.3 — file store; SQLite in Phase 4)

- **Run signal detection** button → `matia signals detect`
- Benchmark comparison matrix (own site vs `benchmarkSites[]`)
- Hypothesis / validated counts from latest `signals/detect-*.json`
- Top findings list (pass / warn / fail)
- See [GEO signal detection v1 spec](./geo-signal-detection-v1-spec.md)

## Host app contract (unchanged)

Host repos implement:

| Artifact | Path |
|----------|------|
| Strategy | `src/seo/strategy.yaml` |
| Registry | `src/seo/registry.ts` |
| Config | `src/seo/matia.config.json` |
| Health | `GET /api/seo/health` |
| Facts | `GET /api/facts.json` |
| LLMs | `GET /llms.txt` |

Cockpit reads strategy/registry from `host_root` on disk; probes production URLs from `site_url`.

## Security

- Bind server to `127.0.0.1:4040` by default
- No authentication in v1 (local single-user)
- `serviceAccountKey` resolved from host config path at runtime; never copied into SQLite
- Reports under `src/seo/reports/` gitignored in host repos

## Technology choices (v1)

| Concern | Choice |
|---------|--------|
| UI framework | Next.js 16 (App Router) — same stack as host apps |
| Database | `better-sqlite3` in `apps/cockpit` only |
| Styling | Tailwind + minimal shadcn |
| Monorepo | npm workspaces: `packages/*`, `apps/*` |

## Acceptance criteria

- [ ] Register elia-studio as first site pointing to local repo path
- [ ] Import existing `~/.matia/cockpit/elia-studio/` JSON into SQLite
- [ ] Run sync + gap + probe from UI; artifacts visible in history
- [ ] Approve action updates queue; status persists across restart
- [ ] `matia cockpit status` and UI show consistent counts
- [ ] No network listen on `0.0.0.0` by default

## Version alignment

- Requires `@matia/core` ≥ 0.2.0
- Host apps pin matia via `ensure-matia.mjs` + optional `MATIA_SEO_REF=v0.2.0` on CI
