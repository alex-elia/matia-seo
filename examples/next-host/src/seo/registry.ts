import type { SeoGeoEntity } from "@matia/core";

/** Page inventory — source of truth for sitemap and gap analysis. */
export const registry: SeoGeoEntity[] = [
  {
    project: "example-site",
    slug: "/",
    url: "https://example.com/",
    pageType: "homepage",
    title: "Home",
    description: "Example site home page.",
    publishStatus: "published",
    isIndexable: true,
  },
  {
    project: "example-site",
    slug: "/services",
    url: "https://example.com/services",
    pageType: "service",
    title: "Services",
    description: "What we offer.",
    publishStatus: "published",
    isIndexable: true,
  },
  {
    project: "example-site",
    slug: "/contact",
    url: "https://example.com/contact",
    pageType: "landing",
    title: "Contact",
    description: "Get in touch.",
    publishStatus: "published",
    isIndexable: true,
  },
];
