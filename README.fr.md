# Matia — Plateforme Agent SEO/GEO

> **Dépôt :** [`matia-seo`](https://github.com/alex-elia/matia-seo) · **Marque :** Matia (grec μάτια — *yeux*)

**Grec : μάτια (*yeux*)** — la vigie de visibilité pour vos sites Next.js.

Matia est une plateforme agent IA qui définit votre stratégie SEO/GEO (objectifs, ICP, intentions), propose des actions, et exécute le travail technique **et** éditorial **après votre approbation**.

> La plupart des outils SEO génèrent des balises. **Matia observe, planifie et déploie.**

## Ce que fait Matia

1. **Stratégie** — objectifs, ICP (profil client idéal), positionnement, carte d'intentions par site
2. **Plan d'actions** — analyse des écarts entre stratégie et pages existantes
3. **Approbation** — rien ne s'exécute sans votre validation
4. **Exécution** — métadonnées, sitemaps, surfaces GEO (`llms.txt`, `facts.json`), contenu, indexation

## Packages

| Package | Description |
|---------|-------------|
| [`@matia/core`](./packages/core) | Types stratégie, modèle d'entités, file d'actions |
| [`@matia/next`](./packages/next) | Métadonnées Next.js App Router et règles crawlers |
| [`@matia/cli`](./packages/cli) | CLI `matia` pour agents et automatisation |

## Démarrage rapide

```bash
git clone https://github.com/alex-elia/matia-seo.git
cd matia-seo
npm install
npm run build
npx matia help
```

### Intégration dans une app hôte (Next.js)

```bash
npm install @matia/core @matia/next
```

Fichier stratégie par application (maintenu par l'agent) :

```text
src/seo/
  strategy.yaml    # objectifs approuvés, ICP, intentions
  registry.ts      # inventaire des pages
  policies.ts      # règles d'indexabilité
  entity-maps.ts   # schémas GEO / facts
```

## État du projet

**v0.1.0 — fondations**

- [x] Types cœur (`SiteStrategyProfile`, `SeoAction`, `SeoGeoEntity`)
- [x] Helper métadonnées Next.js
- [x] CLI initial
- [ ] Contrôles qualité (`matia check`)
- [ ] Scanner d'inventaire (`matia inventory`)
- [ ] Skill agent stratège pour Cursor
- [ ] File d'actions + store Supabase
- [ ] Worker d'exécution OVH

## Documentation

- **GitHub Pages (EN) :** [Site projet](./docs/index.html)
- **GitHub Pages (FR) :** [Site FR](./docs/fr/index.html)

## Pourquoi « Matia »

Du grec **μάτια** (*yeux*). Le SEO et le GEO, c'est être vu — par les moteurs de recherche et les systèmes IA. Matia veille sur votre visibilité : elle détecte les lacunes, propose des corrections, et exécute après approbation.

## Licence

MIT — voir [LICENSE](./LICENSE).

[English README](./README.md)
