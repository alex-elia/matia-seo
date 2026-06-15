import fs from "node:fs";
import path from "node:path";

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function createSnapshotDir(
  baseDir: string,
  slug: string,
  date = new Date(),
): string {
  const dateLabel = date.toISOString().slice(0, 10);
  const dirPath = path.join(baseDir, slug, dateLabel);
  ensureDir(dirPath);
  return dirPath;
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function writeText(filePath: string, text: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text, "utf-8");
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export function findLatestSnapshotDir(
  baseDir: string,
  slug: string,
): string | null {
  const slugDir = path.join(baseDir, slug);
  if (!fs.existsSync(slugDir)) return null;

  const dates = fs
    .readdirSync(slugDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();

  return dates.length > 0 ? path.join(slugDir, dates[0]) : null;
}
