#!/usr/bin/env node
// Racket Stories static site generator. No dependencies: `node build.mjs`.
// Reads content/ and static/, writes a fully static site to dist/.
// SITE_URL sets the absolute origin + base path used for canonicals, feeds and the sitemap.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'dist');
const SITE_URL = (process.env.SITE_URL || 'https://racketstories.com').replace(/\/$/, '');
const BASE = new URL(SITE_URL).pathname.replace(/\/$/, '');

const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const site = readJSON('content/site.json');
const authors = readJSON('content/authors.json');
const comments = readJSON('content/comments.json');

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (p) => BASE + p;
const abs = (p) => SITE_URL + p;
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n) => String(n).padStart(2, '0');

// Dates are written as UK local time ("2026-10-13T21:14"); keep them as wall-clock parts.
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (!m) throw new Error(`Bad date: ${s}`);
  const [y, mo, d, h = '12', mi = '00'] = m.slice(1);
  return { y: +y, mo: +mo, d: +d, h: +h, mi: +mi };
}
function lastSunday(y, mo) { // mo 1-12
  const last = new Date(Date.UTC(y, mo, 0));
  return last.getUTCDate() - last.getUTCDay();
}
function ukOffset({ y, mo, d }) {
  const after = (m, day) => mo > m || (mo === m && d >= day);
  const bst = after(3, lastSunday(y, 3)) && !after(10, lastSunday(y, 10));
  return bst ? '+01:00' : '+00:00';
}
const iso = (t) => `${t.y}-${pad(t.mo)}-${pad(t.d)}T${pad(t.h)}:${pad(t.mi)}:00${ukOffset(t)}`;
const weekday = (t) => DAYS[new Date(Date.UTC(t.y, t.mo - 1, t.d)).getUTCDay()];
const longDate = (t) => `${weekday(t)}, ${t.d} ${MONTHS[t.mo - 1]} ${t.y}`;
const clock = (t) => `${((t.h + 11) % 12) + 1}:${pad(t.mi)} ${t.h < 12 ? 'am' : 'pm'}`;
const sortKey = (t) => iso(t);

// JPEG dimensions, so every <img> gets width/height and nothing jumps about while loading.
function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error(`No size in ${file}`);
}
const imageCache = {};
function image(name) {
  if (!imageCache[name]) {
    const jpg = path.join(ROOT, 'static/images', `${name}-800.jpg`);
    if (!fs.existsSync(jpg)) throw new Error(`Missing image ${name} (run scripts/optimise-images.sh)`);
    imageCache[name] = { name, ...jpegSize(jpg), jpg: `/images/${name}-800.jpg` };
  }
  return imageCache[name];
}
function figure(name, alt, caption, eager) {
  const im = image(name);
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<figure class="pic"><a href="${url(im.jpg)}" title="Click to make it bigger (it's not much bigger)"><picture>` +
    `<source type="image/webp" srcset="${url(`/images/${name}-400.webp`)} 400w, ${url(`/images/${name}-800.webp`)} 800w" sizes="(max-width: 600px) 92vw, 560px">` +
    `<img src="${url(im.jpg)}" alt="${esc(alt)}" width="${im.w}" height="${im.h}" ${load} decoding="async"></picture></a>` +
    (caption ? `<figcaption>${inline(caption)}</figcaption>` : '') + `</figure>`;
}

// ---------- tiny markdown ----------
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => {
      const ext = /^https?:/.test(h);
      const href = ext ? h : (h.startsWith('/') ? url(h) : h);
      return `<a href="${esc(href)}"${ext ? ' rel="noopener"' : ''}>${t}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/ -- /g, ' &ndash; ');
}
function markdown(src, { eagerFirstImage = false } = {}) {
  const blocks = src.replace(/\r/g, '').trim().split(/\n{2,}/);
  let firstImage = true;
  return blocks.map((block) => {
    const b = block.trim();
    if (b === '<!--more-->') return b;
    let m;
    if ((m = /^!\[([^\]]*)\]\(([\w-]+)(?:\s+"([^"]*)")?\)$/.exec(b))) {
      const html = figure(m[2], m[1], m[3], eagerFirstImage && firstImage);
      firstImage = false;
      return html;
    }
    if (b.startsWith('<')) return b;
    if (b === '---') return '<hr>';
    if ((m = /^(#{2,3})\s+(.*)$/.exec(b))) return `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
    if (/^[-*] /.test(b)) return `<ul>${b.split(/\n(?=[-*] )/).map((li) => `<li>${inline(li.replace(/^[-*] /, '').replace(/\n\s*/g, ' '))}</li>`).join('')}</ul>`;
    if (/^\d+\. /.test(b)) return `<ol>${b.split(/\n(?=\d+\. )/).map((li) => `<li>${inline(li.replace(/^\d+\. /, '').replace(/\n\s*/g, ' '))}</li>`).join('')}</ol>`;
    if (b.startsWith('> ')) return `<blockquote><p>${inline(b.replace(/^> ?/gm, '').replace(/\n/g, ' '))}</p></blockquote>`;
    if (/^P\.?S\.? /.test(b)) return `<p class="ps">${inline(b.replace(/\n/g, ' '))}</p>`;
    return `<p>${inline(b).replace(/\n/g, ' ')}</p>`;
  }).join('\n');
}
const stripTags = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// ---------- load posts ----------
function parseFrontmatter(raw, file) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw.replace(/\r/g, ''));
  if (!m) throw new Error(`No frontmatter in ${file}`);
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1');
  }
  return { data, body: m[2] };
}

