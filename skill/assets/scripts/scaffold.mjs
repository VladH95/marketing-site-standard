#!/usr/bin/env node
/**
 * Installs the marketing-site-build standard into a project.
 *
 * Copies the gates, the SEO surfaces, the content loader, the security config
 * and the templates. Existing files are never overwritten — it reports them as
 * skipped so you can diff and merge by hand. That matters most on an existing
 * site, where the whole point is to add the standard without silently
 * replacing work that is already there.
 *
 * Usage, from the target project root:
 *   node <skill-path>/assets/scripts/scaffold.mjs [--force] [--dry-run]
 *
 *   --force     overwrite existing files (diff first; there is no undo)
 *   --dry-run   print what would happen and change nothing
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(HERE, "..");
const TARGET = process.cwd();
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

// Refuse to scaffold a directory that is not a project. This runs from
// whatever the shell's working directory happens to be, and writing nineteen
// files into the wrong repo is both easy to do and annoying to unpick — the
// files land as untracked noise in something unrelated. Cheap to check, so
// check.
const pkgPath = path.join(TARGET, "package.json");
if (!fs.existsSync(pkgPath)) {
  console.error(
    `✖ No package.json in ${TARGET}\n\n` +
      "  Run this from the root of the project you want to scaffold.\n" +
      "  For a brand-new project, create the Next.js app first, then run this.\n"
  );
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

// A package.json alone is not enough — every asset here assumes Next's App
// Router. Landing this in a plain Node package writes twenty files that can
// never run, in a repo where they are pure confusion.
if (!deps.next) {
  console.error(
    `✖ ${path.basename(TARGET)} has a package.json but no Next.js dependency.\n\n` +
      "  This standard is Next.js App Router only. Nothing here will run in\n" +
      "  another framework, so it refuses rather than leaving you files to\n" +
      "  delete.\n"
  );
  process.exit(1);
}

// The content loader and both gates parse frontmatter. Without this the
// advertised build cannot even start, and the error it produces points at a
// scaffolded file rather than at the missing package.
const REQUIRED_DEPS = ["gray-matter", "react-markdown", "remark-gfm"];

// The consent banner and layout primitives are styled with Tailwind utility
// classes. Without Tailwind they still work and still gate correctly, they
// just render unstyled — worth saying out loud rather than letting someone
// discover it as a "broken" banner.
const hasTailwind = Boolean(deps.tailwindcss || deps["@tailwindcss/postcss"]);
const missingDeps = REQUIRED_DEPS.filter((d) => !deps[d]);
const EDITOR_DEPS = ["@keystatic/core", "@keystatic/next"];

/** [source relative to assets/, destination relative to project root] */
const FILES = [
  // config — the only file the project edits
  ["site.config.mjs", "site.config.mjs"],
  ["site.config.d.mts", "site.config.d.mts"],

  // gates
  ["scripts/check-config.mjs", "scripts/check-config.mjs"],
  ["scripts/check-content.mjs", "scripts/check-content.mjs"],
  ["scripts/check-links.mjs", "scripts/check-links.mjs"],
  ["scripts/gen-image-dimensions.mjs", "scripts/gen-image-dimensions.mjs"],
  ["scripts/test-gates.mjs", "scripts/test-gates.mjs"],
  ["scripts/doctor.mjs", "scripts/doctor.mjs"],
  ["scripts/install-hooks.mjs", "scripts/install-hooks.mjs"],
  ["githooks/pre-commit", ".githooks/pre-commit"],
  ["workflows/ci.yml", ".github/workflows/ci.yml"],
  ["dependabot.yml", ".github/dependabot.yml"],

  // architecture — content loader and the generated SEO surfaces
  ["scaffold/src/lib/content.ts", "src/lib/content.ts"],
  ["scaffold/src/lib/routes.ts", "src/lib/routes.ts"],
  ["scaffold/src/lib/jsonld.tsx", "src/lib/jsonld.tsx"],
  ["scaffold/src/lib/metadata.ts", "src/lib/metadata.ts"],
  ["scaffold/src/app/sitemap.ts", "src/app/sitemap.ts"],
  ["scaffold/src/app/robots.ts", "src/app/robots.ts"],
  ["scaffold/src/app/rss.xml/route.ts", "src/app/rss.xml/route.ts"],
  ["scaffold/src/app/llms.txt/route.ts", "src/app/llms.txt/route.ts"],

  // consent gate + analytics loader (the rule "nothing loads before consent"
  // is fixed; which tracker runs comes from the config)
  ["scaffold/src/components/markdown.tsx", "src/components/markdown.tsx"],
  ["scaffold/src/components/consent.tsx", "src/components/consent.tsx"],
  ["scaffold/src/components/analytics.tsx", "src/components/analytics.tsx"],

  // layout primitives
  ["scaffold/src/components/ui/section.tsx", "src/components/ui/section.tsx"],
  ["scaffold/src/components/ui/container.tsx", "src/components/ui/container.tsx"],

  // docs
  ["templates/AGENTS.md", "AGENTS.md"],
];

