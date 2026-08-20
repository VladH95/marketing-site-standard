#!/usr/bin/env node
/**
 * Internal link + asset checker.
 *
 * A dead internal link is the most common SEO regression on a content site and
 * the least visible one: nothing crashes, the build passes, and the page just
 * quietly links to a 404 until someone clicks it. Renaming a file, deleting a
 * draft, or fixing a typo in a slug all cause it.
 *
 * The check works by deriving the real route table from the app directory
 * (every folder with a page/route file), then resolving every root-relative link
 * found in content and components against it. Dynamic segments resolve against
 * the actual content files, so a link to a deleted or draft post fails.
 *
 * ERRORS: a link that resolves to nothing, or an image that is not in /public.
 * WARNINGS: a link this script cannot decide about — reported so nothing is
 * silently waved through.
 *
 * Usage: node scripts/check-links.mjs
 * Requires: gray-matter
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import config from "../site.config.mjs";

const ROOT = process.cwd();
// Both layouts are valid Next.js; pick whichever this project uses.
const APP_DIR = [path.join(ROOT, "src/app"), path.join(ROOT, "app")].find((d) =>
  fs.existsSync(d)
);
const PUBLIC_DIR = path.join(ROOT, "public");

if (!APP_DIR) {
  // Without a route table every link would "fail", which is noise, not a
  // finding. Say so and pass rather than crying wolf.
  console.log("link check: no app directory found (src/app or app) — skipping.");
  process.exit(0);
}
const PAGE_FILES = ["page.tsx", "page.jsx", "page.ts", "page.js", "route.ts", "route.js"];

/**
 * Next's special metadata files serve a URL that does not match their
 * filename, so walking for page/route files alone misses them — and then any
 * link to /sitemap.xml gets reported as dead.
 */
const SPECIAL_FILES = {
  "sitemap.ts": "/sitemap.xml",
  "sitemap.js": "/sitemap.xml",
  "robots.ts": "/robots.txt",
  "robots.js": "/robots.txt",
  "manifest.ts": "/manifest.webmanifest",
  "manifest.js": "/manifest.webmanifest",
};

/** Placeholder for an optional catch-all, expanded after the segments join. */
const OPTIONAL_CATCH_ALL = "__OPTIONAL_CATCH_ALL__";

const errors = [];
const warnings = [];

// ── 1. Route table from the filesystem ──────────────────────────────────────
const staticRoutes = new Set();
/** @type {{regex: RegExp, prefix: string, catchAll: boolean}[]} */
const dynamicRoutes = [];

function walkApp(dir, segments) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const e of entries) {
    if (e.isFile() && SPECIAL_FILES[e.name]) {
      const prefix = segments.filter(Boolean).join("/");
      staticRoutes.add((prefix ? `/${prefix}` : "") + SPECIAL_FILES[e.name]);
    }
  }

  if (entries.some((e) => e.isFile() && PAGE_FILES.includes(e.name))) {
    const route = "/" + segments.filter(Boolean).join("/");
    if (segments.some((s) => s.startsWith("["))) {
      const prefix =
        "/" + segments.slice(0, segments.findIndex((s) => s.startsWith("["))).join("/");
      const pattern = segments
        .map((s) =>
          // An optional catch-all matches the parent path too (/docs as well
          // as /docs/a/b), so its leading slash has to be optional — treating
          // it like a required catch-all wrongly rejects /docs.
          s.startsWith("[[...")
            ? OPTIONAL_CATCH_ALL
            : s.startsWith("[...")
              ? ".+"
              : s.startsWith("[")
                ? "[^/]+"
                : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        )
        .join("/")
        .split(`/${OPTIONAL_CATCH_ALL}`)
        .join("(?:/.+)?")
        .split(OPTIONAL_CATCH_ALL)
        .join("(?:.+)?");
      dynamicRoutes.push({
        regex: new RegExp(`^/${pattern}$`),
        prefix: prefix === "/" ? "/" : prefix,
        catchAll: segments.some((s) => s.includes("...")),
      });
    } else {
      staticRoutes.add(route === "" ? "/" : route);
    }
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    // Folder conventions that contribute no URL segment: route groups
    // (group), intercepting routes (.)foo, parallel routes @slot, and
    // private _folders. Treating any of them as a path segment invents
    // routes that do not exist and hides the real ones.
    if (e.name.startsWith("_")) continue;
    const transparent =
      (e.name.startsWith("(") && e.name.endsWith(")")) || e.name.startsWith("@");
    walkApp(path.join(dir, e.name), transparent ? segments : [...segments, e.name]);
  }
}
walkApp(APP_DIR, []);

// Routes that exist as files rather than directories (sitemap.ts, robots.ts,
// and any `foo.txt/route.ts` style handler) are already picked up above.

// ── 2. Published slugs per content route ────────────────────────────────────
/** route prefix → Set of published slugs */
const publishedSlugs = new Map();
for (const [, rules] of Object.entries(config.content ?? {})) {
  const dir = path.join(ROOT, rules.dir);
  if (!fs.existsSync(dir)) continue;
  const slugs = new Set();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".md") && !f.endsWith(".json")) continue;
    const slug = f.replace(/\.(md|json)$/, "");
    if (f.endsWith(".md")) {
      const { data } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      if (data.draft === true) continue;
    }
    slugs.add(slug);
  }
  publishedSlugs.set(rules.route, slugs);
}