const posts = fs.readdirSync(path.join(ROOT, 'content/posts')).filter((f) => f.endsWith('.md')).map((file) => {
  const { data, body } = parseFrontmatter(fs.readFileSync(path.join(ROOT, 'content/posts', file), 'utf8'), file);
  for (const k of ['title', 'date', 'author', 'labels', 'description', 'image', 'imageAlt']) {
    if (!data[k]) throw new Error(`${file}: missing ${k}`);
  }
  if (!authors[data.author]) throw new Error(`${file}: unknown author ${data.author}`);
  const t = parseDate(data.date);
  const slug = data.slug || file.replace(/\.md$/, '');
  const labels = data.labels.split(',').map((l) => l.trim()).filter(Boolean);
  const [teaserMd] = body.split('<!--more-->');
  const html = markdown(body.replace('<!--more-->', ''), { eagerFirstImage: true });
  const words = stripTags(html).split(' ').length;
  return {
    ...data, slug, t, labels, words,
    path: `/${t.y}/${pad(t.mo)}/${slug}.html`,
    html,
    teaser: markdown(teaserMd),
    teaserEager: markdown(teaserMd, { eagerFirstImage: true }),
    hasMore: body.includes('<!--more-->'),
    comments: comments[slug] || [],
  };
}).sort((a, b) => sortKey(b.t).localeCompare(sortKey(a.t)));

const labelIndex = {};
for (const p of posts) for (const l of p.labels) (labelIndex[l] ||= []).push(p);
const labelPath = (l) => `/search/label/${slugify(l)}/`;
const authorPath = (k) => `/profile/${k}.html`;

