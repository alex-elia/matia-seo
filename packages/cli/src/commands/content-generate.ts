import fs from "node:fs";
import path from "node:path";
import {
  buildArticlePrompt,
  buildGroundingContext,
  formatBlogMarkdown,
  hashString,
  parseArticleResponse,
  slugifyIntent,
  validateArticleClaims,
  type ContentGenerateReview,
  type ValidationResult,
  type ArticleDraft,
} from "@matia/core";
import { completeChat, resolveLlmConfig } from "@matia/llm";
import { getArg } from "../args.js";

export type ContentGenerateOutput = {
  ok: boolean;
  filesWritten: string[];
  outcome: string;
  markDone: boolean;
  reviewPath?: string;
  error?: string;
};

function readHostLlmConfig(hostRoot: string): {
  tokenBudget: number;
  temperature?: number;
  maxTokens?: number;
  articleLayout: "blog-locale" | "news-per-locale";
  defaultAuthor: string;
} {
  const configPath = path.join(hostRoot, "src", "seo", "matia.config.json");
  if (!fs.existsSync(configPath)) {
    return { tokenBudget: 10_000, articleLayout: "blog-locale", defaultAuthor: "Matia" };
  }
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8")) as {
    llm?: {
      groundingTokenBudget?: number;
      parameters?: { temperature?: number; maxTokens?: number };
    };
    content?: {
      articleLayout?: "blog-locale" | "news-per-locale";
      defaultAuthor?: string;
    };
  };
  return {
    tokenBudget: raw.llm?.groundingTokenBudget ?? 10_000,
    temperature: raw.llm?.parameters?.temperature,
    maxTokens: raw.llm?.parameters?.maxTokens,
    articleLayout: raw.content?.articleLayout ?? "blog-locale",
    defaultAuthor: raw.content?.defaultAuthor ?? "Matia",
  };
}

function resolveArticleRelativePath(
  layout: "blog-locale" | "news-per-locale",
  slug: string,
  locale: string,
): string {
  if (layout === "news-per-locale") {
    return `content/news/${slug}.${locale}.md`;
  }
  return `content/${locale}/blog/${slug}.md`;
}

