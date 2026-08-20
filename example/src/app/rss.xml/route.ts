import siteConfig from "../../../site.config.mjs";
import { getAllDocs, getCollections } from "@/lib/content";

export const dynamic = "force-static";

const BASE = siteConfig.site.url.replace(/\/$/, "");

/** XML text escape. Content is authored, not hostile, but an unescaped
 *  ampersand in a title breaks the whole feed for every reader. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const items = getCollections()
    .flatMap((c) => getAllDocs(c))
    .sort((a, b) =>
      String(b.data.date ?? "").localeCompare(String(a.data.date ?? ""))
    )
    .slice(0, 50)
    .map((doc) => {
      const url = `${BASE}${doc.href}`;
      const date = doc.data.date ? new Date(String(doc.data.date)) : null;
      return [
        "    <item>",
        `      <title>${esc(String(doc.data.title ?? doc.slug))}</title>`,
        `      <link>${esc(url)}</link>`,
        `      <guid isPermaLink="true">${esc(url)}</guid>`,
        doc.data.description
          ? `      <description>${esc(String(doc.data.description))}</description>`
          : null,
        date && !Number.isNaN(date.getTime())
          ? `      <pubDate>${date.toUTCString()}</pubDate>`
          : null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(siteConfig.site.name)}</title>
    <link>${esc(BASE)}</link>
    <description>${esc(siteConfig.site.description ?? siteConfig.site.name)}</description>
    <language>${esc(siteConfig.site.locale ?? "en")}</language>
    <atom:link href="${esc(BASE)}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