// ---------- sidebar ----------
function avatar(k) {
  const a = authors[k];
  return `<div class="avatar" style="background:${a.colour}" aria-hidden="true"><span>${esc(a.name[0])}</span></div>`;
}
function followerGrid() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cols = ['#b5651d', '#2a6f97', '#8e44ad', '#3b5323', '#c0392b', '#d4a017', '#5d6d7e', '#16a085', '#e67e22', '#7f8c8d'];
  return Array.from({ length: 24 }, () => `<i style="background:${cols[Math.floor(rnd() * cols.length)]}"></i>`).join('');
}
function archiveTree(open) {
  const years = {};
  for (const p of posts) ((years[p.t.y] ||= {})[p.t.mo] ||= []).push(p);
  return Object.keys(years).sort((a, b) => b - a).map((y) => {
    const months = years[y];
    const count = Object.values(months).flat().length;
    const yOpen = open && open.y === +y;
    const inner = Object.keys(months).sort((a, b) => b - a).map((mo) => {
      const list = months[mo];
      const mOpen = yOpen && open.mo === +mo;
      return `<details${mOpen ? ' open' : ''}><summary><a href="${url(`/${y}/${pad(mo)}/`)}">${MONTHS[mo - 1]}</a> (${list.length})</summary><ul>` +
        list.map((p) => `<li><a href="${url(p.path)}">${esc(p.title)}</a></li>`).join('') + `</ul></details>`;
    }).join('');
    return `<details${yOpen ? ' open' : ''}><summary><a href="${url(`/${y}/`)}">${y}</a> (${count})</summary>${inner}</details>`;
  }).join('');
}
function sidebar(open) {
  const labels = Object.keys(labelIndex).sort((a, b) => a.localeCompare(b));
  const max = Math.max(...labels.map((l) => labelIndex[l].length));
  const poll = site.poll;
  return `<aside class="sidebar" aria-label="Sidebar">
<div class="widget"><h2>About us</h2><p>Five club players, one shared password, zero editorial standards. We write about the bits of racket sports nobody puts in the brochure.</p><p><a href="${url('/p/about.html')}">Read the full (honest) story &raquo;</a></p></div>
<div class="widget"><h2>Contributors</h2><ul>${Object.keys(authors).map((k) => `<li><a href="${url(authorPath(k))}" rel="author">${esc(authors[k].display)}</a></li>`).join('')}</ul></div>
<div class="widget archive"><h2>Blog Archive</h2>${archiveTree(open)}</div>
<div class="widget"><h2>Labels</h2><div class="cloud">${labels.map((l) => {
    const n = labelIndex[l].length;
    return `<a href="${url(labelPath(l))}" style="font-size:${(85 + (n / max) * 60).toFixed(0)}%">${esc(l)}</a>&nbsp;(${n})`;
  }).join(' ')}</div></div>
<div class="widget"><h2>Get the app we keep going on about</h2><p>Rallio runs our mixers, ladders and Graham's Sunday mornings.</p><p><a class="store" href="${esc(site.links.appStore)}" rel="noopener">Download on the App Store</a><br><a class="store" href="${esc(site.links.googlePlay)}" rel="noopener">Get it on Google Play</a></p><small><a href="${esc(site.links.home)}" rel="noopener">What is it?</a></small></div>
<div class="widget"><h2>Followers (${site.followers})</h2><a href="${esc(site.links.appStore)}" rel="noopener" class="followers" title="Join them: get the app">${followerGrid()}</a><a href="${esc(site.links.appStore)}" rel="noopener">Follow (well, join us on the app)</a><br><small>Hi Mum.</small></div>
<div class="widget poll"><h2>Poll</h2><p><b>${esc(poll.question)}</b></p>${poll.options.map(([o, pc, slug]) => { const t = posts.find((x) => x.slug === slug); return `<label>${t ? `<a href="${url(t.path)}">${esc(o)}</a>` : esc(o)} (${pc}%)</label><div class="bar" style="width:${pc}%"></div>`; }).join('')}<small>${poll.votes} votes. Poll closed because Dan kept voting. Click an answer to read the moan about it.</small></div>
<div class="widget"><h2>Blogs &amp; links we like</h2><ul>${site.blogroll.map((b) => `<li><a href="${esc(b.url)}" rel="noopener">${esc(b.name)}</a></li>`).join('')}</ul></div>
<div class="widget"><h2>Subscribe to</h2><a href="${url('/feeds/posts/default.xml')}" class="badge"><b>XML</b><i>Posts (Atom)</i></a></div>
<div class="widget"><h2>Visitors since 2019</h2><div class="counter" aria-label="${site.visitors} visitors">${[...site.visitors].map((d) => `<b>${d}</b>`).join('')}</div><br><small>(Bev refreshes it a lot)</small></div>
</aside>`;
}

