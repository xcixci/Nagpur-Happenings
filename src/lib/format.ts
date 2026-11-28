import type { DayRecord, EventRecord, OrganiserRecord, VenueRecord } from './sheet-map.ts';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const QUIET = /silent march|candle ?march|candlelight march|vigil|in (loving )?memory of|memorial (service|meet|gathering|prayer)|condolence|shra?ddh?anjali|श्रद्धांजल|prayer meet|rest in peace|remembrance|protest|dharna|मूक मोर्चा|mook morcha/i;

/** Hosts that must never get UTM tags: chat, social, forms, tickets, payments. */
const UTM_BLOCKED = [
  'wa.me',
  'whatsapp.com',
  'instagram.com',
  'ig.me',
  'facebook.com',
  'fb.com',
  'fb.me',
  'forms.gle',
  'docs.google.com',
  'tally.so',
  'bookmyshow.com',
  'district.in',
  'rzp.io',
  'razorpay.com',
  'ticketwings.in',
  'paytm.com',
  'paytm.in',
  'phonepe.com',
  'instamojo.com',
  'stripe.com',
  'paypal.com',
  'paypal.me',
];

export interface Clock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface ContactLink {
  href: string;
  label: string;
  external: boolean;
}

export interface CardModel {
  quiet: boolean;
  cancelled: boolean;
  kicker: string;
  title: string;
  when: string;
  where: string;
  by: string;
  tile: string;
  image: string;
  imageKind: 'poster' | 'logo' | '';
  badge: string;
  badgeKind: 'free' | 'paid' | '';
  brand: string;
  domain: string;
}

export interface EventPageModel {
  event: EventRecord;
  cancelled: boolean;
  ended: boolean;
  quiet: boolean;
  socialTitle: string;
  summary: string;
  lede: string;
  showAbout: boolean;
  about: string[];
  whenDate: string;
  whenTime: string;
  dayLabel: string;
  categoryLine: string;
  featured: boolean;
  alcohol: boolean;
  who: string[];
  whereName: string;
  whereLine: string;
  address: string;
  mapsHref: string;
  entry: string;
  organiserName: string;
  contact: ContactLink | null;
  registration: ContactLink | null;
  registrationNote: string;
  canCalendar: boolean;
  badge: { weekday: string; day: string; month: string };
  media: {
    mode: 'poster' | 'logo' | 'tile';
    src: string;
    alt: string;
    logo: string;
    logoAlt: string;
    tile: string;
  };
  pagePath: string;
  pageUrl: string;
  shortPath: string;
  shortUrl: string;
  cardPath: string;
  cardUrl: string;
  icsPath: string;
  whatsappHref: string;
  shareTitle: string;
  shareBody: string;
  googleHref: string;
  jsonLd: unknown[];
}

export function parseIso(value: string): { year: number; month: number; day: number; weekday: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return { year, month, day, weekday: dt.getUTCDay() };
}

