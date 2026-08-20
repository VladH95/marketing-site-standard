// Edge middleware. Next.js 16 calls this file src/proxy.ts and expects an
// exported `proxy` function; on Next 15 and earlier the file is
// src/middleware.ts exporting `middleware`. Only the names differ.
//
// Three jobs, in order of how much damage each prevents:
//   1. noindex every host that is not the production domain
//   2. optional geo-block
//   3. optional markdown twins for AI agents
//
// Everything here reads site.config.mjs so the same file ships to every
// project unmodified.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import siteConfig from "../site.config.mjs";

// Explicit <string>: the config ships these as empty literals, which TypeScript
// infers as never[]. Without the annotation `new Set([])` becomes Set<never>
// and every .has(someString) below is a compile error on a fresh install.
const PROD_HOSTS = new Set<string>(
  (siteConfig.site.prodHosts ?? []).map((h: string) => h.toLowerCase())
);
const BLOCKED_COUNTRIES = new Set<string>(siteConfig.security?.blockedCountries ?? []);
const NOINDEX_ROUTES: string[] = siteConfig.seo?.noindexRoutes ?? [];

// ---------------------------------------------------------------------------
// AI-agent detection → markdown versions of content pages.
//
// This is an ALLOWLIST, and the reason it is an allowlist matters. Serving
// different content to a search crawler than to a human is cloaking, and
// Google penalises it. So a traditional search-engine token must never appear
// in the list below, and the SEARCH_BOT_UA guard runs first regardless: if a
// user-agent ever matches both lists, the crawler match wins and the request
// is left completely alone. That guard is the whole reason this feature is
// safe enough to ship at all — do not remove it to "simplify" the function.
//
// The *-searchbot user-agents are deliberately absent from this list and
// present in the guard below. OpenAI documents OAI-SearchBot as the crawler
// that discovers content for ChatGPT search, which makes it a search crawler
// however it is branded, and Anthropic's equivalent reads the same way. On a
// site we are responsible for, the asymmetry decides it: including them buys a
// marginally better-formatted answer, excluding them costs nothing, and being
// wrong in the first direction is an argument about cloaking on a client's
// domain. Fetch-on-behalf-of-a-user agents stay, because those are one person
// reading one page, not an index being built.
const AI_AGENT_UA = [
  // Anthropic
  "claudebot",
  "claude-user",
  "anthropic-ai",
  // OpenAI
  "gptbot",
  "chatgpt-user",
  // Perplexity
  "perplexitybot",
  "perplexity-user",
  // Mistral
  "mistralai-user",
];

// Anything here is left completely untouched, and this test runs first. The
// AI-search crawlers are included for the reason above: they build an index
// that produces links, so they are treated exactly like Google.
const SEARCH_BOT_UA =
  /googlebot|adsbot|apis-google|google-inspectiontool|bingbot|bingpreview|duckduckbot|baiduspider|yandex|applebot|slurp|oai-searchbot|claude-searchbot/;

const twinSections: string[] = siteConfig.agents?.markdownTwins
  ? (siteConfig.agents.twinSections ?? [])
  : [];
const HAS_MD_TWIN = twinSections.length
  ? new RegExp(`^/(${twinSections.join("|")})/[a-z0-9-]+$`)
  : null;

function isAiAgent(ua: string): boolean {
  return !SEARCH_BOT_UA.test(ua) && AI_AGENT_UA.some((t) => ua.includes(t));
}

export function proxy(req: NextRequest) {
  // ── geo-block ─────────────────────────────────────────────────────────────
  // Vercel sets the visitor's ISO-3166-1 alpha-2 code at the edge. Search
  // crawlers run from the US, so a block here does not affect indexing.
  if (BLOCKED_COUNTRIES.size) {
    const country = req.headers.get("x-vercel-ip-country");
    if (country && BLOCKED_COUNTRIES.has(country)) {
      return new NextResponse("This site is not available in your region.", {
        status: 451, // Unavailable For Legal Reasons
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-robots-tag": "noindex",
        },
      });
    }
  }

  const path = req.nextUrl.pathname;
  const mdTwin =
    HAS_MD_TWIN !== null &&
    (req.method === "GET" || req.method === "HEAD") &&
    HAS_MD_TWIN.test(path);

  if (mdTwin) {
    const ua = (req.headers.get("user-agent") || "").toLowerCase();
    if (isAiAgent(ua)) {
      const url = req.nextUrl.clone();
      url.pathname = `${path}.md`;
      return NextResponse.redirect(url, 302);
    }
  }

  const res = NextResponse.next();

  // ── noindex everything that is not production ─────────────────────────────
  // Preview and staging URLs are real, public, and crawlable. Left alone they
  // end up in the index competing with the live site and splitting its
  // signals. This one header is the cheapest SEO insurance there is.
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  if (PROD_HOSTS.size && !PROD_HOSTS.has(host)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (NOINDEX_ROUTES.some((p) => path === p || path.startsWith(p + "/"))) {
    // Pages that exist for a visitor but should never rank: thank-you pages,
    // confirmations, gated downloads. This header is what actually keeps them
    // out of results — blocking them in robots.txt would stop the crawler
    // fetching the page and therefore stop it ever seeing this instruction,
    // which is how a "blocked" URL still ends up listed with no title.
    res.headers.set("X-Robots-Tag", "noindex");
  }

  if (mdTwin) {
    // Standard alternate hint for agentic browsers that use an ordinary
    // user-agent and so never hit the redirect above. Relative URL keeps
    // previews self-contained; harmless to search crawlers.
    res.headers.set("Link", `<${path}.md>; rel="alternate"; type="text/markdown"`);
  }

  return res;
}

// The matcher export must be named `config` — that is Next's contract. The
// project settings are imported above as `siteConfig` to keep the two apart.
export const config = {
  // Run on pages; skip Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)",
  ],
};
