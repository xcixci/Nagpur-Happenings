import {
  datesFrom,
  dayLabel,
  emptyCopy,
  rangeLabel,
  startMonthKey,
  weekendRange,
  MONTHS,
  type TimedEvent,
} from '../lib/calendar.ts';
import { cityToday, clockTime, hasEnded } from '../lib/format.ts';

function watchFrames(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-frame]').forEach((frame) => {
    const img = frame.querySelector<HTMLImageElement>('[data-poster]');
    if (!img || img.dataset.watched === 'true') return;
    img.dataset.watched = 'true';
    const fail = () => {
      if (!img.isConnected) return;
      const logo = frame.dataset.logo || '';
      if (frame.dataset.mode === 'poster' && logo) {
        frame.dataset.mode = 'logo';
        img.alt = frame.dataset.logoAlt || '';
        img.src = logo;
        return;
      }
      img.remove();
      frame.dataset.mode = 'tile';
    };
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
  });
}

function poolEvents(root: HTMLElement): TimedEvent[] {
  const template = root.querySelector<HTMLTemplateElement>('#calendar-card-pool');
  const nodes = template
    ? [...template.content.querySelectorAll<HTMLElement>('[data-card-id]')]
    : [...root.querySelectorAll<HTMLElement>('[data-card-id]')];
  const seen = new Set<string>();
  const events: TimedEvent[] = [];
  for (const card of nodes) {
    const id = card.dataset.cardId || '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    events.push({
      id,
      date: card.dataset.date || '',
      start_time: card.dataset.start || '',
      end_time: card.dataset.end || '',
      status: card.dataset.status === 'cancelled' ? 'cancelled' : 'published',
    });
  }
  return events;
}

function namedDays(root: HTMLElement): Map<string, string> {
  const names = new Map<string, string>();
  root.querySelectorAll<HTMLElement>('[data-named-days] li').forEach((item) => {
    const date = item.dataset.date || '';
    const name = item.textContent?.trim() || '';
    if (!date || !name) return;
    const current = names.get(date);
    names.set(date, current ? `${current}, ${name}` : name);
  });
  return names;
}

