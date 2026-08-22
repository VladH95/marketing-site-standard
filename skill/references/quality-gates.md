# Quality gates

Contents: [the three layers](#the-three-layers) · [the build chain](#the-build-chain) ·
[content gate](#the-content-gate) · [link check](#the-link-check) ·
[pre-commit](#pre-commit) · [CI](#ci-and-the-setting-that-makes-it-real) ·
[installing](#installing-the-gates) · [when a gate is wrong](#when-a-gate-is-wrong)

The premise: the site owner does not read code. Nobody reviews the diff. So the
only reviewer is the machine, and a rule that is not enforced by a failing exit
code is a rule that holds until the first busy evening.

## The three layers

Each layer catches what the previous one lets through, and each is slower than
the last. That ordering is deliberate — fast feedback where you are still typing,
thorough feedback where you can afford to wait.

| Layer | Runs | Catches | Cost |
|---|---|---|---|
| Pre-commit hook | `git commit` | lint, types, content, links | ~10–30s |
| CI on pull request | push to a branch | everything above + full build, on a clean machine | ~2–4 min |
| Build on deploy | push to `main` | last line of defence; a failure keeps the old version live | ~2–4 min |

The third layer is free — it is just Vercel building. It is also the one that
makes the content gate meaningful, because "the deploy failed" is a real
consequence and "the linter printed something" is not.

## The build chain

```json
"build": "node scripts/gen-image-dimensions.mjs && node scripts/check-content.mjs && node scripts/check-links.mjs && next build"
```

The order is load-bearing:

1. **Image dimensions** first, because the app imports the map they generate.
2. **Content gate** next — cheap, and it fails on the most common mistakes.
3. **Link check** — needs the content to be valid before its results mean anything.
4. **`next build`** last, and only if everything upstream passed.

`&&` is what makes this a chain: any non-zero exit stops it, and Vercel marks the
deployment failed. That single property is the whole design.

## The content gate

`scripts/check-content.mjs`. Reads its thresholds from `site.config.mjs`.

**Errors — these stop the deploy.** All of them share two traits: easy to forget
while writing, and expensive to discover after publishing.

| Check | Why it blocks |
|---|---|
| Required frontmatter present and non-empty | A missing `description` means no meta description and no share text — invisible until someone posts the link |
| `date` parses | An invalid date silently breaks sorting and the sitemap's `lastModified` |
| Cover file exists in `/public` | A broken cover degrades every share card and the Article schema |
| Cover is not an external URL | External images rot and force a wider CSP |
| FAQ has ≥ N complete pairs | Incomplete pairs emit invalid FAQPage schema, which is worse than emitting none |
| Long-form has ≥3 takeaways | The scannable summary is the strongest AI-citation signal available; short posts are exempt because it would be filler |
| Filename is a valid slug | A stray filename never becomes a URL, so the author thinks it is live and it is not |

Drafts (`draft: true`) are skipped entirely — they are already excluded from the
site, so holding them to the publish bar would block builds on unfinished work.

**Warnings — these print and pass.** Title length, description length, heading
count, thin word count, missing internal links, unmarked quotes. They are real
quality issues, but blocking a deploy over a 72-character title teaches people
that the gate is noise, and once that is learned the errors stop being read too.

## The link check

`scripts/check-links.mjs`. Derives the actual route table by walking `src/app`
for page and route files, then resolves every root-relative link found in
content, components, and app files against it.

A dead internal link is the most common SEO regression on a content site and the
least visible: nothing crashes, the build passes, the page just links to a 404
until a crawler finds it. Renaming a file, deleting a draft, or fixing a typo in
a slug all cause one.

It catches: links to slugs that do not exist, links to drafts, and images
missing from `/public`. Anything it cannot resolve is reported as a warning
rather than swallowed — usually that means a route prefix differs from its
content directory name, which is fixed by declaring the mapping in
`site.config.mjs` (`route:` and `dir:` are separate fields for exactly this).

## Pre-commit

`.githooks/pre-commit`, wired up by `scripts/install-hooks.mjs` running from
`npm run prepare` — so a fresh clone gets it automatically after `npm install`.

Deliberately not husky: a committed hooks directory plus one `git config` line
does the same job with no dependency to maintain and nothing extra to explain
when the repo changes hands.

Deliberately does **not** run `next build` — thirty seconds is tolerable, three
minutes is not, and a hook people find intolerable is a hook they start
bypassing. The full build is CI's job.

`git commit --no-verify` bypasses it. That escape hatch should exist and should
be rare. Twice in a week means the gate is miscalibrated; fix the gate.

## CI and the setting that makes it real

`.github/workflows/ci.yml` runs lint, typecheck, build, the gate tests and a
blocking `npm audit` on every pull request.

**The workflow alone blocks nothing.** GitHub will happily merge a PR with a red
check. Two repository settings turn it into an actual gate:

1. Settings → Branches → add a protection rule for `main`
2. Enable "Require status checks to pass before merging" and select the `verify` job

Without those, CI is a notification. Verify them explicitly during an audit, and
again after a repository transfer — **branch protection rules do not always
survive a transfer between accounts**, which is a quiet way for a handed-over
site to lose its safety net on day one.

`npm audit` **fails the run**, scoped as `--omit=dev --audit-level=high`. The
scoping is the whole design: a moderate advisory in a build-time dev tool is not
reachable from the running site, and failing on it would train people to ignore
the step — but a high-severity advisory in a production dependency is shipped
code, and a standard that reports those without stopping them is not a standard.

Pin third-party actions by commit SHA rather than tag. A tag is mutable: whoever
controls the action can move `v4` onto different code and every consumer picks
it up on the next run. Give each workflow an explicit `permissions:` block too,
or it inherits the repository default, which is often write access to
everything.

## Installing the gates

```bash
cp <skill>/assets/scripts/*.mjs        scripts/
mkdir -p .githooks && cp <skill>/assets/githooks/pre-commit .githooks/
mkdir -p .github/workflows && cp <skill>/assets/workflows/ci.yml .github/workflows/
cp <skill>/assets/site.config.mjs      site.config.mjs
# merge assets/templates/package-scripts.json into package.json
npm install            # runs prepare → installs the hook
npm run build          # prove the chain works before committing it
```

On an existing project, land the gates **before** any refactor. Then when
something breaks you know whether you broke it.

If TypeScript complains about importing `site.config.mjs`, add `"**/*.mjs"` to
`include` in `tsconfig.json`.

## The part no gate can do

Every check here is build-time and text-level. That leaves one entire class
untouched, and it is not a small one: **whether the page is actually any good
to look at.**

This is not hypothetical. An article body in this standard's own example
rendered as a wall of unformatted plain text for several days. The page
returned 200. The text was present. Metadata, structured data and every link
resolved. All five gates passed, twice, under review — because "the content is
there" and "the content is readable" are different questions, and only one of
them can be asked in a script.

So the standard requires a look. Before any launch and before any handoff, open
the site and use it:

- [ ] **An article, top to bottom.** Are headings headings, lists lists,
      quotes quotes? Do images appear, at sane sizes, without the page jumping
      as they load?
- [ ] **The home page and one listing.** Is the order right? Do the cards show
      what they should?
- [ ] **On a phone.** Not a narrow desktop window — a phone, or at minimum
      device emulation. This is where most marketing traffic is.
- [ ] **The forms.** Submit one. Watch it arrive. Then break it (offline in
      devtools) and check the failure is visible and offers a fallback.
- [ ] **The console.** No errors, no CSP violations. A blocked script fails
      silently in production and nowhere else.
- [ ] **A share preview.** Paste the URL into a chat and look at the card.
- [ ] **The 404 page.** Someone will find it.

Ten minutes, and it catches the category that eight scripts cannot. If you
find yourself skipping it because the build is green, remember that the build
was green in the example too.

## When a gate is wrong

A gate that fires on correct work is worse than no gate, because it trains
people to bypass it. When that happens, the fix is one of:

1. **A threshold is wrong** → change the number in `site.config.mjs`.
2. **The rule does not apply to this project** → set it to 0 or remove it from the config.
3. **The check has a bug** → fix the script, and note it as an upstream fix worth carrying back to the skill.

The wrong fix is `--no-verify`, and the second-wrong fix is editing the script
inside one project — that forks the framework and every later project inherits
the divergence.
