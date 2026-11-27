import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mapFeed } from '../src/lib/sheet-map.ts';

const slug = process.env.CITY || 'nagpur';

if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`CITY must be a slug, got ${slug}`);
  process.exit(1);
}

const root = process.cwd();
const configPath = resolve(root, 'cities', `${slug}.json`);

let city: { slug?: string; feed_url?: string; timezone?: string };
try {
  city = JSON.parse(readFileSync(configPath, 'utf8')) as { slug?: string; feed_url?: string; timezone?: string };
} catch {
  console.error(`No city config at cities/${slug}.json`);
  process.exit(1);
}

if (!city.feed_url) {
  console.error(`cities/${slug}.json is missing feed_url`);
  process.exit(1);
}

const feedUrl = city.feed_url;
const snapshotPath = resolve(root, 'data', slug, 'snapshot.json');

function readSnapshot(): { events?: unknown } | null {
  try {
    return JSON.parse(readFileSync(snapshotPath, 'utf8')) as { events?: unknown };
  } catch {
    return null;
  }
}

function snapshotHasEvents(value: { events?: unknown } | null): boolean {
  return !!value && Array.isArray(value.events) && value.events.length > 0;
}

try {
  const response = await fetch(feedUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Feed responded ${response.status}`);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Feed did not return a JSON object');
  }
  const record = body as { ok?: boolean; error?: string };
  if (record.ok === false) throw new Error(record.error || 'Feed returned ok: false');

  const mapped = mapFeed(body, city.slug || slug);
  if (mapped.events.length === 0) throw new Error('Feed returned no events');

  const snapshot = {
    city: city.slug || slug,
    timezone: city.timezone || 'Asia/Kolkata',
    fetched_at: new Date().toISOString(),
    events: mapped.events,
    organisers: mapped.organisers,
    venues: mapped.venues,
    sponsors: mapped.sponsors,
    days: mapped.days,
    categories: mapped.categories,
    tags: mapped.tags,
  };
  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `Saved data/${slug}/snapshot.json (${snapshot.events.length} events, ${snapshot.organisers.length} organisers, ${snapshot.venues.length} venues, ${snapshot.sponsors.length} sponsors, ${snapshot.days.length} days, ${snapshot.categories.length} categories, ${snapshot.tags.length} tags)`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (snapshotHasEvents(readSnapshot())) {
    console.warn(`Feed failed (${message}). Using the last snapshot.`);
    process.exit(0);
  }
  console.error(`Feed failed (${message}), and there is no snapshot with events.`);
  process.exit(1);
}
