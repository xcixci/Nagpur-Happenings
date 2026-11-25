#!/usr/bin/env node
// Builds the site into _site/ and adds a link-preview page for each event:
//   _site/e/NH-019/index.html  (title, date, place and card image for WhatsApp, Instagram etc.;
//                               people who open it go straight to the event on the calendar)
//   _site/e/NH-019/card.jpg    (1200 x 630 card)
//   _site/e/built.json         (which events have a preview page; the site reads this for share links)
// Run by .github/workflows/pages.yml on every push and every hour.
//
// Env (all optional): NH_FEED_URL, NH_FEED_FILE (local JSON instead of the feed), NH_OUT,
// NH_SITE_URL, NH_TODAY (YYYY-MM-DD, for tests), PW_CHANNEL (e.g. "chrome").

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.resolve(process.env.NH_OUT || path.join(ROOT, '_site'));
const SITE_URL = (process.env.NH_SITE_URL || 'https://nagpurhappenings.in/').replace(/\/?$/, '/');
const SITE_PATH = new URL(SITE_URL).pathname;
const DAYS_BACK = 14;          // keep preview pages for events up to two weeks old
const MAX_EVENTS = 300;
const IS_SCHEDULED = process.env.GITHUB_EVENT_NAME === 'schedule';

/* ---------- Same rules as script.js ---------- */
const CATEGORIES = [
  ['books', 'Books & Literature', 'Books'], ['games', 'Board Games & Chess', 'Games & chess'],
  ['arts', 'Arts & Culture', 'Arts'], ['music', 'Music & Entertainment', 'Music & fun'],
  ['learning', 'Learning & Workshops', 'Learning'], ['community', 'Communities & Social', 'Community'],
  ['outdoors', 'Outdoors & Recreation', 'Outdoors'], ['other', 'Other', 'Other'],
];
const CATEGORY_NAME = new Map(CATEGORIES.map(([k, n]) => [k, n]));
const CATEGORY_LOOKUP = new Map();
const norm = (v) => String(v || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
CATEGORIES.forEach((c) => c.forEach((label) => CATEGORY_LOOKUP.set(norm(label), c[0])));
[
  ['books and lit', 'books'], ['literature', 'books'], ['poetry', 'books'],
  ['board games', 'games'], ['chess', 'games'], ['games', 'games'],
  ['arts', 'arts'], ['art', 'arts'], ['culture', 'arts'], ['theatre', 'arts'],
  ['music', 'music'], ['entertainment', 'music'], ['comedy', 'music'],
  ['learning', 'learning'], ['workshops', 'learning'], ['workshop', 'learning'], ['talks', 'learning'],
  ['communities', 'community'], ['community', 'community'], ['social', 'community'],
  ['outdoors', 'outdoors'], ['recreation', 'outdoors'], ['outdoor', 'outdoors'],
].forEach(([label, key]) => CATEGORY_LOOKUP.set(norm(label), key));

// Memorials, silent marches, vigils and protests get the quiet look. Keep in step with script.js.
const QUIET_WORDS = /silent march|candle ?march|candlelight march|vigil|in (loving )?memory of|memorial (service|meet|gathering|prayer)|condolence|shra?ddh?anjali|श्रद्धांजल|prayer meet|rest in peace|remembrance|protest|dharna|मूक मोर्चा|mook morcha/i;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');
const text = (v) => (v === null || v === undefined ? '' : String(v).trim());

function parseIso(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  const dt = new Date(Date.UTC(y, mo, d));
  if (dt.getUTCMonth() !== mo || dt.getUTCDate() !== d) return null;
  return { y, m: mo, d, wd: dt.getUTCDay() };
}

function cleanTime(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text(value));
  if (!m || +m[1] > 23 || +m[2] > 59) return '';
  return pad(+m[1]) + ':' + m[2];
}

function timeLabel(hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return (hh % 12 === 0 ? 12 : hh % 12) + ':' + pad(mm) + ' ' + (hh < 12 ? 'am' : 'pm');
}

function timeRange(ev) {
  if (!ev.startTime) return '';
  return ev.endTime ? timeLabel(ev.startTime) + ' – ' + timeLabel(ev.endTime) : timeLabel(ev.startTime);
}

function formatPrice(price) {
  const s = text(price);
  return /^\d+(\.\d+)?$/.test(s) ? '₹' + Number(s).toLocaleString('en-IN') : s;
}

function priceType(type, price) {
  const t = norm(type);
  if (t === 'free') return 'Free';
  if (t === 'paid') return 'Paid';
  const p = text(price);
  if (!p) return '';
  if (/^(free|₹?\s*0+(\.0+)?)$/i.test(p)) return 'Free';
  return /\d/.test(p) ? 'Paid' : '';
}

