# Specification: Matia GEO signal detection v1

**Version:** 1.0  
**Status:** Implemented (v0.3)  
**ADR:** [0003 — GEO signal detection](../adr/0003-geo-signal-detection.md)  
**Pilot site:** elia-studio.eu

## Purpose

Automate **GEO signal detection** and **benchmark comparison** for operator sites. Deterministic detectors produce `SignalFinding` artifacts, optional auto-validation of `strategy.yaml` hypotheses, and merged gap actions — without LLM-based pass/fail truth.

## Non-goals (v1)

- LangGraph or multi-step agent orchestration
- LLM citation probes (`matia signals probe-citation`) — deferred Phase 2
- GSC Search Analytics / query impression API
- Competitor SERP scraping (`source: competitor-serp` reserved, not implemented)
- Autonomous `strategy.yaml` edits without `--auto-validate`
- Hosted SaaS or multi-tenant signal store

## Architecture

```text
strategy.yaml                    production site
├── signalDetection[]     ──►   /llms.txt, /api/facts.json, /api/seo/health
├── benchmarkSites[]      ──►   external URLs (e.g. signalseo.co)
├── geoEntities[]
└── intentMap[]

         │
         ▼
┌────────────────────────────────────────────┐
│ @matia/core  packages/core/src/signals/    │
│  runSignalDetection()                      │
│   ├─ BenchmarkDetector                     │
│   ├─ OwnSiteDetector (+ probeGeoSurfaces)  │
│   ├─ GscSignalMatcher                      │
│   ├─ SchemaOrgDetector                     │
│   ├─ buildComparisonMatrix()               │
│   └─ autoValidateSignals()                 │
└──────────────┬─────────────────────────────┘
               │
     ┌─────────┴──────────┐
     ▼                    ▼
runGapAnalysis()     cockpit store
(signalFindings)     signals/detect-*.json
     │
     ▼
SeoAction[] → actions-queue.json
```

**Design principle:** Detectors are pure functions (fetch + parse + rules). LLM is only for optional synthesis in v1.5+, never for signal pass/fail.

## Host contract

### Strategy YAML additions

```yaml
# GEO pattern benchmarks — not business competitors
benchmarkSites:
  - url: https://signalseo.co
    label: Signal SEO
    reason: GEO/citation surface patterns for B2B expertise sites

positioning:
  competitors: []   # real business competitors — separate from benchmarks

signalDetection:
  - id: eu-sovereign-ai-queries
    source: gsc
    hypothesis: "EU buyers search sovereign AI adoption with compliance framing"
    keywordPatterns:        # optional — match intents for GSC matcher
      - sovereign
      - compliance
    evidenceRequired:
      - "Indexed /services and /fr/services with matching copy"
    status: hypothesis
```

| Field | Type | Notes |
|-------|------|-------|
| `benchmarkSites[].url` | string | Canonical site URL |
| `benchmarkSites[].label` | string | Display name in matrix |
| `benchmarkSites[].reason` | string | Operator note — why this site is a pattern reference |
| `signalDetection[].keywordPatterns` | string[] | Optional — GSC matcher intent filter |
| `intentMap[].hypothesisQueries` | string[] | Optional — link intents to GSC signals |

### `matia.config.json` (optional)

```json
"signals": {
  "gscMinImpressions": 10,
  "note": "GSC matcher uses indexing snapshot until Search Analytics API is integrated"
}
```

### Public surfaces (unchanged)

| Surface | Path |
|---------|------|
| LLMs summary | `GET /llms.txt` |
| Structured facts | `GET /api/facts.json` |
| Health audit | `GET /api/seo/health` |
| Deploy manifest | `GET /api/seo/manifest` |

## Core types (`@matia/core`)

