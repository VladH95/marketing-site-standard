---
name: marketing-site-build
description: >-
  The fixed production standard for marketing websites built with Next.js App Router,
  file-based content, and Vercel — machine-enforced quality gates, SEO/GAIO plumbing,
  security headers, and a client-handoff checklist. Use this whenever starting a new
  marketing, landing, agency, or client website; turning a Figma design or a
  vibe-coded wireframe into a production site; adding a blog, case studies, glossary,
  or SEO layer to a marketing site; auditing an existing marketing site's build gates,
  metadata, redirects, headers, or content pipeline; or preparing to transfer a
  finished site to a client's GitHub and Vercel. Reach for it even when the user
  only says "set this site up properly", "make it production-ready", "check the SEO",
  or "we're giving this to the client". Not for product/app work (dashboards, auth,
  databases, APIs) and not for non-web deliverables.
---

# Marketing site build standard

A marketing site is finished when whoever owns it can publish a page and be certain
the site did not break and the SEO did not regress. Everything here exists to make
that true.

Be precise about who "whoever owns it" is, because it changes what you have to build.
Out of the box this standard produces a site an **editor comfortable with git** can
run: they still touch YAML frontmatter, commit, and push. Guardrails, not absence of
technical work. A genuinely non-technical owner needs the git-backed editor switched
on as well (`references/client-editing.md`) — then publishing is a form and a button,
and their save still runs every gate below.

Either way the person publishing does not read code, so correctness cannot rest on
anyone remembering a rule. It has to be enforced by a script that fails loudly.

Two rules hold across every project:

**The machine is the reviewer.** Any rule worth stating is worth failing a build over.
A rule that lives only in a markdown file gets skipped by a rushed session. Prefer
adding a check to prose every time.

**One config, one framework.** Everything project-specific — domain, blocked countries,
content thresholds, analytics provider — lives in `site.config.mjs`. The scripts, hooks,
workflows, and headers are framework and get copied unmodified. If you find yourself
editing a script to fit a project, you have found a missing config field. Add the field.

Two honest limits on that. Page components are design work and are never generated —
the standard gives you the content model, the routing helpers and the gates, not the
pages. And a config flag alone does nothing: `markdownTwins`, `indexnow` and `editor` each
need files the installer only copies when the flag is already on, so switching one on
later means re-running the installer. The config gate catches it if you forget.

## Pick the flow