function formatArticleFile(
  draft: ArticleDraft,
  date: string,
  layout: "blog-locale" | "news-per-locale",
  author: string,
): string {
  if (layout === "news-per-locale") {
    const title = draft.title.replace(/"/g, '\\"');
    const summary = draft.description.replace(/"/g, '\\"');
    return `---
title: "${title}"
summary: "${summary}"
date: ${date}
author: ${author}
tags: [matia-draft]
eyebrow: Matia draft
---

${draft.bodyMarkdown}
`;
  }
  return formatBlogMarkdown(draft, date);
}

export async function runContentGenerateCommand(): Promise<void> {
  const result = await executeContentGenerate({
    hostRoot: getArg("--root") ?? process.cwd(),
    intent: getArg("--intent") ?? "",
    slug: getArg("--slug"),
    actionId: getArg("--action-id") ?? `manual-${Date.now()}`,
    locales: (getArg("--locales") ?? "en,fr").split(",").map((s) => s.trim()),
    contentHints: (getArg("--hints") ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean),
    targetPages: (getArg("--target-pages") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    dryRun: getArg("--dry-run") === "true",
  });

  if (!getArg("--json")) {
    console.log(result.outcome);
    if (result.filesWritten.length) {
      console.log(`Files: ${result.filesWritten.join(", ")}`);
    }
    if (result.reviewPath) {
      console.log(`Review: ${result.reviewPath}`);
    }
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }

  if (getArg("--json")) {
    process.stdout.write(JSON.stringify(result));
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }
}

export async function executeContentGenerate(opts: {
  hostRoot: string;
  intent: string;
  slug?: string;
  actionId: string;
  locales: string[];
  contentHints?: string[];
  targetPages?: string[];
  dryRun?: boolean;
}): Promise<ContentGenerateOutput> {
  if (!opts.intent.trim()) {
    return {
      ok: false,
      filesWritten: [],
      outcome: "Missing --intent",
      markDone: false,
      error: "missing intent",
    };
  }

  const slug = opts.slug?.trim() || slugifyIntent(opts.intent);
  const hostLlm = readHostLlmConfig(opts.hostRoot);
  const filesWritten: string[] = [];
  const validation: Record<string, ValidationResult> = {};
  let totalInput = 0;
  let totalOutput = 0;

  let llmConfig: Awaited<ReturnType<typeof resolveLlmConfig>> | undefined;
  if (!opts.dryRun) {
    try {
      llmConfig = resolveLlmConfig({ purpose: "article" });
      if (hostLlm.temperature != null) llmConfig.temperature = hostLlm.temperature;
      if (hostLlm.maxTokens != null) llmConfig.maxTokens = hostLlm.maxTokens;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        filesWritten: [],
        outcome: message,
        markDone: false,
        error: message,
      };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const contextHashes: string[] = [];

  for (const locale of opts.locales) {
    const grounding = buildGroundingContext({
      hostRoot: opts.hostRoot,
      locale,
      intent: opts.intent,
      targetPages: opts.targetPages,
      contentHints: opts.contentHints,
      tokenBudget: hostLlm.tokenBudget,
    });
    contextHashes.push(hashString(JSON.stringify(grounding)));
    const { system, user } = buildArticlePrompt(grounding);

    if (opts.dryRun) {
      console.log(`\n=== DRY RUN ${locale} ===\n`);
      console.log("SYSTEM:\n", system);
      console.log("\nUSER:\n", user.slice(0, 4000));
      continue;
    }

    const completion = await completeChat({
      config: llmConfig!,
      system,
      user,
      jsonMode: true,
    });
    totalInput += completion.usage?.inputTokens ?? 0;
    totalOutput += completion.usage?.outputTokens ?? 0;

    const draft = parseArticleResponse(completion.text);
    const check = validateArticleClaims(draft, grounding.facts);
    validation[locale] = check;

    if (!check.ok) {
      const failedPath = path.join(
        opts.hostRoot,
        ".matia",
        "review",
        `${opts.actionId}-failed.json`,
      );
      fs.mkdirSync(path.dirname(failedPath), { recursive: true });
      fs.writeFileSync(
        failedPath,
        JSON.stringify(
          {
            actionId: opts.actionId,
            intent: opts.intent,
            locale,
            model: llmConfig!.model,
            hardFailures: check.hardFailures,
            warnings: check.warnings,
            draft,
          },
          null,
          2,
        ),
      );
      return {
        ok: false,
        filesWritten,
        outcome: `Validation blocked ${locale}: ${check.hardFailures.map((f) => f.message).join("; ")}`,
        markDone: false,
        reviewPath: path.relative(opts.hostRoot, failedPath),
        error: "validation failed",
      };
    }

    const relPath = resolveArticleRelativePath(hostLlm.articleLayout, slug, locale);
    const fullPath = path.join(opts.hostRoot, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(
      fullPath,
      formatArticleFile(draft, today, hostLlm.articleLayout, hostLlm.defaultAuthor),
      "utf-8",
    );
    filesWritten.push(relPath);
  }

  if (opts.dryRun) {
    return {
      ok: true,
      filesWritten: [],
      outcome: "Dry run — prompts printed, no API calls",
      markDone: false,
    };
  }

  const review: ContentGenerateReview = {
    actionId: opts.actionId,
    intent: opts.intent,
    slug,
    locales: opts.locales,
    model: llmConfig!.model,
    generatedAt: new Date().toISOString(),
    contextHash: contextHashes.join(","),
    filesWritten,
    validation,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
  };

  const reviewPath = path.join(opts.hostRoot, ".matia", "review", `${opts.actionId}.json`);
  fs.mkdirSync(path.dirname(reviewPath), { recursive: true });
  fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2));

  const warnCount = Object.values(validation).reduce((n, v) => n + v.warnings.length, 0);

  return {
    ok: true,
    filesWritten,
    outcome:
      warnCount > 0
        ? `Generated EN+FR blog drafts (${warnCount} validation warnings) — review before mark done`
        : "Generated EN+FR blog drafts — review before mark done",
    markDone: false,
    reviewPath: path.relative(opts.hostRoot, reviewPath),
  };
}