```typescript
type SignalFinding = {
  id: string;
  signalId?: string;
  source: "own-site" | "benchmark" | "gsc" | "geo-probe" | "llm-citation" | "manual";
  status: "pass" | "warn" | "fail" | "info";
  hypothesis?: string;
  evidence: string[];
  payload?: Record<string, unknown>;
  detectedAt: string;
};

type SignalDetectionResult = {
  project: string;
  detectedAt: string;
  siteUrl: string;
  findings: SignalFinding[];
  benchmarkReports: BenchmarkSiteReport[];
  comparisonMatrix: BenchmarkCheckResult[];
  validations: SignalValidationResult[];
  baselineMatrix?: Record<string, unknown>;
};
```

**Source files:**

| Module | Path |
|--------|------|
| Types | `packages/core/src/signals/types.ts` |
| Runner | `packages/core/src/signals/runner.ts` |
| Benchmark | `packages/core/src/signals/detectors/benchmark.ts` |
| Own site | `packages/core/src/signals/detectors/own-site.ts` |
| GSC | `packages/core/src/signals/detectors/gsc-matcher.ts` |
| Schema | `packages/core/src/signals/detectors/schema-org.ts` |
| Auto-validate | `packages/core/src/signals/auto-validate.ts` |

## Detector catalog

### 1. BenchmarkDetector

For each `benchmarkSites[]` URL, fetch in parallel:

| Check | Rule |
|-------|------|
| `/llms.txt` | HTTP 200, body length > 100 |
| `/api/facts.json` | HTTP 200, valid JSON |
| `robots.txt` | AI agent allow/disallow (GPTBot, PerplexityBot, Google-Extended, Bingbot) |
| Homepage JSON-LD | Organization, Person, FAQPage, Service, WebSite |
| Entity overlap | Token match vs own `geoEntities[]` |
| hreflang / `/en/` | Multilingual signals |
| Sitemap GEO URLs | llms.txt / facts.json in sitemap |

Output: `BenchmarkSiteReport` + info/warn findings per benchmark.

### 2. OwnSiteDetector

Extends `probeGeoSurfaces()`:

| Check | Rule |
|-------|------|
| Health overall | pass / warn / fail from `/api/seo/health` |
| llms.txt / facts.json | HTTP status |
| GEO entities | Fuzzy mention on both surfaces |
| Signal-specific | `regulated-sector-proof`, `mvp-price-entry`, `bing-copilot-eu` |
| Health sub-checks | `robots-ai-agents`, Bing-related checks |

### 3. GscSignalMatcher

Reads latest GSC indexing snapshot from cockpit / host reports.

For each `signalDetection` with `source: gsc`:

1. Extract paths from `evidenceRequired` (e.g. `/services`)
2. Match intents via `keywordPatterns` or `hypothesisQueries`
3. Emit pass if all target paths indexed; warn/fail otherwise

**Limitation (v1):** Uses URL inspection status, not Search Analytics impressions.

### 4. SchemaOrgDetector

Fetches key registry pages on own site; compares JSON-LD types vs benchmark.

| Finding | Gap action |
|---------|------------|
| Benchmark has FAQPage, own does not | `update-geo-surface` (add JSON-LD) |
| Own has Organization | pass finding |

## CLI

```bash
matia signals detect \
  --config src/seo/matia.config.json \
  --root . \
  --cockpit true
```

| Flag | Default | Description |
|------|---------|-------------|
| `--config` | required | Site `matia.config.json` |
| `--root` | `cwd` | Host app root |
| `--cockpit true` | false | Write `~/.matia/cockpit/<slug>/signals/detect-*.json` |
| `--benchmark-only` | false | Skip own-site, GSC, schema detectors |
| `--auto-validate` | false | Promote signals in `strategy.yaml` when evidence passes |
| `--merge-gap false` | true | Run gap analysis with findings; import queue |

**Host npm script (elia-studio):**

```bash
npm run seo:signals
```

## Artifacts

| Location | Content |
|----------|---------|
| `~/.matia/cockpit/<project>/signals/detect-<timestamp>.json` | Full `SignalDetectionResult` |
| `src/seo/reports/<slug>/<date>/signal-detection.json` | Same (host reports dir) |
| `src/seo/reports/<slug>/<date>/gap-analysis.json` | Merged gap when `--merge-gap` |