// ---------- layout ----------
const css = fs.readFileSync(path.join(ROOT, 'static/style.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}');
const randomScript = `<script>document.getElementById('nb').onclick=function(e){var u=${JSON.stringify(posts.map((p) => url(p.path)))};e.preventDefault();location.href=u[Math.floor(Math.random()*u.length)]}</script>`;

function layout({ title, description, pathName, body, open, ogImage, ogType = 'website', jsonld = [], noindex = false }) {
  const fullTitle = pathName === '/' ? `${site.title}: ${site.description.split('.')[0]}` : `${title} | ${site.title}`;
  const og = ogImage ? abs(image(ogImage).jpg) : abs(image('racket-wall').jpg);
  return `<!doctype html>
<html lang="${site.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex,follow">' : `<link rel="canonical" href="${abs(pathName)}">`}
<link rel="icon" href="${url('/favicon.svg')}" type="image/svg+xml">
<link rel="alternate" type="application/atom+xml" title="${esc(site.title)} - Atom" href="${abs('/feeds/posts/default.xml')}">
<meta name="theme-color" content="#3b5323">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:locale" content="en_GB">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(pathName)}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
<style>${css}</style>
</head>
<body>
<a class="skip" href="#main">Skip to the stories</a>
<div class="navbar" role="navigation" aria-label="Blog toolbar">
<form action="${url('/search/')}" method="get" role="search"><input type="search" name="q" placeholder="Search this blog" aria-label="Search this blog"><button type="submit">Search</button></form>
<span class="sep">|</span><a href="${url(posts[posts.length - 1].path)}" id="nb">Next Blog&raquo;</a>
<span class="right"><a href="${url('/p/about.html')}">About</a> <span class="sep">|</span> <a href="${esc(site.links.contact)}" rel="noopener">Contact</a> <span class="sep">|</span> <a href="${esc(site.links.appStore)}" rel="noopener">Get the app</a></span>
</div>
<div class="outer">
<header class="header">
<p class="title"><a href="${url('/')}">Racket St<span class="ball" aria-hidden="true"></span>ries</a></p>
<p class="desc">${esc(site.description)}</p>
</header>
<div class="wrap">
<main class="main" id="main">
${body}
</main>
${sidebar(open)}
</div>
<footer class="footer">
<p>&copy; ${posts[0].t.y} ${esc(site.title)}. Theme nicked from about 2008 and lovingly not updated since.</p>
<p>Stories from real club life. Bev, Dan, Priya and Graham are composite characters; Jake is real and built <a href="https://rallio.io" rel="noopener">Rallio</a>, which some of these stories mention. <a href="${url('/p/about.html')}">More on that here</a>.</p>
<p><a href="${esc(site.links.contact)}" rel="noopener">Contact</a> &middot; <a href="${esc(site.links.appStore)}" rel="noopener">Rallio on the App Store</a> &middot; <a href="${esc(site.links.googlePlay)}" rel="noopener">Rallio on Google Play</a> &middot; <a href="${url('/feeds/posts/default.xml')}">Atom feed</a> &middot; <a href="${url('/sitemap.xml')}">Sitemap</a></p>
</footer>
</div>
${randomScript}
</body>
</html>
`;
}

// ---------- fragments ----------
function shareLinks(p) {
  const link = encodeURIComponent(abs(p.path));
  const text = encodeURIComponent(p.title);
  return [
    ['Email this', `mailto:?subject=${text}&body=${link}`],
    ['WhatsApp', `https://wa.me/?text=${text}%20${link}`],
    ['Share to X', `https://twitter.com/intent/tweet?text=${text}&url=${link}`],
    ['Share to Facebook', `https://www.facebook.com/sharer/sharer.php?u=${link}`],
  ].map(([label, href]) => `<a href="${esc(href)}" rel="noopener nofollow">${label}</a>`).join(' | ');
}
function postFooter(p) {
  const a = authors[p.author];
  const n = p.comments.length;
  return `<div class="post-footer">
Posted by <a href="${url(authorPath(p.author))}" rel="author">${esc(a.display)}</a> at <a href="${url(p.path)}" title="permanent link"><time datetime="${iso(p.t)}">${clock(p.t)}</time></a>
&nbsp; <a href="${url(p.path)}#comments">${n} comment${n === 1 ? '' : 's'}</a>
<br><span class="labels">Labels: ${p.labels.map((l) => `<a href="${url(labelPath(l))}" rel="tag">${esc(l)}</a>`).join(', ')}</span>
<br><span class="share">Share: ${shareLinks(p)}</span>
</div>`;
}
function postSummary(p, showDate, eager) {
  return `${showDate ? `<h2 class="date-header"><span>${longDate(p.t)}</span></h2>` : ''}
<article class="post">
<h3 class="post-title"><a href="${url(p.path)}">${esc(p.title)}</a></h3>
<div class="post-body">${eager ? p.teaserEager : p.teaser}
${p.hasMore ? `<p class="jump"><a href="${url(p.path)}#more">Read more &raquo;</a></p>` : ''}</div>
${postFooter(p)}
</article>`;
}
function postList(list) {
  let lastDay = '';
  return list.map((p, i) => {
    const day = longDate(p.t);
    const html = postSummary(p, day !== lastDay, i === 0);
    lastDay = day;
    return html;
  }).join('\n');
}
const pager = (newer, older) => `<nav class="blog-pager" aria-label="More posts">
<span>${newer ? `<a href="${url(newer)}" rel="prev">&laquo; Newer Posts</a>` : ''}</span>
<span class="home"><a href="${url('/')}">Home</a></span>
<span>${older ? `<a href="${url(older)}" rel="next">Older Posts &raquo;</a>` : ''}</span>
</nav>
<div class="feed-links">Subscribe to: <a href="${url('/feeds/posts/default.xml')}">Posts (Atom)</a></div>`;

const publisher = { '@type': 'Organization', name: site.title, url: abs('/'), logo: { '@type': 'ImageObject', url: abs('/favicon.svg') } };
const personLd = (k) => ({ '@type': 'Person', name: authors[k].display, url: abs(authorPath(k)) });

// ---------- write ----------
const pages = []; // for the sitemap
function write(p, html, { sitemap = true, lastmod } = {}) {
  const file = path.join(OUT, p.endsWith('/') ? `${p}index.html` : p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (sitemap) pages.push({ loc: abs(p), lastmod });
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'static'), OUT, { recursive: true, filter: (s) => !s.endsWith('style.css') });

// home + pagination
const per = site.postsPerPage;
const pageCount = Math.ceil(posts.length / per);
const pagePath = (n) => (n === 1 ? '/' : `/page/${n}/`);
for (let n = 1; n <= pageCount; n++) {
  const list = posts.slice((n - 1) * per, n * per);
  write(pagePath(n), layout({
    title: n === 1 ? site.title : `${site.title} - page ${n}`,
    description: n === 1 ? `${site.description} ${site.tagline}` : `Older stories from ${site.title}, page ${n}. ${site.tagline}`,
    pathName: pagePath(n),
    open: list[0].t,
    jsonld: n === 1 ? [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: site.title, url: abs('/'), description: site.description, inLanguage: site.language },
      { '@context': 'https://schema.org', '@type': 'Blog', name: site.title, url: abs('/'), description: site.tagline, publisher,
        blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: abs(p.path), datePublished: iso(p.t), author: personLd(p.author) })) },
    ] : [],
    body: postList(list) + pager(n > 1 ? pagePath(n - 1) : null, n < pageCount ? pagePath(n + 1) : null),
  }), { lastmod: n === 1 ? iso(posts[0].t) : undefined });
}

