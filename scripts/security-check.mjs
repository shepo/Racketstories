#!/usr/bin/env node
// Checks the built site in dist/ before it ships. `npm run build` runs it after build.mjs, so Cloudflare
// refuses to deploy a build that fails. No dependencies. Prints each problem and exits 1 if there are any.
//
// What it guards (see .claude/skills/pentest/SKILL.md for why):
//   S1  _headers carries the security headers, and the CSP lists a hash for every inline <script>
//   S2  no inline event handlers (onclick=, onerror=...) anywhere
//   S3  no javascript:, data: or vbscript: URLs in href/src/action
//   S4  nothing is loaded from another site (no external src, no iframe/object/embed)
//   S5  every external link has rel="noopener"
//   S6  no plain http:// links
//   S7  every internal link and image resolves to a file in dist/
//   S8  no secrets (API keys, tokens, private keys) in tracked files or dist/
//   S9  the CSP names no other site except PostHog (content/site.json `posthog`)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const problems = [];
const fail = (id, where, what) => problems.push(`${id} ${where}: ${what}`);

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);
const html = files.filter((f) => f.endsWith('.html'));
const rel = (f) => path.relative(DIST, f);

// S1 headers
const headers = fs.existsSync(path.join(DIST, '_headers')) ? fs.readFileSync(path.join(DIST, '_headers'), 'utf8') : '';
for (const h of ['Content-Security-Policy:', 'X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Strict-Transport-Security:', 'Referrer-Policy:', 'Permissions-Policy:']) {
  if (!headers.includes(h)) fail('S1', '_headers', `missing ${h}`);
}
const csp = (/Content-Security-Policy: (.*)/.exec(headers) || [])[1] || '';
for (const d of ["default-src 'none'", "frame-ancestors 'none'", "base-uri 'none'"]) if (!csp.includes(d)) fail('S1', '_headers', `CSP lacks ${d}`);
if (/script-src[^;]*'unsafe-inline'/.test(csp)) fail('S1', '_headers', "CSP script-src allows 'unsafe-inline'");
// S9: the only other site the CSP may name is PostHog (analytics), from content/site.json. Anything else is a new
// external load and needs a deliberate change here.
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));
const allowedOrigins = new Set([site.posthog?.host, site.posthog?.assets].filter(Boolean));
for (const o of csp.match(/https?:\/\/[^\s;']+/g) || []) if (!allowedOrigins.has(o)) fail('S9', '_headers', `CSP allows an unexpected origin: ${o}`);

let links = 0;
for (const f of html) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    const hash = `'sha256-${crypto.createHash('sha256').update(m[1]).digest('base64')}'`;
    if (!csp.includes(hash)) fail('S1', rel(f), `inline script not in the CSP: ${m[1].slice(0, 60)}`);
  }
  for (const m of src.matchAll(/<script\b([^>]*)>/g)) {
    if (m[1] && !/^\s*type="application\/ld\+json"\s*$/.test(m[1])) fail('S4', rel(f), `unexpected script tag <script${m[1]}>`);
  }
  // S2
  for (const m of src.matchAll(/<[a-z][^>]*\s(on[a-z]+)\s*=/gi)) fail('S2', rel(f), `inline handler ${m[1]}=`);
  // S4
  for (const m of src.matchAll(/<(iframe|object|embed|frame)\b/gi)) fail('S4', rel(f), `<${m[1]}> tag`);
  // attributes
  for (const m of src.matchAll(/\s(href|src|srcset|action|poster)="([^"]*)"/g)) {
    const [, attr, raw] = m;
    const v = raw.replace(/&amp;/g, '&').trim();
    if (/^(javascript|data|vbscript):/i.test(v)) fail('S3', rel(f), `${attr}="${v.slice(0, 40)}"`);
    if (/^http:\/\//i.test(v)) fail('S6', rel(f), `${attr}="${v}"`);
    if (attr !== 'href' && /^https?:\/\//i.test(v)) fail('S4', rel(f), `loads ${v}`);
    // S7 internal links
    for (const part of (attr === 'srcset' ? v.split(',').map((s) => s.trim().split(/\s+/)[0]) : [v])) {
      if (!part.startsWith('/') || part.startsWith('//')) continue;
      links++;
      const p = decodeURI(part.split(/[?#]/)[0]);
      const target = path.join(DIST, p.endsWith('/') ? `${p}index.html` : p);
      const ok = (fs.existsSync(target) && fs.statSync(target).isFile()) || fs.existsSync(`${target}.html`);
      if (!ok) fail('S7', rel(f), `broken link ${part}`);
    }
  }
  // S5
  for (const m of src.matchAll(/<a\s[^>]*href="https?:\/\/[^"]*"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(m[0])) fail('S5', rel(f), `external link without rel=noopener: ${m[0].slice(0, 80)}`);
  }
}

// S8 secrets
const SECRET = /(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9_-]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|CLOUDFLARE_API_TOKEN\s*[=:]\s*\S{20,})/;
let tracked = [];
try {
  tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean).map((f) => path.join(ROOT, f));
} catch { /* not a git checkout: dist only */ }
for (const f of [...tracked, ...files]) {
  if (/\.(jpe?g|png|webp|gif|ico)$/i.test(f) || !fs.existsSync(f)) continue;
  const m = SECRET.exec(fs.readFileSync(f, 'utf8'));
  if (m) fail('S8', path.relative(ROOT, f), `looks like a secret: ${m[0].slice(0, 12)}...`);
}

if (problems.length) {
  console.error(`Security check failed (${problems.length}):\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`Security check passed: ${html.length} pages, ${links} internal links, CSP covers ${csp.split('sha256-').length - 1} inline scripts.`);
