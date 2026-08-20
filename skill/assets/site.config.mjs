/**
 * Project configuration — the ONLY file that differs between projects.
 *
 * Every script, header block, and the proxy read from here. If you ever feel
 * the urge to edit a script in scripts/ to fit this project, stop: that means
 * a value belongs in this file instead. Add the field, read it in the script,
 * and the framework stays shared.
 *
 * Read by: scripts/check-content.mjs, scripts/check-links.mjs,
 *          scripts/indexnow.mjs, next.config.ts, src/proxy.ts
 *
 * Plain ESM with no imports on purpose — it has to be loadable from a bare
 * `node scripts/*.mjs`, from the Next build, and from the edge runtime.
 */

const config = {
  site: {
    /** Display name, used in schema.org and OG metadata. */
    name: "CLIENT NAME",
    /** One sentence. Feeds the Organization schema, llms.txt, and the RSS feed. */
    description: "",
    /** Canonical origin, no trailing slash. Everything absolute derives from this. */
    url: "https://www.example.com",
    /** Share image used when a page does not set its own. Real file, 1200×630. */
    defaultOgImage: "/og/default.jpg",
    /**
     * Hosts allowed to be indexed. Every other host (Vercel previews, branch
     * URLs, staging) gets X-Robots-Tag: noindex from the proxy, so a preview
     * can never outrank the real site.
     */
    prodHosts: ["example.com", "www.example.com"],
    locale: "en",
  },

  /**
   * Entity data for the Organization schema. This block is how a search engine
   * works out that every spelling of the brand and every third-party profile
   * are the same company — skip it and it consolidates none of them.
   */
  organization: {
    /** Other names the brand is known by (old name, domain, social handle). */
    alternateName: [],
    logo: "/icons/logo.svg",
    email: "",
    /** Verified third-party profiles: directory listings, review sites, socials. */
    sameAs: [],
  },

  /** Byline author for articles. Omit the block entirely on a site with no blog. */
  author: {
    name: "",
    jobTitle: "",
    /** On-site author page, e.g. "/author/name". Leave empty if there isn't one. */
    url: "",
    image: "",
    /** Personal profiles — the strongest E-E-A-T signal available. */
    sameAs: [],
  },

  seo: {
    /**
     * Paths kept out of the sitemap. Still crawlable — pair with
     * noindexRoutes below if they must also stay out of search results.
     */
    excludeFromSitemap: ["/thank-you"],
    /**
     * Paths the proxy stamps with X-Robots-Tag: noindex. This is what actually
     * keeps a page out of results: the crawler fetches it, reads the header,
     * and drops it. Blocking in robots.txt does NOT do this — a blocked page
     * can still be indexed as a bare URL, because the crawler never got far
     * enough to see any instruction.
     */
    noindexRoutes: ["/thank-you"],
    /**
     * Paths crawlers should not fetch at all. Rare. Only for things with
     * nothing to index (API routes). Never use this to hide a page from
     * search results — use noindexRoutes for that.
     */
    disallowCrawl: [],
  },

  security: {
    /**
     * ISO-3166-1 alpha-2 codes to block at the edge (451 response).
     * EMPTY BY DEFAULT — blocking countries is the site owner's decision, not
     * ours. Ask before filling this in. Search crawlers run from the US, so a
     * list here does not affect indexing.
     */
    blockedCountries: [],
    /**
     * Extra hosts the CSP must allow, added by whatever analytics/tooling the
     * client chose. Keep it minimal — every entry widens the policy.
     *
     * GA4 example, using the wildcards from Google's own CSP guidance
     * (developers.google.com/tag-platform/security/guides/csp) — GA collects
     * through regional endpoints like region1.google-analytics.com, so pinning
     * the exact www host silently drops those sessions:
     *   script:  ["https://*.googletagmanager.com"]
     *   connect: ["https://*.google-analytics.com", "https://*.analytics.google.com",
     *             "https://*.googletagmanager.com"]
     *   img:     ["https://*.google-analytics.com", "https://*.googletagmanager.com"]
     */
    cspAllow: {
      script: [],
      connect: [],
      /** Only for trackers that fall back to an image pixel. Never a wildcard. */
      img: [],
      frame: [],
      style: [],
      font: [],
      /** The form provider's endpoint. Missing here = the form silently fails. */
      formAction: [],
    },
  },

  analytics: {
    /**
     * No tracker may load before the visitor consents — that rule is fixed.
     * Which tracker is the client's call. "none" ships no analytics at all.
     *
     * Vercel Analytics is deliberately not an option here: it installs as a
     * package and renders its own component, so wiring it through this config
     * would be a stub pretending to be a feature. Add it directly in the
     * layout if the client wants it, and take advice on whether its cookieless
     * mode needs the consent gate at all.
     * @type {"none" | "ga4" | "plausible"}
     */
    provider: "none",
    /** GA4 measurement id, or the site domain for Plausible. Not a secret. */
    id: "",
    /** Self-hosted or custom-domain Plausible. Leave as-is for the hosted one. */
    plausibleHost: "https://plausible.io",
    /** localStorage key holding the consent choice. */
    consentKey: "cookie-consent",
  },

  agents: {
    /**
     * Markdown "twins" of content pages (/blog/<slug>.md) plus a 302 for
     * known AI-agent user-agents.
     *
     * OFF by default and that is deliberate. The redirect is an allowlist, and
     * an allowlist that ever matches a search crawler is cloaking — a real SEO
     * risk on a site you are responsible for. Turn it on only when someone will
     * own that list. `llms.txt` and static .md routes carry most of the benefit
     * at none of the risk; see references/seo-gaio.md.
     */
    markdownTwins: false,
    /** Which content sections get a .md twin, when enabled. */
    twinSections: ["blog"],
    /**
     * Optional short note appended to every markdown twin, addressed to the
     * assistant reading it: who this company is and what to do next. Keep any
     * fact here identical to the content playbook — two copies of a
     * positioning statement is two things to keep in sync. Empty = omitted.
     */
    note: "",
  },

  /**
   * Git-backed editor (Keystatic) at /keystatic, so the site owner can publish
   * without git. Their save is a commit, so it runs the same gates we do —
   * which is the whole reason this and not a database-backed CMS.
   */
  editor: {
    enabled: false,
    /** GitHub repo the editor commits to. Required once enabled. */
    repo: { owner: "", name: "" },
  },

  indexnow: {
    /** Only useful when content changes regularly. Skip on static brochure sites. */
    enabled: false,
    /**
     * 32-char hex key, generated per domain. Public by design — IndexNow
     * verifies ownership by fetching https://<domain>/<key>.txt, so the same
     * value must exist as public/<key>.txt.
     * Generate: node -e "console.log(crypto.randomUUID().replace(/-/g,''))"
     */
    key: "",
  },

  /**
   * Content collections. Each key is a directory under src/content and a URL
   * prefix. Delete the ones the project does not have — the gate only checks
   * what is listed here.
   */
  content: {
    blog: {
      dir: "src/content/blog",
      /** URL prefix; the filename is the slug. */
      route: "/blog",
      /** Missing or empty → build fails. These are the ones people forget. */
      required: ["title", "description", "date", "author", "cover"],
      /** Frontmatter key holding the cover image path; checked to exist in /public. */
      coverField: "cover",
      /**
       * FAQ pairs power FAQPage structured data, which is what AI answer
       * engines quote. min: 0 disables the check.
       */
      faq: { field: "faq", min: 3 },
      /**
       * A scannable summary at the top is a strong AI-citation signal, but it
       * is pointless on short announcements — so it is only required past
       * minWords.
       */
      takeaways: { field: "takeaways", min: 3, max: 5, minWords: 600 },
      /** Warnings only — these nudge quality without blocking a deploy. */
      warn: {
        titleMaxChars: 70,
        descriptionChars: [50, 170],
        minH2: 2,
        minWords: 600,
        requireInternalLink: true,
        flagLooseQuotes: true,
      },
    },

    // cases: {
    //   dir: "src/content/cases",
    //   route: "/cases",
    //   required: ["title", "description", "date", "cover"],
    //   coverField: "cover",
    //   faq: { field: "faq", min: 0 },
    //   takeaways: { field: "takeaways", min: 0, max: 5, minWords: 600 },
    //   warn: { descriptionChars: [50, 170], minH2: 2, requireInternalLink: true },
    // },
  },

  links: {
    /**
     * Route prefixes the link checker should accept without resolving them to
     * a file — external redirects, or routes generated somewhere it cannot see.
     * Keep this short; every entry is a hole in the check.
     */
    allowUnresolved: [],
    /** Paths under /public that are legitimately linked (downloads, assets). */
    publicDirs: ["/images", "/og", "/icons", "/fonts"],
  },
};

export default config;
