# Matia Next.js host template (v1)

Copy these files when adding Matia to a new Next.js host. Full contract: [`docs/specifications/host-integration-v1-spec.md`](../../docs/specifications/host-integration-v1-spec.md).

## Copy scripts

```bash
cp templates/next-host/scripts/ensure-matia.mjs   /path/to/host/scripts/
cp templates/next-host/scripts/run-matia.mjs      /path/to/host/scripts/
cp templates/next-host/scripts/generate-seo-manifest-snapshot.mjs /path/to/host/scripts/
```

Add host-specific `scripts/matia-execute.mjs` (cockpit approve executor).

## Merge config fragments

| Fragment | Into |
|----------|------|
| `package.json.fragment.json` | `package.json` scripts + deps |
| `tsconfig.exclude.fragment.json` | `tsconfig.json` → `exclude` |
| `next.config.matia.fragment.ts` | `next.config.ts` |
| `gitignore.fragment.txt` | `.gitignore` |

## SEO contract

Copy and customize from [`examples/next-host/src/seo/`](../examples/next-host/src/seo/) or a pilot host.

## Verify

```bash
cd /path/to/host && npm install && npm run seo:check
```

**Do not edit `ensure-matia.mjs` in host repos without updating this template and the spec.**
