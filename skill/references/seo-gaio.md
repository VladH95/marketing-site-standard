# SEO and AI visibility

Contents: [the generated surfaces](#the-generated-surfaces) · [metadata](#metadata) ·
[structured data](#structured-data-json-ld) · [redirect discipline](#redirect-discipline) ·
[migrating onto a live domain](#migrating-onto-a-live-domain) ·
[AI answer engines](#ai-answer-engines) · [markdown twins](#markdown-twins-optional) ·
[IndexNow](#indexnow) · [audit checklist](#audit-checklist)

One principle underneath all of it: **every SEO surface is generated from
content, never hand-maintained.** A hand-maintained sitemap drifts, and a sitemap
that lists a page which 404s teaches the crawler to trust the file less.

## The generated surfaces

| File | Emits | Source |
|---|---|---|
| `src/app/sitemap.ts` | `/sitemap.xml` | the content loader |
| `src/app/robots.ts` | `/robots.txt` | static rules + sitemap URL |
| `src/app/rss.xml/route.ts` | RSS feed | the content loader |
| `src/app/llms.txt/route.ts` | a site map for AI crawlers ([llmstxt.org](https://llmstxt.org)) | the content loader |

Sitemap notes worth copying: give file-based content a real `lastModified` from
its frontmatter date (a freshness signal), and give fixed structured pages none
rather than inventing `new Date()` — a sitemap claiming every page changed today
is a sitemap the crawler stops believing.

## Metadata

Per-page metadata comes from one helper so no page can forget a piece of it.
Each page needs a canonical URL, an OG title/description/image, and a Twitter
card. Set `metadataBase` once in the root layout so relative image paths resolve
to absolute URLs.

Two rules that catch most real problems:

- **The canonical is the production URL, always.** Not the preview, not the bare
  domain if the site serves `www`.
- **OG images are real files with real dimensions** (1200×630). Generating them
  at request time is a runtime dependency on something a share crawler will only
  try once.

## Structured data (JSON-LD)

What is worth emitting on a marketing site, and why:

| Schema | Where | What it buys |
|---|---|---|
| `Organization` + `WebSite` | root layout, once | Entity disambiguation — this is what stops four unrelated companies with your name from splitting your brand query |
| `Article` / `BlogPosting` | each post | Author, date, image in results |
| `Person` (the author) | posts + author page | A named, credentialed author is weighted far above a faceless brand |
| `BreadcrumbList` | nested pages | The breadcrumb trail shown in results |
| `FAQPage` | pages with an FAQ | The single most-quoted format in AI answers |
| `ItemList` | list-format posts | Tells an engine "this page is a ranked list of N things" |
| `DefinedTerm` | glossary entries | The format answer engines prefer for a clean definition |

`Organization.sameAs` deserves attention on a rebrand or a domain move: listing
the verified third-party profiles (directory listings, review sites, social
accounts) is how a search engine consolidates several spellings of a brand into
one entity.

**Escape JSON-LD before inlining it.** `JSON.stringify` does not escape `<`, `>`,
`&`, or U+2028/U+2029, so a `</script>` inside any content field breaks out of
the block. One replace closes it:

```ts
function safeJsonLd(d: object): string {
  return JSON.stringify(d).replace(/[<>&\u2028\u2029]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}
```

## Redirect discipline

**A URL that has ever been live is a permanent commitment.** Its rankings and its
inbound links belong to that exact string. Changing it without a 301 throws both
away, and the recovery takes months.

So: the `redirects()` block in `next.config.ts` is a registry, it only ever
grows, and every entry gets a comment saying why it exists. Someone will
eventually look at a five-line redirect for a URL nobody visits and want to
tidy it up — the comment is what stops them.

Add an entry, in the same commit, whenever you:

- rename a slug (prefer not renaming at all)
- move a section (`/success-stories/x` → `/cases/x`)
- find a 404 in Search Console that used to be a real page
- migrate from another platform with different URL shapes

Use `permanent: true` (a 301) — a 302 does not pass ranking signals.

## Migrating onto a live domain

Replacing an existing site on the same domain is the highest-risk operation in
this whole standard, because everything is reversible except lost rankings.
Order of work:

1. **Inventory the live URLs first** — from the current sitemap, from Search
   Console's page report, and from analytics for the last 12 months. Do this
   before writing any code; afterwards you are guessing.
2. **Match every one of them.** Same path, or a 301 to the closest equivalent.
   A path with traffic and no destination is a decision, not an oversight —
   make it deliberately.
3. **Preserve titles and descriptions** for pages that already rank. Rewriting
   the copy of a page ranking at position 4 is a separate experiment; do not
   run it in the same change as the platform move.
4. **Keep the previous metadata** where it was good. If the old platform left
   HTML entities in scraped titles, decode them rather than dropping them.
5. **After cutover**: fetch the sitemap, spot-check a sample of URLs for 200s,
   submit the sitemap in Search Console, and watch the coverage report for two
   weeks. A spike in 404s means a redirect was missed.

## AI answer engines

Answer engines quote structure, not prose quality. The formats that get cited:

- **A direct answer in the first sentence under each H2.** Extraction takes the
  first sentence; a wind-up paragraph loses the citation to whoever answered faster.
- **FAQ pairs in frontmatter**, which render *and* emit FAQPage schema. A
  hand-written FAQ section in the body emits nothing.
- **A short "what this covers" list** in the intro.
- **Key takeaways** — three to five declarative, specific lines. "Budget $30K–$100K
  for a mid-market redesign" gets quoted; "UX is important" does not.
- **List-format pieces with `ItemList`**, which in practice tend to be cited far
  more often than narrative guides.

The content gate enforces the ones that can be checked mechanically (FAQ count,
takeaways on long-form). The rest is editorial and belongs in the playbook.

## Markdown twins (optional)

Serving `/blog/<slug>.md` — a clean markdown version of a page — plus a 302 for
known AI-agent user-agents. Off by default in `site.config.mjs`.

It works like this: a rewrite maps `/blog/<slug>.md` to a route handler that
renders the doc as markdown with `X-Robots-Tag: noindex` and a `Link:
rel="canonical"` header back to the HTML page, so the twin never competes in
search. The proxy redirects allowlisted agent user-agents to it.

**The risk, stated plainly.** Serving different content to a search crawler than
to a human is cloaking. The protection is that the allowlist is checked *after*
a search-crawler guard which wins unconditionally — but the protection is one
edit away from being removed by someone tidying up the function. That is why
this is opt-in on a client site: turn it on only where someone owns that list.

Lower-risk subset, safe everywhere: publish `llms.txt`, and serve the `.md`
routes as ordinary URLs with a `Link: rel="alternate"` header, with no
user-agent branching at all. Most of the benefit, none of the cloaking surface.

## IndexNow

Pings Bing and Yandex when content changes, so a new page is crawled in minutes
instead of days. Google does not participate.

The key is public by design — ownership is verified by fetching
`https://<domain>/<key>.txt`. So it lives in `site.config.mjs` and in
`public/<key>.txt`, needs no repository secret, and survives a repo transfer
with nothing to re-provision. Generate a **new key per domain**; do not reuse one
across clients.

```bash
node -e "console.log(crypto.randomUUID().replace(/-/g,''))"
```

## Audit checklist

- [ ] `sitemap.xml` returns 200 and lists exactly the pages that should be indexed
- [ ] `robots.txt` points at the sitemap; nothing important is disallowed
- [ ] Every page has a canonical pointing at the production URL
- [ ] Titles and descriptions are unique per page
- [ ] OG image exists and is 1200×630
- [ ] JSON-LD validates ([Rich Results Test](https://search.google.com/test/rich-results)) and is escaped
- [ ] Preview and staging hosts return `X-Robots-Tag: noindex`
- [ ] Every historical URL either resolves or 301s
- [ ] No external image hotlinks
- [ ] Internal links are root-relative, never absolute to the production domain
- [ ] `npm run check:links` passes
- [ ] Search Console and Bing Webmaster Tools are set up and the sitemap is submitted
