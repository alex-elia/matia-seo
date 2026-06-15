import type { searchconsole_v1 } from "googleapis";
import type { InspectionData, SitemapUrlEntry, UrlInspectionStatus } from "../types.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type InspectTarget = string | SitemapUrlEntry;

export interface InspectUrlsOptions {
  maxUrls?: number;
  delayMs?: number;
  verbose?: boolean;
}

export async function inspectUrls(
  searchConsole: searchconsole_v1.Searchconsole,
  property: string,
  urls: InspectTarget[],
  options: InspectUrlsOptions = {},
): Promise<InspectionData> {
  const { maxUrls = 500, delayMs = 120, verbose = true } = options;
  const targets = urls.slice(0, maxUrls);
  const results: UrlInspectionStatus[] = [];
  let rateLimited = false;

  for (let i = 0; i < targets.length; i += 1) {
    const current = targets[i];
    const inspectionUrl =
      typeof current === "string" ? current : current.url;

    if (verbose) {
      process.stdout.write(
        `   [${i + 1}/${targets.length}] Inspecting ${inspectionUrl}... `,
      );
    }

    try {
      const response = await searchConsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl,
          siteUrl: property,
        },
      });

      const result = response.data?.inspectionResult?.indexStatusResult;
      const status: UrlInspectionStatus = {
        url: inspectionUrl,
        indexed: result?.verdict === "PASS",
        coverageState: result?.coverageState || "UNKNOWN",
        verdict: result?.verdict || "UNKNOWN",
        lastCrawlTime: result?.lastCrawlTime ?? null,
        indexingState: result?.indexingState || "UNKNOWN",
        pageFetchState: result?.pageFetchState || "UNKNOWN",
        issues: [],
      };

      results.push(status);
      if (verbose) {
        console.log(status.indexed ? "Indexed" : status.coverageState);
      }
    } catch (error) {
      const err = error as { errors?: Array<{ message?: string }>; message?: string };
      const message = err?.errors?.[0]?.message || err.message || "Unknown error";
      if (verbose) console.log(`Error: ${message}`);

      if (
        message.toLowerCase().includes("quota") ||
        message.toLowerCase().includes("rate")
      ) {
        rateLimited = true;
        break;
      }

      results.push({
        url: inspectionUrl,
        indexed: false,
        coverageState: "ERROR",
        verdict: "ERROR",
        error: message,
      });
    }

    await delay(delayMs);
  }

  return {
    inspected: results.length,
    rateLimited,
    results,
  };
}
