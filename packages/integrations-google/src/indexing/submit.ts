import fs from "node:fs";
import { google } from "googleapis";

const DEFAULT_LOW_VALUE_PATTERNS = [
  /\/tag\//,
  /\/author\//,
  /\/category\//,
  /\/automatic-translation\//,
  /\/blog-(en|fr)$/,
];

export interface SubmitIndexingOptions {
  keyPath: string;
  urls: string[];
  limit?: number;
  dryRun?: boolean;
  filterLowValue?: boolean;
  lowValuePatterns?: RegExp[];
}

export interface SubmitIndexingResult {
  successful: Array<{ url: string }>;
  failed: Array<{ url: string; error: string }>;
}

function filterLowValueUrls(
  urls: string[],
  patterns: RegExp[],
): string[] {
  return urls.filter((url) => !patterns.some((pattern) => pattern.test(url)));
}

function createIndexingClient(keyPath: string) {
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account key file not found: ${keyPath}`);
  }

  const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf-8")) as {
    client_email: string;
    private_key: string;
  };

  const jwtClient = new google.auth.JWT(
    keyFile.client_email,
    undefined,
    keyFile.private_key,
    ["https://www.googleapis.com/auth/indexing"],
  );

  return google.indexing({ version: "v3", auth: jwtClient });
}

async function submitUrl(
  indexingClient: ReturnType<typeof google.indexing>,
  url: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await indexingClient.urlNotifications.publish({
      requestBody: { url, type: "URL_UPDATED" },
    });
    return { success: true };
  } catch (error) {
    const err = error as { message?: string };
    return { success: false, error: err.message || "Unknown error" };
  }
}

export async function submitUrlsToIndexingApi(
  options: SubmitIndexingOptions,
): Promise<SubmitIndexingResult> {
  const {
    keyPath,
    urls,
    limit = 200,
    dryRun = false,
    filterLowValue = false,
    lowValuePatterns = DEFAULT_LOW_VALUE_PATTERNS,
  } = options;

  let targets = urls;
  if (filterLowValue) {
    targets = filterLowValueUrls(targets, lowValuePatterns);
  }
  targets = targets.slice(0, limit);

  const result: SubmitIndexingResult = { successful: [], failed: [] };

  if (dryRun) {
    for (const url of targets) {
      result.successful.push({ url });
    }
    return result;
  }

  const client = createIndexingClient(keyPath);

  for (let i = 0; i < targets.length; i += 1) {
    const url = targets[i];
    process.stdout.write(
      `[${i + 1}/${targets.length}] Submitting ${url.substring(0, 60)}... `,
    );

    if (i > 0 && i % 10 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }

    const res = await submitUrl(client, url);
    if (res.success) {
      console.log("OK");
      result.successful.push({ url });
    } else {
      console.log(`FAIL: ${res.error}`);
      result.failed.push({ url, error: res.error || "Unknown error" });
    }
  }

  return result;
}

export function urlsFromSnapshotNotIndexed(
  inspectionResults: Array<{ url: string; indexed: boolean }>,
): string[] {
  return inspectionResults.filter((r) => !r.indexed).map((r) => r.url);
}

export function urlsFromCsv(csvPath: string): string[] {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());
  const urls: string[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(/^([^,]+),/);
    if (match?.[1]?.startsWith("http")) {
      urls.push(match[1].trim());
    }
  }

  return urls;
}