function cloneCard(root: HTMLElement, id: string): HTMLElement | null {
  const template = root.querySelector<HTMLTemplateElement>('#calendar-card-pool');
  const source = template?.content.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`);
  if (!source) return null;
  const copy = source.cloneNode(true) as HTMLElement;
  watchFrames(copy);
  return copy;
}

function onDate(events: TimedEvent[], iso: string): TimedEvent[] {
  return events
    .filter((event) => event.date === iso)
    .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99') || a.id.localeCompare(b.id));
}

function fillTime(body: HTMLElement, root: HTMLElement, list: TimedEvent[]): void {
  body.replaceChildren();
  const groups = new Map<string, TimedEvent[]>();
  const order: string[] = [];
  for (const event of list) {
    const time = clockTime(event.start_time) || 'Time to be confirmed';
    if (!groups.has(time)) {
      groups.set(time, []);
      order.push(time);
    }
    groups.get(time)?.push(event);
  }
  for (const time of order) {
    const items = groups.get(time) ?? [];
    const section = document.createElement('section');
    section.dataset.timeGroup = '';
    const heading = document.createElement('h2');
    heading.className = 'time-heading';
    heading.dataset.timeHeading = '';
    heading.dataset.time = time;
    heading.textContent = items.length > 1 ? `${time} · ${items.length} events` : time;
    const listEl = document.createElement('ul');
    listEl.className = 'event-list';
    for (const event of items) {
      const card = cloneCard(root, event.id);
      if (!card) continue;
      const item = document.createElement('li');
      item.append(card);
      listEl.append(item);
    }
    section.append(heading, listEl);
    body.append(section);
  }
}

function fillDays(
  body: HTMLElement,
  root: HTMLElement,
  from: string,
  to: string,
  today: string,
  names: Map<string, string>,
  events: TimedEvent[],
): void {
  body.replaceChildren();
  for (const iso of datesFrom(from, to)) {
    const list = onDate(events, iso);
    const item = document.createElement('li');
    item.className = `agenda-day${iso === today ? ' agenda-day--today' : ''}${list.length ? '' : ' agenda-day--quiet'}`;
    item.dataset.dayGroup = '';
    item.dataset.weekDay = '';
    item.dataset.date = iso;
    const label = dayLabel(iso, today);
    const heading = document.createElement('h2');
    heading.className = 'day-heading';
    heading.dataset.dayHeading = '';
    heading.dataset.label = label;
    heading.textContent = list.length === 0 ? label : `${label} · ${list.length === 1 ? '1 event' : `${list.length} events`}`;
    item.append(heading);
    const name = names.get(iso);
    if (name) {
      const line = document.createElement('p');
      line.className = 'day-names';
      line.textContent = name;
      item.append(line);
    }
    const listEl = document.createElement('ul');
    listEl.className = 'event-list';
    listEl.dataset.eventList = '';
    listEl.hidden = list.length === 0;
    for (const event of list) {
      const card = cloneCard(root, event.id);
      if (!card) continue;
      const wrap = document.createElement('li');
      wrap.append(card);
      listEl.append(wrap);
    }
    const quiet = document.createElement('p');
    quiet.className = 'quiet-line';
    quiet.dataset.quiet = '';
    quiet.hidden = list.length > 0;
    quiet.textContent = 'No events listed';
    item.append(listEl, quiet);
    body.append(item);
  }
}

function viewBody(view: HTMLElement, tag: 'ol' | 'div'): HTMLElement {
  const current = view.querySelector<HTMLElement>('[data-view-body]');
  if (current && current.tagName.toLowerCase() === tag) return current;
  const next = document.createElement(tag);
  next.dataset.viewBody = '';
  next.className = tag === 'ol' ? 'agenda-days' : '';
  if (current) current.replaceWith(next);
  else view.querySelector('[data-view-empty]')?.before(next);
  return next;
}

function rebuildQuick(root: HTMLElement, today: string): void {
  const events = poolEvents(root);
  const names = namedDays(root);
  const todayView = root.querySelector<HTMLElement>('[data-view-today]');
  if (todayView) {
    const range = todayView.querySelector('[data-range]');
    if (range) range.textContent = rangeLabel(today, today);
    fillTime(viewBody(todayView, 'div'), root, onDate(events, today));
  }
  const weekend = weekendRange(today);
  const weekendView = root.querySelector<HTMLElement>('[data-view-weekend]');
  if (weekendView) {
    const range = weekendView.querySelector('[data-range]');
    if (range) range.textContent = rangeLabel(weekend.from, weekend.to);
    if (weekend.from === weekend.to) {
      weekendView.removeAttribute('data-span-days');
      fillTime(viewBody(weekendView, 'div'), root, onDate(events, weekend.from));
    } else {
      weekendView.setAttribute('data-span-days', '');
      fillDays(viewBody(weekendView, 'ol'), root, weekend.from, weekend.to, today, names, events);
    }
  }
  const weekView = root.querySelector<HTMLElement>('[data-view-week]');
  if (weekView) {
    const from = today;
    const to = datesFrom(today, today).length ? addSix(today) : today;
    const range = weekView.querySelector('[data-range]');
    if (range) range.textContent = rangeLabel(from, to);
    fillDays(viewBody(weekView, 'ol'), root, from, to, today, names, events);
  }
}

function addSix(today: string): string {
  return datesFrom(today, '9999-12-31')[6] || today;
}

function markDays(root: HTMLElement, today: string): void {
  root.querySelectorAll<HTMLElement>('[data-day]').forEach((cell) => {
    const iso = cell.dataset.date || '';
    const isToday = iso === today;
    cell.classList.toggle('day--today', isToday);
    cell.classList.toggle('day--past', iso !== '' && iso < today);
    if (isToday) cell.setAttribute('aria-current', 'date');
    else cell.removeAttribute('aria-current');
    const flag = cell.querySelector<HTMLElement>('[data-today-flag]');
    if (flag) flag.hidden = !isToday;
  });
  root.querySelectorAll<HTMLElement>('.agenda-day').forEach((group) => {
    group.classList.toggle('agenda-day--today', group.dataset.date === today);
  });
}

function retitleAgenda(root: HTMLElement, today: string): void {
  root.querySelectorAll<HTMLElement>('[data-agenda-day]').forEach((group) => {
    const iso = group.dataset.date || '';
    const heading = group.querySelector<HTMLElement>('[data-day-heading]');
    if (!heading || !iso) return;
    const total = group.querySelectorAll('[data-event]').length;
    const label = dayLabel(iso, today);
    heading.dataset.label = label;
    heading.textContent = total === 0 ? label : `${label} · ${total === 1 ? '1 event' : `${total} events`}`;
  });
}

function splitEarlier(root: HTMLElement, today: string): void {
  root.querySelectorAll<HTMLElement>('[data-month-panel]').forEach((panel) => {
    const key = panel.dataset.month || '';
    const earlierList = panel.querySelector('[data-earlier-list]');
    const laterList = panel.querySelector('[data-later-list]');
    const details = panel.querySelector<HTMLElement>('[data-earlier]');
    if (!earlierList || !laterList || !details) return;
    const groups = [...panel.querySelectorAll<HTMLElement>('[data-agenda-day]')].sort((a, b) =>
      (a.dataset.date || '').localeCompare(b.dataset.date || ''),
    );
    const current = today.startsWith(key);
    for (const group of groups) {
      const iso = group.dataset.date || '';
      if (current && iso < today) earlierList.append(group);
      else laterList.append(group);
    }
    details.hidden = earlierList.childElementCount === 0;
  });
}

function monthLabel(key: string): string {
  const month = Number(key.slice(5, 7));
  const year = key.slice(0, 4);
  return `${MONTHS[month - 1] ?? ''} ${year}`.trim();
}

function showMonth(root: HTMLElement, key: string): void {
  root.querySelectorAll<HTMLElement>('[data-month-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.month !== key;
  });
  const name = root.querySelector('[data-month-name]');
  const year = root.querySelector('[data-year-name]');
  if (name) name.textContent = MONTHS[Number(key.slice(5, 7)) - 1] ?? '';
  if (year) year.textContent = key.slice(0, 4);
  const months = (root.dataset.months || '').split(',').filter(Boolean);
  const index = months.indexOf(key);
  setArrow(root, 'prev', index > 0 ? months[index - 1] ?? null : null);
  setArrow(root, 'next', index >= 0 && index < months.length - 1 ? months[index + 1] ?? null : null);
}

function setArrow(root: HTMLElement, dir: 'prev' | 'next', key: string | null): void {
  const link = root.querySelector<HTMLAnchorElement>(`[data-${dir}]`);
  const off = root.querySelector<HTMLElement>(`[data-${dir}-off]`);
  if (!link || !off) return;
  if (key) {
    link.href = `/calendar/${key}/`;
    link.hidden = false;
    link.setAttribute('aria-label', `${dir === 'prev' ? 'Previous' : 'Next'} month, ${monthLabel(key)}`);
    off.hidden = true;
  } else {
    link.hidden = true;
    off.hidden = false;
  }
}

function syncEnded(root: HTMLElement, timeZone: string, now: Date): void {
  root.querySelectorAll<HTMLElement>('[data-card-id]').forEach((card) => {
    const ended = hasEnded({
      status: card.dataset.status === 'cancelled' ? 'cancelled' : 'published',
      date: card.dataset.date || '',
      start_time: card.dataset.start || '',
      end_time: card.dataset.end || '',
    }, timeZone, now);
    const label = card.querySelector<HTMLElement>('[data-ended]');
    if (label) label.hidden = !ended;
  });
}

function selected(root: HTMLElement): { cats: Set<string>; freeOnly: boolean } {
  const cats = new Set<string>();
  root.querySelectorAll<HTMLButtonElement>('[data-filter-cat]').forEach((button) => {
    if (button.getAttribute('aria-pressed') === 'true' && button.dataset.filterCat) cats.add(button.dataset.filterCat);
  });
  const freeOnly = root.querySelector('[data-free-only]')?.getAttribute('aria-pressed') === 'true';
  return { cats, freeOnly };
}

function paintFilters(root: HTMLElement, cats: Set<string>, freeOnly: boolean): void {
  root.querySelector('[data-filter-all]')?.setAttribute('aria-pressed', cats.size === 0 ? 'true' : 'false');
  root.querySelectorAll<HTMLButtonElement>('[data-filter-cat]').forEach((button) => {
    button.setAttribute('aria-pressed', cats.has(button.dataset.filterCat || '') ? 'true' : 'false');
  });
  root.querySelector('[data-free-only]')?.setAttribute('aria-pressed', freeOnly ? 'true' : 'false');
}

function matches(el: HTMLElement, cats: Set<string>, freeOnly: boolean): boolean {
  if (freeOnly && el.dataset.price !== 'free') return false;
  if (cats.size > 0 && !cats.has(el.dataset.category || '')) return false;
  return true;
}

function applyFilters(root: HTMLElement): void {
  const { cats, freeOnly } = selected(root);
  const filtering = cats.size > 0 || freeOnly;

  root.querySelectorAll<HTMLElement>('[data-event]').forEach((el) => {
    if (el.classList.contains('day__chip')) return;
    el.hidden = !matches(el, cats, freeOnly);
  });

  root.querySelectorAll<HTMLElement>('[data-day]').forEach((cell) => {
    let matched = 0;
    let shown = 0;
    cell.querySelectorAll<HTMLElement>('.day__chip').forEach((chip) => {
      if (!matches(chip, cats, freeOnly)) {
        chip.hidden = true;
        return;
      }
      matched += 1;
      chip.hidden = shown >= 3;
      if (shown < 3) shown += 1;
    });
    const more = cell.querySelector<HTMLElement>('[data-more]');
    if (more) {
      more.hidden = matched <= 3;
      more.textContent = `+${Math.max(0, matched - 3)} more`;
    }
    let dots = 0;
    cell.querySelectorAll<HTMLElement>('[data-dot]').forEach((dot) => {
      if (!matches(dot, cats, freeOnly)) {
        dot.hidden = true;
        return;
      }
      dot.hidden = dots >= 4;
      if (dots < 4) dots += 1;
    });
    cell.classList.toggle('day--has-events', matched > 0);
    const count = cell.querySelector('[data-day-count]');
    if (count) count.textContent = matched === 0 ? 'no events' : matched === 1 ? '1 event' : `${matched} events`;
  });

  root.querySelectorAll<HTMLElement>('[data-time-group]').forEach((group) => {
    const visible = [...group.querySelectorAll<HTMLElement>('[data-event]')].filter((card) => !card.hidden).length;
    group.hidden = visible === 0;
    const heading = group.querySelector<HTMLElement>('[data-time-heading]');
    const time = heading?.dataset.time || '';
    if (heading && visible > 0) heading.textContent = visible > 1 ? `${time} · ${visible} events` : time;
  });

  root.querySelectorAll<HTMLElement>('[data-day-group]').forEach((group) => {
    if (group.hasAttribute('data-named-only')) {
      group.hidden = filtering;
      return;
    }
    const visible = [...group.querySelectorAll<HTMLElement>('[data-event]')].filter((card) => !card.hidden).length;
    const heading = group.querySelector<HTMLElement>('[data-day-heading]');
    const label = heading?.dataset.label || '';
    if (heading) {
      heading.textContent = visible > 0 ? `${label} · ${visible === 1 ? '1 event' : `${visible} events`}` : label;
    }
    if (group.hasAttribute('data-week-day')) {
      group.hidden = false;
      const list = group.querySelector<HTMLElement>('[data-event-list]');
      const quiet = group.querySelector<HTMLElement>('[data-quiet]');
      if (list) list.hidden = visible === 0;
      if (quiet) quiet.hidden = visible !== 0;
      return;
    }
    if (group.hasAttribute('data-agenda-day')) group.hidden = visible === 0;
  });

  root.querySelectorAll<HTMLElement>('[data-view]').forEach((view) => {
    const empty = view.querySelector<HTMLElement>('[data-view-empty]');
    if (!empty) return;
    if (view.hasAttribute('data-span-days')) {
      empty.hidden = true;
      return;
    }
    const visible = view.querySelector('[data-time-group]:not([hidden])');
    empty.hidden = !!visible;
    if (!empty.hidden) empty.textContent = emptyCopy(view.dataset.emptyScope || 'for today', cats.size > 0, freeOnly);
  });

  root.querySelectorAll<HTMLElement>('[data-month-panel]').forEach((panel) => {
    const note = panel.querySelector<HTMLElement>('[data-month-empty]');
    if (!note) return;
    const any = panel.querySelector('.day__chip:not([hidden])');
    note.hidden = !filtering || !!any;
    const month = note.dataset.monthLabel || 'this month';
    if (!note.hidden) {
      if (freeOnly && cats.size > 0) note.textContent = `No free events in the selected categories in ${month}.`;
      else if (freeOnly) note.textContent = `No free events in ${month}.`;
      else note.textContent = `No events in the selected categories in ${month}.`;
    }
  });
}

function writeUrl(root: HTMLElement): void {
  const { cats, freeOnly } = selected(root);
  const params = new URLSearchParams();
  root.querySelectorAll<HTMLButtonElement>('[data-filter-cat]').forEach((button) => {
    const name = button.dataset.filterCat || '';
    if (name && cats.has(name)) params.append('cat', name);
  });
  if (freeOnly) params.set('free', '1');
  const query = params.toString();
  const next = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
  history.replaceState(null, '', next);
}

function readUrl(root: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  const wanted = new Set(params.getAll('cat'));
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-filter-cat]')];
  const known = buttons.map((button) => button.dataset.filterCat || '').filter(Boolean);
  const allSelected = known.length > 0 && known.every((name) => wanted.has(name));
  buttons.forEach((button) => {
    const name = button.dataset.filterCat || '';
    button.setAttribute('aria-pressed', !allSelected && wanted.has(name) ? 'true' : 'false');
  });
  const freeOnly = params.get('free') === '1';
  root.querySelector('[data-free-only]')?.setAttribute('aria-pressed', freeOnly ? 'true' : 'false');
  const any = buttons.some((button) => button.getAttribute('aria-pressed') === 'true');
  root.querySelector('[data-filter-all]')?.setAttribute('aria-pressed', any ? 'false' : 'true');
}

function bindFilters(root: HTMLElement): void {
  const buttons = () => [...root.querySelectorAll<HTMLButtonElement>('[data-filter-cat]')];
  const sync = () => {
    const { cats, freeOnly } = selected(root);
    paintFilters(root, cats, freeOnly);
    applyFilters(root);
    writeUrl(root);
  };
  root.querySelector('[data-filter-all]')?.addEventListener('click', () => {
    buttons().forEach((button) => button.setAttribute('aria-pressed', 'false'));
    sync();
  });
  buttons().forEach((button) => {
    button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      const on = buttons().filter((item) => item.getAttribute('aria-pressed') === 'true');
      if (on.length === buttons().length) buttons().forEach((item) => item.setAttribute('aria-pressed', 'false'));
      sync();
    });
  });
  root.querySelector('[data-free-only]')?.addEventListener('click', () => {
    const button = root.querySelector('[data-free-only]');
    const pressed = button?.getAttribute('aria-pressed') === 'true';
    button?.setAttribute('aria-pressed', pressed ? 'false' : 'true');
    sync();
  });
}

export function startCalendar(): void {
  const root = document.querySelector<HTMLElement>('[data-calendar]');
  if (!root || root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';
  const timeZone = root.dataset.timezone || 'Asia/Kolkata';
  const now = new Date();
  const today = cityToday(timeZone, now);
  const builtToday = root.dataset.builtToday || today;

  if (today !== builtToday) {
    markDays(root, today);
    retitleAgenda(root, today);
    splitEarlier(root, today);
    if (root.dataset.home === 'true') rebuildQuick(root, today);
  }

  if (root.dataset.home === 'true') {
    const months = (root.dataset.months || '').split(',').filter(Boolean);
    const start = startMonthKey(poolEvents(root), months, timeZone, now);
    if (start && start !== root.dataset.builtMonth) showMonth(root, start);
  }

  syncEnded(root, timeZone, now);
  readUrl(root);
  applyFilters(root);
  bindFilters(root);
  watchFrames(root);
}
