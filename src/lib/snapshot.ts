import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { city } from './city';
import type {
  CategoryRecord,
  DayRecord,
  EventRecord,
  OrganiserRecord,
  SponsorRecord,
  TagRecord,
  VenueRecord,
} from './sheet-map';

export interface Snapshot {
  city: string;
  timezone: string;
  fetched_at: string;
  events: EventRecord[];
  organisers: OrganiserRecord[];
  venues: VenueRecord[];
  sponsors: SponsorRecord[];
  days: DayRecord[];
  categories: CategoryRecord[];
  tags: TagRecord[];
}

let cached: Snapshot | null = null;

export function loadSnapshot(): Snapshot {
  if (cached && cached.city === city.slug) return cached;
  const file = resolve(process.cwd(), 'data', city.slug, 'snapshot.json');
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`No snapshot at data/${city.slug}/snapshot.json`);
  }
  const data = JSON.parse(raw) as Snapshot;
  if (!Array.isArray(data.events) || data.events.length === 0) {
    throw new Error(`data/${city.slug}/snapshot.json has no events`);
  }
  data.organisers ??= [];
  data.venues ??= [];
  data.sponsors ??= [];
  data.days ??= [];
  data.categories ??= [];
  data.tags ??= [];

  const slugs = new Set<string>();
  const ids = new Set<string>();
  for (const event of data.events) {
    if (!event.slug || slugs.has(event.slug)) throw new Error(`Duplicate event slug ${event.slug || '(blank)'}`);
    if (!event.id || ids.has(event.id)) throw new Error(`Duplicate event id ${event.id || '(blank)'}`);
    slugs.add(event.slug);
    ids.add(event.id);
  }

  cached = data;
  return data;
}
