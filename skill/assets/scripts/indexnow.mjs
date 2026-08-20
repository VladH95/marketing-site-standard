#!/usr/bin/env node
/**
 * IndexNow submitter — tells Bing and Yandex (one shared network) to crawl a
 * URL now instead of waiting for their bot to rediscover it. Typically minutes
 * instead of days for a new article. Google does not participate; for Google
 * the sitemap plus internal links is the mechanism.
 *
 * The key is public by design: IndexNow verifies ownership by fetching
 * https://<host>/<key>.txt. So the key belongs in site.config.mjs and in
 * public/<key>.txt — it is not a secret, and treating it as one just makes the
 * setup harder to hand over.
 *
 * Usage:
 *   node scripts/indexnow.mjs --all                submit every URL in the live sitemap
 *   node scripts/indexnow.mjs --changed <baseSha>  submit content changed since <baseSha> (CI)
 *   node scripts/indexnow.mjs <url> [url...]       submit specific absolute URLs
 *
 * No dependencies — plain Node 18+ (global fetch).
 */
import { execFileSync } from "node:child_process";
import config from "../site.config.mjs";

if (!config.indexnow?.enabled) {
  console.log("indexnow: disabled in site.config.mjs — nothing to do.");
  process.exit(0);
}

const KEY = config.indexnow.key;
if (!KEY || !/^[a-f0-9]{8,128}$/i.test(KEY)) {
  console.error(
    "indexnow: missing or malformed key in site.config.mjs.\n" +
      '  Generate one:  node -e "console.log(crypto.randomUUID().replace(/-/g,\'\'))"\n' +
      "  Then save the same value as public/<key>.txt (its contents are the key itself)."
  );
  process.exit(1);
}

const BASE = config.site.url.replace(/\/$/, "");
const HOST = new URL(BASE).host;
const KEY_LOCATION = `${BASE}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

/** Map a changed content file to its public URL, using the routes in the config. */
function fileToUrl(file) {
  for (const rules of Object.values(config.content ?? {})) {
    const dir = rules.dir.replace(/^\.\//, "");
    const m = file.match(new RegExp(`^${dir}/(.+)\\.(md|json)$`));
    if (m) return `${BASE}${rules.route}/${m[1]}`;
  }
  return null;
}

async function collectUrls() {
  const args = process.argv.slice(2);

  if (args[0] === "--all") {
    const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  }

  if (args[0] === "--changed") {
    const base = args[1];
    // A brand-new branch has an all-zero base sha and nothing to diff against.
    if (!base || /^0+$/.test(base)) {
      console.log("indexnow: no valid base sha (new branch?) — nothing to submit.");
      return [];
    }
    // Must look like a commit sha, and passed as an argument rather than
    // interpolated into a shell string. In CI this value comes from the
    // workflow, but the same flag is documented for manual use, and a string
    // spliced into a shell is a string that can carry shell syntax.
    if (!/^[0-9a-f]{7,40}$/i.test(base)) {
      console.error(`indexnow: "${base}" is not a commit sha.`);
      process.exit(1);
    }
    const diff = execFileSync("git", ["diff", "--name-only", base, "HEAD"], {
      encoding: "utf8",
    });
    return [
      ...new Set(
        diff.split("\n").map((f) => f.trim()).filter(Boolean).map(fileToUrl).filter(Boolean)
      ),
    ];
  }

  return args.filter((a) => a.startsWith("http"));
}

const urlList = await collectUrls();

if (urlList.length === 0) {
  console.log("indexnow: no URLs to submit.");
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
});

// 200 = accepted, 202 = accepted with key validation pending.
console.log(`indexnow: submitted ${urlList.length} URL(s) → HTTP ${res.status} ${res.statusText}`);
for (const u of urlList) console.log(`  • ${u}`);
if (res.status !== 200 && res.status !== 202) {
  console.error("indexnow: unexpected status —", await res.text());
  process.exit(1);
}
