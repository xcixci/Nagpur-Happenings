import { cityToday, clockTime, hasEnded, parseIso } from './format.ts';
import type { CategoryRecord, DayRecord, EventRecord } from './sheet-map.ts';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const MAX_CHIPS = 3;
export const MAX_DOTS = 4;

export interface YearMonth {
  year: number;
  month: number;
}

export interface DayCell {
  date: string;
  inMonth: boolean;
  day: number;
  weekday: number;
  names: string[];
  events: EventRecord[];
}

export interface AgendaDay {
  date: string;
  names: string[];
  events: EventRecord[];
}

export interface TimeGroup {
  time: string;
  events: EventRecord[];
}

export interface TimedEvent {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'published' | 'cancelled';
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

export function parseMonthKey(key: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match?.[1] || !match[2]) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function addDays(iso: string, days: number): string {
  const p = parseIso(iso);
  if (!p) return iso;
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return next.toISOString().slice(0, 10);
}

export function calendarEvents(events: EventRecord[]): EventRecord[] {
  return events.filter((event) => event.status === 'published' || event.status === 'cancelled');
}

export function compareEvents(
  a: { start_time: string; title?: string },
  b: { start_time: string; title?: string },
): number {
  const as = a.start_time || '99:99';
  const bs = b.start_time || '99:99';
  if (as !== bs) return as < bs ? -1 : 1;
  return (a.title || '').localeCompare(b.title || '');
}

export function filterCategories(categories: CategoryRecord[], events: EventRecord[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of categories) {
    const name = row.category.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  for (const event of events) {
    const name = event.category.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

function addMonths(ym: YearMonth, count: number): YearMonth {
  const index = ym.year * 12 + (ym.month - 1) + count;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function compareYm(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** Months that have a listed event, from the earliest through 12 months ahead of today. */
export function visibleMonths(events: EventRecord[], todayIso: string): YearMonth[] {
  const today = parseIso(todayIso);
  if (!today) return [];
  const lastAllowed = addMonths({ year: today.year, month: today.month }, 12);
  const keys = new Set<string>();
  for (const event of calendarEvents(events)) {
    const date = parseIso(event.date);
    if (!date) continue;
    const ym = { year: date.year, month: date.month };
    if (compareYm(ym, lastAllowed) > 0) continue;
    keys.add(monthKey(date.year, date.month));
  }
  return [...keys].sort().map((key) => parseMonthKey(key)).filter((ym): ym is YearMonth => !!ym);
}

export function neighbor(months: YearMonth[], current: YearMonth, delta: -1 | 1): YearMonth | null {
  const keys = months.map((ym) => monthKey(ym.year, ym.month));
  const index = keys.indexOf(monthKey(current.year, current.month));
  if (index < 0) return null;
  return months[index + delta] ?? null;
}

export function monthPath(ym: YearMonth): string {
  return `/calendar/${monthKey(ym.year, ym.month)}/`;
}

export function monthName(ym: YearMonth): string {
  return MONTHS[ym.month - 1] ?? '';
}

/**
 * The month home opens on. Published events that have not ended keep their month.
 * Otherwise the next month with one, or the latest month that has any event.
 */
export function startMonthKey(events: TimedEvent[], months: string[], timeZone: string, now = new Date()): string {
  const today = cityToday(timeZone, now);
  const published = events.filter((event) => event.status === 'published');
  const upcoming = published.filter((event) => !hasEnded(event, timeZone, now));
  const thisMonth = today.slice(0, 7);
  if (months.includes(thisMonth) && upcoming.some((event) => event.date.startsWith(thisMonth))) return thisMonth;
  const nextDate = upcoming.map((event) => event.date).sort()[0];
  if (nextDate && months.includes(nextDate.slice(0, 7))) return nextDate.slice(0, 7);
  return months[months.length - 1] || thisMonth;
}

export function weekdayHeaders(): { letter: string; short: string; weekend: boolean }[] {
  const headers = [];
  for (let i = 0; i < 7; i += 1) {
    const dow = (1 + i) % 7;
    headers.push({
      letter: WEEKDAY_LETTERS[dow] ?? '',
      short: WEEKDAYS_SHORT[dow] ?? '',
      weekend: dow === 0 || dow === 6,
    });
  }
  return headers;
}

export function monthGrid(year: number, month: number, events: EventRecord[], days: DayRecord[]): DayCell[] {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const lead = (firstDow - 1 + 7) % 7;
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((lead + total) / 7) * 7;
  const prefix = monthKey(year, month);
  const inMonth = calendarEvents(events).filter((event) => event.date.startsWith(prefix)).sort(compareEvents);
  const cells: DayCell[] = [];
  for (let i = 0; i < cellCount; i += 1) {
    const day = i - lead + 1;
    if (day < 1 || day > total) {
      cells.push({ date: '', inMonth: false, day: 0, weekday: 0, names: [], events: [] });
      continue;
    }
    const date = `${prefix}-${pad(day)}`;
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    cells.push({
      date,
      inMonth: true,
      day,
      weekday,
      names: dayNames(days, date),
      events: inMonth.filter((event) => event.date === date),
    });
  }
  return cells;
}

export function monthAgenda(year: number, month: number, events: EventRecord[], days: DayRecord[]): AgendaDay[] {
  const prefix = monthKey(year, month);
  const byDate = new Map<string, EventRecord[]>();
  for (const event of calendarEvents(events)) {
    if (!event.date.startsWith(`${prefix}-`)) continue;
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }
  for (const day of days) {
    if (!day.date.startsWith(`${prefix}-`) || byDate.has(day.date)) continue;
    byDate.set(day.date, []);
  }
  return [...byDate.keys()].sort().map((date) => ({
    date,
    names: dayNames(days, date),
    events: (byDate.get(date) ?? []).sort(compareEvents),
  }));
}

export function splitAgenda(days: AgendaDay[], today: string, key: string): { earlier: AgendaDay[]; later: AgendaDay[] } {
  if (!today.startsWith(key)) return { earlier: [], later: days };
  return {
    earlier: days.filter((day) => day.date < today),
    later: days.filter((day) => day.date >= today),
  };
}

export function weekendRange(todayIso: string): { from: string; to: string } {
  const date = parseIso(todayIso);
  if (!date) return { from: todayIso, to: todayIso };
  if (date.weekday === 0) return { from: todayIso, to: todayIso };
  const toSaturday = date.weekday === 6 ? 0 : 6 - date.weekday;
  const from = addDays(todayIso, toSaturday);
  return { from, to: addDays(from, 1) };
}

export function datesFrom(from: string, to: string): string[] {
  const dates: string[] = [];
  let iso = from;
  while (iso && iso <= to && dates.length < 14) {
    dates.push(iso);
    iso = addDays(iso, 1);
  }
  return dates;
}

export function eventsOn(events: EventRecord[], iso: string): EventRecord[] {
  return calendarEvents(events).filter((event) => event.date === iso).sort(compareEvents);
}

export function groupByStart(events: EventRecord[]): TimeGroup[] {
  const groups: TimeGroup[] = [];
  for (const event of [...events].sort(compareEvents)) {
    const time = clockTime(event.start_time) || 'Time to be confirmed';
    const last = groups[groups.length - 1];
    if (last && last.time === time) last.events.push(event);
    else groups.push({ time, events: [event] });
  }
  return groups;
}

export function timeHeading(group: TimeGroup): string {
  if (group.events.length < 2) return group.time;
  return `${group.time} · ${group.events.length} events`;
}

export function dayLabel(iso: string, today: string): string {
  const date = parseIso(iso);
  if (!date) return '';
  const label = `${WEEKDAYS[date.weekday]}, ${date.day} ${MONTHS[date.month - 1]}`;
  return iso === today ? `Today · ${label}` : label;
}

export function dayHeading(iso: string, today: string, count: number): string {
  const label = dayLabel(iso, today);
  if (!count) return label;
  return `${label} · ${count === 1 ? '1 event' : `${count} events`}`;
}

export function rangeLabel(from: string, to: string): string {
  if (from === to) {
    const date = parseIso(from);
    if (!date) return '';
    return `${WEEKDAYS[date.weekday]}, ${date.day} ${MONTHS[date.month - 1]} ${date.year}`;
  }
  const a = parseIso(from);
  const b = parseIso(to);
  if (!a || !b) return '';
  const left = `${WEEKDAYS_SHORT[a.weekday]} ${a.day}`;
  const right = `${WEEKDAYS_SHORT[b.weekday]} ${b.day}`;
  if (a.month === b.month && a.year === b.year) return `${left} – ${right} ${MONTHS[b.month - 1]}`;
  return `${left} ${MONTHS_SHORT[a.month - 1]} – ${right} ${MONTHS_SHORT[b.month - 1]}`;
}

export function countLabel(count: number): string {
  if (count === 0) return 'no events';
  if (count === 1) return '1 event';
  return `${count} events`;
}

export function dayNames(days: DayRecord[], iso: string): string[] {
  return days.filter((day) => day.date === iso).map((day) => day.name.trim()).filter(Boolean);
}

export function emptyCopy(scope: string, filteringCategories: boolean, freeOnly: boolean): string {
  if (freeOnly && filteringCategories) return `No free events ${scope} in the selected categories.`;
  if (freeOnly) return `No free events ${scope}.`;
  if (filteringCategories) return `Nothing listed ${scope} in the selected categories.`;
  return `Nothing listed ${scope} yet.`;
}
