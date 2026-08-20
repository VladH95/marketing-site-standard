# Content system

Contents: [the playbook](#the-playbook) · [frontmatter contract](#the-frontmatter-contract) ·
[writer workflow](#writer-workflow) · [reviewer workflow](#reviewer-workflow) ·
[why two roles](#why-two-roles) · [common failures](#common-failures)

## The playbook

Every project with a blog gets `docs/content-playbook.md`, from
`assets/templates/content-playbook.md`. It is the single source of truth for
positioning, the content plan, article standards, and the review workflow.

It exists because content sessions hallucinate facts. Without one file that
explicitly wins over memory, an agent will invent a price range, promote a
segment the client abandoned, or re-word a claim that legal already signed off.
The failure is confident and plausible, which is what makes it expensive.

Three properties make a playbook work:

**It wins over memory, explicitly.** Say so in the first paragraph: "when this
file and your memory disagree, this file wins."

**It is genuinely single.** The moment a fact lives in two places, one of them
goes stale and nobody knows which. If the positioning appears in the playbook
and also in a component, the component reads it or the playbook points at it.

**It records corrections as they happen.** The "standing corrections" section —
numbered, dated, quoted where possible — is the memory of every mistake already
made once. It is the highest-value section in the file, and it only stays
valuable if new entries get added the day the correction is given.

A playbook carries the client's facts and nothing else. Never copy positioning,
pricing, case examples, or exclusions from one client's playbook into another's.

## The frontmatter contract

Frontmatter is the interface between an author and everything generated: the
page, the listing card, the sitemap entry, the RSS item, the structured data.
The content gate enforces the parts that can be checked.

```yaml
---
title: ...             # contains the primary query
seoTitle: ...          # optional shorter title, used in search results
description: ...       # meta description and share text
date: 'YYYY-MM-DD'
category: ...          # reuse an existing value; a new one splits the taxonomy
author: ...
cover: /images/blog/<slug>.png
draft: false           # true hides it from everything
takeaways: [...]       # 3–5, required on long-form
faq: [{question, answer}, ...]   # ≥3 complete pairs
---
```

Two conventions worth keeping regardless of project:

- **The filename is the URL.** No `slug:` field, no mapping table, no way for the
  two to drift.
- **`draft: true` is the only way to hide something.** Not a comment, not a
  branch nobody merges, not moving the file. One mechanism the loader, gate, and
  link checker all understand.

## Writer workflow

1. **Re-verify the target query.** Search metrics drift; a piece written against
   last quarter's numbers is a piece written for nobody.
2. **Write the full piece** to the playbook's standards, frontmatter included.
3. **De-slop pass** before showing anyone — run `/stop-slop` or apply its rules.
   Doing it first means the reviewer reads the argument instead of the tics.
4. **Show the full text and wait for explicit approval.** Not a summary. Approval
   on a summary is approval of nothing.
5. **Source the cover image**, at the project's dimensions.
6. **Run the gate**: `npm run build` → 0 errors.
7. **Branch, commit, push. Stop there.** Writers do not merge.

## Reviewer workflow

The checklist below is not generic diligence — each line is a class of error
that has actually shipped.

1. **Diff every factual claim against the playbook's canonical facts.** Stage,
   segment, pricing, proof points, exclusions.
2. **Update `date:` to the real publish date.** Branches sit for days under any
   spaced-publishing plan, and a backdated post lands below the fold in the
   listing.
3. **Verify every internal link resolves and every external link is allowed.**
   `npm run check:links` covers the internal half mechanically.
4. **Web-verify anything about a third party.** Ratings, prices, and headcounts
   drift, and an out-of-date number about someone else is the one readers notice.
   Keep it consistent across every page that mentions them.
5. **Check structural requirements** — the frontmatter fields that drive
   structured data, present and complete.
6. **Full `npm run build`.**
7. **Show a preview and wait for an explicit yes to merge.**
8. **Merge, push, verify on production**: 200, key phrases present, structured
   data valid, appears on the index page and in the sitemap.

## Why two roles

The writer optimises for finishing; the reviewer optimises for correctness.
Collapsed into one session, correctness loses — not through carelessness but
because the person who just wrote the sentence is the worst reader of it. The
split is worth the extra step, and separating them into two sessions is what
makes it real rather than nominal.

The other reason: the reviewer checklist accumulates. Every regression that
reaches production becomes a line in it. That only works if there is a distinct
step for the lines to accumulate in.

## Common failures

| Failure | Fix |
|---|---|
| Invented statistics with no traceable source | Playbook rule: if the primary source cannot be opened and read, the number does not ship |
| Facts about a competitor inconsistent across pages | Reviewer web-verifies and updates every page that mentions them, in the same pass |
| A hand-written FAQ section in the body | Frontmatter only — the body version emits no schema |
| Slug renamed after publishing | Add the 301 in the same commit, or do not rename |
| Article merged without approval | Branch-only for writers; merge is a separate, explicit step |
| Positioning drifting piece by piece | The playbook is the source; changes go there first, then into copy |
