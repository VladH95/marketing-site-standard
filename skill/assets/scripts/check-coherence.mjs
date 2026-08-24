#!/usr/bin/env node
/**
 * Coherence gate — does this project agree with itself?
 *
 * Every other gate here checks DATA against a RULE: is this article complete,
 * does this link resolve, is this config filled in. None of them check the
 * machine itself, and that turned out to be where the failures were.
 *
 * A developer reviewing this standard found, in one pass: a config field the
 * gate validated that nothing read, a README promising a script the project did
 * not have, and two documents describing a check that had since changed its
 * behaviour. Not one is a bug inside a function. All three are two parts of the
 * system disagreeing — which no amount of validating content will ever surface,
 * because each part is individually correct.
 *
 * So this gate checks the seams:
 *
 *   1. A config section the config gate validates must be read by something
 *      else. Otherwise the gate enforces values nobody consumes — the shape of
 *      the Keystatic bug, where `editor.repo` was checked and then ignored in
 *      favour of a hardcoded string.
 *   2. Every `npm run X` a document mentions must exist in package.json.
 *   3. Every script package.json points at must exist on disk.
 *   4. site.config.mjs and site.config.d.mts must describe the same shape.
 *
 * What it deliberately cannot check: whether a page looks right. Nothing
 * automated here noticed that article bodies rendered as unformatted text,
 * because the page returned 200 with the text present and every rule passed.
 * That one needs eyes — see the launch checklist in references/quality-gates.md.
 *
 * Usage: node scripts/check-coherence.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];
const warnings = [];

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const pkg = JSON.parse(read("package.json"));
const scripts = pkg.scripts ?? {};

/** Every source file worth searching, excluding build output and deps. */
function sourceFiles(dir = ROOT, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isSymbolicLink()) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if ([".git", "node_modules", ".next", "out"].includes(e.name)) continue;
      sourceFiles(fp, out);
    } else if (/\.(ts|tsx|mjs|js|jsx|mts)$/.test(e.name)) {
      out.push(fp);
    }
  }
  return out;
}
const SOURCES = sourceFiles();

// ── 1. config sections that are validated but never read ───────────────────
//
// Deliberately checked at SECTION level, not per field. Two false-positive
// classes killed the per-field version: a reader that destructures
// (`const org = siteConfig.organization` then `org.logo`) never mentions the
// leaf, and an optional feature that is switched off legitimately has no
// consumer installed at all. Both would have produced noise, and a gate that
// cries wolf gets switched off.
//
// Section level still catches the failure that actually happened: a whole
// config block validated by the gate and consumed by nobody.
const CONFIG_GATE = "scripts/check-config.mjs";
if (exists(CONFIG_GATE)) {
  const gateSrc = read(CONFIG_GATE);
  const config = (await import(`file://${path.join(ROOT, "site.config.mjs")}`)).default ?? {};

  const validated = new Set(
    [...gateSrc.matchAll(/\bconfig\.([a-zA-Z]+)\??\./g)].map((m) => m[1])
  );

  const bodies = SOURCES.filter((f) => !f.endsWith("check-config.mjs")).map((f) =>
    fs.readFileSync(f, "utf8")
  );

  for (const section of validated) {
    // A feature that is off has no installed consumer by design.
    const block = config[section];
    if (block && typeof block === "object" && block.enabled === false) continue;

    const re = new RegExp(`\\.${section}\\b`);
    if (!bodies.some((body) => re.test(body))) {
      errors.push(
        `site.config.mjs → the "${section}" section is validated by the config gate but read nowhere else. Either wire it up or stop checking it: a gate that enforces values nobody consumes is worse than no gate, because it looks like coverage.`
      );
    }
  }
}

// ── 2. commands documents promise must exist ────────────────────────────────
const DOCS = [
  "README.md",
  "AGENTS.md",
  ...(exists("docs")
    ? fs.readdirSync(path.join(ROOT, "docs")).filter((f) => f.endsWith(".md")).map((f) => `docs/${f}`)
    : []),
].filter(exists);

for (const doc of DOCS) {
  const body = read(doc);
  const mentioned = new Set(
    [...body.matchAll(/`?npm run ([a-z][a-z0-9:-]*)`?/g)].map((m) => m[1])
  );
  for (const name of mentioned) {
    if (!scripts[name]) {
      errors.push(
        `${doc} tells the reader to run "npm run ${name}", which is not in package.json. Documentation that names a command it does not have is how someone concludes the whole setup is broken.`
      );
    }
  }
}

// ── 3. scripts package.json points at must exist ────────────────────────────
for (const [name, cmd] of Object.entries(scripts)) {
  for (const m of String(cmd).matchAll(/node\s+(scripts\/[\w.-]+\.mjs)/g)) {
    if (!exists(m[1])) {
      errors.push(`package.json "${name}" runs ${m[1]}, which does not exist.`);
    }
  }
}

// ── 4. the config and its type declaration must agree ───────────────────────
if (exists("site.config.mjs") && exists("site.config.d.mts")) {
  const config = (await import(`file://${path.join(ROOT, "site.config.mjs")}`)).default ?? {};
  const dts = read("site.config.d.mts");

  // Top-level keys declared on the interface.
  const iface = dts.slice(dts.indexOf("export interface SiteConfig"));
  const declared = new Set(
    [...iface.matchAll(/^\s{2}([a-zA-Z]+)\??:/gm)].map((m) => m[1])
  );

  for (const key of Object.keys(config)) {
    if (!declared.has(key)) {
      errors.push(
        `site.config.mjs has "${key}" but site.config.d.mts does not declare it. The declaration is what every TypeScript consumer is typed against, so an undeclared field is invisible to them.`
      );
    }
  }
  for (const key of declared) {
    if (!(key in config)) {
      warnings.push(
        `site.config.d.mts declares "${key}", which this project's config omits. Fine if the field is optional and unused here.`
      );
    }
  }
}

// ── report ──────────────────────────────────────────────────────────────────
if (warnings.length) {
  console.log("\n⚠️  coherence");
  warnings.forEach((w) => console.log(`     warn:  ${w}`));
}
if (errors.length) {
  console.log("\n❌ the project disagrees with itself");
  errors.forEach((e) => console.log(`     ERROR: ${e}`));
  console.error(`\n✖ Coherence gate FAILED — ${errors.length} inconsistency(ies). Deploy blocked.\n`);
  process.exit(1);
}
console.log("✓ Coherence gate passed (config, docs and scripts agree).\n");