// posts
posts.forEach((p, i) => {
  const newer = posts[i - 1];
  const older = posts[i + 1];
  const a = authors[p.author];
  const related = posts.filter((o) => o !== p).map((o) => ({ o, s: o.labels.filter((l) => p.labels.includes(l)).length }))
    .filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 3).map((x) => x.o);
  const commentHtml = `<section class="comments" id="comments"><h4>${p.comments.length} comment${p.comments.length === 1 ? '' : 's'}:</h4>
${p.comments.map((c) => {
    const t = parseDate(c.date);
    const who = c.author ? `<a href="${url(authorPath(c.author))}">${esc(authors[c.author].display)}</a>` : esc(c.name);
    return `<div class="comment${c.author === p.author ? ' author' : ''}"><span class="who">${who}</span> said...<p>${inline(esc(c.text))}</p><span class="when">${t.d} ${MONTHS[t.mo - 1]} ${t.y} at ${clock(t)}</span></div>`;
  }).join('\n')}
<p class="comment-closed"><b>Post a Comment</b><br>Comments are switched off at the moment because a robot kept offering Bev cheap trainers. Got something to say, or a story of your own? <a href="${esc(site.links.contact)}" rel="noopener">Send it in here</a> and Jake will pass it on. Or tell us in person, ideally between points.</p>
</section>`;
  const jsonld = [{
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: p.title, description: p.description, image: [abs(image(p.image).jpg)],
    datePublished: iso(p.t), dateModified: iso(p.t), inLanguage: site.language,
    author: personLd(p.author), publisher, mainEntityOfPage: abs(p.path),
    keywords: p.labels.join(', '), articleSection: p.labels[0], wordCount: p.words,
    commentCount: p.comments.length,
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: site.title, item: abs('/') },
      { '@type': 'ListItem', position: 2, name: p.labels[0], item: abs(labelPath(p.labels[0])) },
      { '@type': 'ListItem', position: 3, name: p.title, item: abs(p.path) },
    ],
  }];
  const body = `<h2 class="date-header"><span>${longDate(p.t)}</span></h2>
<article class="post">
<h1 class="post-title">${esc(p.title)}</h1>
<div class="post-body">${p.html.replace('<!--more-->', '<a id="more"></a>')}</div>
<p class="jump">&mdash; ${esc(a.name)}. ${esc(a.short)} <a href="${url(authorPath(p.author))}">More about ${esc(a.name)}</a>.</p>
${postFooter(p)}
${commentHtml}
</article>
${related.length ? `<div class="related"><h4>You might also like:</h4><ul>${related.map((r) => `<li><a href="${url(r.path)}">${esc(r.title)}</a></li>`).join('')}</ul></div>` : ''}
<nav class="blog-pager" aria-label="Neighbouring posts">
<span>${newer ? `<a href="${url(newer.path)}" rel="prev" title="${esc(newer.title)}">&laquo; Newer Post</a>` : ''}</span>
<span class="home"><a href="${url('/')}">Home</a></span>
<span>${older ? `<a href="${url(older.path)}" rel="next" title="${esc(older.title)}">Older Post &raquo;</a>` : ''}</span>
</nav>
<div class="feed-links">Subscribe to: <a href="${url('/feeds/posts/default.xml')}">Posts (Atom)</a></div>`;
  write(p.path, layout({ title: p.title, description: p.description, pathName: p.path, open: p.t, ogImage: p.image, ogType: 'article', jsonld, body }), { lastmod: iso(p.t) });
});

