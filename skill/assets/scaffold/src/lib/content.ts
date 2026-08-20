import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import siteConfig from "../../site.config.mjs";

/**
 * File-based content store. One file is one page: markdown with YAML
 * frontmatter under the directories declared in site.config.mjs.
 *
 * Every derived surface — routes, listings, sitemap, RSS, llms.txt, structured
 * data — reads from here and nowhere else. That is the property worth
 * protecting: a file appears in all of them or in none of them, so nothing can
 * drift out of sync with what is actually published.
 */

const COLLECTIONS = siteConfig.content ?? {};

/** A clean slug. Guards every getter below against path traversal, since these
 *  values arrive from URL params and get joined onto a filesystem path. */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;

export type FaqItem = { question: string; answer: string };

export type Doc = {
  slug: string;
  /** which collection it came from, e.g. "blog" */
  collection: string;
  /** public URL path, e.g. "/blog/my-post" */
  href: string;
  /** markdown body */
  body: string;
  data: {
    title?: string;
    seoTitle?: string;
    description?: string;
    date?: string;
    category?: string;
    cover?: string;
    author?: string;
    takeaways?: string[];
    faq?: FaqItem[];
    /** excluded from routes, listings, sitemap and feeds while true */
    draft?: boolean;
    [key: string]: unknown;
  };
};

function rules(collection: string) {
  return COLLECTIONS[collection] ?? null;
}

/** Every collection name declared in the config. */
export function getCollections(): string[] {
  return Object.keys(COLLECTIONS);
}

export function getDoc(collection: string, slug: string): Doc | null {
  const r = rules(collection);
  if (!r || !SAFE_SLUG.test(slug)) return null;
  const fp = path.join(process.cwd(), r.dir, `${slug}.md`);
  if (!fs.existsSync(fp)) return null;
  const { data, content } = matter(fs.readFileSync(fp, "utf8"));
  return {
    slug,
    collection,
    href: `${r.route}/${slug}`,
    body: content,
    data,
  };
}

/**
 * Every publishable doc in a collection, newest first. Sorting happens once,
 * here, so no page component ever re-derives ordering and gets it subtly
 * different from the listing.
 */
export function getAllDocs(collection: string): Doc[] {
  const r = rules(collection);
  if (!r) return [];
  const dir = path.join(process.cwd(), r.dir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter((s) => SAFE_SLUG.test(s))
    .map((s) => getDoc(collection, s))
    .filter((d): d is Doc => d !== null && d.data.draft !== true)
    .sort((a, b) =>
      String(b.data.date ?? "").localeCompare(String(a.data.date ?? ""))
    );
}

/** Published slugs — feed this to generateStaticParams. */
export function getSlugs(collection: string): string[] {
  return getAllDocs(collection).map((d) => d.slug);
}

/**
 * Related docs for a given one: same category first (newest first), topped up
 * with other recent docs to reach `limit`. Powers the "related" module, which
 * is the internal-link surface that stays relevant without anyone maintaining
 * it by hand.
 */
export function getRelated(collection: string, slug: string, limit = 3): Doc[] {
  const all = getAllDocs(collection);
  const current = all.find((d) => d.slug === slug);
  const others = all.filter((d) => d.slug !== slug);
  if (!current?.data.category) return others.slice(0, limit);
  const same = others.filter((d) => d.data.category === current.data.category);
  const rest = others.filter((d) => d.data.category !== current.data.category);
  return [...same, ...rest].slice(0, limit);
}

/** Distinct categories in a collection, in order of first appearance. */
export function getCategories(collection: string): string[] {
  const seen = new Set<string>();
  for (const d of getAllDocs(collection)) {
    if (typeof d.data.category === "string") seen.add(d.data.category);
  }
  return [...seen];
}
