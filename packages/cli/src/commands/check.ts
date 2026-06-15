import fs from "node:fs";
import path from "node:path";
import { getArg } from "../args.js";

export type CheckResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

const STRATEGY_REQUIRED_KEYS = ["project", "goals", "icp", "intentMap"] as const;

function readFileIfExists(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

function validateStrategy(content: string, filePath: string): string[] {
  const errors: string[] = [];
  if (!content.trim()) {
    errors.push(`${filePath}: file is empty`);
    return errors;
  }
  for (const key of STRATEGY_REQUIRED_KEYS) {
    if (!new RegExp(`^${key}:`, "m").test(content)) {
      errors.push(`${filePath}: missing top-level key "${key}"`);
    }
  }
  if (!/primary:\s*.+/m.test(content)) {
    errors.push(`${filePath}: goals.primary is missing or empty`);
  }
  return errors;
}

function validateRegistry(content: string, filePath: string): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content.trim()) {
    errors.push(`${filePath}: file is empty`);
    return { errors, warnings };
  }

  if (!/export\s+(const|function)/.test(content)) {
    errors.push(`${filePath}: expected exported registry (const or function)`);
  }

  const urlCount = (content.match(/\burl:\s*["'`]/g) ?? []).length;
  const slugCount = (content.match(/\bslug:\s*["'`]/g) ?? []).length;
  const entryCount = Math.max(urlCount, slugCount);

  if (entryCount === 0) {
    errors.push(`${filePath}: no page entries found (expected url or slug fields)`);
  } else if (entryCount < 3) {
    warnings.push(
      `${filePath}: only ${entryCount} entries — verify inventory is complete`,
    );
  }

  return { errors, warnings };
}

export function runMatiaCheck(cwd: string): CheckResult {
  const seoDir = path.join(cwd, "src", "seo");
  const strategyPath = path.join(seoDir, "strategy.yaml");
  const registryPath = path.join(seoDir, "registry.ts");
  const configPath = path.join(seoDir, "matia.config.json");

  const errors: string[] = [];
  const warnings: string[] = [];

  const strategy = readFileIfExists(strategyPath);
  if (strategy === null) {
    errors.push(`Missing ${strategyPath}`);
  } else {
    errors.push(...validateStrategy(strategy, strategyPath));
  }

  const registry = readFileIfExists(registryPath);
  if (registry === null) {
    errors.push(`Missing ${registryPath}`);
  } else {
    const reg = validateRegistry(registry, registryPath);
    errors.push(...reg.errors);
    warnings.push(...reg.warnings);
  }

  if (!fs.existsSync(configPath)) {
    warnings.push(
      `Optional ${configPath} not found — needed for matia sync-gsc / submit-indexing`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function resolveHostRoot(root: string): string {
  return path.isAbsolute(root) ? root : path.resolve(process.cwd(), root);
}

export async function runCheckCommand(): Promise<void> {
  const positionalRoot = process.argv[3];
  const flaggedRoot = getArg("--root") ?? getArg("--cwd");
  const root = resolveHostRoot(
    flaggedRoot ??
      (positionalRoot && !positionalRoot.startsWith("-")
        ? positionalRoot
        : "."),
  );
  const result = runMatiaCheck(root);

  console.log(`Matia check — ${root}`);
  console.log("=".repeat(50));

  if (result.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of result.warnings) console.log(`  - ${w}`);
  }

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const e of result.errors) console.log(`  - ${e}`);
    console.log("\nCheck failed.");
    process.exit(1);
  }

  console.log("\nCheck passed.");
}
