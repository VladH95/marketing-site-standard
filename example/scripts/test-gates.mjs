#!/usr/bin/env node
/**
 * Negative tests for the gates.
 *
 * A green CI run proves the gates let good input through. It says nothing
 * about whether they would stop bad input — and a gate that silently stops
 * catching things is worse than no gate, because the green tick is read as
 * proof. Two independent reviews of this project found exactly that: checks
 * that passed content they should have rejected.
 *
 * So each case here breaks something on purpose in a scratch copy of the
 * project and asserts the relevant script exits non-zero with a recognisable
 * message. Nothing under test is mutated: everything runs in a temporary
 * directory that is removed afterwards.
 *
 * Usage: node scripts/test-gates.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const results = [];

/** Copy the project into a scratch dir, minus the heavy and generated parts. */
function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-test-"));
  for (const entry of fs.readdirSync(ROOT)) {
    if (["node_modules", ".next", ".git"].includes(entry)) continue;
    fs.cpSync(path.join(ROOT, entry), path.join(dir, entry), { recursive: true });
  }
  // node_modules is symlinked rather than copied: the scripts need gray-matter,
  // and copying a dependency tree per case would dominate the runtime.
  fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"));
  return dir;
}

/**
 * @param {string} name       what this proves
 * @param {string} script     script under test, relative to the project
 * @param {(dir: string) => void} break_  mutate the scratch copy
 * @param {string|RegExp} expect  text the failure must mention
 */
function check(name, script, break_, expect) {
  const dir = scratch();
  try {
    break_(dir);
    let code = 0;
    let output = "";
    try {
      output = execFileSync(process.execPath, [script], {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      code = err.status ?? 1;
      output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    }

    const matched =
      typeof expect === "string" ? output.includes(expect) : expect.test(output);

    if (code === 0) {
      results.push({ name, ok: false, why: "exited 0 — the gate did not catch it" });
    } else if (!matched) {
      results.push({ name, ok: false, why: `failed, but not about "${expect}"` });
    } else {
      results.push({ name, ok: true });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const write = (dir, rel, body) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), body);
};
const edit = (dir, rel, fn) => {
  const p = path.join(dir, rel);
  fs.writeFileSync(p, fn(fs.readFileSync(p, "utf8")));
};

const ARTICLE = (front) => `---\n${front}\n---\n## One\n## Two\nBody text here.\n`;

// ── config ──────────────────────────────────────────────────────────────────
check(
  "config: a placeholder domain fails",
  "scripts/check-config.mjs",
  (d) => edit(d, "site.config.mjs", (s) => s.replace(/url: "https:\/\/[^"]+"/, 'url: "https://www.example.com"')),
  "template default"
);

check(
  "config: prodHosts that omit the canonical host fails",
  "scripts/check-config.mjs",
  (d) => edit(d, "site.config.mjs", (s) => s.replace(/prodHosts: \[[^\]]*\]/, 'prodHosts: ["staging.internal"]')),
  "would serve X-Robots-Tag: noindex"
);

check(
  "config: analytics enabled without its CSP host fails",
  "scripts/check-config.mjs",
  (d) =>
    edit(d, "site.config.mjs", (s) =>
      s.replace(/provider: "none"/, 'provider: "ga4"').replace(/id: "",/, 'id: "G-TEST",')
    ),
  "CSP would block it"
);

// ── images ──────────────────────────────────────────────────────────────────
check(
  "images: a file whose header will not parse fails",
  "scripts/gen-image-dimensions.mjs",
  (d) => write(d, "public/images/corrupt.png", "not actually a png"),
  "could not be read"
);

// ── content ─────────────────────────────────────────────────────────────────
check(
  "content: a missing cover fails",
  "scripts/check-content.mjs",
  (d) =>
    write(
      d,
      "src/content/blog/no-cover.md",
      ARTICLE(`title: No cover\ndescription: A description comfortably inside the ideal length range for a meta description tag.\ndate: '2026-01-01'\nauthor: A\nfaq:\n  - question: Q1?\n    answer: A1\n  - question: Q2?\n    answer: A2\n  - question: Q3?\n    answer: A3`)
    ),
  'missing/empty frontmatter: "cover"'
);

check(
  "content: a cover pointing at a file that is not there fails",
  "scripts/check-content.mjs",
  (d) =>
    write(
      d,
      "src/content/blog/ghost-cover.md",
      ARTICLE(`title: Ghost cover\ndescription: A description comfortably inside the ideal length range for a meta description tag.\ndate: '2026-01-01'\nauthor: A\ncover: /images/blog/does-not-exist.png\nfaq:\n  - question: Q1?\n    answer: A1\n  - question: Q2?\n    answer: A2\n  - question: Q3?\n    answer: A3`)
    ),
  "not found in /public"
);

// ── links ───────────────────────────────────────────────────────────────────
check(
  "links: a link to a slug that does not exist fails",
  "scripts/check-links.mjs",
  (d) => write(d, "src/components/probe.tsx", `export const P = () => <a href="/blog/no-such-post">x</a>;`),
  "no published file for this slug"
);

check(
  "links: a single-quoted dead link fails",
  "scripts/check-links.mjs",
  (d) => write(d, "src/components/probe.tsx", `export const P = () => <a href='/nowhere-at-all'>x</a>;`),
  "no route matches"
);

check(
  "links: a link to a drafted post fails",
  "scripts/check-links.mjs",
  (d) => {
    write(d, "src/content/blog/hidden.md", ARTICLE("title: Hidden\ndraft: true"));
    write(d, "src/components/probe.tsx", `export const P = () => <a href="/blog/hidden">x</a>;`);
  },
  "no published file for this slug"
);

check(
  "links: an image missing from /public fails",
  "scripts/check-links.mjs",
  (d) => write(d, "src/components/probe.tsx", `export const P = () => <img src="/images/absent.png" alt="" />;`),
  "file not found in /public"
);

// ── the draft exemption, asserted positively ────────────────────────────────
{
  const dir = scratch();
  try {
    write(dir, "src/content/blog/wip.md", ARTICLE("title: WIP\ndraft: true"));
    execFileSync(process.execPath, ["scripts/check-content.mjs"], { cwd: dir, stdio: "ignore" });
    results.push({ name: "content: an incomplete draft does NOT block the build", ok: true });
  } catch {
    results.push({
      name: "content: an incomplete draft does NOT block the build",
      ok: false,
      why: "exited non-zero — drafts should be exempt",
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── report ──────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
console.log("");
for (const r of results) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? "" : `\n      ${r.why}`}`);
}
console.log(`\n— gate tests: ${results.length - failed.length}/${results.length} passed —`);

if (failed.length) {
  console.error(`\n✖ ${failed.length} gate(s) did not behave as documented.\n`);
  process.exit(1);
}
console.log("✓ Every gate rejects what it claims to reject.\n");
