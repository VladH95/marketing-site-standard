#!/usr/bin/env node
/**
 * Drift check: how far has this project's copy of the standard fallen behind?
 *
 * The standard is installed by copying files, which means the moment a project
 * is scaffolded it starts diverging — the skill gains a fix, the project never
 * hears about it. That is the honest cost of copying rather than depending on
 * a package, and it is fine as long as the divergence is *visible*. Silent
 * drift is how a project ends up running a link checker with a bug that was
 * fixed months ago.
 *
 * Compares the framework files against the skill they came from and reports
 * three states:
 *
 *   up to date     identical
 *   behind         the skill changed; you are missing the fix
 *   locally edited both changed, or only yours did — someone forked the
 *                  framework in place, which the standard asks you not to do
 *
 * Never writes anything. Copying the newer file over is a decision, not a
 * side effect, and a locally edited file may be a deliberate divergence you
 * would lose.
 *
 * Usage:
 *   node scripts/doctor.mjs                      # finds the skill in ~/.claude/skills
 *   node scripts/doctor.mjs --skill <path>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const skillArg = args.indexOf("--skill");
const SKILL =
  skillArg !== -1
    ? path.resolve(args[skillArg + 1])
    : path.join(os.homedir(), ".claude/skills/marketing-site-build");

if (!fs.existsSync(path.join(SKILL, "SKILL.md"))) {
  console.error(
    `✖ No skill found at ${SKILL}\n\n  Pass --skill <path> if it lives somewhere else.\n`
  );
  process.exit(1);
}

/** [file in the project, its source inside the skill's assets] */
const TRACKED = [
  ["scripts/check-config.mjs", "assets/scripts/check-config.mjs"],
  ["scripts/check-content.mjs", "assets/scripts/check-content.mjs"],
  ["scripts/check-links.mjs", "assets/scripts/check-links.mjs"],
  ["scripts/gen-image-dimensions.mjs", "assets/scripts/gen-image-dimensions.mjs"],
  ["scripts/install-hooks.mjs", "assets/scripts/install-hooks.mjs"],
  ["scripts/test-gates.mjs", "assets/scripts/test-gates.mjs"],
  ["scripts/indexnow.mjs", "assets/scripts/indexnow.mjs"],
  [".githooks/pre-commit", "assets/githooks/pre-commit"],
  [".github/workflows/ci.yml", "assets/workflows/ci.yml"],
  ["site.config.d.mts", "assets/site.config.d.mts"],
  ["src/lib/content.ts", "assets/scaffold/src/lib/content.ts"],
  ["src/lib/routes.ts", "assets/scaffold/src/lib/routes.ts"],
  ["src/lib/jsonld.tsx", "assets/scaffold/src/lib/jsonld.tsx"],
  ["src/lib/metadata.ts", "assets/scaffold/src/lib/metadata.ts"],
  ["src/lib/markdown.ts", "assets/scaffold/src/lib/markdown.ts"],
  ["src/app/sitemap.ts", "assets/scaffold/src/app/sitemap.ts"],
  ["src/app/robots.ts", "assets/scaffold/src/app/robots.ts"],
  ["src/app/rss.xml/route.ts", "assets/scaffold/src/app/rss.xml/route.ts"],
  ["src/app/llms.txt/route.ts", "assets/scaffold/src/app/llms.txt/route.ts"],
  ["src/components/markdown.tsx", "assets/scaffold/src/components/markdown.tsx"],
  ["src/components/consent.tsx", "assets/scaffold/src/components/consent.tsx"],
  ["src/components/analytics.tsx", "assets/scaffold/src/components/analytics.tsx"],
];

// site.config.mjs is deliberately absent: it is meant to differ. So is
// next.config.ts and proxy.ts, which are merges rather than copies.

const hash = (p) =>
  crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 12);

const behind = [];
const missing = [];
let same = 0;

for (const [projectRel, skillRel] of TRACKED) {
  const mine = path.join(process.cwd(), projectRel);
  const theirs = path.join(SKILL, skillRel);
  if (!fs.existsSync(theirs)) continue; // optional piece, not shipped
  if (!fs.existsSync(mine)) {
    missing.push(projectRel);
    continue;
  }
  if (hash(mine) === hash(theirs)) same++;
  else behind.push(projectRel);
}

// Without a record of what was installed, "changed" cannot be split into
// "the skill moved" and "you edited it". Report the ambiguity rather than
// guessing, and say what resolves it.
const version = fs.existsSync(path.join(SKILL, "VERSION"))
  ? fs.readFileSync(path.join(SKILL, "VERSION"), "utf8").trim()
  : "unversioned";

console.log(`\nmarketing-site-build · skill version ${version}`);
console.log(`  source: ${SKILL}\n`);
console.log(`  ${same} file(s) identical`);

if (missing.length) {
  console.log(`\n  ${missing.length} not installed (optional, or an older scaffold):`);
  missing.forEach((f) => console.log(`    · ${f}`));
}

if (behind.length) {
  console.log(`\n  ${behind.length} differ from the skill:`);
  behind.forEach((f) => console.log(`    ~ ${f}`));
  console.log(
    `\n  Either the skill gained a fix you do not have, or the file was edited\n` +
      `  here. Diff before copying — a local edit is usually a config field that\n` +
      `  should have been added instead, and overwriting loses it:\n\n` +
      behind
        .slice(0, 3)
        .map((f) => {
          const src = TRACKED.find(([p]) => p === f)[1];
          return `      diff ${f} ${path.join(SKILL, src)}`;
        })
        .join("\n") +
      (behind.length > 3 ? `\n      … and ${behind.length - 3} more` : "")
  );
}

if (!behind.length && !missing.length) {
  console.log("\n✓ In step with the skill.\n");
} else {
  console.log("");
}
