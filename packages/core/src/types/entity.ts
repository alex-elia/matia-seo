export type PageType =
  | "homepage"
  | "landing"
  | "article"
  | "faq"
  | "service"
  | "location"
  | "software-app"
  | "case-study";

export type PublishStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "archived";

export type IndexingStatus =
  | "unknown"
  | "not-submitted"
  | "submitted"
  | "discovered"
  | "indexed"
  | "excluded"
  | "needs-review";

export interface SeoGeoEntity {
  project: string;
  slug: string;
  url: string;
  pageType: PageType;
  title?: string;
  description?: string;
  canonicalUrl?: string;
  primaryIntent?: string;
  primaryKeyword?: string;
  entities?: string[];
  audience?: string;
  publishStatus: PublishStatus;
  indexingStatus?: IndexingStatus;
  isIndexable: boolean;
  updatedAt?: string;
  internalLinksFrom?: string[];
  internalLinksTo?: string[];
  notes?: string[];
  geoSurfaces?: Array<"llms-txt" | "llms-full" | "facts-json" | "rss">;
  partnerRefs?: Array<{ project: string; url: string }>;
}
