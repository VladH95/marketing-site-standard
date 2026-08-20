#!/usr/bin/env node
/**
 * Config gate — runs FIRST in the build chain.
 *
 * Everything else in this standard trusts site.config.mjs: canonical URLs,
 * the sitemap, the noindex rule for previews, the CSP, structured data. If the
 * config still says example.com, all of that is confidently wrong and nothing
 * else notices, because every check downstream is internally consistent with
 * the wrong value. A site can build clean, deploy clean, and be publishing
 * canonical tags pointing at a domain nobody owns.
 *
 * That is the failure this exists to prevent: not a crash, a quiet lie.
 *
 * ERRORS block the deploy. WARNINGS are things that are probably wrong but
 * legitimately might not be.
 *
 * Usage: node scripts/check-config.mjs
 */
import fs from "node:fs";
import path from "node:path";
import config from "../site.config.mjs";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const errors = [];
const warnings = [];

const PLACEHOLDERS = ["CLIENT NAME", "example.com", "www.example.com", "YOUR ", "TODO"];
const looksUnfilled = (v) =>
  typeof v === "string" && PLACEHOLDERS.some((p) => v.includes(p));

const publicFileExists = (p) =>
  typeof p === "string" && p.startsWith("/") && fs.existsSync(path.join(PUBLIC_DIR, p));

// ── site identity ───────────────────────────────────────────────────────────
const site = config.site ?? {};

if (!site.name || looksUnfilled(site.name)) {
  errors.push(`site.name is still a placeholder ("${site.name ?? ""}")`);
}

if (!site.url) {
  errors.push("site.url is missing");
} else if (looksUnfilled(site.url)) {
  errors.push(`site.url is still the template default (${site.url})`);
} else {
  try {
    const u = new URL(site.url);
    if (u.protocol !== "https:") errors.push(`site.url must be https (${site.url})`);
    if (site.url.endsWith("/")) errors.push("site.url must not end with a slash");
    // Canonicals derive from site.url while the noindex rule derives from
    // prodHosts. If they disagree, production quietly noindexes itself.
    const hosts = (site.prodHosts ?? []).map((h) => h.toLowerCase());
    if (!hosts.length) {
      errors.push("site.prodHosts is empty — every host would be treated as a preview and noindexed");
    } else if (!hosts.includes(u.host.toLowerCase())) {
      errors.push(
        `site.prodHosts does not include the canonical host "${u.host}" — production would serve X-Robots-Tag: noindex`
      );
    }
  } catch {
    errors.push(`site.url is not a valid URL (${site.url})`);
  }
}

if (site.defaultOgImage && !publicFileExists(site.defaultOgImage)) {
  errors.push(`site.defaultOgImage not found in /public: ${site.defaultOgImage}`);
}
if (!site.defaultOgImage) {
  warnings.push("no site.defaultOgImage — pages without their own image share with no preview");
}

if (config.organization?.logo && !publicFileExists(config.organization.logo)) {
  errors.push(`organization.logo not found in /public: ${config.organization.logo}`);
}

// ── analytics ───────────────────────────────────────────────────────────────
const analytics = config.analytics ?? {};
if (analytics.provider && analytics.provider !== "none") {
  if (!analytics.id) {
    errors.push(`analytics.provider is "${analytics.provider}" but analytics.id is empty`);
  }
  // A tracker whose host is missing from the CSP is blocked in production and
  // nowhere else — it works locally, then silently records nothing.
  const allow = config.security?.cspAllow ?? {};
  const allHosts = [...(allow.script ?? []), ...(allow.connect ?? [])].join(" ");
  const needle = analytics.provider === "ga4" ? "googletagmanager" : "plausible";
  if (!allHosts.includes(needle)) {
    errors.push(
      `analytics.provider is "${analytics.provider}" but no ${needle} host is in security.cspAllow — the CSP would block it in production`
    );
  }
}

// ── indexnow ────────────────────────────────────────────────────────────────
if (config.indexnow?.enabled) {
  const key = config.indexnow.key ?? "";
  if (!/^[a-f0-9]{8,128}$/i.test(key)) {
    errors.push("indexnow.enabled is true but indexnow.key is missing or malformed");
  } else {
    const keyFile = path.join(PUBLIC_DIR, `${key}.txt`);
    if (!fs.existsSync(keyFile)) {
      errors.push(`indexnow key file missing: public/${key}.txt (submissions are rejected without it)`);
    } else if (fs.readFileSync(keyFile, "utf8").trim() !== key) {
      errors.push(`public/${key}.txt does not contain the key itself`);
    }
  }
}

// ── editor ──────────────────────────────────────────────────────────────────
if (config.editor?.enabled) {
  const repo = config.editor.repo ?? {};
  if (!repo.owner || !repo.name) {
    errors.push("editor.enabled is true but editor.repo.owner/name are not set — the editor cannot commit anywhere");
  }
  const hasConfig = fs.existsSync(path.join(ROOT, "keystatic.config.ts"));
  if (!hasConfig) {
    errors.push("editor.enabled is true but keystatic.config.ts is missing — re-run the scaffold installer");
  }
}

// ── content collections ─────────────────────────────────────────────────────
for (const [name, rules] of Object.entries(config.content ?? {})) {
  if (!rules.dir || !rules.route) {
    errors.push(`content.${name} needs both "dir" and "route"`);
    continue;
  }
  if (!rules.route.startsWith("/")) {
    errors.push(`content.${name}.route must start with a slash (${rules.route})`);
  }
  // A declared collection whose directory is absent means the gate silently
  // checks nothing — the exact shape of a rule that looks enforced and isn't.
  if (!fs.existsSync(path.join(ROOT, rules.dir))) {
    errors.push(`content.${name}.dir does not exist: ${rules.dir}`);
  }
}

// ── markdown twins ──────────────────────────────────────────────────────────
if (config.agents?.markdownTwins) {
  const handler = [
    "src/app/md/[collection]/[slug]/route.ts",
    "app/md/[collection]/[slug]/route.ts",
  ].some((p) => fs.existsSync(path.join(ROOT, p)));
  if (!handler) {
    errors.push(
      "agents.markdownTwins is on but the /md route handler is missing — every agent redirect would 404. Re-run the scaffold installer."
    );
  }
  for (const s of config.agents.twinSections ?? []) {
    if (!config.content?.[s]) {
      errors.push(`agents.twinSections lists "${s}", which is not a declared content collection`);
    }
  }
}

// ── report ──────────────────────────────────────────────────────────────────
if (warnings.length) {
  console.log(`\n⚠️  config`);
  warnings.forEach((w) => console.log(`     warn:  ${w}`));
}
if (errors.length) {
  console.log(`\n❌ site.config.mjs`);
  errors.forEach((e) => console.log(`     ERROR: ${e}`));
  console.error(`\n✖ Config gate FAILED — fix the ${errors.length} error(s) above. Deploy blocked.\n`);
  process.exit(1);
}
console.log("✓ Config gate passed.\n");
