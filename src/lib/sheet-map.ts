/**
 * Sheet headers stay human-readable. This file is the only place they
 * become field names. It also accepts the current v1 feed (camelCase)
 * until feed_url points at the new sheet.
 */

export interface EventRecord {
  id: string;
  slug: string;
  city: string;
  title: string;
  category: string;
  sub_category: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_id: string;
  venue_name: string;
  area: string;
  organiser_id: string;
  organiser_name: string;
  organiser_contact: string;
  description: string;
  registration_url: string;
  price_type: 'free' | 'paid' | '';
  ticket_price: number | null;
  cover_image_url: string;
  who_can_join: string[];
  vibe_tags: string[];
  status: 'published' | 'cancelled';
  featured: boolean;
}

export interface OrganiserRecord {
  id: string;
  slug: string;
  name: string;
  type: 'community' | 'chapter' | 'ngo' | 'organisation' | '';
  category: string;
  sub_category: string;
  tagline: string;
  description: string;
  logo_url: string;
  instagram_url: string;
  whatsapp_url: string;
  other_links: string;
  founded: string;
  languages: string[];
  meeting_frequency: string;
  usual_time: string;
  area: string;
  turnout: string;
  price_type: 'free' | 'paid' | 'mixed' | '';
  typical_price: string;
  alcohol: 'never' | 'sometimes' | 'usually' | '';
  how_to_join: string;
  tags: string[];
  founders: string;
  other_cities: string;
  status: 'listed';
  verified: boolean;
}

export interface CategoryRecord {
  category: string;
  sub_category: string;
}

export interface TagRecord {
  tag: string;
  tag_group: string;
}

export interface VenueRecord {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string;
  maps_url: string;
  website_url: string;
  instagram_url: string;
}

export interface SponsorRecord {
  id: string;
  name: string;
  logo_url: string;
  link_url: string;
  placement: 'site' | 'weekend' | '';
  start_date: string;
  end_date: string;
  status: 'live' | 'off' | '';
}

export interface DayRecord {
  date: string;
  name: string;
}

export interface MappedFeed {
  events: EventRecord[];
  organisers: OrganiserRecord[];
  venues: VenueRecord[];
  sponsors: SponsorRecord[];
  days: DayRecord[];
  categories: CategoryRecord[];
  tags: TagRecord[];
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const eventHeaders = {
  id: 'Event ID',
  title: 'Title',
  category: 'Category',
  sub_category: 'Sub-category',
  date: 'Date',
  start_time: 'Start Time',
  end_time: 'End Time',
  venue_id: 'Venue ID',
  venue_name: 'Venue',
  area: 'Area',
  organiser_id: 'Organiser ID',
  organiser_name: 'Organiser Name',
  organiser_contact: 'Organiser Contact',
  description: 'Description',
  registration_url: 'Registration URL',
  price_type: 'Free or Paid',
  ticket_price: 'Ticket Price',
  cover_image_url: 'Cover Image URL',
  who_can_join: 'Who can join',
  vibe_tags: 'Vibe tags',
  status: 'Status',
  featured: 'Featured',
} as const;

const legacyEventKeys = {
  id: 'id',
  title: 'title',
  category: 'category',
  sub_category: 'subCategory',
  date: 'date',
  start_time: 'startTime',
  end_time: 'endTime',
  venue_id: 'venueId',
  venue_name: 'venue',
  area: 'area',
  organiser_id: 'organiserId',
  organiser_name: 'organiserName',
  organiser_contact: 'organiserContact',
  description: 'description',
  registration_url: 'registrationUrl',
  price_type: 'priceType',
  ticket_price: 'ticketPrice',
  cover_image_url: 'coverImageUrl',
  who_can_join: 'audience',
  vibe_tags: 'vibeTags',
  status: 'status',
  featured: 'featured',
} as const;

const organiserHeaders = {
  id: 'ID',
  name: 'Name',
  type: 'Type',
  category: 'Category',
  sub_category: 'Sub-category',
  tagline: 'Tagline',
  description: 'Description',
  logo_url: 'Logo URL',
  instagram_url: 'Instagram URL',
  whatsapp_url: 'WhatsApp URL',
  other_links: 'Other links',
  founded: 'Founded',
  languages: 'Languages',
  meeting_frequency: 'Meeting frequency',
  usual_time: 'Usual time',
  area: 'Area',
  turnout: 'Turnout',
  price_type: 'Price type',
  typical_price: 'Typical price',
  alcohol: 'Alcohol',
  how_to_join: 'How to join',
  tags: 'Tags',
  founders: 'Founders',
  other_cities: 'Other cities',
  status: 'Status',
  verified: 'Verified',
} as const;

const venueHeaders = {
  id: 'ID',
  name: 'Name',
  area: 'Area',
  address: 'Address',
  maps_url: 'Maps URL',
  website_url: 'Website URL',
  instagram_url: 'Instagram URL',
} as const;

const sponsorHeaders = {
  id: 'ID',
  name: 'Name',
  logo_url: 'Logo URL',
  link_url: 'Link URL',
  placement: 'Placement',
  start_date: 'Start Date',
  end_date: 'End Date',
  status: 'Status',
} as const;

type Row = Record<string, unknown>;

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’‘"]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function eventSlug(title: string, date: string, id: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const year = match?.[1] ?? '0000';
  const month = match ? (MONTHS[Number(match[2]) - 1] ?? 'xxx') : 'xxx';
  const day = match ? String(Number(match[3])) : '0';
  const words = title
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word))
    .slice(0, 6);
  const titlePart = slugify(words.join(' ')) || 'event';
  const idPart = id.toLowerCase().replace(/[^a-z0-9]/g, '') || 'id';
  return `${titlePart}-${day}-${month}-${year}-${idPart}`;
}

