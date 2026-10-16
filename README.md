# Racket Stories

A light-hearted group blog about club racket sports (tennis, padel, squash, pickleball) told from the court, the clubhouse and the car park. It's styled like an old Blogspot blog on purpose: dated header, sidebar archive tree, label cloud, hit counter, "Older Posts" paging and a "Next Blog»" button that takes you somewhere random.

The stories are the posts from the Rallio blog, rewritten as personal first-person accounts by five contributors. Jake is real; Bev, Dan, Priya and Graham are composite characters. The About page and the footer say so.

## How it's built

- `build.mjs` is a static site generator with no dependencies (Node 18+). It reads `content/` and writes plain HTML to `dist/`.
- CSS is inlined into every page (about 7 KB). The only JavaScript is the one-line "Next Blog»" randomiser. Fonts are system fonts.
- Images are served as WebP at 400 and 800 pixels wide, with an 800-pixel JPEG fallback. Each one has a width and height set, and every image except the first is lazy-loaded.
- For SEO the build adds a canonical URL, meta description, Open Graph and Twitter tags to every page. Posts carry `BlogPosting` and `BreadcrumbList` JSON-LD, the home page carries `WebSite` and `Blog`, and author pages carry `ProfilePage`. It also writes `sitemap.xml`, `robots.txt`, an Atom feed at `/feeds/posts/default.xml` and a 404 page.
- URLs follow the Blogspot pattern: `/2026/10/post-slug.html`, `/search/label/padel/`, `/2026/10/`, `/p/about.html` and `/profile/bev.html`.

```bash
npm run build                      # writes dist/ (SITE_URL defaults to the GitHub Pages URL)
SITE_URL=http://localhost:8080 npm run serve   # build and preview at localhost:8080
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

`.github/workflows/pages.yml` builds the site and deploys it to GitHub Pages on every push to `main` or `master`. Turn it on under **Settings → Pages → Source: GitHub Actions**. If you move to a custom domain, set a repository variable `SITE_URL` (for example `https://racketstories.co.uk`) so canonicals, the feed and the sitemap use it.