// A content directory the config does not describe still backs real URLs, so
// infer it rather than reporting false failures: <content>/<name>/<slug>.*
const CONTENT_ROOT = [path.join(ROOT, "src/content"), path.join(ROOT, "content")].find(
  (d) => fs.existsSync(d)
) ?? path.join(ROOT, "src/content");
if (fs.existsSync(CONTENT_ROOT)) {
  for (const e of fs.readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const route = `/${e.name}`;
    if (publishedSlugs.has(route)) continue;
    const slugs = new Set(
      fs
        .readdirSync(path.join(CONTENT_ROOT, e.name))
        .filter((f) => /\.(md|json)$/.test(f))
        .map((f) => f.replace(/\.(md|json)$/, ""))
    );
    if (slugs.size) publishedSlugs.set(route, slugs);
  }
}

// ── 3. Collect links ────────────────────────────────────────────────────────
/** @type {{href: string, source: string}[]} */
const links = [];

function collectFrom(file, text) {
  // markdown links and images: ](/path)
  for (const m of text.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    links.push({ href: m[1], source: file });
  }
  // JSX / JSON / TS hrefs and srcs: href="/path", href='/path', "href": "/path".
  // Both quote styles matter — Prettier normalises JSX to double quotes, but
  // object literals in .ts data files are commonly single-quoted, and matching
  // one style means silently skipping half the codebase.
  // Case-insensitive so prop and variable names carry too: `privacyHref =
  // "/privacy-policy"` is a real link that a case-sensitive match walks past,
  // which is exactly how a dead link reached this project's own example.
  for (const m of text.matchAll(/(?:href|src)["']?\s*[:=]\s*(["'])(\/[^"']*)\1/gi)) {
    links.push({ href: m[2], source: file });
  }
}

function walkFiles(dir, exts, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walkFiles(fp, exts, onFile);
    } else if (exts.some((x) => e.name.endsWith(x))) {
      onFile(fp);
    }
  }
}

// .ts is in here on purpose: src/content commonly holds hand-written data
// modules (catalogs, related-item lists, nav definitions) whose hrefs are as
// real as any link in an article. Skipping them is how a listing that points
// at a page which no longer resolves goes unnoticed.
walkFiles(CONTENT_ROOT, [".md", ".json", ".ts"], (fp) => {
  const raw = fs.readFileSync(fp, "utf8");
  const rel = path.relative(ROOT, fp);
  if (fp.endsWith(".md")) {
    const { data, content } = matter(raw);
    if (data.draft === true) return;
    collectFrom(rel, content);
    // frontmatter can carry links too (faq answers, link lists, covers)
    collectFrom(rel, JSON.stringify(data));
  } else {
    collectFrom(rel, raw);
  }
});

// Components and pages: nav, footer, and CTA links live here, and they are the
// links a visitor actually clicks — worth checking as much as the content.
const SOURCE_DIRS = [path.join(ROOT, "src"), APP_DIR, path.join(ROOT, "components")].filter(
  (d, i, all) => d && fs.existsSync(d) && all.indexOf(d) === i
);
const scanned = new Set();
for (const d of SOURCE_DIRS) {
  walkFiles(d, [".tsx", ".ts"], (fp) => {
    if (scanned.has(fp)) return;
    scanned.add(fp);
    collectFrom(path.relative(ROOT, fp), fs.readFileSync(fp, "utf8"));
  });
}

// ── 4. Resolve ──────────────────────────────────────────────────────────────
const assetPrefixes = config.links?.publicDirs ?? ["/images", "/og", "/icons", "/fonts"];
const allowUnresolved = config.links?.allowUnresolved ?? [];
const seen = new Set();

for (const { href, source } of links) {
  const clean = href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  const key = `${source}::${clean}`;
  if (seen.has(key)) continue;
  seen.add(key);

  if (clean.startsWith("//")) continue; // protocol-relative external
  if (allowUnresolved.some((p) => clean === p || clean.startsWith(p + "/"))) continue;

  // Static asset under /public
  if (assetPrefixes.some((p) => clean.startsWith(p + "/")) || /\.[a-z0-9]{2,5}$/i.test(clean)) {
    if (fs.existsSync(path.join(PUBLIC_DIR, clean))) continue;
    // could still be a real route ending in an extension (e.g. /llms.txt)
    if (staticRoutes.has(clean)) continue;
    errors.push(`${source} → ${href} (file not found in /public)`);
    continue;
  }

  if (staticRoutes.has(clean)) continue;

  const dyn = dynamicRoutes.find((d) => d.regex.test(clean));
  if (dyn) {
    const prefix = clean.slice(0, clean.lastIndexOf("/")) || "/";
    const slug = clean.slice(clean.lastIndexOf("/") + 1);
    const known = publishedSlugs.get(prefix);
    if (!known) {
      warnings.push(`${source} → ${href} (matches a dynamic route; no content directory to verify the slug against)`);
      continue;
    }
    if (!known.has(slug)) {
      errors.push(`${source} → ${href} (no published file for this slug — deleted, renamed, or still a draft)`);
    }
    continue;
  }

  errors.push(`${source} → ${href} (no route matches this path)`);
}

// ── 5. Report ───────────────────────────────────────────────────────────────
if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} link(s) could not be verified`);
  warnings.forEach((w) => console.log(`     warn:  ${w}`));
}
if (errors.length) {
  console.log(`\n❌ ${errors.length} broken internal link(s)`);
  errors.forEach((e) => console.log(`     ERROR: ${e}`));
  console.error(`\n✖ Link check FAILED — fix the ${errors.length} broken link(s) above. Deploy blocked.\n`);
  process.exit(1);
}
console.log(
  `✓ Link check passed (${seen.size} internal link(s), ${staticRoutes.size} static + ${dynamicRoutes.length} dynamic route(s)).\n`
);
