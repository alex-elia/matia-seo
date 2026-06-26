# Plan: Matia Cockpit v1

**Timeline:** ~3–4 weeks part-time  
**Pilot site:** elia-studio.eu  
**Placement:** [ADR 0001](../adr/0001-matia-cockpit-repository-placement.md) — `apps/cockpit` in matia-seo monorepo

## Summary

| Question | Answer |
|----------|--------|
| New repo or same repo? | **Same repo** (`matia-seo`), new `apps/cockpit` workspace |
| In elia-studio? | **No** — host repo ships public surfaces only |
| Where does data live? | `~/.matia/cockpit/cockpit.db` + optional JSON import from v0.2 |

## Phase 0 — Done (Matia v0.2)

- [x] `matia gap` — strategy operator
- [x] `matia probe-geo` — GEO measurement
- [x] `signalDetection` in strategy YAML
- [x] File-based cockpit store in `@matia/core`
- [x] `matia cockpit` CLI (status, queue, approve, import)
- [x] elia-studio scripts: `seo:gap`, `seo:probe-geo`, `seo:cockpit`
- [x] Bingbot in `@matia/next` robots; Bing manual submit documented

## Phase 0.5 — Done (Matia v0.3 — signal detection)

- [x] `matia signals detect` — deterministic detectors + benchmark comparison ([ADR 0003](../adr/0003-geo-signal-detection.md))
- [x] `benchmarkSites[]` in strategy YAML
- [x] GSC signal matcher (indexing proxy), schema.org detector, auto-validate
- [x] Gap merge from `signalFindings[]`
- [x] Cockpit signals panel + run button (file store)
- [x] elia-studio `seo:signals` script
- [ ] SQLite `signals` table (deferred to Phase 4)
- [ ] LLM citation probe, LangGraph investigate (deferred — see spec)

## Phase 1 — Monorepo scaffold (week 1)

**Goal:** Empty cockpit app boots locally and reads v0.2 JSON store.

| Task | Output |
|------|--------|
| Add `apps/cockpit` to npm workspaces | `package.json` workspaces: `["packages/*", "apps/*"]` |
| Next.js app, port 4040, bind localhost | `apps/cockpit/package.json` |
| SQLite schema + migration script | `apps/cockpit/src/db/schema.sql` |
| Import v0.2 JSON → SQLite | `apps/cockpit/scripts/import-v02-store.mjs` |
| Site registry config | `~/.matia/cockpit/sites.json` (local, gitignored template in repo) |

**Deliverable:** Dashboard lists elia-studio with queue counts from imported data.

## Phase 2 — Operator workflows (week 2)

**Goal:** Replace manual CLI loops with UI buttons.

| Task | Output |
|------|--------|
| “Sync GSC” button → spawn `matia sync-gsc` | Snapshot row in DB |
| “Run gap” / “Probe GEO” buttons | Artifacts + merged actions |
| Action queue UI with approve/reject/done | Writes through `@matia/core` or CLI |
| Site detail: indexing table from last snapshot | Read `payload_json` |
| Gap view: intent coverage chart | From latest gap artifact |

**Deliverable:** Weekly operator loop entirely from cockpit except content edits in host repo.

## Phase 3 — Content agent handoff (week 3)

**Goal:** Bridge approved actions → Cursor/host repo work.

| Task | Output |
|------|--------|
| Export approved actions as Markdown batch | `apps/cockpit/src/export/action-batch.md` |
| Cursor rule snippet: read queue from cockpit path | Update `templates/cursor-rules/matia-strategist.mdc` |
| Optional: open host file paths from payload | Deep links / `cursor://` hints |
| Mark done after deploy + re-probe | Closes loop |

**Deliverable:** Approve 3 partial-intent actions for elia-studio → implement in messages → mark done → probe confirms.

## Phase 4 — Multi-site + polish (week 4)

**Goal:** Ready for nemrut / next client.

| Task | Output |
|------|--------|
| Add site wizard (name, host_root, config_path) | UI form |
| Multi-site dashboard | |
| Signal validation workflow | Partial — `matia signals detect --auto-validate`; full SQLite UI in Phase 4 |
| HTML report export (reuse seo-audit patterns) | Download from cockpit |
| Tag matia-seo `v0.3.0` with cockpit beta | |

**Deliverable:** Two sites registered; elia-studio remains pilot.

## Deployment matrix

| Component | Deploy target | Contains secrets? |
|-----------|---------------|-------------------|
| elia-studio | Vercel (prod) | No |
| matia-seo packages | GitHub npm / file: deps | No |
| apps/cockpit | **localhost only** | Reads secrets from disk paths |
| `~/.matia/cockpit/` | Operator machine | Snapshots, queue, SQLite |

## elia-studio rollout (now)

1. Push matia-seo `v0.2.0` tag to GitHub.
2. Commit elia-studio changes (scripts, strategy, config).
3. Set Vercel env optional: `MATIA_SEO_REF=v0.2.0` for reproducible builds.
4. Deploy — Bingbot robots change goes live.
5. Manual: Bing Webmaster sitemap submit (once).
6. Weekly: cockpit Phase 0 file store until Phase 1 UI exists.

## Risks

| Risk | Mitigation |
|------|------------|
| Vercel clones matia-seo before v0.2 tag pushed | Pin `MATIA_SEO_REF`; push tag first |
| SQLite + better-sqlite3 native bindings on Windows | Document build tools; fallback sql.js for read-only |
| Scope creep (Bing API, ads) | v1 spec non-goals; ADR defers separate repo |

## Success metrics (90d, elia-studio pilot)

- Core commercial pages indexed EN + FR (GSC)
- Intent coverage ≥ 80% marked `covered` in strategy
- ≥ 2 signals moved from hypothesis → validated
- Operator weekly loop < 30 min (sync + gap + approve)