// labels
for (const [l, list] of Object.entries(labelIndex)) {
  write(labelPath(l), layout({
    title: `${l} stories`,
    description: `Every Racket Stories post labelled ${l}: ${list.map((p) => p.title).join('; ')}.`.slice(0, 300),
    pathName: labelPath(l),
    open: list[0].t,
    body: `<div class="status-msg">Showing posts with label <b>${esc(l)}</b>. <a href="${url('/')}">Show all posts</a></div>${postList(list)}${pager(null, null)}`,
  }));
}

// month + year archives
const byMonth = {};
for (const p of posts) (byMonth[`${p.t.y}/${pad(p.t.mo)}`] ||= []).push(p);
for (const [ym, list] of Object.entries(byMonth)) {
  const [y, mo] = ym.split('/');
  const name = `${MONTHS[+mo - 1]} ${y}`;
  write(`/${ym}/`, layout({
    title: `${name} archive`, description: `Racket Stories posts from ${name}: ${list.map((p) => p.title).join('; ')}.`.slice(0, 300),
    pathName: `/${ym}/`, open: list[0].t,
    body: `<div class="status-msg">Showing posts from <b>${name}</b>. <a href="${url('/')}">Show all posts</a></div>${postList(list)}${pager(null, null)}`,
  }));
}
for (const y of new Set(posts.map((p) => p.t.y))) {
  const list = posts.filter((p) => p.t.y === y);
  write(`/${y}/`, layout({
    title: `${y} archive`, description: `Everything we wrote in ${y}: ${list.length} stories about tennis, padel, squash and the people who organise them.`,
    pathName: `/${y}/`, open: list[0].t,
    body: `<div class="status-msg">Showing posts from <b>${y}</b>. <a href="${url('/')}">Show all posts</a></div>${postList(list)}${pager(null, null)}`,
  }));
}

