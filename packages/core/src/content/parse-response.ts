import type { ArticleDraft } from "./types.js";

export function parseArticleResponse(raw: string): ArticleDraft {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    text = fence[1].trim();
  }

  const parsed = JSON.parse(text) as Partial<ArticleDraft>;
  if (!parsed.title || !parsed.description || !parsed.bodyMarkdown) {
    throw new Error("LLM response missing title, description, or bodyMarkdown");
  }

  return {
    title: String(parsed.title).trim(),
    description: String(parsed.description).trim().slice(0, 200),
    bodyMarkdown: String(parsed.bodyMarkdown).trim(),
    citationsUsed: Array.isArray(parsed.citationsUsed)
      ? parsed.citationsUsed.map(String)
      : [],
  };
}

export function formatBlogMarkdown(draft: ArticleDraft, date: string): string {
  const desc = draft.description.replace(/"/g, '\\"');
  const title = draft.title.replace(/"/g, '\\"');
  return `---
title: "${title}"
date: ${date}
description: "${desc}"
---

${draft.bodyMarkdown}
`;
}
