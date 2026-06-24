import fs from "node:fs";
import path from "node:path";
import {
  importGeoProbe,
  parseRegistryTs,
  parseStrategyYaml,
  probeGeoSurfaces,
  runGapAnalysis,
} from "@matia/core";
import { loadSiteConfig } from "@matia/integrations-google";
import { getArg } from "../args.js";
import { resolveHostRoot } from "./check.js";

export async function runProbeGeoCommand(): Promise<void> {
  const configPath = getArg("--config");
  if (!configPath) {
    throw new Error("--config is required (site matia.config.json)");
  }

  const rootArg = getArg("--root") ?? getArg("--cwd") ?? ".";
  const importCockpit = getArg("--cockpit") === "true";
  const runGap = getArg("--gap") !== "false";

  const config = loadSiteConfig(configPath);
  const root = resolveHostRoot(rootArg);
  const strategyPath = path.join(root, "src", "seo", "strategy.yaml");

  if (!fs.existsSync(strategyPath)) {
    throw new Error(`Missing ${strategyPath}`);
  }

  const strategy = parseStrategyYaml(fs.readFileSync(strategyPath, "utf-8"));
  const probe = await probeGeoSurfaces(config.siteUrl, strategy.geoEntities);

  console.log(`Matia probe geo — ${config.siteUrl}`);
  console.log("=".repeat(50));
  console.log(
    `Health: ${probe.health?.ok ? probe.health.overall ?? "ok" : "unavailable"}`,
  );
  console.log(`llms.txt: ${probe.surfaces.llms.ok ? "ok" : "fail"} (${probe.surfaces.llms.status})`);
  console.log(
    `facts.json: ${probe.surfaces.facts.ok ? "ok" : "fail"} (${probe.surfaces.facts.status})`,
  );

  if (probe.missingEntities.length > 0) {
    console.log(`\nIncomplete GEO entities:`);
    for (const name of probe.missingEntities) {
      const mention = probe.entityMentions[name];
      console.log(
        `  - ${name} (llms: ${mention.llms}, facts: ${mention.facts})`,
      );
    }
  } else {
    console.log("\nAll strategy geoEntities appear on llms.txt and facts.json.");
  }

  const dateLabel = new Date().toISOString().slice(0, 10);
  const outDir = path.join(
    config.resolvedPaths.reportsBaseDir,
    config.slug,
    dateLabel,
  );
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "geo-probe.json");
  fs.writeFileSync(outPath, JSON.stringify(probe, null, 2));
  console.log(`\nWrote ${outPath}`);

  if (importCockpit) {
    const artifactPath = importGeoProbe(probe, config.slug);
    console.log(`Cockpit probe artifact: ${artifactPath}`);
  }

  if (runGap) {
    const registryPath = path.join(root, "src", "seo", "registry.ts");
    const registryContent = fs.readFileSync(registryPath, "utf-8");
    const registry = parseRegistryTs(registryContent);
    const gap = runGapAnalysis({
      strategy,
      registry,
      siteUrl: config.siteUrl,
      geoProbe: { entityMentions: probe.entityMentions },
    });
    const gapPath = path.join(outDir, "gap-analysis.json");
    fs.writeFileSync(gapPath, JSON.stringify(gap, null, 2));
    console.log(`Wrote ${gapPath} (${gap.actions.length} proposed actions)`);
  }
}
