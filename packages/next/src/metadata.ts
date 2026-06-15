import type { Metadata } from "next";

export type LocaleMetadataInput = {
  siteUrl: string;
  locale: string;
  pathname: string;
  title: string;
  description: string;
  locales: string[];
  defaultLocale: string;
  ogImage?: string;
  ogType?: "website" | "article";
};

function localeUrl(
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

export function buildLocaleMetadata(input: LocaleMetadataInput): Metadata {
  const {
    siteUrl,
    locale,
    pathname,
    title,
    description,
    locales,
    defaultLocale,
    ogImage,
    ogType = "website",
  } = input;

  const canonical = localeUrl(siteUrl, locale, pathname, defaultLocale);
  const languages = Object.fromEntries(
    locales.map((loc) => [loc, localeUrl(siteUrl, loc, pathname, defaultLocale)]),
  );
  languages["x-default"] = localeUrl(
    siteUrl,
    defaultLocale,
    pathname,
    defaultLocale,
  );

  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: ogType,
      title,
      description,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
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
] as const;
