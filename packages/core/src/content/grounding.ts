import fs from "node:fs";
import path from "node:path";
import { parseStrategyYaml } from "../gap/parse-host-seo.js";
import type { GroundingContext, GroundingFacts } from "./types.js";

const PAGE_MESSAGE_KEYS: Record<string, string[]> = {
  "/": ["metadata.home", "home.hero", "home.positioning"],
  "/services": ["metadata.services", "services.intro", "services.subtitle"],
  "/about": ["metadata.about", "about.intro"],
  "/contact": ["metadata.contact", "contact.body"],
  "/references": ["metadata.references"],
};

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function getNested(obj: Record<string, unknown>, dotPath: string): unknown {
  const parts = dotPath.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function slicePageCopy(
  hostRoot: string,
  locale: string,
  targetPages: string[],
): Record<string, unknown> | undefined {
  const messagesPath = path.join(hostRoot, "messages", `${locale}.json`);
  if (!fs.existsSync(messagesPath)) return undefined;
  const messages = JSON.parse(fs.readFileSync(messagesPath, "utf-8")) as Record<string, unknown>;
  const slice: Record<string, unknown> = {};
  for (const page of targetPages) {
    const keys = PAGE_MESSAGE_KEYS[page] ?? [];
    for (const key of keys) {
      const value = getNested(messages, key);
      if (value !== undefined) {
        slice[`${page}:${key}`] = value;
      }
    }
  }
  return Object.keys(slice).length ? slice : undefined;
}

function truncateGrounding(serialized: string, maxChars: number): string {
  if (serialized.length <= maxChars) return serialized;
  return `${serialized.slice(0, maxChars)}\n…[truncated]`;
}

export type BuildGroundingInput = {
  hostRoot: string;
  locale: string;
  intent: string;
  targetPages?: string[];
  contentHints?: string[];
  tokenBudget?: number;
};

export function buildGroundingContext(input: BuildGroundingInput): GroundingContext {
  const hostRoot = input.hostRoot;
  const strategyPath = path.join(hostRoot, "src", "seo", "strategy.yaml");
  const strategy = fs.existsSync(strategyPath)
    ? parseStrategyYaml(fs.readFileSync(strategyPath, "utf-8"))
    : { contentPrinciples: [] as string[] };

  const factsPath = path.join(hostRoot, "src", "seo", "grounding", "facts.json");
  const facts =
    readJsonIfExists<GroundingFacts>(factsPath) ??
    ({
      clientReferences: [],
      contactPolicy: "Do not invent contact details.",
    } satisfies GroundingFacts);

  const llmsPath = path.join(hostRoot, "src", "seo", "grounding", "llms-excerpt.txt");
  const llmsExcerpt = fs.existsSync(llmsPath)
    ? fs.readFileSync(llmsPath, "utf-8").trim()
    : "";

  const targetPages = input.targetPages ?? [];
  const pageSlice = slicePageCopy(hostRoot, input.locale, targetPages);

  const ctx: GroundingContext = {
    locale: input.locale,
    intent: input.intent,
    targetPages,
    contentHints: input.contentHints ?? [],
    contentPrinciples: strategy.contentPrinciples ?? [],
    facts,
    llmsExcerpt,
    pageSlice,
  };

  const budget = input.tokenBudget ?? 10_000;
  const maxChars = budget * 4;
  const serialized = JSON.stringify(ctx);
  if (serialized.length > maxChars && pageSlice) {
    return { ...ctx, pageSlice: undefined };
  }
  if (serialized.length > maxChars) {
    return {
      ...ctx,
      llmsExcerpt: truncateGrounding(ctx.llmsExcerpt, Math.floor(maxChars * 0.2)),
    };
  }
  return ctx;
}

export function serializeGroundingForPrompt(ctx: GroundingContext): string {
  return JSON.stringify(
    {
      locale: ctx.locale,
      intent: ctx.intent,
      targetPages: ctx.targetPages,
      contentHints: ctx.contentHints,
      contentPrinciples: ctx.contentPrinciples,
      facts: ctx.facts,
      llmsExcerpt: ctx.llmsExcerpt,
      pageSlice: ctx.pageSlice,
    },
    null,
    2,
  );
}