export function longDate(iso: string): string {
  const p = parseIso(iso);
  if (!p) return '';
  return `${WEEKDAYS[p.weekday]}, ${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

export function shortDate(iso: string, timeZone: string, now = new Date()): string {
  const p = parseIso(iso);
  if (!p) return '';
  const label = `${WEEKDAYS_SHORT[p.weekday]}, ${p.day} ${MONTHS_SHORT[p.month - 1]}`;
  if (p.year !== wallParts(now, timeZone).year) return `${label} ${p.year}`;
  return label;
}

export function clockTime(hhmm: string): string {
  const from = timeParts(hhmm);
  if (!from) return '';
  return `${from.clock} ${from.suffix}`;
}

export function timeRange(start: string, end: string): string {
  const from = timeParts(start);
  if (!from) return '';
  const to = timeParts(end);
  if (!to) return `${from.clock} ${from.suffix}`;
  if (from.suffix === to.suffix) return `${from.clock} – ${to.clock} ${from.suffix}`;
  return `${from.clock} ${from.suffix} – ${to.clock} ${to.suffix}`;
}

export function dateBadge(iso: string): { weekday: string; day: string; month: string } {
  const date = parseIso(iso);
  if (!date) return { weekday: '', day: '', month: '' };
  return {
    weekday: WEEKDAYS_SHORT[date.weekday] ?? '',
    day: String(date.day),
    month: MONTHS_SHORT[date.month - 1] ?? '',
  };
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function isQuiet(event: Pick<EventRecord, 'title' | 'description'>): boolean {
  return QUIET.test(`${event.title} ${event.description}`);
}

export function hasEnded(
  event: Pick<EventRecord, 'status' | 'date' | 'start_time' | 'end_time'>,
  timeZone: string,
  now = new Date(),
): boolean {
  if (event.status === 'cancelled') return false;
  const today = wallParts(now, timeZone);
  const todayIso = isoFromClock(today);
  let endIso = event.date;
  let endMinutes = 24 * 60;
  if (event.end_time && event.start_time && minutes(event.end_time) <= minutes(event.start_time)) {
    endIso = addDays(event.date, 1);
    endMinutes = minutes(event.end_time);
  } else if (event.end_time) {
    endMinutes = minutes(event.end_time);
  }
  if (todayIso > endIso) return true;
  if (todayIso < endIso) return false;
  return today.hour * 60 + today.minute >= endMinutes;
}

export function httpUrl(value: string): string {
  let s = value.trim();
  if (!s) return '';
  if (/^www\./i.test(s)) s = `https://${s}`;
  try {
    const url = new URL(s);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch {
    return '';
  }
}

export function imageUrl(value: string): string {
  const s = value.trim();
  if (!s) return '';
  const drive = s.match(
    /^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/([\w-]{20,})|(?:open|uc)\?(?:[^#]*&)?id=([\w-]{20,}))/i,
  );
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1] || drive[2]}=w1200`;
  return httpUrl(s);
}

export function withUtm(href: string, citySlug: string, eventSlug: string): string {
  const url = new URL(href);
  if (blocksUtm(url.hostname)) return url.href;
  url.searchParams.set('utm_source', `${citySlug}happenings`);
  url.searchParams.set('utm_medium', 'referral');
  url.searchParams.set('utm_campaign', eventSlug);
  return url.href;
}

export function cardModel(
  event: EventRecord,
  organisers: OrganiserRecord[],
  cityName: string,
  domain: string,
  timeZone: string,
  now = new Date(),
): CardModel {
  const quiet = isQuiet(event);
  const cancelled = event.status === 'cancelled';
  const poster = imageUrl(event.cover_image_url);
  const logo = organiserLogo(event, organisers);
  const date = parseIso(event.date);
  let badge = '';
  let badgeKind: CardModel['badgeKind'] = '';
  if (!cancelled && !quiet && event.price_type === 'free') {
    badge = 'Free entry';
    badgeKind = 'free';
  } else if (!cancelled && !quiet && event.price_type === 'paid') {
    badge = event.ticket_price != null ? formatInr(event.ticket_price) : 'Paid';
    badgeKind = 'paid';
  }
  return {
    quiet,
    cancelled,
    kicker: cancelled ? 'Cancelled' : event.category || 'Event',
    title: event.title,
    when: [shortDate(event.date, timeZone, now), timeRange(event.start_time, event.end_time)].filter(Boolean).join(' · '),
    where: [event.venue_name, event.area].filter(Boolean).join(', '),
    by: quiet ? '' : event.organiser_name,
    tile: quiet && date ? `${date.day} ${MONTHS[date.month - 1]}` : event.category || 'Event',
    image: poster || logo,
    imageKind: poster ? 'poster' : logo ? 'logo' : '',
    badge,
    badgeKind,
    brand: `${cityName} Happenings`,
    domain,
  };
}

export function eventPageModel(input: {
  event: EventRecord;
  organisers: OrganiserRecord[];
  venues: VenueRecord[];
  days: DayRecord[];
  cityName: string;
  citySlug: string;
  timeZone: string;
  origin: string;
  now?: Date;
}): EventPageModel {
  const { event, cityName, citySlug, timeZone } = input;
  const now = input.now ?? new Date();
  const quiet = isQuiet(event);
  const cancelled = event.status === 'cancelled';
  const ended = hasEnded(event, timeZone, now);
  const pagePath = `/events/${event.slug}/`;
  const pageUrl = new URL(pagePath, input.origin).href;
  const shortPath = `/e/${event.id}/`;
  const shortUrl = new URL(shortPath, input.origin).href;
  const cardPath = `/cards/${event.id}.jpg`;
  const cardUrl = new URL(cardPath, input.origin).href;
  const poster = imageUrl(event.cover_image_url);
  const logo = organiserLogo(event, input.organisers);
  const date = parseIso(event.date);
  const tile = quiet && date ? `${date.day} ${MONTHS[date.month - 1]}` : event.category || 'Event';
  const mode = poster ? 'poster' : logo ? 'logo' : 'tile';
  const venue = event.venue_id ? input.venues.find((item) => item.id === event.venue_id) : undefined;
  const registration = liveRegistration(event, citySlug, cancelled, ended);
  const shareBody = [
    event.title,
    [longDate(event.date), timeRange(event.start_time, event.end_time)].filter(Boolean).join(', '),
    [event.venue_name, event.area].filter(Boolean).join(', '),
  ].filter(Boolean).join('\n');
  const summary = summaryLine(event, quiet, cancelled);
  const text = event.description.trim();
  const socialTitle = cancelled ? `${event.title} (cancelled)` : event.title;
  const modelBase = {
    event,
    cancelled,
    ended,
    quiet,
    socialTitle,
    summary,
    lede: lede(text),
    showAbout: text.length > 220,
    about: text.length > 220 ? paragraphs(text) : [],
    whenDate: longDate(event.date),
    whenTime: timeRange(event.start_time, event.end_time),
    dayLabel: input.days.filter((day) => day.date === event.date).map((day) => day.name).join(', '),
    categoryLine: [event.category, event.sub_category].filter(Boolean).join(' · '),
    featured: event.featured && !quiet && !cancelled,
    alcohol: event.vibe_tags.some((tag) => tag.trim().toLowerCase() === 'alcohol served'),
    who: event.who_can_join,
    whereName: event.venue_name,
    whereLine: event.area ? `${event.area}, ${cityName}` : event.venue_name ? cityName : '',
    address: venue?.address ?? '',
    mapsHref: mapsHref(event, venue, cityName),
    entry: quiet ? '' : entryLabel(event),
    organiserName: event.organiser_name,
    contact: contactOf(event.organiser_contact, citySlug, event.slug),
    registration: registration.link,
    registrationNote: registration.note,
    canCalendar: !cancelled && !ended,
    badge: {
      weekday: date ? WEEKDAYS_SHORT[date.weekday] ?? '' : '',
      day: date ? String(date.day) : '',
      month: date ? MONTHS_SHORT[date.month - 1] ?? '' : '',
    },
    media: {
      mode,
      src: poster || logo,
      alt: poster ? `Poster for ${event.title}` : logo ? `${event.organiser_name || 'Organiser'} logo` : '',
      logo: poster && logo ? logo : '',
      logoAlt: `${event.organiser_name || 'Organiser'} logo`,
      tile,
    },
    pagePath,
    pageUrl,
    shortPath,
    shortUrl,
    cardPath,
    cardUrl,
    icsPath: `/events/${event.slug}/event.ics`,
    whatsappHref: `https://wa.me/?text=${encodeURIComponent(`${shareBody}\n${pageUrl}`)}`,
    shareTitle: event.title,
    shareBody,
    googleHref: googleCalendarUrl({ event, pageUrl, cityName, timeZone, citySlug }),
  } satisfies Omit<EventPageModel, 'jsonLd'>;

  return {
    ...modelBase,
    jsonLd: [
      eventJsonLd({ ...modelBase, timeZone, cityName }),
      breadcrumbJsonLd(cityName, new URL('/', input.origin).href, event.title, pageUrl),
    ],
  };
}

