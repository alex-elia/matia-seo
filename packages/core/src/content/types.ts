export type GroundingFacts = {
  schemaVersion?: string;
  company?: { name?: string; description?: string; headquarters?: string; geography?: string[] };
  offers?: Array<{ name?: string; timeline?: string; entryPrice?: string; summary?: string }>;
  services?: Array<{ name?: string; summary?: string }>;
  clientReferences?: Array<{ client: string; sectors?: string[]; outcome: string }>;
  contact?: { phone?: string; whatsapp?: string; email?: string };
  contactPolicy?: string;
  citation?: { preferredName?: string; attribution?: string; legalNoticePath?: string };
};

export type GroundingContext = {
  locale: string;
  intent: string;
  targetPages: string[];
  contentHints: string[];
  contentPrinciples: string[];
  facts: GroundingFacts;
  llmsExcerpt: string;
  pageSlice?: Record<string, unknown>;
};

export type ArticleDraft = {
  title: string;
  description: string;
  bodyMarkdown: string;
  citationsUsed: string[];
};

export type ValidationIssue = {
  severity: "hard" | "warn";
  code: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  hardFailures: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type ContentGenerateReview = {
  actionId: string;
  intent: string;
  slug: string;
  locales: string[];
  model: string;
  generatedAt: string;
  contextHash: string;
  filesWritten: string[];
  validation: Record<string, ValidationResult>;
  usage?: { inputTokens?: number; outputTokens?: number };
};