// profiles
for (const [k, a] of Object.entries(authors)) {
  const list = posts.filter((p) => p.author === k);
  write(authorPath(k), layout({
    title: `${a.display} - profile`, description: `${a.short} Posts by ${a.name} on ${site.title}.`,
    pathName: authorPath(k), open: list[0] && list[0].t,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: a.display, description: a.short, homeLocation: { '@type': 'Place', name: a.location }, url: abs(authorPath(k)) } }],
    body: `<h1 class="post-title">${esc(a.display)}</h1>
<div class="profile">${avatar(k)}<div>
<p><b>Location:</b> ${esc(a.location)}<br><b>Plays:</b> ${esc(a.plays)}<br><b>Blogging since:</b> ${esc(a.since)}</p></div></div>
<div class="post-body"><h2>About me</h2><p>${esc(a.bio)}</p>
<h2>Interests</h2><p>${a.interests.map(esc).join(', ')}</p>
${k === 'jake' ? `<h2>My other place</h2><p><a href="${esc(site.links.home)}" rel="noopener">rallio.io</a> &middot; <a href="${esc(site.links.appStore)}" rel="noopener">App Store</a> &middot; <a href="${esc(site.links.googlePlay)}" rel="noopener">Google Play</a> &middot; <a href="${esc(site.links.contact)}" rel="noopener">Get in touch</a></p>` : ''}
<h2>Posts by ${esc(a.name)}</h2>${list.length ? `<ul>${list.map((p) => `<li><a href="${url(p.path)}">${esc(p.title)}</a> <small>(${p.t.d} ${MONTHS[p.t.mo - 1]} ${p.t.y})</small></li>`).join('')}</ul>` : '<p>Nothing yet. Keep nagging.</p>'}</div>`,
  }));
}

// about page
const aboutMd = fs.readFileSync(path.join(ROOT, 'content/about.md'), 'utf8');
write('/p/about.html', layout({
  title: 'About Racket Stories', description: 'Who writes Racket Stories, why, and the honest bit about who is real, who is a composite, and how Rallio fits in.',
  pathName: '/p/about.html', open: posts[0].t,
  body: `<article class="post"><h1 class="post-title">About Racket Stories</h1><div class="post-body">${markdown(aboutMd)}
<h2>The gang</h2><ul>${Object.entries(authors).map(([k, a]) => `<li><a href="${url(authorPath(k))}">${esc(a.display)}</a> &ndash; ${esc(a.short)}</li>`).join('')}</ul></div></article>`,
}));