| Situation | Go to |
|---|---|
| New site, design ready, nothing built | [New build](#new-build) |
| A wireframe or partial site already exists (vibe-coded, inherited, migrated) | [Adopt an existing site](#adopt-an-existing-site) |
| Site is live, you want to know what's missing | [Audit](#audit) |
| Work is done, the client is taking over | `references/client-handoff.md` — read it fully before touching anything |

## New build

**Install the standard first, then build pages on top of it.** One command from the
target project root writes the config, the gates, the content loader, the SEO surfaces
and the layout primitives. It never overwrites an existing file — anything already
present is reported as skipped, to diff by hand.

```bash
node <skill-path>/assets/scripts/scaffold.mjs
```

Then, in order:

1. **Fill in `site.config.mjs`.** This is the interview: domain, content collections,
   whether the client wants geo-blocking, which analytics tool. Geo-blocking and
   analytics are the client's decisions — ask rather than defaulting.
2. **Finish the wiring the installer cannot do safely** — merge
   `assets/templates/package-scripts.json` into `package.json`, merge
   `assets/security-headers.ts` into `next.config.ts`, copy `assets/proxy.ts` to
   `src/proxy.ts`. These three files usually already exist with project-specific
   content, which is why they are merges, not copies.
3. **`npm install` then `npm run build`.** Nothing is real until the build passes. The
   install also wires up the pre-commit hook.
4. **Now build pages from the design.** The content model, routing helpers, sitemap,
   RSS, `llms.txt` and structured data already work — pages consume them. Extract shared
   primitives on the second use, not the fifth.
5. **Verify live.** After the first deploy check the real URL: 200 responses, correct
   canonical, `sitemap.xml` lists what you expect, headers present. Curl it; do not assume.

The order matters. File-based content from the first commit, even on a five-page site —
retrofitting a content model onto hardcoded JSX is the most expensive mistake available
in this stack. And gates before pages: a gate added at the end surfaces fifty problems at
once, while a gate added at the start surfaces them one at a time, when each is cheap.

## Adopt an existing site

The order matters. Gates before changes, so you can tell whether *you* broke something
or it was already broken.

1. **Snapshot the starting state.** `npm run build` and `npm run lint` on a clean
   checkout, and save the output. This is your baseline. If the build already fails,
   fix only that, commit, and re-baseline before doing anything else.
2. **Run the installer** (`node <skill-path>/assets/scripts/scaffold.mjs`), then land the
   CI workflow and pre-commit hook *before* any refactor. Existing files are left alone,
   so this is additive. Everything you do after is then protected.
   Use `--dry-run` first to see what it would touch.
3. **Run the audit** (below) and write down the gaps as a list before fixing any of them.
   Fix in this order: build-breaking → SEO-regressing → security → nice-to-have. SEO
   ranks above security here for one reason only: a broken URL costs traffic that takes
   months to recover, while a missing header costs nothing until it is exploited. Both
   get fixed; this is just the sequence.
4. **Migrate hardcoded content into the content model** one collection at a time, running
   the build between each. If the site was vibe-coded, expect copy embedded directly in
   components — that is normal and it is the main job.
5. **If the site is replacing a live one on the same domain**, URL parity comes before
   everything else. See the redirect discipline section in `references/seo-gaio.md`.

## Audit

Work through this and report findings in plain language, grouped by severity. Do not fix
while auditing — a list the owner can see is worth more than silent repairs, because it
is what tells them what they were exposed to.

**Gates** — is there a pre-commit hook? Does CI run on pull requests and actually block a
merge? Do `lint`, `typecheck`, and `build` all run? Does the content gate exit non-zero?

**Content** — is content file-based or hardcoded? Does a new file appear in the listing,
sitemap, and feed automatically, or does someone edit three files by hand?

**SEO** — sitemap, robots, canonical URLs, per-page metadata, OG images, JSON-LD, RSS.
Do previews get `noindex`? Is there a redirect registry for any URL that ever changed?
Any external image hotlinks?

**Security** — CSP and the other headers, secrets in git history, dependency audit,
who can push to `main`.

**Handoff readiness** — is there an inventory of every account, key, and domain the site
depends on? If the answer is "it's in someone's head", that is a finding.

## Reference files

Load the one you need; do not read them all up front.

- `references/architecture.md` — stack, file-based content model, routing, design system
- `references/quality-gates.md` — lint, typecheck, build chain, pre-commit, CI, what each gate catches
- `references/seo-gaio.md` — sitemap, robots, metadata, JSON-LD, RSS, llms.txt, markdown twins, IndexNow, redirect discipline, the content gate's SEO rules
- `references/security.md` — CSP and headers, proxy/middleware, geo-blocking, secrets, dependencies
- `references/content-system.md` — the content playbook, frontmatter contract, writer→reviewer workflow
- `references/client-editing.md` — the git-backed editor: why the client's publish runs our gates, setup, who can edit, what it cannot do
- `references/forms-and-leads.md` — where submissions go and why never into git, provider choice, spam, failure states, personal-data ownership
- `references/client-handoff.md` — transfer checklist with every irreversible step flagged

## Assets

Real files, not descriptions of files. `assets/scripts/scaffold.mjs` installs everything
in the top block; the bottom block is merged by hand because those files normally already
exist.

| Asset | Destination | Notes |
|---|---|---|
| `assets/scripts/scaffold.mjs` | — | The installer. Run it from the target project root. Never overwrites without `--force`. |
| `assets/site.config.mjs` | `site.config.mjs` | Project settings. Everything else reads from it — but note the caveats under "one config" above. |
| `assets/site.config.d.mts` | `site.config.d.mts` | Types the config as a contract rather than as one project's literal, so deleting an unused block does not break compilation. Install both or neither. |
| `assets/scaffold/src/lib/content.ts` | `src/lib/content.ts` | The content loader. Every derived surface reads from it, which is what keeps them in sync. |
| `assets/scaffold/src/lib/routes.ts` | `src/lib/routes.ts` | Derives static routes by walking the app directory, so the sitemap cannot fall behind the site. |
| `assets/scaffold/src/lib/jsonld.tsx` | `src/lib/jsonld.tsx` | Organization, Article, FAQ, Breadcrumb, ItemList, and the script-breakout escaping. |
| `assets/scaffold/src/lib/metadata.ts` | `src/lib/metadata.ts` | Canonical, OG, Twitter — from one helper, so no page ships without them. |
| `assets/scaffold/src/app/sitemap.ts` | `src/app/sitemap.ts` | |
| `assets/scaffold/src/app/robots.ts` | `src/app/robots.ts` | |
| `assets/scaffold/src/app/rss.xml/route.ts` | `src/app/rss.xml/route.ts` | |
| `assets/scaffold/src/app/llms.txt/route.ts` | `src/app/llms.txt/route.ts` | |
| `assets/scaffold/src/components/ui/*` | `src/components/ui/` | `Section` and `Container` only — the rest is design-specific. |
| `assets/scripts/check-content.mjs` | `scripts/check-content.mjs` | Content gate. Exits 1 on error — this is what blocks a bad article from deploying. |
| `assets/scripts/check-links.mjs` | `scripts/check-links.mjs` | Internal link and image checker. Catches dead links before Google does. |
| `assets/scripts/gen-image-dimensions.mjs` | `scripts/gen-image-dimensions.mjs` | Intrinsic sizes for markdown images. Zero dependencies. |
| `assets/scripts/indexnow.mjs` | `scripts/indexnow.mjs` | Pings Bing/Yandex on content change. Only if the project has a blog. |
| `assets/scripts/install-hooks.mjs` | `scripts/install-hooks.mjs` | Points git at the committed hooks directory. No husky dependency. |
| `assets/githooks/pre-commit` | `.githooks/pre-commit` | Fast local gate. |
| `assets/workflows/ci.yml` | `.github/workflows/ci.yml` | The blocking gate. Requires branch protection to actually block — see quality-gates. |
| `assets/workflows/indexnow.yml` | `.github/workflows/indexnow.yml` | |
| `assets/templates/AGENTS.md` | `AGENTS.md` | Project working rules. `CLAUDE.md` can just contain `@AGENTS.md`. |
| `assets/templates/content-playbook.md` | `docs/content-playbook.md` | Empty structure. Fill with the client's own facts. |

Merged by hand, because the target file normally already exists and replacing it would
throw away project-specific content:

| Asset | Destination |
|---|---|
| `assets/security-headers.ts` | `next.config.ts` |
| `assets/proxy.ts` | `src/proxy.ts` (`src/middleware.ts` before Next 16) |
| `assets/scaffold/keystatic.config.ts` + `src/app/keystatic/*` | the client's editor | Installed when `editor.enabled`. Their save is a commit, so their publish runs our gates. |
| `assets/templates/package-scripts.json` | `package.json` |

After installing anything, run `npm run build`. An asset that has not been built against
the actual project is a guess.

## Things this standard deliberately does not cover

Say so out loud rather than quietly skipping them, because each one is a real limit the
owner should know about.

- **A nonce-based CSP.** The shipped policy allows `'unsafe-inline'` for scripts because
  Next's hydration bootstrap and inline JSON-LD require it without a nonce pipeline. The
  header set is still far above a typical marketing site. Tightening it is a separate
  project with real breakage risk on Next upgrades.
- **Performance and accessibility budgets.** No Lighthouse CI, no axe run. Worth adding
  per project; not baseline.
- **Automated tests.** There is no unit or E2E layer. The build plus the content gate is
  the safety net, which suits sites whose logic is mostly content rendering, and stops
  suiting them the moment real interactivity appears.
- **A form backend.** The standard says where submissions must go and what to check
  (`references/forms-and-leads.md`), but the provider is a per-project choice and the
  integration is a few lines against their API. Nothing is shipped, deliberately —
  hard-wiring one vendor into the framework would be the opposite of portable.
- **A lead database or CRM.** Submissions never enter git, so there is no admin view
  of them inside the content editor. The provider's own dashboard is the answer;
  building one costs a database, auth, and a pile of personal-data obligations.
- **Editorial approval workflows.** The shipped editor (`editor.enabled`) is
  git-backed, so access is GitHub write access and there is no "draft, then someone
  approves". A client who needs that needs a database-backed CMS, and it is worth
  finding out during scoping rather than after.
- **The handoff itself.** `references/client-handoff.md` is documentation. Transfers,
  DNS changes, and key rotations are the owner's to execute; several are irreversible.
