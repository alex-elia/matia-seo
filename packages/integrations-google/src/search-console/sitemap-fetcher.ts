import type { searchconsole_v1 } from "googleapis";
import type { SitemapData, SitemapUrlEntry } from "../types.js";

interface ParsedSitemap {
  sitemapindex?: { sitemap: Array<{ loc: string }> | { loc: string } };
  urlset?: { url: Array<Record<string, string>> | Record<string, string> };
}

function parseSitemapXml(xml: string): ParsedSitemap {
  const result: ParsedSitemap = {};

  if (xml.includes("<sitemapindex")) {
    const sitemapMatches = xml.matchAll(/<sitemap[^>]*>[\s\S]*?<\/sitemap>/gi);
    const sitemaps: Array<{ loc: string }> = [];
    for (const match of sitemapMatches) {
      const locMatch = match[0].match(/<loc[^>]*>([^<]+)<\/loc>/i);
      if (locMatch) sitemaps.push({ loc: locMatch[1] });
    }
    result.sitemapindex = { sitemap: sitemaps };
  } else if (xml.includes("<urlset")) {
    const urlMatches = xml.matchAll(/<url[^>]*>[\s\S]*?<\/url>/gi);
    const urls: Array<Record<string, string>> = [];
    for (const match of urlMatches) {
      const entry: Record<string, string> = {};
      const locMatch = match[0].match(/<loc[^>]*>([^<]+)<\/loc>/i);
      if (locMatch) entry.loc = locMatch[1];
      const lastmodMatch = match[0].match(/<lastmod[^>]*>([^<]+)<\/lastmod>/i);
      if (lastmodMatch) entry.lastmod = lastmodMatch[1];
      const changefreqMatch = match[0].match(
        /<changefreq[^>]*>([^<]+)<\/changefreq>/i,
      );
      if (changefreqMatch) entry.changefreq = changefreqMatch[1];
      const priorityMatch = match[0].match(/<priority[^>]*>([^<]+)<\/priority>/i);
      if (priorityMatch) entry.priority = priorityMatch[1];
      if (entry.loc) urls.push(entry);
    }
    result.urlset = { url: urls };
  }

  return result;
}

async function downloadAndParseSitemap(
  sitemapUrl: string,
): Promise<SitemapUrlEntry[]> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Matia-SEO/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const urls: SitemapUrlEntry[] = [];
    const parsed = parseSitemapXml(xml);

    if (parsed.sitemapindex?.sitemap) {
      const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap];

      for (const sitemap of sitemaps) {
        if (sitemap.loc) {
          const nested = await downloadAndParseSitemap(sitemap.loc);
          urls.push(...nested);
        }
      }
    } else if (parsed.urlset?.url) {
      const urlEntries = Array.isArray(parsed.urlset.url)
        ? parsed.urlset.url
        : [parsed.urlset.url];

      for (const entry of urlEntries) {
        if (entry.loc) {
          urls.push({
            url: entry.loc,
            lastmod: entry.lastmod ?? null,
            changefreq: entry.changefreq ?? null,
            priority: entry.priority ?? null,
          });
        }
      }
    }

    return urls;
  } catch {
    return [];
  }
}

export async function fetchSitemapUrls(
  searchConsole: searchconsole_v1.Searchconsole,
  property: string,
): Promise<SitemapData> {
  const response = await searchConsole.sitemaps.list({ siteUrl: property });
  const sitemaps = response.data?.sitemap ?? [];

  const allUrls: SitemapUrlEntry[] = [];
  const seen = new Set<string>();

  for (const sitemap of sitemaps) {
    if (!sitemap.path) continue;

    const sitemapUrl = sitemap.path.startsWith("http")
      ? sitemap.path
      : `https://${property.replace("sc-domain:", "")}${sitemap.path}`;

    const urls = await downloadAndParseSitemap(sitemapUrl);

    for (const entry of urls) {
      if (!seen.has(entry.url)) {
        seen.add(entry.url);
        allUrls.push(entry);
      }
    }
  }

  return {
    sitemapsCount: sitemaps.length,
    totalUrls: allUrls.length,
    urls: allUrls,
  };
}