// search (the toolbar box submits here; filtering is done in the browser)
write('/search/', layout({
  title: 'Search this blog', description: `Search every ${site.title} post: tennis, padel, squash, mixers, ladders and club life.`,
  pathName: '/search/', open: posts[0].t, noindex: true,
  body: `<div class="status-msg" id="search-msg">Showing all ${posts.length} posts. Type something in the box at the top to narrow it down.</div>
<ul class="search-results">${posts.map((p) => `<li data-s="${esc([p.title, p.description, p.labels.join(' '), authors[p.author].display, stripTags(p.html)].join(' ').toLowerCase())}"><a href="${url(p.path)}">${esc(p.title)}</a> <small>by ${esc(authors[p.author].display)}, ${p.t.d} ${MONTHS[p.t.mo - 1]} ${p.t.y}</small><br>${esc(p.description)}</li>`).join('')}</ul>
<p id="search-none" hidden>Nothing found. Try "ladder", "padel", "biscuits" or "Keith". Or have a look at the <a href="${url('/')}">home page</a>.</p>
<script>(function(){var q=(new URLSearchParams(location.search).get('q')||'').trim(),f=document.querySelector('.navbar input[type=search]');if(f)f.value=q;if(!q)return;var w=q.toLowerCase().split(/\\s+/),n=0;document.querySelectorAll('.search-results li').forEach(function(li){var ok=w.every(function(t){return li.dataset.s.indexOf(t)>-1});li.hidden=!ok;if(ok)n++});var m=document.getElementById('search-msg');m.textContent='';m.append('Showing '+n+' post'+(n==1?'':'s')+' matching ');var b=document.createElement('b');b.textContent=q;m.append(b,'. ');var a=document.createElement('a');a.href=${JSON.stringify(url('/search/'))};a.textContent='Show all posts';m.append(a);document.getElementById('search-none').hidden=n>0})()</script>`,
}), { sitemap: false });

// 404
write('/404.html', layout({
  title: 'Out!', description: 'Sorry, the page you were looking for in this blog does not exist.', pathName: '/404.html', noindex: true, open: posts[0].t,
  body: `<div class="status-msg"><b>Sorry, the page you were looking for in this blog does not exist.</b><br>It was definitely out. We checked the mark. <a href="${url('/')}">Back to the home page</a>, or have a rummage in the archive on the right.</div>`,
}), { sitemap: false });

// Atom feed
const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${site.language}">
<title>${esc(site.title)}</title>
<subtitle>${esc(site.description)}</subtitle>
<link href="${abs('/feeds/posts/default.xml')}" rel="self"/>
<link href="${abs('/')}"/>
<id>${abs('/')}</id>
<updated>${iso(posts[0].t)}</updated>
${posts.map((p) => `<entry>
<title>${esc(p.title)}</title>
<link href="${abs(p.path)}"/>
<id>${abs(p.path)}</id>
<published>${iso(p.t)}</published>
<updated>${iso(p.t)}</updated>
<author><name>${esc(authors[p.author].display)}</name><uri>${abs(authorPath(p.author))}</uri></author>
${p.labels.map((l) => `<category term="${esc(l)}"/>`).join('')}
<summary>${esc(p.description)}</summary>
<content type="html">${esc(p.html.replace('<!--more-->', ''))}</content>
</entry>`).join('\n')}
</feed>
`;
write('/feeds/posts/default.xml', feed, { sitemap: false });

// sitemap + robots
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `<url><loc>${p.loc}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log(`Built ${posts.length} posts, ${pages.length} indexable pages into dist/ for ${SITE_URL}`);
