# Client handoff

**This file is documentation. Do not execute a transfer, a DNS change, or a key
rotation from a session.** Several steps below are irreversible, some need
credentials nobody should paste into a chat, and all of them are the owner's
call. Produce the inventory, produce the plan, hand it over.

Contents: [before you start](#before-you-start) · [the inventory](#step-1-the-inventory) ·
[access decision](#step-2-decide-what-access-you-keep) · [repository](#step-3-repository)
· [Vercel](#step-4-vercel) · [environment variables](#step-5-environment-variables-and-secrets)
· [domain and DNS](#step-6-domain-and-dns) · [analytics](#step-7-analytics-and-search-console)
· [IndexNow](#step-8-indexnow-key) · [documentation](#step-9-documentation-handover) ·
[after](#step-10-the-week-after) · [irreversible steps](#irreversible-steps-summary)

## Before you start

Handoff is where an otherwise clean project generates its worst week. The pattern
is always the same: an account nobody knew about, a key that was in someone's
head, a DNS record changed at 5pm on a Friday.

Three rules that prevent most of it:

1. **Inventory before you transfer anything.** You cannot hand over what you have
   not written down.
2. **One irreversible step at a time, verified before the next.** Never batch a
   repo transfer with a DNS cutover.
3. **Nothing on a Friday, and nothing during the client's high-traffic period.**

## Step 1: The inventory

Write this out and share it with the client before any transfer. It is the
deliverable that makes the rest safe, and it is the artefact the client will
still be using in two years.

| Item | Value | Currently owned by | Transfer method | Reversible? |
|---|---|---|---|---|
| GitHub repository | `org/repo` | | GitHub transfer | Yes, with cooperation |
| Vercel project | | | Vercel team transfer | Yes, with cooperation |
| Domain registrar | | | Registrar transfer / auth code | Slow (5–7 days) |
| DNS provider | | | Nameserver change | Yes, but propagation is slow |
| Analytics property | | | Add owner, remove self | Yes |
| Search Console property | | | Add owner, remove self | Yes |
| Bing Webmaster Tools | | | Add owner | Yes |
| IndexNow key | in `site.config.mjs` + `public/<key>.txt` | | Regenerate | Yes |
| Form / CRM endpoint | | | Re-provision on client account | Depends |
| Booking link (Calendly etc.) | | | Client's own account | Yes |
| Font licences | | | **Check the licence terms** | Often not transferable |
| Stock imagery licences | | | Check terms | Often not transferable |
| Email / transactional sending | | | | |

**Fonts and imagery deserve a real look.** A commercial webfont licence is
frequently tied to a named licensee and a domain, and it does not automatically
follow the site to a new owner. Finding out afterwards is a legal problem for the
client and a reputational one for you. Check before handover and say plainly what
they need to buy.

## Step 2: Decide what access you keep

Agree this in writing before transferring anything, because it is much harder to
ask for access back than to keep it.

**Default: collaborator access for a fixed warranty period (30–90 days).**
Ownership moves to the client immediately; you keep enough access to fix what you
built. At the end of the period, access is removed on a stated date. Clean for
both sides, and it matches what a warranty actually is.

**Alternative: ongoing retainer.** If the client wants you maintaining content or
shipping changes after launch, access continues under the retainer instead of
ending. Same transfer of ownership — the only difference is that the end date is
"when the retainer ends" rather than a fixed day. Write the review date into the
agreement anyway; open-ended access with no review is how a vendor ends up still
holding admin rights three years later.

**Not recommended: keeping ownership.** Some clients will not sign it, and if the
relationship ends badly the client's site is hostage to it.

Whichever applies, write down: what access, to which systems, until when, and who
removes it.

## Step 3: Repository

**Before transferring:**

- [ ] `main` is green — build, lint, typecheck all pass on a clean clone
- [ ] No secrets in the working tree or in history
- [ ] `AGENTS.md` and `README.md` reflect reality
- [ ] `docs/content-playbook.md` is current, if there is one
- [ ] Any open branches are merged or deliberately abandoned
- [ ] Note the branch-protection settings — you will re-create them after

**Transfer:** GitHub → repository Settings → Transfer ownership.

⚠️ **Irreversible without the new owner's cooperation.** After the transfer, you
are not an owner and cannot transfer it back on your own. Redirects from the old
URL work, but they break if either side later creates a repo with the same name.

**After transferring, verify — do not assume:**

- [ ] Branch protection on `main` still exists, with CI still a **required** check.
      **This is the one that most often does not survive a transfer**, and it
      silently removes the safety net on day one.
- [ ] GitHub Actions are enabled on the new owner's account (org policies differ,
      and a disabled Actions setting means IndexNow and CI just stop)
- [ ] Vercel's GitHub integration reconnected to the moved repository
- [ ] Push a trivial change and watch a deploy complete end to end

## Step 4: Vercel

Two routes, and the difference matters:

**Transfer the project** into the client's Vercel team. Keeps deployment history,
domain configuration, and environment variables. Both sides must be members of
the target team at the moment of transfer.

**Or have the client create a fresh project** from the transferred repository.
Cleaner separation, but you re-add domains and environment variables by hand, and
deployment history starts over.

Prefer the transfer when the site is already live on the domain — recreating a
project means re-attaching the domain, which is a brief window where production
can break.

Checklist:

- [ ] Client has a Vercel account and a team (Hobby plans cannot receive team transfers)
- [ ] Environment variables exist on the target project, per Step 5
- [ ] Production branch is `main`
- [ ] Domains attached and verified
- [ ] Build command and Node version match what the repo expects
- [ ] Deploy protection settings reviewed — preview URLs are public by default
- [ ] A real deploy runs green on the client's account before you step back

## Step 5: Environment variables and secrets

- [ ] List every variable, its purpose, and whether it is genuinely secret
- [ ] `NEXT_PUBLIC_*` values are in the browser bundle — confirm nothing sensitive is there
- [ ] **Rotate every genuine secret at handover.** Not because you distrust
      anyone: a key that two organisations have held is a key with no clear
      owner, and rotating draws the line cleanly.
- [ ] Third-party accounts (form handlers, CRM, email) get re-provisioned on the
      client's own account rather than shared. A service billed to you and used
      by them will eventually be cancelled by accident.
- [ ] Client stores the values in their own password manager, not in a chat thread

## Step 6: Domain and DNS

The slowest and most public part. Registrar transfers take days; DNS changes
propagate for up to 48 hours.

**Registrar transfer** (if you hold the domain):

- [ ] Unlock the domain, disable privacy if it blocks the auth code
- [ ] Provide the authorisation code to the client
- [ ] Client initiates at their registrar; both sides approve
- [ ] ⚠️ Typically **60 days locked** afterwards — no further transfers, and no
      undo. Do not start this in the same week as anything else.
- [ ] Check the expiry date and auto-renew on the receiving account. An expired
      domain is the single worst outcome available here.

**DNS cutover** (pointing the domain at the new site):

- [ ] Lower the TTL on the relevant records 24–48h in advance, so a mistake can be
      undone in minutes instead of a day
- [ ] Record the current values before changing anything
- [ ] Change records, then verify: `dig`, then load the site, then check HTTPS
- [ ] Confirm the certificate is issued before announcing anything
- [ ] Restore the normal TTL once it is stable
- [ ] ⚠️ **Do not enable HSTS until HTTPS works on every hostname.** Browsers cache
      it for the full max-age and there is no way to un-tell them.
- [ ] Leave MX and any verification TXT records alone unless email is explicitly
      in scope. Breaking a client's email during a website launch is the classic
      handover disaster.

## Step 7: Analytics and Search Console

- [ ] **Analytics property**: add the client as an administrator, confirm they can
      see the data, then remove yourself (or stay, per Step 2). Moving a property
      between accounts loses historical data — add an owner instead of migrating.
- [ ] **Search Console**: add the client as an owner. Verification is per-property,
      so if verification used a DNS TXT record or an HTML file, make sure it
      survives the DNS cutover.
- [ ] **Bing Webmaster Tools**: same.
- [ ] Export or screenshot the baseline numbers at handover. It is what any later
      "the site got worse" conversation is settled with.

## Step 8: IndexNow key

The key is public by design, so this is not a secret rotation — but the key is
tied to the domain and the repo, and regenerating it at handover keeps the
inventory honest.

- [ ] Generate a new key: `node -e "console.log(crypto.randomUUID().replace(/-/g,''))"`
- [ ] Update `indexnow.key` in `site.config.mjs`
- [ ] Add `public/<newkey>.txt` containing the key as its only content
- [ ] Delete the old `.txt`
- [ ] Deploy, then confirm `https://<domain>/<newkey>.txt` returns 200 — IndexNow
      silently rejects submissions when it cannot fetch the key file
- [ ] `npm run indexnow -- --all` once, to confirm the new key is accepted

## Step 9: Documentation handover

The client is not a developer. The document they need is not this file — it is a
short, plain-language page covering:

- How to publish a page or an article (the actual steps, with the file paths)
- What the gates do, and what to do when one fails: the deploy failed, the live
  site is untouched, read the error, fix, push again
- How to roll back: `git revert --no-edit HEAD` then push
- Who to contact and until when
- The inventory table from Step 1
- What is deliberately not covered — no CMS, no automated tests, no performance
  budget (see the closing section of SKILL.md) — so its absence is a known choice
  rather than a surprise

Walk them through it live once. A document nobody has been walked through is a
document nobody reads.

## Step 10: The week after

- [ ] Day 1: full smoke test on production — every top-level page, the forms, the
      booking link, share previews on one social platform
- [ ] Day 2: Search Console coverage — no new 404 spike, sitemap read successfully
- [ ] Day 7: analytics still recording; deploys still running on the client's account
- [ ] Day 30 (or the agreed date): remove your access, confirm in writing, and
      update the inventory to say who owns what now

## Irreversible steps summary

Do these one at a time, on separate days, verified before the next:

| Step | Why it cannot be undone |
|---|---|
| GitHub repository transfer | You lose ownership; return requires the new owner to act |
| Domain registrar transfer | ~60-day lock afterwards |
| Enabling HSTS | Browsers cache it for the full max-age; no way to retract |
| Deleting the old IndexNow key file | Trivial to recreate, but submissions fail silently until you do |
| Removing your own access | Getting it back requires the client to grant it |
| Rotating a secret | Anything still using the old value breaks immediately |

And one that is not irreversible but behaves like it: **letting a domain expire.**
Check the expiry date and auto-renew setting on the receiving account before you
close the project.
