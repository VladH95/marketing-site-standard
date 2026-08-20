import type { MetadataRoute } from "next";
import siteConfig from "../../site.config.mjs";
import { getAllDocs, getCollections } from "@/lib/content";
import { getStaticRoutes, hasDynamicPage } from "@/lib/routes";

const BASE = siteConfig.site.url.replace(/\/$/, "");

/** Frontmatter date → Date, or undefined when missing or unparseable. */
function toDate(d?: unknown): Date | undefined {
  if (!d) return undefined;
  const dt = new Date(String(d));
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of getStaticRoutes()) {
    entries.push({
      url: `${BASE}${route === "/" ? "" : route}`,
      changeFrequency: route === "/" ? "weekly" : "monthly",
      priority: route === "/" ? 1 : 0.8,
    });
  }

  // File-based content carries a real lastModified from its frontmatter — a
  // genuine freshness signal. Pages with no real date get none, deliberately:
  // stamping `new Date()` on everything claims the whole site changed today,
  // and a crawler stops believing a sitemap that says that.
  for (const collection of getCollections()) {
    const docs = getAllDocs(collection);
    // Only advertise a collection once something actually renders it. Content
    // files usually land before the page that displays them, and a sitemap
    // listing URLs that 404 teaches the crawler to distrust the whole file.
    const route = (siteConfig.content?.[collection]?.route ?? `/${collection}`) as string;
    if (docs.length && !hasDynamicPage(route)) {
      console.warn(
        `sitemap: skipping "${collection}" — ${docs.length} file(s) but no ${route}/[slug] page yet`
      );
      continue;
    }
    for (const doc of docs) {
      entries.push({
        url: `${BASE}${doc.href}`,
        lastModified: toDate(doc.data.date),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
