import type { MetadataRoute } from "next";
import siteConfig from "../../site.config.mjs";

const BASE = siteConfig.site.url.replace(/\/$/, "");

/**
 * robots.txt. Deliberately permissive: on a marketing site the job is to be
 * found.
 *
 * The important distinction, because getting it backwards is a classic own
 * goal: `Disallow` tells a crawler not to FETCH a page. It does not tell it not
 * to INDEX one. A disallowed URL that someone links to can still show up in
 * results as a bare URL with no title or description — and because the crawler
 * never fetched it, it never saw the page's own `noindex` either. Blocking is
 * how you guarantee the crawler stays ignorant, not how you guarantee absence.
 *
 * So the two lists in the config mean different things and are kept apart:
 *
 *   sitemap.excludeRoutes  — "don't advertise this" (thank-you pages,
 *                            confirmations). Still crawlable, so the noindex
 *                            below is the thing that keeps it out of results.
 *   seo.noindexRoutes      — "never index this". The proxy sets
 *                            X-Robots-Tag: noindex on these paths, which the
 *                            crawler must obey once it fetches them.
 *   robots.disallow        — "don't fetch this at all". Rare, and only for
 *                            paths with nothing to index anyway (API routes).
 *                            Never use it to hide a page from results.
 *
 * Preview and staging hosts are handled separately, in the proxy, by host.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow: string[] = (siteConfig.seo?.disallowCrawl ?? []) as string[];

  return {
    rules: { userAgent: "*", allow: "/", ...(disallow.length ? { disallow } : {}) },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