## Gap analysis merge

`runGapAnalysis({ signalFindings })` adds actions when:

| Finding | Action type |
|---------|-------------|
| Schema gap (benchmark has, own lacks) | `update-geo-surface` |
| Benchmark entity overlap warn | `update-content` |
| GSC signal fail (paths not indexed) | `submit-indexing` |
| Own has llms.txt, benchmark does not | `update-geo-surface` (competitive advantage note) |
| Hypothesis signal with pass finding | Skip `update-content` nag |

Hypothesis signals without passing findings still produce `update-content` actions (unchanged v0.2 behaviour).

## Cockpit integration

### File store (v0.3 — implemented)

- `importSignalDetection()` → `signals/detect-*.json`
- `getLatestSignalDetection(project)` for site brief
- `getCockpitStatus().latestSignals` path

### UI (incremental)

| Surface | Status |
|---------|--------|
| **Run signal detection** button | Implemented |
| Signals panel (hypothesis/validated, matrix, findings) | Implemented in `site-brief.tsx` |
| Technical JSON (signal detection payload) | Implemented |
| SQLite `signals` table | Planned (cockpit v1 Phase 4) |

### Operator loop

```text
1. matia sync-gsc          → indexing snapshot
2. matia signals detect    → findings + optional gap merge
3. Review cockpit brief    → benchmark matrix, signal findings
4. matia cockpit approve   → implement actions in host repo
5. Deploy → matia probe-geo → confirm surfaces
```

## Auto-validation

`autoValidateSignals()` maps detector findings to `SignalValidationResult[]`:

| Signal source | Validate when |
|---------------|---------------|
| `geo-probe` | All related findings `pass` |
| `gsc` | GSC matcher finding `pass` |
| `manual` (`bing-copilot-eu`) | Health pass + llms.txt online |
| `sales` | Offer ladder cited on llms.txt (detector heuristic) |

With `--auto-validate`, matching `signalDetection.status` fields update in `strategy.yaml` via `applySignalValidationsToYaml()`.

## Deferred: LLM citation (Phase 2)

```bash
# Not implemented in v1
matia signals probe-citation --queries "sovereign AI consulting Europe"
```

Manual spike: OVH `gpt-oss-120b` query — log whether site URL appears. See `packages/core/src/signals/llm-citation.ts`.

## Deferred: LangGraph investigate (v2+)

Narrow scope if pursued:

```bash
matia signals investigate --signal eu-sovereign-ai-queries
```

Agent tools: `read_strategy`, `fetch_benchmark`, `read_gsc`, `probe_geo` → markdown brief + proposed `SeoAction[]` (still requires approve).

Decision documented in `SIGNALS_LANGGRAPH_DECISION` (`packages/core/src/signals/types.ts`). v1 ships deterministic pipeline first; compare false-positive rates before adopting.

## Acceptance criteria

- [x] `matia signals detect` completes in < 60s (deterministic only)
- [x] `benchmarkSites` parsed from `strategy.yaml`
- [x] Benchmark matrix: own site vs signalseo.co (llms, facts, schema, entity overlap)
- [x] Own-site findings include GEO entity mentions and health checks
- [x] GSC matcher runs for `source: gsc` signals (indexing proxy)
- [x] Gap merge produces actions from warn/fail findings
- [x] Cockpit artifact written with `--cockpit true`
- [x] Cockpit UI shows signals panel and run button
- [x] `npm run seo:signals` works from elia-studio
- [ ] ≥ 2 signals auto-validated via `--auto-validate` (operator choice)
- [ ] Search Analytics integration for true GSC query signals (future)
- [ ] `matia signals probe-citation` (Phase 2)

## Version alignment

- Requires `@matia/core` ≥ 0.3.0
- Related: `matia probe-geo`, `matia gap`, `matia cockpit`
- Cockpit SQLite signals table: see [cockpit v1 spec](./cockpit-v1-spec.md) Phase 4
