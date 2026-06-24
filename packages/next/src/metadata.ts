import type { Metadata } from "next";

export type BuildPageMetadataInput = {
  siteUrl: string;
  locale: string;
  pathname: string;
  title: string;
  description: string;
  locales: string[];
  defaultLocale: string;
  /**
   * Set false when alternate locales use different slugs (e.g. blog posts).
   */
  withHreflang?: boolean;
  siteName?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  /** e.g. en_EU, fr_EU — derived from locale if omitted */
  ogLocale?: string;
  publishedTime?: string;
  modifiedTime?: string;
  indexable?: boolean;
  /** Override per-locale URL resolution (host app localePath conventions). */
  resolveLocaleUrl?: (locale: string, pathname: string) => string;
};

/** @deprecated Use BuildPageMetadataInput */
export type LocaleMetadataInput = BuildPageMetadataInput;

export function defaultLocaleUrl(
  siteUrl: string,
  locale: string,
  pathname: string,
  defaultLocale: string,
): string {
  const base = siteUrl.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalized = path === "/" ? "" : path;
  if (locale === defaultLocale) {
    return `${base}${normalized || "/"}`;
  }
  return `${base}/${locale}${normalized}`;
}

function defaultOgLocale(locale: string): string {
  if (locale === "fr") return "fr_EU";
  if (locale.startsWith("en")) return "en_EU";
  return `${locale}_${locale.toUpperCase()}`;
}

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const {
    siteUrl,
    locale,
    pathname,
    title,
    description,
    locales,
    defaultLocale,
    withHreflang = true,
    siteName,
    ogImage,
    ogType = "website",
    ogLocale,
    publishedTime,
    modifiedTime,
    indexable = true,
    resolveLocaleUrl = (loc, path) =>
      defaultLocaleUrl(siteUrl, loc, path, defaultLocale),
  } = input;

  const canonical = resolveLocaleUrl(locale, pathname);

  const languages: Record<string, string> = {};
  if (withHreflang) {
    for (const loc of locales) {
      languages[loc] = resolveLocaleUrl(loc, pathname);
    }
    languages["x-default"] = resolveLocaleUrl(defaultLocale, pathname);
  }

  const ogImageEntry = ogImage
    ? [{ url: ogImage, ...(siteName ? { alt: siteName } : {}) }]
    : undefined;

  const openGraph: Metadata["openGraph"] = {
    type: ogType,
    locale: ogLocale ?? defaultOgLocale(locale),
    url: canonical,
    title,
    description,
    ...(siteName ? { siteName } : {}),
    ...(ogImageEntry ? { images: ogImageEntry } : {}),
    ...(ogType === "article" && publishedTime
      ? {
          type: "article" as const,
          publishedTime,
          modifiedTime: modifiedTime ?? publishedTime,
        }
      : {}),
  };

  const twitter: Metadata["twitter"] = ogImage
    ? {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      }
    : {
        card: "summary_large_image",
        title,
        description,
      };

  return {
    title,
    description,
    alternates: {
      canonical,
      ...(withHreflang ? { languages } : {}),
    },
    openGraph,
    twitter,
    robots: {
      index: indexable,
      follow: indexable,
    },
  };
}

/** Alias for buildPageMetadata */
export function buildLocaleMetadata(input: BuildPageMetadataInput): Metadata {
  return buildPageMetadata(input);
}

export const AI_CRAWLER_AGENTS = [
  "*",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "Bingbot",
] as const;
