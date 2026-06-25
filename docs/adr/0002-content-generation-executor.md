# ADR 0002: Content generation executor — OVH LLM + approve action loop

**Status:** Accepted  
**Date:** 2026-06-15  
**Deciders:** Elia Studio / Matia platform  
**Related:** [ADR 0001](./0001-matia-cockpit-repository-placement.md), [Content generation v1 spec](../specifications/content-generation-v1-spec.md)

## Context

Matia cockpit approves SEO actions (`update-content`, `create-page`, …) from gap analysis. v0.2 wrote static JSON patches or empty blog scaffolds only — no LLM generation.

Requirements for v0.3 personal operator build:

- **Approve → generate** blog articles locally in the host repo (EN + FR)
- **OVH AI Endpoints** with **`gpt-oss-120b`** (reasoning tier, large context)
- **Single credential vault:** `~/.matia/secrets/ovh.env`
- **Grounded generation** — facts from host `src/seo/grounding/`, strategy `contentPrinciples`, claim validation before write
- **Human review** — never auto-mark done or auto-deploy for LLM output

Cursor SDK agent execution for multi-file page creation remains **deferred** (Phase 2).

## Decision

1. **Default executor for blog content:** OVH LLM via new `@matia/llm` package and `matia content generate` CLI.
2. **Credentials:** operator vault at `~/.matia/secrets/ovh.env` (not committed).
3. **Model:** `gpt-oss-120b` for article generation (configurable via env).
4. **Approve loop:** cockpit approve → `executeActionOnHost` → host `matia-execute.mjs` → `matia content generate` when no curated patch exists.
5. **Curated patches** (`src/seo/execute/patches/*.json`) remain deterministic — no LLM.
6. **Validation:** hard-fail on invented regulated client claims before writing markdown.

## Rationale

- OVH fits EU sovereign stack and headless cockpit approve (seconds, not minutes).
- Single vault simplifies personal operator setup vs per-site credential UI.
- Grounding bundle + structured JSON output + claim validator reduces hallucination vs raw prompts.
- Hybrid with Cursor deferred until create-page needs multi-file Next.js routes.

## Consequences

### Positive

- Approve on content actions produces EN+FR blog drafts with validation report.
- `matia llm probe` verifies token and model before first run.
- Review artifacts in `.matia/review/{actionId}.json` for cockpit.

### Negative

- Host must maintain `src/seo/grounding/facts.json` in sync with `entity-maps.ts`.
- LLM cost per approve (two calls: EN + FR).
- Phase 2 still needed for Cursor-based page scaffolding.

## Compliance

- API token only in `~/.matia/secrets/ovh.env` or process env — never in git.
- Generation runs locally; credentials never on Vercel.
- Hard-fail validation for unapproved client outcomes and contact details.
- Queue status `executing` until operator marks done after review.
