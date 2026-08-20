import siteConfig from "../../../site.config.mjs";
import { getAllDocs, getCollections } from "@/lib/content";

export const dynamic = "force-static";

const BASE = siteConfig.site.url.replace(/\/$/, "");

/**
 * /llms.txt — a structured map of the site for AI crawlers and answer engines
 * (see llmstxt.org). Built from the same content loader as everything else, so
 * it cannot list a page that does not exist or miss one that does.
 *
 * Worth shipping even on a small site: it is the cheapest way to tell an answer
 * engine what this site is and which pages matter, and unlike the markdown-twin
 * redirect it carries no cloaking risk, because everyone gets the same file.
 */
export function GET() {
  const section = (name: string, docs: { href: string; data: Record<string, unknown> }[]) =>
    docs.length
      ? `\n## ${name[0].toUpperCase()}${name.slice(1)}\n` +
        docs
          .map((d) => {
            const title = (d.data.title as string) ?? d.href;
            const desc = d.data.description as string | undefined;
            return `- [${title}](${BASE}${d.href})${desc ? `: ${desc}` : ""}`;
          })
          .join("\n")
      : "";

  const body = [
    `# ${siteConfig.site.name}`,
    "",
    `> ${siteConfig.site.description ?? ""}`,
    "",
    ...getCollections().map((c) => section(c, getAllDocs(c))),
  ].join("\n");

  return new Response(body + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
