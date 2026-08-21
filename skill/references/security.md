# Security

Contents: [threat model](#threat-model) · [headers](#headers) · [CSP](#the-csp) ·
[proxy](#the-proxy) · [geo-blocking](#geo-blocking) · [secrets](#secrets) ·
[dependencies](#dependencies) · [analytics and consent](#analytics-and-consent) ·
[audit checklist](#audit-checklist)

## Threat model

A static marketing site has no login, no database, and no user data at rest.
That removes most of the usual attack surface and leaves a short, specific list:

1. **Cross-site scripting** through content — a markdown body, a frontmatter
   field, or a JSON-LD value that escapes into executable script.
2. **Clickjacking** — the site framed inside someone else's page.
3. **Data leaking to third parties** — every external host the page loads sees
   the visitor's IP, referrer, and user-agent.
4. **Supply chain** — a compromised dependency running at build time.
5. **Credential sprawl** — tokens in git, or nobody knowing which accounts the
   site depends on. This is the one that actually bites, usually at handover.

The controls below map onto those, in that order.

## Headers

Applied to every path via `next.config.ts`. See `assets/security-headers.ts`.

| Header | Value | What it prevents |
|---|---|---|
| `Content-Security-Policy` | see below | XSS, unexpected third-party loads |
| `X-Content-Type-Options` | `nosniff` | The browser guessing a file's type — which is how an uploaded "image" ends up executed |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking on older browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Leaking full URLs to third parties |
| `Permissions-Policy` | camera/mic/geolocation/browsing-topics off | APIs the site never uses, including ad-topics |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Downgrade attacks |

**HSTS is the one irreversible header.** Browsers cache it for the stated
duration and will refuse plain HTTP for that long. Add it only once HTTPS works
on the apex and every subdomain that will ever be used. It ships commented out
for that reason.

## The CSP

Built from `site.config.mjs` so adding an analytics tool means editing one array,
not hand-patching a policy string.

```
default-src 'self'
script-src 'self' 'unsafe-inline' <configured hosts>
style-src 'self' 'unsafe-inline'
img-src 'self' data:
font-src 'self'
connect-src 'self' <configured hosts>
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
object-src 'none'
upgrade-insecure-requests
```

**Why `'unsafe-inline'` is there.** Next's hydration bootstrap and the inline
JSON-LD blocks are inline scripts with no nonce. Removing the directive breaks
the site. A nonce pipeline is possible — it means generating a nonce per request
in middleware, threading it through the document, and losing full static
rendering — and it has to be revisited on every Next upgrade. That trade is
deliberately out of scope; see the closing section of SKILL.md. The compensating
control is that JSON-LD is escaped against script-tag breakout before it is
inlined (`references/seo-gaio.md`), which closes the realistic injection path
for a site whose content comes from its own repo.

**`img-src` deliberately omits `https:`.** Allowing any HTTPS image host is
convenient during a migration and permanent afterwards. Host images locally
instead — the CSP stays tight and the images stop rotting.

Every host added to `cspAllow` is a host that sees your visitors. Add the
minimum, and know what each one is for.

## The proxy

`src/proxy.ts` on Next 16 (`src/middleware.ts` on 15 and earlier). Runs at the
edge on every page request. Three jobs — see `assets/proxy.ts`.

**Noindex for non-production hosts** is the most valuable line in the file.
Vercel preview URLs are public and crawlable; left alone they get indexed and
compete with the real site. One header, checked against the `prodHosts` list.

**Geo-blocking** and **markdown twins** are both optional and both off by
default. The cloaking risk in the twin allowlist is covered in
`references/seo-gaio.md`.

## Geo-blocking

Blocking countries is the site owner's legal and commercial decision, not the
builder's — so `blockedCountries` ships empty and the question gets asked per
project.

Mechanically: Vercel sets `x-vercel-ip-country` at the edge, and a blocked
request gets `451 Unavailable For Legal Reasons` plus `x-robots-tag: noindex`.
Search crawlers run from the US, so a block does not affect indexing. Be honest
with the client that it is IP-based and therefore trivially bypassed with a VPN —
it is a policy signal, not a security control.

## Secrets

A static marketing site should need approximately none, which is the goal to
defend. Things that look like secrets but are not: the IndexNow key (public by
design), a GA4 measurement id, a Calendly URL.

Rules:

- `.env*` is gitignored. Never commit one, not even briefly.
- Anything genuinely secret (a form-handler API key, a CRM token) lives in Vercel
  environment variables, referenced by name in code and in the handover inventory.
- `NEXT_PUBLIC_*` variables are compiled into the browser bundle. Nothing
  sensitive goes there, whatever the name suggests.
- Keep a written inventory of every credential the site depends on, from day one.
  At handover it is required (`references/client-handoff.md`), and reconstructing
  it from memory afterwards is how things get missed.
- If a secret does reach git, rotate it. Rewriting history does not help — assume
  anything pushed to a remote is public forever.

## Dependencies

`npm ci` in CI so the lockfile is what gets built, and `npm audit --omit=dev
--audit-level=high` **as a gate** — a high-severity advisory in a production
dependency is shipped code. Dev-only and moderate findings do not block, because
they are not reachable from the running site and failing on them teaches people
to skip the step.

Watch the framework's own release notes: most production advisories here arrive
transitively through Next rather than through anything you chose, so the fix is
usually a Next patch release rather than a direct dependency bump.

Pin third-party GitHub Actions by commit SHA, not tag — a tag can be moved onto
different code by whoever owns the action. Set an explicit `permissions:` block
on every workflow; without one it inherits the repository default.

File scanners here do not follow symlinked directories. A link inside the
content tree can point anywhere on the machine, and following one both leaves
the project and can loop on a cycle.

Keep the dependency list short. Every package is build-time code execution on
your machine and on Vercel's. The reference stack runs on roughly six runtime
dependencies; a marketing site that has grown to forty has acquired a problem
that is not visible yet.

## Analytics and consent

**No tracker loads before the visitor consents.** That rule is fixed. Which
tracker is the client's choice — GA4, Plausible, Vercel Analytics, or none.

The pattern: the consent banner writes the choice to `localStorage` and fires an
event; the analytics component renders nothing until it sees consent, either on
mount or from that event. Nothing loads on a declined or undecided visit, which
means no cookie, no network request, no CSP entry exercised.

Two details that matter more than they look:

- **Make Accept and Decline the same size.** A greyed-out decline is not consent
  under GDPR, and the pattern is being enforced.
- **Say what actually runs.** "One analytics tool, no ad networks, no
  retargeting" is both truthful and more persuasive than a wall of legalese.

Whatever the client picks, add its hosts to `cspAllow` and to the handover
inventory — an analytics property nobody owns is a dead measurement on day 31.

## Audit checklist

- [ ] The five always-on headers present on a production response
      (`curl -sI https://domain | sort`): CSP, X-Content-Type-Options,
      X-Frame-Options, Referrer-Policy, Permissions-Policy
- [ ] HSTS is the sixth and ships commented out. Enable it deliberately, once
      HTTPS works on every hostname — then confirm it is present
- [ ] CSP has no `https:` wildcard in `img-src` and no host nobody can explain
- [ ] Preview hosts return `X-Robots-Tag: noindex`
- [ ] No `.env` in git history; no secret in a `NEXT_PUBLIC_` variable
- [ ] `npm audit --omit=dev` reviewed
- [ ] `main` is protected and CI is a required check
- [ ] No tracker fires before consent (check DevTools → Network on a fresh profile)
- [ ] Credential inventory exists and is current