export function mapFeed(feed: unknown, city: string): MappedFeed {
  const record = isRecord(feed) ? feed : {};
  const organisers = mapOrganisers(asRows(record.organisers));
  const venues = mapVenues(asRows(record.venues));
  const sponsors = mapSponsors(asRows(record.sponsors));
  const days = mapDays(record.days);
  const lists = mapLists(record);
  const events = mapEvents(asRows(record.events), city, organisers, venues);
  return { events, organisers, venues, sponsors, days, categories: lists.categories, tags: lists.tags };
}

function mapEvents(
  rows: Row[],
  city: string,
  organisers: OrganiserRecord[],
  venues: VenueRecord[],
): EventRecord[] {
  const keys = eventsUseHeaders(rows) ? eventHeaders : legacyEventKeys;
  const organisersById = indexById(organisers);
  const organisersByName = uniqueByName(organisers);
  const venuesById = indexById(venues);
  const venuesByName = uniqueByName(venues);
  const events: EventRecord[] = [];

  for (const row of rows) {
    const id = cell(row, keys.id);
    const title = cell(row, keys.title);
    const date = isoDate(cell(row, keys.date));
    const status = eventStatus(cell(row, keys.status));
    if (!id || !title || !date || !status) continue;

    const organiser = linkName(
      cell(row, keys.organiser_id),
      cell(row, keys.organiser_name),
      organisersById,
      organisersByName,
    );
    const venue = linkName(
      cell(row, keys.venue_id),
      cell(row, keys.venue_name),
      venuesById,
      venuesByName,
    );

    events.push({
      id,
      slug: eventSlug(title, date, id),
      city,
      title,
      category: cell(row, keys.category),
      sub_category: cell(row, keys.sub_category),
      date,
      start_time: timeValue(cell(row, keys.start_time)),
      end_time: timeValue(cell(row, keys.end_time)),
      venue_id: venue.id,
      venue_name: venue.name,
      area: cell(row, keys.area),
      organiser_id: organiser.id,
      organiser_name: organiser.name,
      organiser_contact: cell(row, keys.organiser_contact),
      description: cell(row, keys.description),
      registration_url: cell(row, keys.registration_url),
      price_type: priceType(cell(row, keys.price_type)),
      ticket_price: ticketPrice(cell(row, keys.ticket_price)),
      cover_image_url: cell(row, keys.cover_image_url),
      who_can_join: list(cell(row, keys.who_can_join)),
      vibe_tags: list(cell(row, keys.vibe_tags)),
      status,
      featured: isFeatured(row[keys.featured]),
    });
  }

  events.sort((a, b) => {
    const ka = `${a.date} ${a.start_time || '99:99'} ${a.id}`;
    const kb = `${b.date} ${b.start_time || '99:99'} ${b.id}`;
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return 0;
  });
  return events;
}

