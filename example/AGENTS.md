<!--
  Project working rules. Copy to the repo root as AGENTS.md, and make CLAUDE.md
  a single line: @AGENTS.md

  Fill in every {{PLACEHOLDER}}. Delete sections that do not apply — a rule
  that is not true of this project trains sessions to skim the whole file.

  Keep this SHORT. It is loaded into every session; the long-form reasoning
  lives in the marketing-site-build skill, not here.
-->

# {{PROJECT NAME}} — working rules

Marketing site for **{{DOMAIN}}**. Next.js {{VERSION}} (App Router) + TypeScript +
Tailwind {{VERSION}}. Content is **file-based** — no CMS. You edit files, commit,
push, and Vercel deploys. Most work here is content: copy, pages, SEO.

Project settings live in `site.config.mjs`. Change behaviour there, not in the scripts.

## The one hard rule: never push a broken build

```bash
npm run build      # the gate — must succeed
npm run lint       # 0 errors
```

The pre-commit hook runs lint, typecheck and the content and link gates — but
**not** the full build, because a slow hook is a bypassed hook. CI runs
everything including the build. So run `npm run build` yourself before pushing
anything non-trivial; the hook passing is not the same as the build passing.

If either fails, fix it — do not reach for `--no-verify`. Nobody downstream
reviews this code, and a broken push is a broken live site.

## How to work

1. Read the relevant files before editing.
2. Edit.
3. Verify locally: `npm run build` and `npm run lint`. For visual changes, check the dev server.
4. Commit and push{{COMMIT_AUTHOR_RULE}}.
5. Verify live on the deploy preview — curl the page, confirm the change is really there.
6. Report what changed in plain, non-technical language.

**If you break it, undo it.** Do not leave `main` broken; the owner cannot fix it.

```bash
git revert --no-edit HEAD
git push origin main
```

## Content

{{#IF_BLOG}}Writing or reviewing an article? Read `docs/content-playbook.md` first — it is
the source of truth for positioning, standards, and the review workflow. Do not
write copy from memory.{{/IF_BLOG}}

| What | Where | Format |
|---|---|---|
| {{Blog posts}} | `src/content/blog/<slug>.md` | YAML frontmatter + markdown |
| {{...}} | | |

Rules:

- **New page = new file.** It appears in the listing, sitemap, and feed automatically.
- **Work in progress:** `draft: true` in frontmatter excludes it from everything.
- **Slugs:** lowercase `a-z 0-9 -`. The filename is the URL. **Never rename a live slug** — it changes the URL and loses the rankings. If you truly must, add a 301 to the redirect registry in `next.config.ts` in the same commit.
- **Images:** files go in `public/images/...`, referenced root-relative (`/images/foo.png`). Never hotlink an external URL.
- **Internal links:** root-relative (`/blog/...`), never the full `https://{{DOMAIN}}/...`.
- **Headings:** real `##` / `###`. Not bold text pretending to be a heading. No skipped levels.

## Do not touch unless you mean it

- `next.config.ts`, `src/proxy.ts`, `src/app/layout.tsx`, `src/lib/*`, `tsconfig.json`
- `scripts/*` — the gates. Change `site.config.mjs` instead.
- SEO plumbing is automatic: `sitemap.ts`, `robots.ts`, JSON-LD, per-page metadata. Editing content updates them for free. Never hand-edit.
- Never commit secrets or `.env*`.

## UI conventions

- Reuse `src/components/ui/*`. Do not hand-roll a button.
- {{Any new full-bleed section must declare its background theme so the sticky header stays readable.}}
- Respect `prefers-reduced-motion` on animation.

## SEO is the priority

{{If this site replaces a live one on the same domain: URL parity and clean metadata
come before everything. Anything that changes a URL, a redirect, a title, or
structured data gets flagged, not guessed.}}
