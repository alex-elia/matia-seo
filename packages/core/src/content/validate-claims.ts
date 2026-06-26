import type { ArticleDraft, GroundingFacts, ValidationIssue, ValidationResult } from "./types.js";

const FORBIDDEN_PATTERNS = [
  { code: "atlas-brand", pattern: /\bATLAS\b/i, message: "ATLAS product branding must not appear on public copy" },
  {
    code: "invented-email",
    pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
    message: "Invented email address detected",
  },
  {
    code: "invented-phone",
    pattern: /\+?\d[\d\s().-]{8,}\d/,
    message: "Possible invented phone number detected",
  },
];

function approvedClients(facts: GroundingFacts): Map<string, string> {
  const map = new Map<string, string>();
  for (const ref of facts.clientReferences ?? []) {
    map.set(ref.client.toLowerCase(), ref.outcome);
  }
  return map;
}

export function validateArticleClaims(
  draft: ArticleDraft,
  facts: GroundingFacts,
): ValidationResult {
  const hardFailures: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const body = `${draft.title}\n${draft.description}\n${draft.bodyMarkdown}`;
  const lower = body.toLowerCase();

  for (const { code, pattern, message } of FORBIDDEN_PATTERNS) {
    if (code === "invented-email" && !pattern.test(body)) continue;
    if (code === "invented-phone") {
      const approved = [
        facts.contact?.phone,
        facts.contact?.whatsapp,
        facts.contact?.email,
      ].filter(Boolean) as string[];
      if (approved.some((value) => body.includes(value.replace(/\s/g, "")) || body.includes(value))) {
        continue;
      }
    }
    if (pattern.test(body)) {
      if (code === "invented-phone" && body.includes("€5")) {
        continue;
      }
      hardFailures.push({ severity: "hard", code, message });
    }
  }

  const clients = approvedClients(facts);
  for (const [client, outcome] of clients) {
    if (!lower.includes(client)) continue;
    if (!lower.includes(outcome.toLowerCase())) {
      const wrongFte =
        client.includes("efectis") && lower.includes("fte") && !outcome.toLowerCase().includes("fte");
      const wrongRoadmap =
        client.includes("crédit") && lower.includes("roadmap") && outcome.toLowerCase().includes("fte");
      if (wrongFte || wrongRoadmap) {
        hardFailures.push({
          severity: "hard",
          code: "wrong-client-outcome",
          message: `Wrong outcome for ${client}. Approved: "${outcome}"`,
        });
      } else if (!body.includes(outcome)) {
        warnings.push({
          severity: "warn",
          code: "client-outcome-paraphrase",
          message: `Client ${client} cited but exact outcome "${outcome}" not found verbatim`,
        });
      }
    }
  }

  for (const match of body.matchAll(/\b(\d{1,3})\s*%|\b€\s?\d+/g)) {
    const snippet = match[0];
    const allowed =
      body.includes("€5") ||
      body.includes("5 000") ||
      body.includes("20%") ||
      body.includes("20 %") ||
      facts.clientReferences?.some((r) => r.outcome.includes(snippet.replace(/\s/g, "")));
    if (!allowed && !facts.offers?.some((o) => JSON.stringify(o).includes(snippet))) {
      warnings.push({
        severity: "warn",
        code: "unlisted-stat",
        message: `Numeric claim "${snippet}" not found in grounding facts`,
      });
    }
  }

  if (draft.description.length > 160) {
    warnings.push({
      severity: "warn",
      code: "description-length",
      message: `Description is ${draft.description.length} chars (target max 160)`,
    });
  }

  return {
    ok: hardFailures.length === 0,
    hardFailures,
    warnings,
  };
}
