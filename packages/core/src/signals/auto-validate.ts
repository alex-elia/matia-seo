import type { ParsedSignal } from "../gap/parse-host-seo.js";
import type { SignalFinding, SignalValidationResult } from "./types.js";

function findingsForSignal(
  findings: SignalFinding[],
  signalId: string,
): SignalFinding[] {
  return findings.filter((f) => f.signalId === signalId);
}

function allPass(findings: SignalFinding[]): boolean {
  return findings.length > 0 && findings.every((f) => f.status === "pass");
}

function anyFail(findings: SignalFinding[]): boolean {
  return findings.some((f) => f.status === "fail");
}

export function autoValidateSignals(
  signals: ParsedSignal[],
  findings: SignalFinding[],
): SignalValidationResult[] {
  const results: SignalValidationResult[] = [];

  for (const signal of signals) {
    const related = findingsForSignal(findings, signal.id);
    let suggestedStatus = signal.status;

    if (signal.status === "rejected") {
      results.push({
        signalId: signal.id,
        previousStatus: signal.status,
        suggestedStatus: signal.status,
        reason: "Signal already rejected",
      });
      continue;
    }

    if (related.length > 0) {
      if (allPass(related)) {
        suggestedStatus = "validated";
      } else if (anyFail(related)) {
        suggestedStatus = "hypothesis";
      }
    } else if (signal.source === "geo-probe") {
      const geoFindings = findings.filter(
        (f) =>
          f.source === "geo-probe" &&
          (f.id.includes(signal.id) || f.signalId === signal.id),
      );
      if (geoFindings.length > 0 && allPass(geoFindings)) {
        suggestedStatus = "validated";
      }
    } else if (signal.source === "gsc") {
      const gscFinding = findings.find((f) => f.signalId === signal.id && f.source === "gsc");
      if (gscFinding?.status === "pass") {
        suggestedStatus = "validated";
      }
    } else if (signal.source === "manual" && signal.id === "bing-copilot-eu") {
      const healthOk = findings.some(
        (f) => f.id === "own-health-overall" && f.status === "pass",
      );
      const llmsOk = findings.some(
        (f) => f.id === "own-llms-surface" && f.status === "pass",
      );
      if (healthOk && llmsOk) {
        suggestedStatus = "validated";
      }
    }

    const reason =
      suggestedStatus === signal.status
        ? `Status unchanged (${signal.status})`
        : suggestedStatus === "validated"
          ? "All detector evidence checks passed"
          : "Evidence incomplete or failing";

    results.push({
      signalId: signal.id,
      previousStatus: signal.status,
      suggestedStatus,
      reason,
    });
  }

  return results;
}

export function applySignalValidationsToYaml(
  yamlContent: string,
  validations: SignalValidationResult[],
): string {
  let updated = yamlContent;
  for (const v of validations) {
    if (v.suggestedStatus === v.previousStatus) continue;
    const pattern = new RegExp(
      `(id:\\s*${v.signalId}[\\s\\S]*?status:\\s*)${v.previousStatus}`,
      "m",
    );
    updated = updated.replace(pattern, `$1${v.suggestedStatus}`);
  }
  return updated;
}
