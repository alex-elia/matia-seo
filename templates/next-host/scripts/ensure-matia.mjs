/**
 * CANONICAL COPY — templates/next-host/scripts/ensure-matia.mjs
 * Sync into host repos as scripts/ensure-matia.mjs (do not edit without updating template).
 * Spec: docs/specifications/host-integration-v1-spec.md
 *
 * Ensures ./matia-seo exists with built @matia/* packages before npm install.
 * - Vercel/CI: shallow-clones github.com/alex-elia/matia-seo
 * - Local dev: reuses ../matia-seo via directory junction when present
 *
 * Use npm --prefix from the host root so nested commands never run the host's
 * prebuild/build scripts. Set MATIA_ENSURE_SKIP=1 on nested npm calls.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.MATIA_ENSURE_SKIP === "1") {
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localMatia = path.join(root, "matia-seo");
const siblingMatia = path.join(root, "..", "matia-seo");
const matiaPrefix = "./matia-seo";
const repo =
  process.env.MATIA_SEO_REPO ?? "https://github.com/alex-elia/matia-seo.git";
const ref = process.env.MATIA_SEO_REF?.trim() || "";

function hasBuiltNext(dir) {
  return fs.existsSync(path.join(dir, "packages", "next", "dist", "index.js"));
}

function isValidMatiaRoot(dir) {
  return fs.existsSync(path.join(dir, "package.json"));
}

function removeIfPresent(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function run(cmd, cwd = root, extraEnv = {}) {
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, MATIA_ENSURE_SKIP: "1", ...extraEnv },
  });
}

function runMatiaNpm(args) {
  run(`npm ${args.join(" ")} --prefix ${matiaPrefix}`, root);
}

function linkSiblingMatia() {
  removeIfPresent(localMatia);
  if (process.platform === "win32") {
    run(`cmd /c mklink /J "${localMatia}" "${siblingMatia}"`);
  } else {
    fs.symlinkSync(siblingMatia, localMatia, "dir");
  }
}

function cloneMatiaRepo() {
  removeIfPresent(localMatia);
  console.log(`[ensure-matia] Cloning ${repo}${ref ? ` @ ${ref}` : ""} → ./matia-seo`);
  const cloneArgs = ["clone", "--depth", "1"];
  if (ref) cloneArgs.push("--branch", ref);
  cloneArgs.push(repo, "matia-seo");
  run(`git ${cloneArgs.join(" ")}`, root, { MATIA_ENSURE_SKIP: "0" });
}

function ensureMatiaRoot() {
  if (hasBuiltNext(localMatia)) {
    return localMatia;
  }

  if (fs.existsSync(localMatia) && !isValidMatiaRoot(localMatia)) {
    console.log("[ensure-matia] Removing incomplete ./matia-seo (stale cache or failed link)");
    removeIfPresent(localMatia);
  }

  if (isValidMatiaRoot(localMatia)) {
    return localMatia;
  }

  if (isValidMatiaRoot(siblingMatia)) {
    console.log("[ensure-matia] Linking local sibling ../matia-seo → ./matia-seo");
    linkSiblingMatia();
    if (isValidMatiaRoot(localMatia)) {
      return localMatia;
    }
    console.warn("[ensure-matia] Sibling link did not produce a valid root — cloning instead");
    removeIfPresent(localMatia);
  }

  cloneMatiaRepo();

  if (!isValidMatiaRoot(localMatia)) {
    console.error("[ensure-matia] git clone completed but matia-seo/package.json is missing");
    process.exit(1);
  }

  return localMatia;
}

const matiaRoot = ensureMatiaRoot();

if (!hasBuiltNext(matiaRoot)) {
  console.log("[ensure-matia] Building @matia/* packages…");
  runMatiaNpm(["install", "--ignore-scripts"]);
  runMatiaNpm(["run", "build"]);
}

if (!hasBuiltNext(matiaRoot)) {
  console.error("[ensure-matia] @matia/next dist still missing after build.");
  process.exit(1);
}

console.log("[ensure-matia] Ready:", matiaRoot);
