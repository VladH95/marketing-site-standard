# Architecture

Contents: [stack](#stack) · [file-based content](#file-based-content-the-core-idea) ·
[the loader](#the-loader) · [routing](#routing) · [design system](#design-system) ·
[images](#images) · [what to build first](#what-to-build-first)

## Stack

Next.js App Router + TypeScript + Tailwind + Vercel. The parts that matter for a
marketing site and why this combination rather than another:

- **Static by default.** Every page prerenders. A marketing site has no per-user
  state, so there is nothing to render at request time, and a static page is the
  cheapest thing to serve and the fastest thing to rank.
- **File-based content.** Content is markdown and JSON in the repo. Publishing is
  a commit. This is what makes the whole gate system possible — you cannot run a
  build-time check against a CMS someone edits at 11pm.
- **Vercel deploy on push.** A failing build means a failed deployment and the
  previous version stays live. That property is doing a lot of work: it is why
  the content gate is a real safety net and not just a linter.

Next.js renames things between majors. Read the docs shipped in
`node_modules/next/dist/docs/` before writing routing or config code rather than
relying on remembered APIs — the middleware/proxy rename between 15 and 16 is a
typical example, and getting it wrong fails silently.

## File-based content: the core idea

One file is one page. Adding the file makes the page exist, and makes it appear
in the listing, the sitemap, the RSS feed, `llms.txt`, and the structured data —
all at once, because all of those read from the same loader.

```
src/content/
  blog/<slug>.md         YAML frontmatter + markdown body
  cases/<slug>.md
  services/<slug>.json   structured pages: fixed shape, no prose freedom
  legal/<slug>.md
```

The shipped loader reads **markdown only** — that is what the content gate,
the link checker, the sitemap and the feeds are all built around. JSON-backed
pages are a deliberate pattern below, but they need their own small loader and
their own route; do not expect `getAllDocs` to pick them up.

Markdown when the page is prose an author writes. JSON when the page is a fixed
layout filled with fields — a service page with a hero, a three-column overview,
a numbered process, and an FAQ is a data structure, and forcing it into markdown
means every page drifts into a slightly different shape.

The property to protect: **a file either appears in all the derived surfaces or
in none of them.** The moment a sitemap is hand-maintained, it starts lying, and
a lying sitemap is worse than no sitemap. Every derived surface must call the
same loader.

## The loader

**Ships as a real file:** `assets/scaffold/src/lib/content.ts`. Do not rewrite
it from this description — install it, then read the rest of this section to
understand what it guarantees.

One module owns reading content. Everything else imports from it. Three
behaviours matter:

**Slug validation.** Test every incoming slug against `/^[a-z0-9][a-z0-9-]*$/`
before joining it to a path. These functions take slugs from URL params, and
`path.join` with `../../` in it reads any file on the server. One regex closes
that entirely.

**Draft handling.** `draft: true` in frontmatter excludes a file from routes,
listings, sitemap, and feeds. This gives writers somewhere to keep unfinished
work in the repo, which they will do anyway — better in a branch that builds
than in a file that breaks the deploy.

**Sorting and typing at the boundary.** Sort newest-first once, in the loader, so
no page component ever re-derives ordering.

```ts
export function getAllDocs(kind: ContentKind): Doc[] {
  const d = dir(kind);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter((s) => SAFE_SLUG.test(s))
    .map((s) => getDoc(kind, s))
    .filter((doc): doc is Doc => doc !== null && doc.data.draft !== true)
    .sort((a, b) => String(b.data.date ?? "").localeCompare(String(a.data.date ?? "")));
}
```

## Routing

```
src/app/
  page.tsx                    /
  blog/page.tsx               /blog            index, from getAllDocs
  blog/[slug]/page.tsx        /blog/<slug>     generateStaticParams from getSlugs
  services/[slug]/page.tsx
  sitemap.ts  robots.ts  rss.xml/route.ts  llms.txt/route.ts
```

Every dynamic route uses `generateStaticParams` plus `dynamicParams = false`, so
an unknown slug 404s at the edge rather than rendering an empty page. An empty
page that returns 200 gets indexed; a 404 does not.

## Design system

Extract a primitive on its second use, not its fifth. For a marketing site the
recurring set is small and predictable:

- `Section` — full-bleed band, owns horizontal padding and vertical rhythm
- `Container` — caps content width and centres it
- `Button` — the CTA, with its variants
- `Heading` / `Eyebrow` / `SectionHeader` — the type scale, so it stays a scale

One convention worth stealing: if the header is sticky and changes colour over
different backgrounds, make each section **declare** its background tone
(`<Section theme="dark">`, read via a data attribute). Sniffing the colour at
runtime works until it doesn't, and the failure mode is white text on white.

Respect `prefers-reduced-motion` on every animation. Marketing sites are the
worst offenders for this, and it costs one media query.

## Images

Originals go in `public/images/...`, referenced root-relative. Never hotlink an
external CDN: the link rots, it leaks visitor data to a third party, and it
forces `img-src https:` in the CSP, which throws away most of the point of
having one.

Markdown-authored images have no intrinsic dimensions at author time, and
`next/image` needs them to reserve space and avoid layout shift.
`scripts/gen-image-dimensions.mjs` solves this by reading PNG and JPEG headers
directly (no dependency) and writing a `path → {w,h}` map before every build, so
a freshly dropped image just works.

## Adding a content type

Every content type a project needs — products, team members, locations, events
— is one config block, not new plumbing. This is the part of the standard that
makes "can we manage X easily?" a fifteen-minute question instead of a project.

Nothing here is products-specific on purpose: shipping a products collection
would mean guessing fields, and a furniture catalogue, a SaaS pricing tier and
a service package share nothing but the word.

1. **Declare it** in `site.config.mjs`:

   ```js
   products: {
     dir: "src/content/products",
     route: "/products",
     required: ["title", "description", "cover"],
     coverField: "cover",
     faq: { min: 0 },
     takeaways: { min: 0 },
     warn: { descriptionChars: [50, 170] },
   }
   ```

   That alone buys the content gate, the link checker resolving `/products/x`
   against real files, sitemap entries, and `llms.txt`.

2. **Add the route**: `src/app/products/[slug]/page.tsx`, with
   `generateStaticParams` from `getSlugs("products")` and
   `dynamicParams = false`. The sitemap deliberately skips a collection with no
   matching page, so until this exists nothing is advertised.

3. **Structured data**, where there is a schema that fits — `productJsonLd` for
   a catalogue, `articleJsonLd` for anything article-shaped.

4. **Editor fields**, if the client edits it themselves.

**Structured pages are fields, not prose.** A product page is a fixed layout
filled with values: name, images, specs, a short description. Model it as
typed frontmatter and keep the markdown body for the one part that is genuinely
prose. Give an author a blank markdown page instead and every entry drifts into
a slightly different shape, which is how a catalogue stops looking designed.

Two fields worth adding that people always want later: an explicit `order`
integer (clients reorder things, and alphabetical is not an order anyone means)
and a `category` once there are more than about a dozen entries.

## What to build first

Steps 1–3 are one command — `node <skill-path>/assets/scripts/scaffold.mjs`
from the project root:

1. `site.config.mjs`
2. The content loader, the route helper, and the SEO surfaces (sitemap, robots,
   RSS, `llms.txt`, structured data)
3. The gates (`references/quality-gates.md`)

Then by hand:

4. Fill in `site.config.mjs`, merge the package scripts, the security headers
   and the proxy, and get `npm run build` green. Nothing counts until it is.
5. One content type end to end — file → page → listing → sitemap — to prove the
   loop works before there are twenty pages depending on it.
6. Layout primitives, then pages from the design.

Getting the loader and the gates in before the pages feels slower on day one
and is faster by day three, because every page after the first is then a
template rather than a new decision. It also means the design work happens on
top of a site that already publishes correctly, so a Figma-to-code session
never has to think about sitemaps.
