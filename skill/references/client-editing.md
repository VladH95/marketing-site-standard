# Letting the client edit

Contents: [why a git-backed editor](#why-a-git-backed-editor) · [setup](#setup) ·
[the config is the training](#the-config-is-the-training) · [who can edit](#who-can-edit) ·
[what it cannot do](#what-it-cannot-do) · [handoff](#handoff)

Content as files in git suits a developer and suits nobody else. A client who
cannot publish without asking you will either stop publishing or stop paying
attention to the site — both of which make the work you did worth less.

## Why a git-backed editor

Keystatic gives an admin UI at `/keystatic` and stores everything as the same
markdown files the site already reads. The decisive property is what happens on
save:

**Their save is a commit.** So the client's publish runs the pre-commit hook,
CI, and the build gates — the same ones we run. They cannot ship an article
with no FAQ, a missing cover, or a link to a deleted page, because the gate sits
upstream of their publish rather than beside it.

A database-backed CMS inverts that. "Publish" writes to a table, the page
renders from the table, and every gate in this standard is bypassed by the one
person least equipped to notice. That is the argument, and it is worth more
than any feature comparison.

Everything else follows from staying in git: no database, no blob storage, no
monthly cost, no backups to arrange, and exactly one extra account on the
handoff inventory.

The honest cost is that submissions and leads cannot live here — see
`references/forms-and-leads.md` for why that boundary exists and where they go.

## Setup

Turn it on in `site.config.mjs` and re-run the installer (the flag alone copies
nothing):

```js
editor: { enabled: true, repo: { owner: "client-org", name: "site" } }
```

```bash
node <skill>/assets/scripts/scaffold.mjs
npm install @keystatic/core @keystatic/next
npm run dev   # http://localhost:3000/keystatic
```

Local development reads and writes the working copy directly, so you can build
the field model without touching GitHub. Production uses GitHub mode, and that
needs one setup step nobody guesses:

**Keystatic authenticates through a GitHub App**, which you create once per
site. Keystatic's own docs walk it through; what matters here is what it leaves
you with, because these are secrets and they belong in the handoff inventory:

```
KEYSTATIC_GITHUB_CLIENT_ID
KEYSTATIC_GITHUB_CLIENT_SECRET
KEYSTATIC_SECRET                 # any long random string
NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
```

Set all four in Vercel (and in `.env.local` to test locally). The app's callback
URL must point at the production domain, so an app created against a preview URL
signs people in on the preview and nowhere else — a confusing failure worth
avoiding by doing this after the domain is live.

Only the `NEXT_PUBLIC_` one is safe to expose; the client secret is a real
secret and gets rotated at handoff like any other.

The config gate checks that `editor.repo` is filled and that
`keystatic.config.ts` exists, so an enabled flag with nothing behind it fails
the build instead of shipping a broken admin.

## The config is the training

`keystatic.config.ts` is the only documentation most clients will ever read,
because it is the text next to the box they are typing in. Two rules:

**Every field maps to frontmatter the gate knows, with the same limits.** A
field the gate ignores is a field nobody validates. A gate rule with no field is
an error the client cannot act on — they get a failed deploy and no way to fix
it. And where the two disagree on a number, the editor happily saves work the
build then rejects: the shipped config sets `min: 3` on FAQ and `3–5` on
takeaways precisely because the content gate does. Change one, change both.

**Descriptions are written for them, not for us.** "Shown in Google results,
aim for 50–160 characters" is training. "Meta description" is not.

Two settings worth copying:

- `draft` defaults to **true**, so an accidental save never publishes. Turning
  it off is the deliberate act that brings the gates into play.
- Mark fields required in Keystatic wherever the gate requires them. Being
  stopped in the form takes a second; being stopped by a failed deploy takes a
  round trip and feels like the site is broken.

## Who can edit

Access is GitHub repository write access. There is no role system inside
Keystatic — whoever can push can edit.

- **One person:** ideal, nothing to think about.
- **Adding a second or third:** works. Each needs a GitHub account and write
  access to the repository. Be explicit with the client that this grants access
  to the whole repository, not just the text. Fine for colleagues, not for a
  freelancer you met last week.
- **Approval workflows:** not expressible. See below.

## What it cannot do

Say these out loud before the client discovers them:

- **No "draft, then someone approves".** Write access is write access. If the
  client needs editorial approval, that is the line where a database-backed CMS
  earns its cost.
- **No non-GitHub logins.** Everyone editing needs a GitHub account, which is a
  small but real ask of a marketing person.
- **Media at scale.** Images go into the repository. Fine for a marketing site;
  wrong for thousands of assets.
- **No submissions or leads.** Those never enter git.

If a project needs the first or the last of these, raise it during scoping.
Moving from files to a CMS later is straightforward; moving from a database
back to files is not.

## Handoff

- Create the client's GitHub access before the repository transfer, and check
  they can sign in to `/keystatic` themselves — not that it works for you.
- Walk them through publishing one real page, live, once. A document nobody has
  been walked through is a document nobody reads.
- Show them what a failed gate looks like, and what to do: the deploy failed,
  the live site is untouched, read the message, fix, save again. Seeing this
  once removes most of the fear of breaking something.
- Add the editor to the handoff inventory in `references/client-handoff.md`
  alongside the repository, since access to one is access to the other.
