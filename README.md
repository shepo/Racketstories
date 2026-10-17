# Racket Stories

A light-hearted group blog about club racket sports (tennis, padel, squash, pickleball) told from the court, the clubhouse and the car park. It's styled like an old Blogspot blog on purpose: dated header, sidebar archive tree, label cloud, hit counter, "Older Posts" paging and a "Next Blog»" button that takes you somewhere random.

The stories are the posts from the Rallio blog, rewritten as personal first-person accounts by five contributors. Jake is real; Bev, Dan, Priya and Graham are composite characters. The About page and the footer say so.

## How it's built

- `build.mjs` is a static site generator with no dependencies (Node 18+). It reads `content/` and writes plain HTML to `dist/`.
- CSS is inlined into every page (about 7 KB). The only JavaScript is the one-line "Next Blog»" randomiser. Fonts are system fonts.
- Images are served as WebP at 400 and 800 pixels wide, with an 800-pixel JPEG fallback. Each one has a width and height set, and every image except the first is lazy-loaded.
- For SEO the build adds a canonical URL, meta description, Open Graph and Twitter tags to every page. Posts carry `BlogPosting` and `BreadcrumbList` JSON-LD, the home page carries `WebSite` and `Blog`, and author pages carry `ProfilePage`. It also writes `sitemap.xml`, `robots.txt`, an Atom feed at `/feeds/posts/default.xml` and a 404 page.
- URLs follow the Blogspot pattern, minus the `.html`: `/2026/10/post-slug`, `/search/label/padel/`, `/2026/10/`, `/p/about` and `/profile/bev`.

```bash
npm run build                      # writes dist/ (SITE_URL defaults to https://racketstories.com)
SITE_URL=http://localhost:8080 npm run serve   # build and preview at localhost:8080 (Cloudflare-style URLs)
```

## Writing a post

Add `content/posts/<slug>.md`:

```markdown
---
title: My post title
date: 2026-11-02T20:15        # UK local time
author: bev                   # a key from content/authors.json
labels: Tennis, Mixers
description: One or two sentences for search results and link previews.
image: night-courts           # a name from static/images (used for og:image)
imageAlt: What the image shows
---

The first paragraphs appear on the home page.

![Alt text](night-courts "Optional caption")

<!--more-->

The rest of the post. Supported markdown: ## and ### headings, **bold**, *italic*, [links](https://...), - and 1. lists, > quotes, --- and a "P.S." paragraph.
```

Comments for a post go in `content/comments.json` under the post's slug. The comment form is switched off on purpose.

To add photos, put full-size JPEGs in a folder and run `scripts/optimise-images.sh <folder>` (needs ImageMagick).

## Deploying

The site is hosted on **Cloudflare Workers** (static assets only, no Worker code) at **https://racketstories.com**.

- `wrangler.jsonc` points Cloudflare at `dist/`, attaches the `racketstories.com` custom domain, serves `dist/404.html` for unknown URLs, and serves `a/b.html` at `/a/b`. That is why pages are linked without `.html`.
- `static/_headers` (copied to `dist/_headers`) adds security headers and caching for images.
- The repo is connected to the Worker through **Workers Builds**. Every push to `master` runs `npm run build` and then `npx wrangler deploy`. Pull requests get preview URLs.
- `SITE_URL` defaults to `https://racketstories.com`, so canonicals, the feed, the sitemap and `robots.txt` use it.

To deploy by hand instead: `npm run deploy` (needs `npx wrangler login` first).

`npm run serve` builds the site and previews it at http://localhost:8080 with the same URL rules as Cloudflare.