function safeUrl(value) {
  let s = text(value);
  if (!s) return '';
  if (/^www\./i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch (e) { return ''; }
}

// Same as imageUrl() in script.js, except site files become file:// links for rendering.
function imageUrl(value) {
  const s = text(value);
  if (!s) return '';
  if (/^assets\/[\w./-]+\.(webp|png|jpe?g|gif|svg)$/i.test(s) && !s.includes('..')) return pathToFileURL(path.join(ROOT, s)).href;
  const drive = s.match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/([\w-]{20,})|(?:open|uc)\?(?:[^#]*?&)?id=([\w-]{20,}))/i);
  if (drive) return 'https://lh3.googleusercontent.com/d/' + (drive[1] || drive[2]) + '=w1000';
  return safeUrl(s);
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id);
  const title = text(raw.title);
  const date = text(raw.date);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || !title || !parseIso(date)) return null;
  const status = norm(raw.status || 'published');
  if (status !== 'published' && status !== 'cancelled' && status !== 'canceled') return null;
  const description = text(raw.description);
  return {
    id, title, date,
    category: CATEGORY_LOOKUP.get(norm(raw.category)) || 'other',
    startTime: cleanTime(raw.startTime),
    endTime: cleanTime(raw.endTime),
    venue: text(raw.venue),
    area: text(raw.area),
    description,
    organiserName: text(raw.organiserName),
    ticketPrice: text(raw.ticketPrice),
    priceType: priceType(raw.priceType, raw.ticketPrice),
    coverImageUrl: imageUrl(raw.coverImageUrl),
    cancelled: status !== 'published',
    quiet: QUIET_WORDS.test(title + ' ' + description),
  };
}

/* ---------- Card and page content ---------- */
function cardData(ev, logos) {
  const p = parseIso(ev.date);
  const shortDate = WEEKDAYS[p.wd].slice(0, 3) + ', ' + p.d + ' ' + MONTHS[p.m].slice(0, 3);
  const logo = logos.get(norm(ev.organiserName)) || '';
  const image = ev.coverImageUrl || logo;
  let badge = '', badgeKind = '';
  if (!ev.cancelled && !ev.quiet && ev.priceType === 'Free') { badge = 'Free entry'; badgeKind = 'free'; }
  else if (!ev.cancelled && !ev.quiet && ev.priceType === 'Paid') { badge = ev.ticketPrice ? formatPrice(ev.ticketPrice) : 'Paid'; badgeKind = 'paid'; }
  return {
    category: ev.category,
    quiet: ev.quiet,
    cancelled: ev.cancelled,
    kicker: ev.cancelled ? 'Cancelled' : CATEGORY_NAME.get(ev.category),
    title: ev.title,
    when: [shortDate, timeRange(ev)].filter(Boolean).join(' · '),
    where: [ev.venue, ev.area].filter(Boolean).join(', '),
    by: ev.quiet ? '' : ev.organiserName,
    tile: ev.quiet ? p.d + ' ' + MONTHS[p.m] : CATEGORY_NAME.get(ev.category),
    image,
    imageKind: ev.coverImageUrl ? 'poster' : 'logo',
    badge, badgeKind,
  };
}

function description(ev) {
  const p = parseIso(ev.date);
  const longDate = WEEKDAYS[p.wd] + ', ' + p.d + ' ' + MONTHS[p.m] + ' ' + p.y;
  const parts = [longDate, timeRange(ev), [ev.venue, ev.area].filter(Boolean).join(', ')];
  if (ev.cancelled) parts.unshift('Cancelled');
  else if (!ev.quiet && ev.priceType === 'Free') parts.push('Free entry');
  else if (!ev.quiet && ev.priceType === 'Paid' && ev.ticketPrice) parts.push(formatPrice(ev.ticketPrice));
  return parts.filter(Boolean).join(' · ');
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function previewPage(ev, version) {
  const pageUrl = SITE_URL + 'e/' + ev.id + '/';
  const imgUrl = pageUrl + 'card.jpg?v=' + version;
  const target = SITE_PATH + '#event=' + encodeURIComponent(ev.id);
  const title = ev.title + (ev.cancelled ? ' (cancelled)' : '');
  const desc = description(ev);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Nagpur Happenings</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nagpur Happenings">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(imgUrl)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title + ': ' + desc)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F08A2E">
<link rel="icon" href="${esc(SITE_PATH)}assets/favicon.svg" type="image/svg+xml">
<script>location.replace(${JSON.stringify(target)});</script>
</head><body style="font-family:system-ui,sans-serif;padding:2rem">
<p><a href="${esc(target)}">${esc(title)}: see it on Nagpur Happenings</a></p>
</body></html>
`;
}

/* ---------- Steps ---------- */
function copySite() {
  fs.rmSync(OUT, { recursive: true, force: true });
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0').filter(Boolean);
  for (const f of files) {
    if (/^(\.github|tools|_site)\//.test(f)) continue;
    const dest = path.join(OUT, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), dest);
  }
  return files.length;
}

function feedUrl() {
  if (process.env.NH_FEED_URL) return process.env.NH_FEED_URL;
  const m = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8').match(/EVENTS_API_URL:\s*'([^']+)'/);
  return m ? m[1] : '';
}

async function loadFeed() {
  if (process.env.NH_FEED_FILE) return JSON.parse(fs.readFileSync(process.env.NH_FEED_FILE, 'utf8'));
  const url = feedUrl();
  if (!url) throw new Error('No EVENTS_API_URL in script.js');
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = JSON.parse(await res.text());
      if (!data || data.ok === false || !Array.isArray(data.events)) throw new Error('Feed has no events list');
      return data;
    } catch (err) {
      lastErr = err;
      console.warn(`Feed attempt ${attempt} failed: ${err.message}`);
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
  throw lastErr;
}

function todayIst() {
  if (process.env.NH_TODAY) return process.env.NH_TODAY;
  const d = new Date(Date.now() + 330 * 60000);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

function addDays(iso, n) {
  const p = parseIso(iso);
  const d = new Date(Date.UTC(p.y, p.m, p.d + n));
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

async function launchBrowser() {
  const { chromium } = require('playwright');
  const channel = process.env.PW_CHANNEL || undefined;
  try {
    return await chromium.launch({ channel });
  } catch (err) {
    if (!channel) throw err;
    console.warn(`Could not start ${channel} (${err.message.split('\n')[0]}); installing Chromium instead.`);
    execFileSync('npx', ['playwright', 'install', 'chromium'], { cwd: HERE, stdio: 'inherit' });
    return chromium.launch();
  }
}

async function main() {
  const copied = copySite();
  console.log(`Copied ${copied} site files to ${path.relative(ROOT, OUT) || OUT}`);
  const built = [];

  let feed = null;
  try {
    feed = await loadFeed();
  } catch (err) {
    if (IS_SCHEDULED) {
      console.error('Feed unavailable on a scheduled run; keeping the live site as it is.');
      process.exit(1);
    }
    console.warn(`Feed unavailable (${err.message}); building the site without preview pages.`);
  }

  if (feed) {
    const from = addDays(todayIst(), -DAYS_BACK);
    const events = feed.events.map(normalizeEvent).filter((ev) => ev && ev.date >= from).slice(0, MAX_EVENTS);
    const logos = new Map();
    (Array.isArray(feed.organisers) ? feed.organisers : []).forEach((o) => {
      const key = norm(o && o.name);
      const url = imageUrl(o && o.logoUrl);
      if (key && url) logos.set(key, url);
    });

    const browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    if (process.env.NH_IMAGE_DIR) {
      // Tests only: answer Google image requests from local files named after the Drive ID.
      await page.route('https://lh3.googleusercontent.com/**', (route) => {
        const id = (route.request().url().match(/\/d\/([\w-]+)/) || [])[1];
        const file = id && fs.readdirSync(process.env.NH_IMAGE_DIR).find((f) => f.startsWith(id + '.'));
        return file ? route.fulfill({ path: path.join(process.env.NH_IMAGE_DIR, file) }) : route.abort();
      });
    }
    await page.goto(pathToFileURL(path.join(HERE, 'card.html')).href);

    for (const ev of events) {
      try {
        const data = cardData(ev, logos);
        const mode = await page.evaluate((d) => window.renderCard(d), data);
        const jpg = await page.screenshot({ type: 'jpeg', quality: 86 });
        const version = crypto.createHash('sha1').update(jpg).digest('hex').slice(0, 10);
        const dir = path.join(OUT, 'e', ev.id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'card.jpg'), jpg);
        fs.writeFileSync(path.join(dir, 'index.html'), previewPage(ev, version));
        built.push(ev.id);
        console.log(`  ${ev.id}  ${mode.padEnd(6)} ${ev.quiet ? 'quiet ' : ''}${Math.round(jpg.length / 1024)} KB  ${ev.title}`);
      } catch (err) {
        console.warn(`  ${ev.id}  skipped: ${err.message}`);
      }
    }
    await browser.close();
  }

  fs.mkdirSync(path.join(OUT, 'e'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'e', 'built.json'), JSON.stringify({ builtAt: new Date().toISOString(), ids: built }) + '\n');
  console.log(`Preview pages: ${built.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
