import siteConfig from "../../../../../site.config.mjs";
import { getDoc, getSlugs } from "@/lib/content";
import { docMarkdown, markdownHeaders } from "@/lib/markdown";

export const dynamic = "force-static";
export const dynamicParams = false;

/**
 * Internal target for the /<collection>/<slug>.md rewrite declared in
 * next.config.ts. The .md URL is the public one; this /md/* path is plumbing.
 *
 * Prerendered for every published doc in the collections listed under
 * `agents.twinSections`. dynamicParams = false means an unknown or drafted
 * slug 404s at the edge instead of rendering an empty page — important,
 * because a 200 with no content is exactly what gets indexed.
 *
 * This handler is what makes `agents.markdownTwins: true` safe to switch on.
 * Turning the flag on without it would point every agent redirect at a 404.
 */
export function generateStaticParams() {
  const sections: string[] = siteConfig.agents?.markdownTwins
    ? (siteConfig.agents.twinSections ?? [])
    : [];
  return sections.flatMap((collection) =>
    getSlugs(collection).map((slug) => ({ collection, slug }))
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ collection: string; slug: string }> }
) {
  const { collection, slug } = await params;

  const sections: string[] = siteConfig.agents?.twinSections ?? [];
  if (!sections.includes(collection)) {
    return new Response("Not found", { status: 404 });
  }

  const doc = getDoc(collection, slug);
  if (!doc || doc.data.draft === true) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(docMarkdown(doc), {
    headers: markdownHeaders(doc.href),
  });
}