export function icsDocument(input: {
  event: EventRecord;
  pageUrl: string;
  cityName: string;
  timeZone: string;
  host: string;
  citySlug: string;
  now?: Date;
}): string {
  const { event } = input;
  const times = calendarTimes(event, input.timeZone);
  const stamp = stampUtc(input.now ?? new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${input.cityName} Happenings//Calendar//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${icsEscape(`${event.id}@${input.host}`)}`,
    `DTSTAMP:${stamp}`,
    times.allDay ? `DTSTART;VALUE=DATE:${times.start}` : `DTSTART:${times.start}`,
    times.allDay ? `DTEND;VALUE=DATE:${times.end}` : `DTEND:${times.end}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(calendarPlace(event, input.cityName))}`,
    `DESCRIPTION:${icsEscape(calendarDetails(event, input.pageUrl, input.citySlug))}`,
    `URL:${input.pageUrl}`,
    event.status === 'cancelled' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(icsFold).join('\r\n')}\r\n`;
}

export function googleCalendarUrl(input: {
  event: EventRecord;
  pageUrl: string;
  cityName: string;
  timeZone: string;
  citySlug: string;
}): string {
  const times = calendarTimes(input.event, input.timeZone);
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', input.event.title);
  url.searchParams.set('dates', `${times.start}/${times.end}`);
  url.searchParams.set('details', calendarDetails(input.event, input.pageUrl, input.citySlug));
  url.searchParams.set('location', calendarPlace(input.event, input.cityName));
  url.searchParams.set('ctz', input.timeZone);
  return url.href;
}

function eventJsonLd(input: Omit<EventPageModel, 'jsonLd'> & { timeZone: string; cityName: string }): Record<string, unknown> {
  const { event } = input;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    url: input.pageUrl,
    image: [input.cardUrl],
    eventStatus: input.cancelled ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue_name || event.area || input.cityName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: input.address || undefined,
        addressLocality: event.area || input.cityName,
        addressRegion: input.cityName,
        addressCountry: 'IN',
      },
    },
  };
  const description = event.description.trim() || input.summary;
  if (description) data.description = description;
  if (event.start_time) data.startDate = isoLocal(event.date, event.start_time, input.timeZone);
  else data.startDate = event.date;
  if (event.end_time) {
    const endIso = event.start_time && minutes(event.end_time) <= minutes(event.start_time)
      ? addDays(event.date, 1)
      : event.date;
    data.endDate = isoLocal(endIso, event.end_time, input.timeZone);
  }
  if (event.organiser_name) {
    data.organizer = { '@type': 'Organization', name: event.organiser_name };
  }
  if (event.price_type === 'free' || event.price_type === 'paid') {
    data.isAccessibleForFree = event.price_type === 'free';
  }
  if (!input.cancelled && event.price_type === 'free') {
    data.offers = offer('0', input.registration?.href, input.ended);
  } else if (!input.cancelled && event.price_type === 'paid' && event.ticket_price != null) {
    data.offers = offer(String(event.ticket_price), input.registration?.href, input.ended);
  }
  return data;
}

function offer(price: string, url: string | undefined, ended: boolean): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@type': 'Offer',
    price,
    priceCurrency: 'INR',
    availability: ended ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
  };
  if (url) data.url = url;
  return data;
}

function breadcrumbJsonLd(cityName: string, homeUrl: string, title: string, pageUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: `${cityName} Happenings`, item: homeUrl },
      { '@type': 'ListItem', position: 2, name: title, item: pageUrl },
    ],
  };
}

function summaryLine(event: EventRecord, quiet: boolean, cancelled: boolean): string {
  const parts = [longDate(event.date), timeRange(event.start_time, event.end_time), [event.venue_name, event.area].filter(Boolean).join(', ')];
  if (cancelled) parts.unshift('Cancelled');
  else if (!quiet && event.price_type === 'free') parts.push('Free entry');
  else if (!quiet && event.price_type === 'paid' && event.ticket_price != null) parts.push(formatInr(event.ticket_price));
  return parts.filter(Boolean).join(' · ');
}

function organiserLogo(event: EventRecord, organisers: OrganiserRecord[]): string {
  if (!event.organiser_id) return '';
  const found = organisers.find((organiser) => organiser.id === event.organiser_id);
  return found?.logo_url ? imageUrl(found.logo_url) : '';
}

function mapsHref(event: EventRecord, venue: VenueRecord | undefined, cityName: string): string {
  if (!event.venue_name && !event.area) return '';
  const direct = venue?.maps_url ? httpUrl(venue.maps_url) : '';
  if (direct) return direct;
  const query = [event.venue_name, event.area, cityName].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function entryLabel(event: EventRecord): string {
  if (event.price_type === 'free') return 'Free';
  if (event.price_type === 'paid') return event.ticket_price != null ? `Paid, ${formatInr(event.ticket_price)}` : 'Paid';
  return '';
}

function liveRegistration(event: EventRecord, citySlug: string, cancelled: boolean, ended: boolean): { link: ContactLink | null; note: string } {
  if (cancelled || ended) return { link: null, note: '' };
  const href = httpUrl(event.registration_url);
  if (href) {
    return {
      link: { href: withUtm(href, citySlug, event.slug), label: 'Register / More info', external: true },
      note: '',
    };
  }
  const note = event.registration_url.trim();
  return { link: null, note };
}

function contactOf(value: string, citySlug: string, eventSlug: string): ContactLink | null {
  const text = value.trim();
  if (!text) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return { href: `mailto:${text}`, label: text, external: false };
  if (/^\+?\d[\d\s()-]{6,}$/.test(text)) {
    return { href: `tel:${text.replace(/[\s()-]/g, '')}`, label: text, external: false };
  }
  const href = httpUrl(text);
  if (!href) return { href: '', label: text, external: false };
  return { href: withUtm(href, citySlug, eventSlug), label: linkLabel(href), external: true };
}

function linkLabel(href: string): string {
  const url = new URL(href);
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return `${url.hostname.replace(/^www\./, '')}${path}`;
}

function blocksUtm(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (host.startsWith('forms.')) return true;
  return UTM_BLOCKED.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

function lede(description: string): string {
  const text = description.trim();
  if (text.length <= 220) return text;
  const first = text.split(/\n\s*\n/)[0] ?? text;
  const sentence = first.match(/^.{20,200}?[.!?](?=\s|$)/);
  if (sentence?.[0]) return sentence[0];
  return `${first.slice(0, 160).replace(/\s+\S*$/, '')}…`;
}

function paragraphs(value: string): string[] {
  return value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

function timeParts(hhmm: string): { clock: string; suffix: 'AM' | 'PM' } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match?.[1] || !match[2]) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { clock: `${h12}:${String(minute).padStart(2, '0')}`, suffix };
}

function minutes(hhmm: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match?.[1] || !match[2]) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function wallParts(date: Date, timeZone: string): Clock {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const map = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  let hour = Number(map.hour);
  let day = Number(map.day);
  let month = Number(map.month);
  let year = Number(map.year);
  if (hour === 24) {
    hour = 0;
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }
  return { year, month, day, hour, minute: Number(map.minute) };
}

function isoFromClock(clock: Clock): string {
  return `${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')}`;
}

export function cityToday(timeZone: string, now = new Date()): string {
  return isoFromClock(wallParts(now, timeZone));
}

function addDays(iso: string, days: number): string {
  const p = parseIso(iso);
  if (!p) return iso;
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return next.toISOString().slice(0, 10);
}

function wallToUtc(iso: string, hhmm: string, timeZone: string): Date {
  const p = parseIso(iso);
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!p || !match?.[1] || !match[2]) return new Date();
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  let utc = new Date(Date.UTC(p.year, p.month - 1, p.day, hour, minute));
  for (let i = 0; i < 2; i += 1) {
    const got = wallParts(utc, timeZone);
    const actual = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute);
    const wanted = Date.UTC(p.year, p.month - 1, p.day, hour, minute);
    utc = new Date(utc.getTime() - (actual - wanted));
  }
  return utc;
}

