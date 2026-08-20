// Security headers — merge this into next.config.ts.
//
// The CSP is built from site.config.mjs so that adding an analytics tool means
// editing one config array, not hand-patching a policy string and hoping you
// got the directive right.
//
// About 'unsafe-inline' in script-src: Next's hydration bootstrap and inline
// JSON-LD blocks are inline scripts with no nonce, so removing it breaks the
// site. A nonce pipeline is possible but it is a real project with real
// breakage risk on every Next upgrade — see the "deliberately not covered"
// section of SKILL.md. What is shipped here is still well above what a typical
// marketing site runs, and the JSON-LD is separately escaped against
// script-tag breakout (see references/seo-gaio.md).

import type { NextConfig } from "next";
import siteConfig from "./site.config.mjs";

const allow = siteConfig.security?.cspAllow ?? {};
const list = (...parts: (string | string[] | undefined)[]) =>
  parts.flat().filter(Boolean).join(" ");

const csp = [
  "default-src 'self'",
  list("script-src 'self' 'unsafe-inline'", allow.script),
  list("style-src 'self' 'unsafe-inline'", allow.style),
  // data: covers inlined SVG and placeholders. Never add a bare `https:` — a
  // blanket allowance lets any host a content author pastes fingerprint your
  // visitors, and it is the directive most often left permanently wide open
  // after a migration. Analytics that falls back to an image pixel needs its
  // host listed in cspAllow.img, not a wildcard.
  list("img-src 'self' data:", allow.img),
  list("font-src 'self'", allow.font),
  list("connect-src 'self'", allow.connect),
  list("frame-src 'self'", allow.frame),
  // Blocks the site being embedded anywhere — the modern clickjacking defence.
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // An external form handler posts cross-origin; without its host here the
  // submit is blocked and the form fails silently.
  list("form-action 'self'", allow.formAction),
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Stops the browser guessing a file's type — the guess is how an uploaded
  // "image" ends up executed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy companion to frame-ancestors, for old browsers.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Sends the full URL to same-origin, only the origin cross-origin, and
  // nothing when downgrading to http.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Denies powerful APIs the site never uses, including Chrome's ad-topics API.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Tells browsers to use HTTPS for two years and covers subdomains.
  // ⚠️ Add this ONLY once HTTPS works on every subdomain — it is cached by the
  // browser and cannot be undone quickly. Leave it commented until launch day.
  // { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// ── in next.config.ts ────────────────────────────────────────────────────────
const nextConfig: NextConfig = {
  images: {
    // Vercel resizes and re-encodes per request; originals in /public stay
    // untouched. 85 for photography and portfolio imagery, 75 elsewhere.
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    // Markdown twins: /<section>/<slug>.md serves the machine version handled
    // by src/app/md/[collection]/[slug]/route.ts. Generated from the config so
    // the rewrite, the proxy redirect and the prerendered routes cannot drift
    // apart — an enabled flag with a missing rewrite is a 404 for every agent.
    const sections: string[] = siteConfig.agents?.markdownTwins
      ? (siteConfig.agents.twinSections ?? [])
      : [];
    return sections.map((s) => ({
      source: `/${s}/:slug([a-z0-9-]+)\\.md`,
      destination: `/md/${s}/:slug`,
    }));
  },
  async redirects() {
    return [
      // The redirect registry. Every URL that ever changed lives here, forever.
      // See references/seo-gaio.md — deleting an entry silently costs traffic.
      // { source: "/old-path", destination: "/new-path", permanent: true },
    ];
  },
};

export default nextConfig;
