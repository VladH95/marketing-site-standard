import fs from "node:fs";
import path from "node:path";
import siteConfig from "../../site.config.mjs";

/**
 * The site's static routes, derived by walking the app directory for files
 * that define a page.
 *
 * Deriving beats listing. A hand-maintained list of pages drifts the first
 * time someone adds a page and forgets the sitemap, and a sitemap that omits
 * real pages or lists dead ones is worse than none. Walking the filesystem
 * means the sitemap cannot fall behind the site.
 *
 * Dynamic segments are skipped here — those come from the content loader,
 * which knows which slugs are actually published.
 */

const PAGE_FILES = ["page.tsx", "page.jsx", "page.ts", "page.js"];
const APP_DIR = [
  path.join(process.cwd(), "src/app"),
  path.join(process.cwd(), "app"),
].find((d) => fs.existsSync(d));

const excluded: string[] = (siteConfig.seo?.excludeFromSitemap ?? []) as string[];

function walk(dir: string, segments: string[], out: Set<string>) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  if (entries.some((e) => e.isFile() && PAGE_FILES.includes(e.name))) {
    if (!segments.some((s) => s.startsWith("["))) {
      out.add("/" + segments.filter(Boolean).join("/"));
    }
  }

  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith("_")) continue; // _private
    // Four folder conventions contribute no URL segment. Treating any of them
    // as a path invents routes that do not exist — a "/@team/settings" that
    // the sitemap then advertises, while the real "/settings" goes missing.
    //   (group)   route group
    //   (.)foo    intercepting route
    //   @slot     parallel route
    const isGroup = e.name.startsWith("(") && e.name.endsWith(")");
    const isSlot = e.name.startsWith("@");
    const transparent = isGroup || isSlot;
    walk(path.join(dir, e.name), transparent ? segments : [...segments, e.name], out);
  }
}

/** Static, indexable routes. "/" is always first. */
export function getStaticRoutes(): string[] {
  if (!APP_DIR) return ["/"];
  const out = new Set<string>();
  walk(APP_DIR, [], out);
  out.add("/");
  return [...out]
    .map((r) => (r === "" ? "/" : r))
    .filter((r) => !excluded.some((x) => r === x || r.startsWith(x + "/")))
    .sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)));
}

/**
 * Does a route prefix have a dynamic page behind it — is there really a
 * `<prefix>/[slug]/page.tsx`?
 *
 * The sitemap uses this before advertising a collection. Content files and the
 * page that renders them are added in separate steps, and in between, a
 * sitemap built purely from the content directory lists URLs that 404. A
 * crawler that finds dead URLs in a sitemap trusts the file less, so it is
 * worth the check: no page, no listing.
 */
export function hasDynamicPage(routePrefix: string): boolean {
  if (!APP_DIR) return false;
  const dir = path.join(APP_DIR, ...routePrefix.replace(/^\//, "").split("/"));
  if (!fs.existsSync(dir)) return false;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .some(
      (e) =>
        e.isDirectory() &&
        e.name.startsWith("[") &&
        fs
          .readdirSync(path.join(dir, e.name))
          .some((f) => PAGE_FILES.includes(f))
    );
}