function isoLocal(iso: string, hhmm: string, timeZone: string): string {
  const utc = wallToUtc(iso, hhmm, timeZone);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset', hour: '2-digit' });
  const zone = fmt.formatToParts(utc).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(zone);
  const offset = match ? `${match[1]}${match[2].padStart(2, '0')}:${match[3] ?? '00'}` : '+00:00';
  return `${iso}T${hhmm}:00${offset}`;
}

function calendarTimes(event: EventRecord, timeZone: string): { allDay: boolean; start: string; end: string } {
  if (!event.start_time) {
    return { allDay: true, start: event.date.replace(/-/g, ''), end: addDays(event.date, 1).replace(/-/g, '') };
  }
  const start = wallToUtc(event.date, event.start_time, timeZone);
  let end: Date;
  if (event.end_time && minutes(event.end_time) > minutes(event.start_time)) {
    end = wallToUtc(event.date, event.end_time, timeZone);
  } else if (event.end_time) {
    end = wallToUtc(addDays(event.date, 1), event.end_time, timeZone);
  } else {
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  }
  if (end.getTime() <= start.getTime()) end = new Date(start.getTime() + 60 * 60 * 1000);
  return { allDay: false, start: stampUtc(start), end: stampUtc(end) };
}

function stampUtc(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}T${p(date.getUTCHours())}${p(date.getUTCMinutes())}00Z`;
}

function calendarPlace(event: EventRecord, cityName: string): string {
  return [event.venue_name, event.area, cityName].filter(Boolean).join(', ');
}

function calendarDetails(event: EventRecord, pageUrl: string, citySlug: string): string {
  const href = httpUrl(event.registration_url);
  const description = event.description.length > 600 ? `${event.description.slice(0, 597)}…` : event.description;
  return [
    description,
    href ? `Register: ${withUtm(href, citySlug, event.slug)}` : event.registration_url.trim(),
    `Details: ${pageUrl}`,
  ].filter(Boolean).join('\n\n');
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function icsFold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 74) {
      out.push(current);
      current = ' ';
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
}
