#!/usr/bin/env node
/**
 * Point git at the repo's committed hooks directory.
 *
 * Runs from `npm run prepare`, which npm calls automatically after
 * `npm install` — so a fresh clone gets the pre-commit gate without anyone
 * remembering a setup step. That matters: a hook that has to be installed
 * manually is a hook that is not installed on the machine where it counts.
 *
 * Deliberately not husky. A committed .githooks directory plus one git config
 * line does the same job with no dependency, nothing to keep updated, and
 * nothing extra to explain when the repo changes hands.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

// CI checks out without hooks and runs the same commands directly; installing
// them there would only slow the job down.
if (process.env.CI) {
  console.log("hooks: CI detected — skipping.");
  process.exit(0);
}

try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
} catch {
  console.log("hooks: not a git repo — skipping.");
  process.exit(0);
}

if (!fs.existsSync(".githooks")) {
  console.log("hooks: .githooks/ not found — skipping.");
  process.exit(0);
}

for (const f of fs.readdirSync(".githooks")) {
  fs.chmodSync(`.githooks/${f}`, 0o755);
}
execSync("git config core.hooksPath .githooks");
console.log("✓ git hooks installed (core.hooksPath = .githooks)");
