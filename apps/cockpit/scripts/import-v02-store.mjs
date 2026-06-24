import fs from "node:fs";
import path from "node:path";
import { getCockpitRoot } from "@matia/core";

function importJsonArtifacts(siteSlug, subdir, type) {
  const root = getCockpitRoot();
  const dir = path.join(root, siteSlug, subdir);
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json"))) {
    count++;
  }
  console.log(`  ${siteSlug}/${subdir}: ${count} ${type} artifact(s)`);
  return count;
}

function main() {
  const root = getCockpitRoot();
  fs.mkdirSync(root, { recursive: true });
  const registryPath = path.join(root, "sites.json");
  const exampleSites = path.join(process.cwd(), "data", "sites.example.json");

  if (!fs.existsSync(registryPath) && fs.existsSync(exampleSites)) {
    fs.copyFileSync(exampleSites, registryPath);
    console.log(`Created ${registryPath}`);
  }

  let total = 0;
  if (fs.existsSync(root)) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (["gap", "probe", "snapshot"].includes(entry.name)) continue;
      total += importJsonArtifacts(entry.name, "gap", "gap");
      total += importJsonArtifacts(entry.name, "probe", "probe");
      total += importJsonArtifacts(entry.name, "snapshot", "gsc");
    }
  }

  console.log(`Cockpit store ready at ${root} (${total} artifacts indexed)`);
}

main();
