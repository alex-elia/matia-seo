import fs from "node:fs";
import path from "node:path";

export type HostIntegrationResult = {
  errors: string[];
  warnings: string[];
};

function readText(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

function readJson(filePath: string): unknown | null {
  const text = readText(filePath);
  if (text === null) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Validates Matia host wiring per host-integration-v1-spec.md */
export function validateHostIntegration(hostRoot: string): HostIntegrationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredScripts = [
    "scripts/ensure-matia.mjs",
    "scripts/run-matia.mjs",
    "scripts/generate-seo-manifest-snapshot.mjs",
  ];
  for (const rel of requiredScripts) {
    if (!fs.existsSync(path.join(hostRoot, rel))) {
      errors.push(`Missing ${rel} — copy from matia-seo/templates/next-host/scripts/`);
    }
  }

  const pkg = readJson(path.join(hostRoot, "package.json")) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  } | null;
  if (!pkg) {
    errors.push("Missing or invalid package.json");
  } else {
    if (pkg.scripts?.preinstall !== "node scripts/ensure-matia.mjs") {
      errors.push('package.json: scripts.preinstall must be "node scripts/ensure-matia.mjs"');
    }
    if (!pkg.scripts?.prebuild?.includes("generate-seo-manifest-snapshot")) {
      warnings.push("package.json: missing prebuild manifest snapshot script");
    }
    const build = pkg.scripts?.build ?? "";
    if (!build.includes("--webpack")) {
      warnings.push('package.json: scripts.build should include "--webpack" for file: @matia/* deps');
    }
    const coreDep = pkg.dependencies?.["@matia/core"];
    const nextDep = pkg.dependencies?.["@matia/next"];
    if (!coreDep?.includes("matia-seo/packages/core")) {
      errors.push('package.json: dependencies.@matia/core must be file:./matia-seo/packages/core');
    }
    if (!nextDep?.includes("matia-seo/packages/next")) {
      errors.push('package.json: dependencies.@matia/next must be file:./matia-seo/packages/next');
    }
    if (!pkg.devDependencies?.["@matia/cli"]?.includes("matia-seo/packages/cli")) {
      warnings.push("package.json: devDependencies.@matia/cli recommended for seo:* scripts");
    }
  }

  const tsconfig = readJson(path.join(hostRoot, "tsconfig.json")) as {
    exclude?: string[];
  } | null;
  if (!tsconfig) {
    warnings.push("Missing tsconfig.json");
  } else if (!tsconfig.exclude?.includes("matia-seo")) {
    errors.push('tsconfig.json: exclude must include "matia-seo" (see host-integration-v1-spec)');
  }

  const nextConfig =
    readText(path.join(hostRoot, "next.config.ts")) ??
    readText(path.join(hostRoot, "next.config.mjs")) ??
    readText(path.join(hostRoot, "next.config.js"));
  if (!nextConfig) {
    warnings.push("Missing next.config.*");
  } else {
    if (!nextConfig.includes("transpilePackages") || !nextConfig.includes("@matia/next")) {
      errors.push("next.config: transpilePackages must include @matia/core and @matia/next");
    }
    if (nextConfig.includes("externalDir")) {
      errors.push("next.config: remove experimental.externalDir — it type-checks the full matia-seo clone");
    }
  }

  const gitignore = readText(path.join(hostRoot, ".gitignore")) ?? "";
  if (!gitignore.includes("matia-seo")) {
    warnings.push(".gitignore: add matia-seo/ (cloned at install, do not commit)");
  }

  const ensureMatia = readText(path.join(hostRoot, "scripts/ensure-matia.mjs")) ?? "";
  if (ensureMatia && !ensureMatia.includes("MATIA_ENSURE_SKIP")) {
    errors.push("scripts/ensure-matia.mjs: outdated — sync from templates/next-host (missing MATIA_ENSURE_SKIP guard)");
  }
  if (ensureMatia && !ensureMatia.includes("--prefix")) {
    errors.push("scripts/ensure-matia.mjs: outdated — sync from templates/next-host (must use npm --prefix ./matia-seo)");
  }

  return { errors, warnings };
}
