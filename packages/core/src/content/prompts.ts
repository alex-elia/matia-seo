import type { GroundingContext } from "./types.js";
import { serializeGroundingForPrompt } from "./grounding.js";

const SYSTEM_EN = `You are Matia, an SEO content writer for Elia Studio.
Write factual, citation-friendly blog copy for European B2B audiences.

Rules:
- Use ONLY facts present in the GROUNDING JSON block.
- If a claim is not in GROUNDING, omit it or write [NEEDS SOURCE].
- Do NOT invent statistics, client names, prices, timelines, or contact details.
- Do NOT use "ATLAS" as a product brand on the public site.
- Use exact client outcome wording from clientReferences when citing clients.
- Output valid JSON only (no markdown fences).`;

const SYSTEM_FR = `You are Matia, rédacteur SEO pour Elia Studio.
Rédige un article de blog factuel pour un public B2B européen, en français natif.

Règles:
- Utilise UNIQUEMENT les faits du bloc GROUNDING JSON.
- Si une affirmation n'est pas dans GROUNDING, omit ou écris [NEEDS SOURCE].
- N'invente pas de statistiques, clients, prix, délais ou coordonnées.
- N'utilise pas "ATLAS" comme marque produit sur le site public.
- Reprends les formulations exactes de clientReferences pour les références clients.
- Réponds en JSON valide uniquement (pas de fences markdown).`;

export function buildArticlePrompt(ctx: GroundingContext): { system: string; user: string } {
  const system = ctx.locale === "fr" ? SYSTEM_FR : SYSTEM_EN;
  const langNote =
    ctx.locale === "fr"
      ? "Rédige title, description et bodyMarkdown en français."
      : "Write title, description, and bodyMarkdown in English.";

  const user = `${langNote}

Intent: ${ctx.intent}

Respond with JSON:
{
  "title": "string",
  "description": "string (max 160 characters)",
  "bodyMarkdown": "string (600-900 words, markdown with ## headings, link to /services and /contact)",
  "citationsUsed": ["paths into GROUNDING you relied on, e.g. clientReferences[0].outcome"]
}

GROUNDING:
${serializeGroundingForPrompt(ctx)}`;

  return { system, user };
}
