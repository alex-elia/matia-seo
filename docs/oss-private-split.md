# Public OSS vs private project data

Matia-seo is public open source. **Your real sites do not belong in the published tree.**

## What is public (committed)

| Path | Purpose |
|------|---------|
| `packages/*` | Libraries and CLI |
| `configs/sites/example-site.json` | Fictional template (`example.com`) |
| `examples/strategy.yaml` | Generic strategy template |
| `docs/` | GitHub Pages |

## What is private (gitignored — move or keep local)

| Path | Purpose |
|------|---------|
| [`private/`](../private/README.md) | Your real site configs (`eliago.json`, `elia-studio.json`, …) |
| `.secrets/` | Google service account JSON |
| `reports/` | GSC snapshot outputs |

The entire `private/` folder is excluded from git. You can:

- Keep it inside the repo on disk (never pushed), or
- Move it elsewhere, e.g. `~/matia-private-configs/`, and pass `--config` with the full path.

## Recommended long-term home

Per host application (not matia-seo):

```text
elia-studio/src/seo/matia.config.json
elia-studio/src/seo/strategy.yaml
elia-studio/src/seo/registry.ts
```

Run from the app repo:

```bash
cd ../elia-studio
matia sync-gsc --config src/seo/matia.config.json
```

## Publishing checklist

- [ ] No real domains in `configs/sites/` (only `example-site.json`)
- [ ] `private/` not tracked (`git status` should not list it)
- [ ] `.secrets/` and `reports/` not tracked
- [ ] No service account JSON in history
