# marketing-site-standard

A production standard for marketing websites — Next.js App Router, file-based
content, Vercel — packaged as a Claude Code skill, with a worked example that
proves it runs.

The premise: **a marketing site is finished when whoever owns it can publish a
page and be certain the site did not break and the SEO did not regress.**
Getting there means the rules cannot live in a document. Every rule worth
stating is a script that exits non-zero.

(Who "whoever owns it" is depends on one config flag — see
[Honest scope](#honest-scope).)

## What is here

| | |
|---|---|
| [`skill/`](skill) | The standard itself — decision framework, eight reference documents, and copy-ready scripts, hooks, workflows and components |
| [`example/`](example) | A real Next.js site built with it. CI on this repository runs its gates on every pull request |

## The gates

`npm run build` in `example/` is a chain, and any link failing stops the deploy:

```
check-config → gen-image-dimensions → check-content → check-links → next build
```

Each one exists because of a specific failure that is invisible until it is
expensive:

- **`check-config`** — a site still pointing at the template domain. Nothing
  crashes: canonical tags, the sitemap and the preview-noindex rule are all
  confidently wrong *together*, which is why no other check catches it. Also
  refuses a tracker whose host is missing from the CSP, since that fails
  silently in production only.
- **`gen-image-dimensions`** — a file whose header will not parse, usually a
  WebP saved with a `.png` extension. The page renders without dimensions and
  shifts as it loads.
- **`check-content`** — a missing cover, an FAQ too thin to emit valid
  structured data, a long article with no summary. Easy to forget, expensive
  to discover after publishing.
- **`check-links`** — derives the real route table by walking the app
  directory, then resolves every internal link against it. A renamed slug
  fails here rather than in Search Console six weeks later.

Warnings print and pass. A gate that blocks a deploy over a 72-character title
teaches people to route around it, and then the errors stop being read too.

Three layers enforce this, fast to thorough: a pre-commit hook (~30s, no
husky — a committed hooks directory and one git config line), CI on every pull
request, and the deploy itself, where a non-zero exit means Vercel keeps the
previous version live.

**The gates are tested for rejection, not just acceptance.** A green build only
proves good input passes; it says nothing about whether a check quietly stopped
catching things. `npm run test:gates` breaks eleven things on purpose in a
scratch copy — a placeholder domain, a corrupt image, a missing cover, a link
to a drafted post — and asserts each one exits non-zero with the right message.
It runs in CI alongside the build. Two independent reviews of this project
found gates that passed input they should have rejected, which is why this
exists.

The dependency audit is a gate too, not a notice: `npm audit --omit=dev
--audit-level=high` fails the run. A repository with "standard" in its name
shipping known high-severity advisories while its own CI stays green is the
exact contradiction this is here to avoid.

Copied files drift. `npm run doctor` compares a project's framework files
against the skill they came from and names what differs, so falling behind is
visible rather than silent. It never writes.

## What is deliberately not in it

Stated out loud, because each is a real limit:

- **A nonce-based CSP.** The shipped policy allows `'unsafe-inline'` for
  scripts because Next's hydration bootstrap needs it. Tightening it is a
  separate project with breakage risk on every Next upgrade.
- **Performance and accessibility budgets.** No Lighthouse CI, no axe.
- **Automated tests.** The build plus the content gates are the safety net,
  which suits sites whose logic is mostly content rendering and stops suiting
  them the moment real interactivity appears.
- **Editorial approval workflows.** The optional editor is git-backed, so
  access is repository write access and "draft, then someone approves" is not
  expressible.
- **A form backend.** Where submissions go and what to test is specified;
  the provider is a per-project choice, and hard-wiring one vendor into a
  framework is the opposite of portable.

## Using the skill

```bash
git clone https://github.com/VladH95/marketing-site-standard.git
cp -R marketing-site-standard/skill ~/.claude/skills/marketing-site-build
```

Then, in a project, describe the task — "bring this site up to our standard",
"audit the SEO", "we're handing this to the client" — and Claude Code loads it.

To install the standard into a project directly:

```bash
node ~/.claude/skills/marketing-site-build/assets/scripts/scaffold.mjs --dry-run
node ~/.claude/skills/marketing-site-build/assets/scripts/scaffold.mjs
```

The installer refuses a directory that is not a Next.js project, never
overwrites an existing file, and names any dependency you still need.

## One config, one framework

Everything project-specific — domain, content collections, blocked countries,
analytics provider, CSP hosts — lives in `site.config.mjs`. Scripts, hooks,
workflows and headers are copied unmodified. Needing to edit a script means a
config field is missing.

Two honest limits: page components are design work and are never generated,
and a config flag alone does nothing — optional pieces are copied only when
the flag is already on, so switching one on later means re-running the
installer. The config gate catches it if you forget.

## Reference documents

Loaded on demand rather than all at once.

| | |
|---|---|
| [`architecture.md`](skill/references/architecture.md) | Content model, routing, adding a content type |
| [`quality-gates.md`](skill/references/quality-gates.md) | What each gate catches, and what to do when one is wrong |
| [`seo-gaio.md`](skill/references/seo-gaio.md) | Sitemap, structured data, redirect discipline, migrating onto a live domain |
| [`security.md`](skill/references/security.md) | Threat model, headers, CSP, secrets |
| [`content-system.md`](skill/references/content-system.md) | Content playbook, frontmatter contract, writer→reviewer split |
| [`client-editing.md`](skill/references/client-editing.md) | Git-backed editor: why a client's publish runs the same gates |
| [`forms-and-leads.md`](skill/references/forms-and-leads.md) | Why submissions never enter git, and where they go instead |
| [`client-handoff.md`](skill/references/client-handoff.md) | Transfer checklist with every irreversible step flagged |

## Honest scope

Two things worth setting expectations on, because the word "standard" invites
the wrong ones.

**Who can publish.** Out of the box this produces a site an *editor comfortable
with git* can run — YAML frontmatter, commit, push, with guardrails. A
genuinely non-technical owner needs the git-backed editor switched on as well,
and then publishing is a form and a button whose save still runs every gate.

**The AI-visibility guidance is field observation, not documented behaviour.**
No engine publishes how it picks what to quote. That section carries a date and
a warning, and it is the shakiest ground here. Measure it on your own analytics
rather than taking it on faith.

## Licence

MIT. Take it, fork it, disagree with it.
