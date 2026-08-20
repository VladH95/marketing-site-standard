---
title: What this standard actually enforces
description: A tour of the four gates that run before every deploy, and the specific production failures each one is there to prevent.
date: '2026-08-20'
author: Alex Rivera
cover: /images/blog/hello-standard.png
draft: false
takeaways:
  - "The build chain runs four gates before Next compiles anything; any non-zero exit fails the deploy and leaves the live site untouched."
  - "The config gate runs first because every other check is internally consistent with a wrong domain, so a placeholder ships silently."
  - "Warnings never block. A gate that blocks on a 72-character title teaches people to ignore it, and then they ignore the errors too."
faq:
  - question: Why do the gates run before the build rather than after?
    answer: >-
      Because a failed deploy is a real consequence and a printed warning is
      not. On Vercel a non-zero exit marks the deployment failed and the
      previous version stays live, so an incomplete page goes back for rework
      instead of reaching visitors.
  - question: What happens if a gate is wrong about my content?
    answer: >-
      Change the threshold in site.config.mjs. Every number the gates check
      lives there rather than in the scripts, so a project can disagree with a
      default without forking the framework.
  - question: Does this work on a site with no blog?
    answer: >-
      Yes. The content gate only checks the collections declared in the config,
      so a site with none simply has nothing to check and the other three gates
      still run.
---
## The four gates

Each one exists because of a specific failure that is invisible until it is
expensive.

The config gate catches a site still pointing at the template domain. Nothing
crashes in that state, which is the problem: canonical tags, the sitemap and
the preview-noindex rule are all confidently wrong together.

The image step refuses to continue on a file whose header will not parse,
usually a WebP saved with a .png extension. The page renders without
dimensions and shifts as it loads.

The content gate checks the things that are easy to forget and expensive to
find later: a missing cover, an FAQ too thin to emit valid structured data, a
long article with no summary.

The link checker derives the real route table from the app directory and
resolves every internal link against it, so a renamed slug fails here rather
than in Search Console six weeks later.

## What it deliberately does not do

Warnings print and pass. Title length, thin word count, an unmarked quote:
real issues, but blocking a deploy over them trains people to route around the
gate entirely, and then the errors stop being read as well.