function mapOrganisers(rows: Row[]): OrganiserRecord[] {
  if (rows.length === 0) return [];
  const header = 'Name' in rows[0] || 'ID' in rows[0];
  const mapped: Omit<OrganiserRecord, 'slug'>[] = [];

  for (const row of rows) {
    const name = header ? cell(row, organiserHeaders.name) : cell(row, 'name');
    const status = header ? cell(row, organiserHeaders.status) : '';
    if (!name || !isListed(status)) continue;
    mapped.push({
      id: header ? cell(row, organiserHeaders.id) : '',
      name,
      type: organiserType(header ? cell(row, organiserHeaders.type) : ''),
      category: header ? cell(row, organiserHeaders.category) : '',
      sub_category: header ? cell(row, organiserHeaders.sub_category) : '',
      tagline: header ? cell(row, organiserHeaders.tagline) : '',
      description: header ? cell(row, organiserHeaders.description) : '',
      logo_url: header ? cell(row, organiserHeaders.logo_url) : cell(row, 'logoUrl'),
      instagram_url: header ? cell(row, organiserHeaders.instagram_url) : '',
      whatsapp_url: header ? cell(row, organiserHeaders.whatsapp_url) : '',
      other_links: header ? cell(row, organiserHeaders.other_links) : '',
      founded: header ? cell(row, organiserHeaders.founded) : '',
      languages: header ? commaList(cell(row, organiserHeaders.languages)) : [],
      meeting_frequency: header ? cell(row, organiserHeaders.meeting_frequency) : '',
      usual_time: header ? cell(row, organiserHeaders.usual_time) : '',
      area: header ? cell(row, organiserHeaders.area) : '',
      turnout: header ? cell(row, organiserHeaders.turnout) : '',
      price_type: header ? organiserPriceType(cell(row, organiserHeaders.price_type)) : '',
      typical_price: header ? cell(row, organiserHeaders.typical_price) : '',
      alcohol: header ? alcoholValue(cell(row, organiserHeaders.alcohol)) : '',
      how_to_join: header ? cell(row, organiserHeaders.how_to_join) : '',
      tags: header ? commaList(cell(row, organiserHeaders.tags)) : [],
      founders: header ? cell(row, organiserHeaders.founders) : '',
      other_cities: header ? cell(row, organiserHeaders.other_cities) : '',
      status: 'listed',
      verified: header ? isVerified(row[organiserHeaders.verified]) : false,
    });
  }

  return withSlugs(mapped);
}

function mapVenues(rows: Row[]): VenueRecord[] {
  const mapped: Omit<VenueRecord, 'slug'>[] = [];
  for (const row of rows) {
    const name = cell(row, venueHeaders.name);
    if (!name) continue;
    mapped.push({
      id: cell(row, venueHeaders.id),
      name,
      area: cell(row, venueHeaders.area),
      address: cell(row, venueHeaders.address),
      maps_url: cell(row, venueHeaders.maps_url),
      website_url: cell(row, venueHeaders.website_url),
      instagram_url: cell(row, venueHeaders.instagram_url),
    });
  }
  return withSlugs(mapped);
}

function mapSponsors(rows: Row[]): SponsorRecord[] {
  const sponsors: SponsorRecord[] = [];
  for (const row of rows) {
    const name = cell(row, sponsorHeaders.name);
    if (!name) continue;
    sponsors.push({
      id: cell(row, sponsorHeaders.id),
      name,
      logo_url: cell(row, sponsorHeaders.logo_url),
      link_url: cell(row, sponsorHeaders.link_url),
      placement: placement(cell(row, sponsorHeaders.placement)),
      start_date: isoDate(cell(row, sponsorHeaders.start_date)),
      end_date: isoDate(cell(row, sponsorHeaders.end_date)),
      status: sponsorStatus(cell(row, sponsorHeaders.status)),
    });
  }
  return sponsors;
}

function mapLists(record: Row): { categories: CategoryRecord[]; tags: TagRecord[] } {
  return {
    categories: uniquePairs(asRows(record.categories), ['Category', 'category'], ['Sub-category', 'sub_category']).map(
      ([category, sub_category]) => ({ category, sub_category }),
    ),
    tags: uniquePairs(asRows(record.tags), ['Tag', 'tag'], ['Tag group', 'tag_group']).map(([tag, tag_group]) => ({
      tag,
      tag_group,
    })),
  };
}