/** Copied only when the project opted in via site.config.mjs. */
const OPTIONAL = [
  { label: "indexnow.enabled", when: (c) => c.indexnow?.enabled, files: [
    ["scripts/indexnow.mjs", "scripts/indexnow.mjs"],
    ["workflows/indexnow.yml", ".github/workflows/indexnow.yml"],
  ]},
  { label: "agents.markdownTwins", when: (c) => c.agents?.markdownTwins, files: [
    ["scaffold/src/lib/markdown.ts", "src/lib/markdown.ts"],
    ["scaffold/src/app/md/[collection]/[slug]/route.ts", "src/app/md/[collection]/[slug]/route.ts"],
  ]},
  { label: "editor.enabled (Keystatic)", when: (c) => c.editor?.enabled, files: [
    ["scaffold/keystatic.config.ts", "keystatic.config.ts"],
    ["scaffold/src/app/keystatic/keystatic.tsx", "src/app/keystatic/keystatic.tsx"],
    ["scaffold/src/app/keystatic/layout.tsx", "src/app/keystatic/layout.tsx"],
    ["scaffold/src/app/keystatic/[[...params]]/page.tsx", "src/app/keystatic/[[...params]]/page.tsx"],
    ["scaffold/src/app/api/keystatic/[...params]/route.ts", "src/app/api/keystatic/[...params]/route.ts"],
  ]},
  { label: "content collections", when: (c) => Object.keys(c.content ?? {}).length > 0, files: [
    ["templates/content-playbook.md", "docs/content-playbook.md"],
  ]},
];

const created = [];
const skipped = [];

function copy(from, to) {
  const src = path.join(ASSETS, from);
  const dest = path.join(TARGET, to);
  if (!fs.existsSync(src)) {
    console.error(`  ! missing asset: ${from}`);
    return;
  }
  if (fs.existsSync(dest) && !force) {
    skipped.push(to);
    return;
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    if (to.startsWith(".githooks/")) fs.chmodSync(dest, 0o755);
  }
  created.push(to);
}

// Read the project's config BEFORE copying anything, so a dry run and a real
// run see exactly the same inputs. Reading it afterwards meant a real run
// evaluated the freshly-copied template while a dry run evaluated nothing, and
// the two reported different file counts.
let projectConfig = {};
const configPath = path.join(TARGET, "site.config.mjs");
const hadConfig = fs.existsSync(configPath);
if (hadConfig) {
  try {
    projectConfig = (await import(`file://${configPath}`)).default ?? {};
  } catch (err) {
    console.error(`  ! could not read site.config.mjs — optional pieces skipped (${err.message})`);
  }
} else {
  // First run: fall back to the template's own defaults, which is what the
  // project is about to receive.
  try {
    projectConfig = (await import(`file://${path.join(ASSETS, "site.config.mjs")}`)).default ?? {};
  } catch {
    /* defaults are fine */
  }
}

for (const [from, to] of FILES) copy(from, to);

const deferred = [];
for (const group of OPTIONAL) {
  if (group.when(projectConfig)) {
    for (const [from, to] of group.files) copy(from, to);
    if (group.label.startsWith("editor")) {
      for (const d of EDITOR_DEPS) if (!deps[d]) missingDeps.push(d);
    }
  } else {
    deferred.push(group.label);
  }
}

console.log(`\n${dryRun ? "[dry run] " : ""}marketing-site-build scaffold`);
console.log(`\n  ${created.length} file(s) ${dryRun ? "would be written" : "written"}:`);
created.forEach((f) => console.log(`    + ${f}`));
if (skipped.length) {
  console.log(`\n  ${skipped.length} left untouched (already exist — diff and merge by hand):`);
  skipped.forEach((f) => console.log(`    · ${f}`));
}
if (deferred.length) {
  console.log(
    `\n  Not installed, because it is switched off in site.config.mjs:\n` +
      deferred.map((l) => `    · ${l}`).join("\n") +
      `\n\n  Turning any of these on later means re-running this installer —\n` +
      `  the flag alone does nothing without the files it depends on.`
  );
}

if (!hasTailwind) {
  console.log(
    `\n  Note: no Tailwind detected. The shipped components use utility classes,\n` +
      `  so the consent banner and layout primitives will render unstyled until\n` +
      `  you either add Tailwind or restyle them. Nothing else is affected.`
  );
}

if (missingDeps.length) {
  console.log(
    `\n  ⚠️  Missing dependency — the build cannot run until you install it:\n\n` +
      `      npm install ${missingDeps.join(" ")}\n`
  );
}

console.log(`
Next, in order:

  ${missingDeps.length ? `0. npm install ${missingDeps.join(" ")}\n  ` : ""}1. Fill in site.config.mjs. Domain, blocked countries, analytics and the
     content collections are project decisions — ask, do not guess.
  2. Merge assets/templates/package-scripts.json into package.json.
  3. Merge assets/security-headers.ts into next.config.ts, and copy
     assets/proxy.ts to src/proxy.ts (src/middleware.ts before Next 16).
  4. npm install     — also installs the pre-commit hook
  5. npm run build   — nothing is verified until this passes
  6. Protect main on GitHub and mark the \`verify\` check required, or CI
     reports without blocking anything.
`);
