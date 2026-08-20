<!--
  Content playbook template. Copy to docs/content-playbook.md and fill in with
  THIS client's facts.

  Why this file exists: content sessions hallucinate positioning. Left to
  memory, an agent will invent a price range, promote the wrong segment, or
  quietly re-word a claim the client's legal team agreed. One file that wins
  over memory is the fix — and it only works if it is genuinely the single
  source, so resist keeping a second copy of any fact anywhere else.

  Fill every {{PLACEHOLDER}}. An unfilled placeholder is better than a
  plausible guess: it fails loudly at review instead of shipping as fact.
-->

# {{CLIENT}} Content Playbook

**The single source of truth for writing, reviewing, and shipping content on {{DOMAIN}}.**
Every writing or reviewing session starts here. Where this file and your memory
disagree, this file wins.

Last reconciled: {{YYYY-MM-DD}} by {{WHO}}.

---

## 0. The mission

What the content is for, in one paragraph. Not "brand awareness" — the actual
mechanism. Which searches should find it, what it should make the reader do,
which page it should send them to.

Reader profile: {{role, seniority, company stage, what they already tried, what
they are afraid of}}. Write for that person, not for a persona document.

---

## 1. Canonical facts — use verbatim, never improvise

Everything in this table is checked at review. Anything not in this table is not
a fact yet.

| Fact | Value |
|---|---|
| Positioning | {{...}} |
| Who it is for | {{...}} |
| Who it is NOT for | {{...}} |
| Pricing / commercial model | {{...}} |
| Location | {{...}} |
| Proof points (verifiable only) | {{awards, ratings, named metrics, sources}} |
| Preferred examples / case studies | {{...}} |
| ⛔️ Never claim / never lead with | {{...}} |

Proprietary frameworks or named methods worth referencing: {{...}}

---

## 2. Content plan

### 2.1 Live

| Slug | Target query | Volume / difficulty | Notes |
|---|---|---|---|

### 2.2 Queue (approved {{DATE}})

| # | Slug | Target query | Volume / difficulty | Links to |
|---|---|---|---|---|

Re-verify search metrics before writing. They drift, and a piece written against
last quarter's numbers is a piece written for nobody.

### 2.3 Rejected — do not re-propose without fresh data

| Topic | Why rejected | Checked |
|---|---|---|

### 2.4 Permanent exclusions

{{Competitors never to name, topics never to revisit, and why.}}

---

## 3. Clusters, linking, AI visibility

### 3.1 Clusters

Each cluster has one pillar page and several supporting pieces that all link to it.

- **{{Cluster}}** (pillar `{{slug}}`): {{supporting slugs}}

Every piece links to: its pillar + at least one commercial page + related pieces.
Minimum {{N}} internal links, descriptive anchor text only — "click here" wastes
the strongest ranking signal you control.

### 3.2 Commercial-page mapping

{{Which article types point at which service/product page, and the closing CTA pattern.}}

### 3.3 External links

Allowed sources: {{...}}
⛔️ Never link to: {{...}}
⛔️ Never cite an unverifiable statistic. If the primary source cannot be opened
and read, the number does not go in.

### 3.4 Structure that AI answer engines can cite

- A short "what this covers" list in the intro
- A direct answer in the first sentence of each H2 — answer engines extract the
  first sentence, so burying the answer under a wind-up loses the citation
- At least one blockquote (attributed quote or key insight)
- FAQ in frontmatter only, never as a hand-written section in the body — the
  frontmatter version renders *and* emits FAQPage schema; a body version emits
  nothing
- List-format pieces: add the `itemList` frontmatter so they emit ItemList schema

---

## 4. Article standards

### 4.1 Frontmatter (exact)

```yaml
---
title: "..."            # contains the primary query
description: "..."      # {{150–160}} chars
date: 'YYYY-MM-DD'
category: {{allowed values — reuse existing only}}
author: {{NAME}}
cover: /images/blog/<slug>.png    # must exist; {{DIMENSIONS}}
draft: false
takeaways:              # 3–5, declarative and specific
  - "..."
faq:                    # ≥3 decision-level questions
  - question: ...?
    answer: >-
      Prose. No bullets inside an answer.
---
```

### 4.2 Body

- H1 comes from the title — never write one in the body. H2 for sections, H3 beneath. No H4+.
- Open with the problem or the claim. No preamble, no "in today's landscape".
- {{Any project-specific formatting bans, e.g. no `---` dividers between entries.}}
- No HTML comments — they render as visible text.

### 4.3 Voice

{{Two or three real sentences from published work that sound right.}}

Never write: {{the specific phrasings this client hates}}.

---

## 5. Standing corrections

Numbered, dated, and quoted where possible. Violating one is a failed review.
This section is the memory of every mistake already made once — it is the most
valuable part of the file, and it only stays valuable if new corrections get
added the day they happen.

1. {{...}}

---

## 6. Workflow

### 6.1 Writer

1. Re-verify the target query.
2. Write the full piece per §4.
3. De-slop pass (`/stop-slop` or its rules by hand) before showing anyone.
4. Show the full text for approval. Wait for an explicit yes.
5. Source the cover image. {{Where from.}}
6. Gate: `npm run build` — 0 errors.
7. Branch `{{prefix}}/<slug>`, commit, push. Stop there — do not merge.

### 6.2 Reviewer

1. Diff every factual claim against §1.
2. Check every internal link resolves and every external link is on the allowed list.
3. Update `date:` to the actual publish date — branches sit for days.
4. Web-verify anything about a third party; ratings and prices drift.
5. Full `npm run build`.
6. Show a preview. Wait for explicit approval to merge.
7. Merge, push, then verify on production: 200, key phrases present, structured
   data valid, listed on the index page and in the sitemap.

### 6.3 Infra notes

- {{Deploy behaviour, branch conventions, who can merge.}}
- Structured data, sitemap, robots, and feeds are generated. Never hand-managed.

---

## 7. Open items

- [ ] {{...}}
