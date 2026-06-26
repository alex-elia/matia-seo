# ADR 0003: GEO signal detection — deterministic detectors + benchmark comparison

**Status:** Accepted  
**Date:** 2026-06-26  
**Deciders:** Elia Studio / Matia platform  
**Related:** [GEO signal detection v1 spec](../specifications/geo-signal-detection-v1-spec.md), [ADR 0001](./0001-matia-cockpit-repository-placement.md), [ADR 0002](./0002-content-generation-executor.md), [Cockpit v1 spec](../specifications/cockpit-v1-spec.md)

## Context

Matia v0.2 introduced:

- **GEO probe** (`matia probe-geo`) — fetch own-site `/llms.txt`, `/api/facts.json`, `/api/seo/health`; fuzzy entity mention checks
- **`signalDetection`** in `strategy.yaml` — declarative hypotheses with `evidenceRequired`, but **no automated validation**
- **Gap analysis** — turns open hypothesis signals into `update-content` actions; merges GEO entity gaps from probe

What was missing for GEO improvement:

1. **Automated signal validation** — operators manually moved signals from `hypothesis` → `validated`
2. **Benchmark comparison** — no way to learn from high-performing GEO/SEO pattern sites (e.g. [signalseo.co](https://signalseo.co/)) without treating them as business competitors
3. **Structured findings → actions** — gap analysis did not consume detector output beyond basic GEO entity mentions
4. **Agent orchestration choice** — whether to use LangGraph + tool calls for investigation workflows

Pilot site: **elia-studio.eu** — already ships `/llms.txt` and `/api/facts.json` as differentiators; needs schema.org and entity vocabulary improvements informed by benchmarks.

## Decision

1. **Signal truth layer is deterministic.** All pass/fail/warn findings come from fetch + parse + rules in `@matia/core` (`packages/core/src/signals/`). No LLM determines signal status in v1.

2. **New CLI command:** `matia signals detect` orchestrates detectors, writes artifacts to cockpit store and host reports, optionally merges into gap analysis.

3. **Benchmark sites are separate from business competitors.** Strategy YAML gets `benchmarkSites[]` (pattern references). `positioning.competitors[]` remains for named business rivals when configured.

4. **Detector catalog (v1):**
   - `BenchmarkDetector` — probe external sites (llms, facts, robots, JSON-LD, sitemap, entity overlap)
   - `OwnSiteDetector` — extend GEO probe + health checks; auto-check known signal IDs
   - `GscSignalMatcher` — validate `source: gsc` signals against latest indexing snapshot + `keywordPatterns`
   - `SchemaOrgDetector` — compare own JSON-LD richness vs benchmark

5. **Auto-validate (optional):** `--auto-validate` promotes `signalDetection.status` in `strategy.yaml` when all related detector findings pass. Default: report only; operator approves YAML changes.

6. **Gap merge:** `runGapAnalysis()` accepts `signalFindings[]` and emits typed actions (`update-geo-surface`, `update-content`, `submit-indexing`) from warn/fail findings.

7. **Cockpit integration (incremental):** file-based `signals/detect-*.json` artifacts; site brief shows benchmark matrix and top findings; **Run signal detection** button. Full SQLite `signals` table remains per cockpit v1 plan Phase 4.

8. **LangGraph + tool calls: deferred.** A single OVH synthesis call may propose actions from findings in v1.5; LangGraph justified only when multi-step branching investigations (`matia signals investigate`) prove necessary after v1 ships.

9. **LLM citation probe: deferred.** `matia signals probe-citation` is Phase 2 — non-reproducible, costly; manual OVH query acceptable for spikes.

## Rationale

### Why deterministic detectors first

- **Testable** — same inputs produce same findings; suitable for CI and operator trust
- **Zero LLM cost** for weekly operator loop
- **Aligns with Matia principle** — measure indexing and surfaces via GSC/CLI, do not guess rankings
- **ADR 0002 precedent** — LLM used for content generation with human review, not for operational truth

### Why benchmark sites ≠ competitors

[Signal SEO](https://signalseo.co/) is a GEO **pattern reference** (dense entity vocabulary, JSON-LD, proof-as-signal) — not an elia-studio business competitor. Separating `benchmarkSites` avoids polluting competitive positioning with aspirational technical patterns.

### Why not LangGraph in v1

LangGraph adds state persistence, debugging overhead, and Windows dev friction without improving the core signal truth layer. Tool-calling loops become relevant when investigation branches (e.g. GSC → benchmark → schema → synthesis) need persistent agent state across sessions — not yet proven necessary.

### Why GSC matcher uses indexing snapshot (not Search Analytics)

Matia v0.3 `sync-gsc` captures URL inspection status, not query impressions. `GscSignalMatcher` validates evidence paths (e.g. `/services` indexed) and `keywordPatterns` on intents until Search Analytics API integration lands.

## Consequences

### Positive

- `matia signals detect` runs in ~20s against elia-studio + signalseo.co
- Benchmark matrix surfaces competitive advantages (e.g. llms.txt present when benchmark lacks it)
- Auto-validate can promote `regulated-sector-proof`, `mvp-price-entry` on each run
- Gap actions include schema gaps and GSC indexing weaknesses from findings
- Cockpit site brief shows signals panel without waiting for SQLite migration

### Negative

- Benchmark JSON-LD detection may miss client-rendered schema (SSR HTML only)
- Fuzzy entity matching on long names (e.g. parenthetical client lists) can false-negative — separate fix in `probeGeoSurfaces()`
- `--auto-validate` mutates `strategy.yaml` — requires operator awareness
- GSC signal validation is indexing-proxy, not true query-impression validation

## Compliance

- Detectors fetch **public URLs only** — no credentials on production
- Benchmark sites are operator-configured; no automated SERP scraping
- Signal artifacts stored locally (`~/.matia/cockpit/<project>/signals/`)
- LLM citation (when added) runs locally via OVH vault; never on Vercel

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| LangGraph from day one | Operational cost; signal truth must stay deterministic |
| LLM-as-judge for findings | Non-reproducible; conflicts with measure-don't-guess |
| Competitor SERP scraping | Legal/ToS risk; out of v1 scope (`competitor-serp` source reserved) |
| Cockpit-only implementation | Would duplicate CLI; operators need `matia signals detect` in weekly loop without UI |

## Follow-up (not in v1)

- [ ] `matia signals probe-citation` — OVH chat citation test (Phase 2)
- [ ] GSC Search Analytics integration for true query-impression signals
- [ ] `matia signals investigate` — narrow LangGraph spike vs deterministic pipeline comparison
- [ ] Improve `mentionsEntity()` for parenthetical geo entity names
- [ ] SQLite `signals` table migration (cockpit v1 Phase 4)
