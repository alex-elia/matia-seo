# Specification: Matia content generation v1

**Version:** 1.0  
**Status:** Implemented (v0.3)  
**ADR:** [0002 — Content generation executor](../adr/0002-content-generation-executor.md)

## Purpose

After cockpit **approve**, generate grounded blog articles (EN + FR) in the host repo using OVH `gpt-oss-120b`, with claim validation and human review.

## Non-goals (v1)

- Cursor SDK auto-invocation on approve
- LLM editing `messages/*.json` (patches stay human-curated)
- Cockpit `/settings/llm` UI (edit `~/.matia/secrets/ovh.env` instead)
- Auto mark-done or auto-deploy for LLM output

## Flow

```text
Cockpit Approve
  → updateActionStatus(approved)
  → executeActionOnHost(hostRoot, action)
  → scripts/matia-execute.mjs
       ├─ patch file exists? → merge messages/ (deterministic, markDone)
       ├─ signal action? → .matia/signals/*.md
       └─ else → matia content generate
            → buildGroundingContext
            → OVH gpt-oss-120b (EN, FR)
            → validateArticleClaims
            → write content/{locale}/blog/{slug}.md
            → write .matia/review/{actionId}.json
  → status: executing (LLM) or done (patch)
```

## Operator setup

1. Create vault:

   ```powershell
   mkdir "$env:USERPROFILE\.matia\secrets" -Force
   copy config\examples\ovh.env.example "$env:USERPROFILE\.matia\secrets\ovh.env"
   # Edit ovh.env — set OVH_AI_ENDPOINTS_ACCESS_TOKEN
   ```

2. Probe:

   ```bash
   matia llm probe
   ```

3. Dry-run:

   ```bash
   matia content generate --root /path/to/host --intent "..." --slug my-slug --dry-run
   ```

## Host contract

| Artifact | Path |
|----------|------|
| Grounding facts | `src/seo/grounding/facts.json` (sync with entity-maps / facts API) |
| LLMs excerpt | `src/seo/grounding/llms-excerpt.txt` |
| Strategy | `src/seo/strategy.yaml` |
| Curated patches | `src/seo/execute/patches/{intent-slug}.json` |
| Blog output | `content/en/blog/{slug}.md`, `content/fr/blog/{slug}.md` |
| Review report | `.matia/review/{actionId}.json` (gitignored via `.matia/`) |

### `matia.config.json` (non-secret)

```json
"llm": {
  "model": "gpt-oss-120b",
  "parameters": { "temperature": 0.25, "maxTokens": 8192 },
  "groundingTokenBudget": 10000
}
```

## Grounding bundle

Built by `@matia/core` `buildGroundingContext()`:

1. `facts.json` — company, offers, clientReferences (exact outcomes), contactPolicy
2. `strategy.yaml` — contentPrinciples, intent payload
3. `llms-excerpt.txt` — first ~80 lines
4. Optional page slices from `messages/{locale}.json` for targetPages

Prompt contract: use ONLY facts in GROUNDING; `[NEEDS SOURCE]` if missing.

## LLM output schema

```json
{
  "title": "string",
  "description": "string (max 160 chars)",
  "bodyMarkdown": "string",
  "citationsUsed": ["clientReferences[0].outcome"]
}
```

## Validation

| Check | Severity |
|-------|----------|
| Unknown client name | hard |
| Wrong outcome wording for CA / Efectis / Opiris | hard |
| "ATLAS" product branding | hard |
| Invented email/phone/URL | hard |
| Unlisted numeric stats | warn |

Hard failure → no blog write; `.matia/review/{id}-failed.json` with errors.

## CLI

```bash
matia llm probe
matia content generate \
  --root <hostRoot> \
  --intent "custom AI agents for business" \
  --slug custom-ai-agents-for-business \
  --action-id content-xxx \
  --locales en,fr \
  [--dry-run]
```

## Acceptance criteria

- [ ] `matia llm probe` succeeds with valid vault
- [ ] Approve content action without patch generates EN+FR blog files
- [ ] Approve with patch skips LLM and merges messages
- [ ] Hard-fail blocks write on wrong client stat
- [ ] Cockpit shows outcome + review path on executing actions
- [ ] `seo:check` passes after draft added
