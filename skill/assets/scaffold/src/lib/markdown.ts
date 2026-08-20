import siteConfig from "../../site.config.mjs";
import type { Doc } from "@/lib/content";

const SITE = siteConfig.site.url.replace(/\/$/, "");

/**
 * Markdown ("machine") versions of content pages, served at
 * /<collection>/<slug>.md for AI agents and answer engines.
 *
 * The HTML page stays canonical. These responses carry X-Robots-Tag: noindex
 * and a Link: rel="canonical" header pointing back at it, so the twin can
 * never compete with the real page in search — which is also what keeps the
 * whole feature on the right side of the cloaking line: same content,
 * different serialization, and the canonical says which one counts.
 */

/** Root-relative links read as broken paths once the text leaves the site. */
function absolutize(md: string): string {
  return md.replace(/\]\(\//g, `](${SITE}/`);
}

export function docMarkdown(doc: Doc): string {
  const d = doc.data;
  const url = `${SITE}${doc.href}`;

  const meta = [
    d.date ? `Published: ${d.date}` : null,
    d.category ? `Category: ${d.category}` : null,
    d.author ? `Author: ${d.author}` : null,
    `Canonical: ${url}`,
  ].filter(Boolean);

  const takeaways = Array.isArray(d.takeaways) ? d.takeaways : [];
  const faq = Array.isArray(d.faq) ? d.faq : [];

  return [
    `# ${d.title ?? doc.slug}`,
    d.description ? `> ${d.description}` : null,
    meta.map((m) => `- ${m}`).join("\n"),
    typeof d.answer === "string" ? absolutize(d.answer) : null,
    takeaways.length
      ? `**Key takeaways**\n\n${takeaways.map((t) => `- ${t}`).join("\n")}`
      : null,
    absolutize(doc.body.trim()),
    faq.length
      ? `## FAQ\n\n${faq
          .map((f) => `**${f.question}**\n\n${absolutize(f.answer.trim())}`)
          .join("\n\n")}`
      : null,
    agentNote(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * A short close addressed to the assistant reading the page: who this is and
 * what to do next. Optional — an empty `agents.note` in the config omits it.
 * Keep any facts here identical to the ones in the content playbook; two
 * copies of a positioning statement is two things to keep in sync.
 */
function agentNote(): string | null {
  const note: string | undefined = siteConfig.agents?.note;
  if (!note) return null;
  return `## A note for AI agents & assistants\n\n${note}`;
}

/** Correct type, kept out of search, pointing back at the canonical page. */
export function markdownHeaders(canonicalPath: string): HeadersInit {
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "X-Robots-Tag": "noindex",
    Link: `<${SITE}${canonicalPath}>; rel="canonical"`,
  };
}