function uniquePairs(rows: Row[], leftKeys: string[], rightKeys: string[]): Array<[string, string]> {
  const seen = new Set<string>();
  const pairs: Array<[string, string]> = [];
  for (const row of rows) {
    const left = leftKeys.map((key) => cell(row, key)).find(Boolean) ?? '';
    const right = rightKeys.map((key) => cell(row, key)).find(Boolean) ?? '';
    if (!left && !right) continue;
    const key = `${left}\n${right}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push([left, right]);
  }
  return pairs;
}

function mapDays(value: unknown): DayRecord[] {
  const days: DayRecord[] = [];
  for (const row of asRows(value)) {
    const date = isoDate(cell(row, 'date') || cell(row, 'Date'));
    const name = (cell(row, 'name') || cell(row, 'Name')).slice(0, 60);
    if (date && name) days.push({ date, name });
  }
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return days;
}

function linkName(
  id: string,
  name: string,
  byId: Map<string, { id: string; name: string }>,
  byName: Map<string, { id: string; name: string }>,
): { id: string; name: string } {
  if (id && byId.has(id)) {
    const found = byId.get(id);
    return { id, name: name || found?.name || '' };
  }
  if (id) return { id, name };
  const found = byName.get(nameKey(name));
  if (found?.id) return { id: found.id, name: name || found.name };
  return { id: '', name };
}

function withSlugs<T extends { name: string; id: string }>(rows: T[]): Array<T & { slug: string }> {
  const used = new Set<string>();
  return rows.map((row) => {
    const base = slugify(row.name) || slugify(row.id) || 'row';
    let slug = base;
    if (used.has(slug)) {
      const suffix = slugify(row.id);
      slug = suffix && !used.has(`${base}-${suffix}`) ? `${base}-${suffix}` : base;
    }
    let n = 2;
    while (used.has(slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    used.add(slug);
    const { id, name, ...rest } = row;
    return { id, slug, name, ...rest };
  });
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (row.id && !map.has(row.id)) map.set(row.id, row);
  }
  return map;
}

function uniqueByName<T extends { name: string }>(rows: T[]): Map<string, T> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = nameKey(row.name);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = nameKey(row.name);
    if (key && counts.get(key) === 1) map.set(key, row);
  }
  return map;
}

function eventsUseHeaders(rows: Row[]): boolean {
  if (rows.length === 0) return true;
  const row = rows[0];
  if (!row) return true;
  if ('Title' in row || 'Event ID' in row || 'Start Time' in row) return true;
  if ('title' in row || 'startTime' in row) return false;
  return true;
}

function asRows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function isRecord(value: unknown): value is Row {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cell(row: Row, key: string): string {
  const value = row[key];
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : '';
  return String(value).trim();
}

function list(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function commaList(value: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function nameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function letters(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function isoDate(value: string): string {
  const s = value.trim();
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (match?.[1] && match[2] && match[3]) return checkedDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (match?.[1] && match[2] && match[3]) return checkedDate(Number(match[3]), Number(match[2]), Number(match[1]));
  return '';
}

function checkedDate(year: number, month: number, day: number): string {
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
}

function timeValue(value: string): string {
  const s = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return '';
  const match = /^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?$/.exec(s);
  if (!match?.[1]) return '';
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.charAt(0) ?? '';
  if (!match[2] && !meridiem) return '';
  if (meridiem) {
    if (hour < 1 || hour > 12) return '';
    if (meridiem === 'p' && hour !== 12) hour += 12;
    if (meridiem === 'a' && hour === 12) hour = 0;
  }
  if (hour > 23 || minute > 59) return '';
  return `${pad(hour)}:${pad(minute)}`;
}

function ticketPrice(value: string): number | null {
  if (!value.trim()) return null;
  const cleaned = value.replace(/₹/g, '').replace(/\/-/g, '').replace(/rs\.?/gi, '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

function priceType(value: string): 'free' | 'paid' | '' {
  const v = letters(value);
  if (v === 'free') return 'free';
  if (v === 'paid') return 'paid';
  return '';
}

function eventStatus(value: string): 'published' | 'cancelled' | '' {
  const v = letters(value);
  if (v === 'published') return 'published';
  if (v === 'cancelled' || v === 'canceled') return 'cancelled';
  return '';
}

function isListed(value: string): boolean {
  const v = letters(value);
  return !v || v === 'listed';
}

function organiserType(value: string): OrganiserRecord['type'] {
  const v = letters(value);
  if (v === 'community') return 'community';
  if (v === 'chapter') return 'chapter';
  if (v === 'ngo') return 'ngo';
  if (v === 'organisation' || v === 'organization') return 'organisation';
  return '';
}

function organiserPriceType(value: string): OrganiserRecord['price_type'] {
  const v = letters(value);
  if (v === 'free') return 'free';
  if (v === 'paid') return 'paid';
  if (v === 'mixed') return 'mixed';
  return '';
}

function alcoholValue(value: string): OrganiserRecord['alcohol'] {
  const v = letters(value);
  if (v === 'never') return 'never';
  if (v === 'sometimes') return 'sometimes';
  if (v === 'usually') return 'usually';
  return '';
}

function placement(value: string): SponsorRecord['placement'] {
  const v = value.trim().toLowerCase();
  if (v === 'site' || v === 'weekend') return v;
  return '';
}

function sponsorStatus(value: string): SponsorRecord['status'] {
  const v = value.trim().toLowerCase();
  if (v === 'live' || v === 'off') return v;
  return '';
}

function isFeatured(value: unknown): boolean {
  return yesNo(value);
}

function isVerified(value: unknown): boolean {
  return yesNo(value);
}

function yesNo(value: unknown): boolean {
  if (value === true || value === 1) return true;
  return /^(yes|y|true|1)$/i.test(String(value ?? '').trim());
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
