export interface MatiaSiteConfig {
  name: string;
  slug: string;
  property: string;
  siteUrl: string;
  serviceAccountKey: string;
  priorityUrls?: string[];
  lowValuePatterns?: string[];
  inspection?: {
    includeAllSitemapUrls?: boolean;
    maxUrls?: number;
    delayMs?: number;
  };
  reports?: {
    baseDir?: string;
  };
}

export interface ResolvedMatiaSiteConfig extends MatiaSiteConfig {
  resolvedPaths: {
    serviceAccountKey: string;
    reportsBaseDir: string;
    configDir: string;
    configPath: string;
  };
}

export interface SitemapUrlEntry {
  url: string;
  lastmod?: string | null;
  changefreq?: string | null;
  priority?: string | null;
}

export interface SitemapData {
  sitemapsCount: number;
  totalUrls: number;
  urls: SitemapUrlEntry[];
}

export interface UrlInspectionStatus {
  url: string;
  indexed: boolean;
  coverageState: string;
  verdict: string;
  lastCrawlTime?: string | null;
  indexingState?: string;
  pageFetchState?: string;
  issues?: unknown[];
  error?: string;
}

export interface InspectionData {
  inspected: number;
  rateLimited: boolean;
  results: UrlInspectionStatus[];
}

export interface IndexingReportSummary {
  generatedAt: string;
  property: string;
  totalUrls: number;
  inspected: number;
  indexed: number;
  notIndexed: number;
  coverageBreakdown: Record<string, number>;
  rateLimited: boolean;
}

export interface IndexingReport {
  summary: IndexingReportSummary;
  markdown: string;
}

export interface IndexingSnapshot {
  config: {
    name: string;
    property: string;
    siteUrl: string;
  };
  sitemapData: SitemapData;
  inspectionData: InspectionData;
  summary: IndexingReportSummary;
}
