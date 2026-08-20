# Forms and leads

Contents: [the one hard rule](#the-one-hard-rule) · [the shape that works](#the-shape-that-works) ·
[choosing a provider](#choosing-a-provider) · [spam](#spam) ·
[failure behaviour](#failure-behaviour) · [personal data and handoff](#personal-data-and-handoff) ·
[testing checklist](#testing-checklist)

On a marketing site the form is usually the only thing that produces revenue.
Everything else is persuasion; the form is the conversion. It also fails more
quietly than anything else on the site — a broken form looks exactly like a
site nobody is contacting, and the owner finds out weeks later, if at all.

## The one hard rule

**Submissions never go into the repository.** This is the single place where
the file-based model stops being the right answer, and it is worth being
explicit about why, because "everything is a file" is otherwise the whole
premise of this standard:

- Every submission would be a commit, and every commit a rebuild. The site
  redeploys because a stranger filled in a form.
- Spam bots would be committing to the repository. There is no way to make that
  acceptable.
- Personal data would enter git history permanently. Git history is designed
  not to forget, so "please delete my data" becomes a request you technically
  cannot honour without rewriting history everyone has already cloned.
- Two submissions at once conflict.

So form data lives outside git. That is not a compromise of the model; it is
the correct boundary of it — content is authored and versioned, submissions are
received and expire.

## The shape that works

```
visitor → form POST → form provider → ─┬→ email notification
                                       └→ provider's dashboard (searchable, exportable)
```

The provider stores submissions, filters spam, sends the email, and gives the
site owner a page where they can see everything. No database on our side, no
admin UI to build and secure, nothing extra on the handoff inventory except one
account.

The obvious question is whether submissions can show inside the content editor
instead, so the owner has one login. They cannot, without adding the database
this standard deliberately avoids — a git-backed editor renders what is in git,
and submissions must not be in git. Two logins is the honest cost. If a single
view is genuinely wanted later, the cheaper version is a password-protected
page in the site that reads the provider's API; the data still lives with the
provider, so the obligations do not move.

## Choosing a provider

Decide with the client, not for them. What actually differentiates them:

| Question | Why it decides things |
|---|---|
| Does the client need to see a list, or is email enough? | Email-only providers are simpler and cheaper; a dashboard is what makes "where did that enquiry go" answerable |
| Must the data stay in the EU? | Most providers are US-hosted. EU-resident options exist and this is a legal question, not a preference — ask the client's side, do not assume |
| Expected volume? | Free tiers are generous and marketing-site volume is low; this is rarely the deciding factor |
| Does a CRM already exist? | If yes, deliver there as well from day one. Retrofitting lead history later is painful |

**Create the account in the client's name from the start.** Not yours, then
transferred. This costs nothing on day one and removes an irreversible step
from the handoff, and it means a data-deletion request is something they can
act on without you.

## Spam

Assume it. A public form with an email field gets found within days.

Use the provider's built-in filtering, plus a honeypot field (a hidden input
real users never fill). Prefer both over a visible CAPTCHA: a CAPTCHA is a
conversion cost paid by every legitimate visitor to stop a problem the provider
already handles. If one is genuinely needed, it belongs in `security.cspAllow`
too, or it will be blocked and the form will silently stop working.

## Failure behaviour

Decide what happens when the POST fails, and test it — this is the part that is
always skipped and always matters.

- The visitor must see a clear failure, never a silent no-op and never a
  spinner that never resolves. A form that appears to succeed and did not is
  worse than one that visibly failed.
- Give them a fallback in the error state: a plain email address they can use
  instead. A mailto link recovers the lead that the outage would otherwise cost.
- Never clear the form on failure. Re-typing is how a frustrated prospect leaves.
- The success state should say what happens next and when ("we reply within one
  working day"), not just "thanks".

## Personal data and handoff

A form collects personal data, which means someone owns obligations for it.
Settle this before launch, not at handoff:

- Whose privacy policy covers it, and does that policy actually name the
  provider being used?
- Who can access the submissions, and who removes that access later?
- How long is data kept? Most providers can auto-delete after N days — a
  sensible default that shrinks the problem.
- Where does a deletion request go, and can the client action it alone?

Add the provider account to the handoff inventory in
`references/client-handoff.md` like any other credential.

## Testing checklist

Run this before launch and again after the DNS cutover, because the cutover is
exactly when a form silently breaks:

- [ ] Submit a real test enquiry from the production domain
- [ ] The notification email arrives, and not in spam
- [ ] The submission appears in the provider dashboard
- [ ] The reply-to address is the visitor's, so replying works from the inbox
- [ ] Success state is visible and says what happens next
- [ ] Failure state is visible and offers the fallback email (block the request
      in devtools to see it)
- [ ] Required-field validation fires before submit, not after
- [ ] Nothing in the flow is blocked by the CSP — check the console
- [ ] The thank-you page is in `seo.noindexRoutes` and out of the sitemap
- [ ] The client has logged into the dashboard once, themselves
