/* =====================================================================
   Nagpur Happenings — settings
   ---------------------------------------------------------------------
   These are the only lines you normally need to edit. Paste your links
   between the quotes, save, and upload script.js to GitHub again.
   ===================================================================== */
const NH_CONFIG = {
  // Your Google Apps Script web app URL. It ends in /exec. (README, step 2)
  EVENTS_API_URL: 'https://script.google.com/macros/s/AKfycbwqxucqiby_yPb-PREPUuUM-xuuCesWCwIa2pAC9jnoia4jUWKnJeNGI8mDHH4sAO-XyA/exec',

  // Public link to your Google Form for event submissions. (README, step 4)
  SUBMIT_FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSfAouXaWzdK4i1dVSOqxm2Ar2JCaNDMPoWn4CFyeAWiZE0_gg/viewform',
  // "Request an event" button. Best: the form's pre-filled link with "Request a kind of event" ticked.
  // Empty = uses SUBMIT_FORM_URL. Without any form the Request buttons are hidden.
  REQUEST_FORM_URL: '',

  // Instagram profile for the footer "Instagram" link.
  INSTAGRAM_URL: 'https://www.instagram.com/arinjayxci/',

  // Email for the footer "Contact" link and the "Something changed?" button.
  CONTACT_EMAIL: 'community@arinjay.email',

  // "Made by" credit in the footer. Instagram handle without the @.
  CREATOR_NAME: 'Arinjay',
  CREATOR_INSTAGRAM: 'arinjayxci',
  CREATOR_SITE_URL: 'https://xci.cx',
  // Your photo, e.g. 'assets/arinjay.jpg' (square works best). Empty shows your initial.
  CREATOR_PHOTO: '',

  // Free visit counter from goatcounter.com: paste your code, e.g. 'nagpurhappenings'
  // (the part before .goatcounter.com). Empty = no tracking. (README, step 7)
  GOATCOUNTER_CODE: 'nagpurhappenings',

  // Rolling "odometer" visit counter in the footer. Needs "Allow adding visitor
  // counts on your website" switched on in GoatCounter's settings. Set to false to hide.
  SHOW_VISIT_COUNT: true,
  VISIT_COUNT_SINCE: '31 Oct 2026',
  // Keep the counter hidden until the total reaches this number (1 = show right away).
  VISIT_COUNT_MIN: 1,

  // Thin bar above the header announcing the new address. Visitors can close it
  // (remembered on their device); it switches itself off after NEW_HOME_UNTIL.
  SHOW_NEW_HOME: true,
  NEW_HOME_UNTIL: '2026-11-30',

  // "Also by ..." box in the footer. Only list things that are live.
  // url can be '' (shows the name without a link). The helpline lines are optional.
  ALSO_BY: [
    {
      name: 'Orange Hunter',
      url: 'https://www.instagram.com/orangehunterxci/',
      linkLabel: 'Instagram @orangehunterxci',
      logo: 'assets/logo-orange-hunter.webp',
      round: true,
      note: 'A free, volunteer-run community where people with ADHD, neurodivergence, depression, anxiety and ' +
        'other mental health struggles can connect, find their people, and support one another without judgement.',
    },
    {
      name: 'Arinjay Business Systems',
      url: 'https://arinjaysystems.com/',
      linkLabel: 'arinjaysystems.com',
      logo: 'assets/logo-abs.webp',
      note: 'Helping businesses get discovered and recommended by AI through AEO, GEO and comprehensive ' +
        'AI Visibility Audits. Building smarter digital systems and improving visibility across search engines and AI platforms.',
    },
    {
      name: 'xci.cx',
      url: 'https://xci.cx/',
      logo: 'assets/logo-xci.webp',
      round: true,
      note: 'All my links and projects in one place.',
    },
  ],

  // How long a visitor's browser reuses downloaded events before asking again.
  CACHE_MINUTES: 10,

  // Give up waiting for the events feed after this many seconds.
  REQUEST_TIMEOUT_SECONDS: 12,

  // Number of events in "Coming Up in Nagpur" (5–10 works well).
  UPCOMING_LIMIT: 8,

  // Event labels shown inside one calendar day before "+N more".
  MAX_EVENTS_PER_DAY: 3,

  // First column of the calendar: 1 = Monday, 0 = Sunday.
  WEEK_STARTS_ON: 1,

  // All dates and "today" are worked out in this timezone.
  TIMEZONE: 'Asia/Kolkata',

  // Illustrative sample data used by the "Preview with sample events" button.
  SAMPLE_DATA_URL: 'data/sample-events.js',
};

/* =====================================================================
   App code. You shouldn't need to edit anything below this line.
   ===================================================================== */
(function () {
  'use strict';

  const CONFIG = NH_CONFIG;

  // Category colours live in styles.css (.cat-books etc.). Keys must match.
  const CATEGORIES = [
    { key: 'books', name: 'Books & Literature', short: 'Books' },
    { key: 'games', name: 'Board Games & Chess', short: 'Games & chess' },
    { key: 'arts', name: 'Arts & Culture', short: 'Arts' },
    { key: 'music', name: 'Music & Entertainment', short: 'Music & fun' },
    { key: 'learning', name: 'Learning & Workshops', short: 'Learning' },
    { key: 'community', name: 'Communities & Social', short: 'Community' },
    { key: 'outdoors', name: 'Outdoors & Recreation', short: 'Outdoors' },
    { key: 'other', name: 'Other', short: 'Other' },
  ];
  const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));
  const CATEGORY_LOOKUP = new Map();
  CATEGORIES.forEach((c) => {
    [c.key, c.name, c.short].forEach((label) => CATEGORY_LOOKUP.set(norm(label), c.key));
  });
  // A few forgiving spellings for categories typed by hand in the sheet.
  [
    ['books and lit', 'books'], ['literature', 'books'], ['poetry', 'books'],
    ['board games', 'games'], ['chess', 'games'], ['games', 'games'],
    ['arts', 'arts'], ['art', 'arts'], ['culture', 'arts'], ['theatre', 'arts'],
    ['music', 'music'], ['entertainment', 'music'], ['comedy', 'music'],
    ['learning', 'learning'], ['workshops', 'learning'], ['workshop', 'learning'], ['talks', 'learning'],
    ['communities', 'community'], ['community', 'community'], ['social', 'community'],
    ['outdoors', 'outdoors'], ['recreation', 'outdoors'], ['outdoor', 'outdoors'],
  ].forEach(([label, key]) => CATEGORY_LOOKUP.set(norm(label), key));

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WEEKDAYS_SHORT = WEEKDAYS.map((d) => d.slice(0, 3));

  const WEEK_START = CONFIG.WEEK_STARTS_ON === 0 ? 0 : 1;
  const MAX_PER_DAY = Math.max(1, Number(CONFIG.MAX_EVENTS_PER_DAY) || 3);
  const UPCOMING_LIMIT = Math.min(20, Math.max(1, Number(CONFIG.UPCOMING_LIMIT) || 8));
  const UPCOMING_SHOWN = 5;     // Coming Up shows this many, then a 'Show N more' button
  const AGENDA_DAYS_SHOWN = 4;  // the phone month list shows this many days, then 'Show all'
  const CACHE_MS = Math.max(0, Number(CONFIG.CACHE_MINUTES) || 0) * 60 * 1000;
  const CACHE_KEY = 'nagpur-happenings:events:v2:' + String(CONFIG.EVENTS_API_URL || '');

  const state = {
    events: [],
    days: new Map(), // 'YYYY-MM-DD' -> ['Diwali', ...] from the Sheet's Days tab
    loaded: false,
    sample: false,
    view: { y: 2026, m: 0 },
    filters: new Set(),
    logos: new Map(),     // organiser name (normalised) -> logo URL, from the Organisers tab
    agendaOpen: null,     // 'y-m' of a month whose full list is open
    upcomingOpen: false,
  };

  const els = {};
  let lastFocus = null;
  let loading = false;

  /* ---------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------- */
  function norm(value) {
    return String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // m is 0-based (0 = January)
  function isoDate(y, m, d) {
    return y + '-' + pad(m + 1) + '-' + pad(d);
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  }

  function weekdayOf(y, m, d) {
    return new Date(Date.UTC(y, m, d)).getUTCDay();
  }

  function parseIso(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);
    if (m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m)) return null;
    return { y, m, d };
  }

  // Build DOM safely. Strings always become text nodes, never HTML.
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        const value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') el.className = value;
        else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
        else el.setAttribute(key, value === true ? '' : String(value));
      });
    }
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined || child === false || child === '') return;
      el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return el;
  }

  // Only allow web links (http/https). Anything else is dropped.
  function safeUrl(value) {
    let s = String(value || '').trim();
    if (!s) return '';
    if (/^www\./i.test(s)) s = 'https://' + s;
    try {
      const url = new URL(s);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (e) {
      return '';
    }
  }

  // Poster and logo links: https images, Google Drive share links (shown via Google's
  // image server), or files in this site's own assets/ folder.
  function imageUrl(value) {
    const s = String(value || '').trim();
    if (!s) return '';
    if (/^assets\/[\w./-]+\.(webp|png|jpe?g|gif|svg)$/i.test(s) && !s.includes('..')) return s;
    const drive = s.match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/([\w-]{20,})|(?:open|uc)\?(?:[^#]*?&)?id=([\w-]{20,}))/i);
    if (drive) return 'https://lh3.googleusercontent.com/d/' + (drive[1] || drive[2]) + '=w1000';
    return safeUrl(s);
  }

  function isEmail(value) {
    return /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/.test(String(value || '').trim());
  }

  /* ---------------------------------------------------------------
     Time in Nagpur (Asia/Kolkata), whatever the visitor's device says
     --------------------------------------------------------------- */
  let cityClock;
  try {
    cityClock = new Intl.DateTimeFormat('en-GB', {
      timeZone: CONFIG.TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
  } catch (e) {
    cityClock = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
  }

  function nowInCity() {
    const parts = {};
    cityClock.formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
    const y = Number(parts.year);
    const m = Number(parts.month) - 1;
    const d = Number(parts.day);
    const hour = Number(parts.hour) % 24;
    return { y, m, d, iso: isoDate(y, m, d), minutes: hour * 60 + Number(parts.minute) };
  }

  function minutesOf(hhmm) {
    const [hh, mm] = hhmm.split(':').map(Number);
    return hh * 60 + mm;
  }

  /* ---------------------------------------------------------------
     Formatting
     --------------------------------------------------------------- */
  function longDate(iso) {
    const p = parseIso(iso);
    if (!p) return iso;
    return WEEKDAYS[weekdayOf(p.y, p.m, p.d)] + ', ' + p.d + ' ' + MONTHS[p.m] + ' ' + p.y;
  }

  function timeLabel(hhmm, compact) {
    const [hh, mm] = hhmm.split(':').map(Number);
    const suffix = hh < 12 ? 'am' : 'pm';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    if (compact && mm === 0) return h12 + ' ' + suffix;
    return h12 + ':' + pad(mm) + ' ' + suffix;
  }

  function timeRange(ev) {
    if (!ev.startTime) return '';
    if (!ev.endTime) return timeLabel(ev.startTime);
    return timeLabel(ev.startTime) + ' – ' + timeLabel(ev.endTime);
  }

  function formatPrice(price) {
    const s = String(price || '').trim();
    if (/^\d+(\.\d+)?$/.test(s)) return '₹' + Number(s).toLocaleString('en-IN');
    return s;
  }

  function priceLabel(ev) {
    if (ev.priceType === 'Free') return 'Free';
    if (ev.priceType === 'Paid') return ev.ticketPrice ? 'Paid, ' + formatPrice(ev.ticketPrice) : 'Paid';
    return '';
  }

  function placeLabel(ev) {
    return [ev.venue, ev.area].filter(Boolean).join(', ');
  }

  function dayNames(iso) {
    return (state.days.get(iso) || []).join(', ');
  }

  function categoryName(key) {
    return (CATEGORY_BY_KEY.get(key) || CATEGORY_BY_KEY.get('other')).name;
  }

  function savedAtLabel(ms) {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: CONFIG.TIMEZONE, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      }).format(new Date(ms));
    } catch (e) {
      return new Date(ms).toLocaleString();
    }
  }

  /* ---------------------------------------------------------------
     Turning feed rows into clean event objects
     --------------------------------------------------------------- */
  function text(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function cleanTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(text(value));
    if (!match) return '';
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    if (hh > 23 || mm > 59) return '';
    return pad(hh) + ':' + pad(mm);
  }

  function categoryKey(value) {
    return CATEGORY_LOOKUP.get(norm(value)) || 'other';
  }

  function priceType(type, price) {
    const t = norm(type);
    if (t === 'free') return 'Free';
    if (t === 'paid') return 'Paid';
    const p = text(price);
    if (!p) return '';
    if (/^(free|₹?\s*0+(\.0+)?)$/i.test(p)) return 'Free';
    if (/\d/.test(p)) return 'Paid';
    return '';
  }

  function normalizeEvent(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const date = text(raw.date);
    const title = text(raw.title);
    if (!title || !parseIso(date)) return null;

    const statusRaw = norm(raw.status || 'published');
    let status;
    if (statusRaw === 'published') status = 'Published';
    else if (statusRaw === 'cancelled' || statusRaw === 'canceled') status = 'Cancelled';
    else return null; // Draft, Completed or anything else is never shown

    const featured = raw.featured === true || /^(yes|y|true|1)$/i.test(text(raw.featured));

    return {
      id: text(raw.id) || 'event-' + index,
      title,
      category: categoryKey(raw.category),
      date,
      startTime: cleanTime(raw.startTime),
      endTime: cleanTime(raw.endTime),
      venue: text(raw.venue),
      area: text(raw.area),
      description: text(raw.description),
      organiserName: text(raw.organiserName),
      organiserContact: text(raw.organiserContact),
      registrationUrl: safeUrl(raw.registrationUrl),
      ticketPrice: text(raw.ticketPrice),
      priceType: priceType(raw.priceType, raw.ticketPrice),
      coverImageUrl: imageUrl(raw.coverImageUrl),
      // "Who can join", e.g. "Kids 6–12" or "18+, Neurodivergent-friendly". Blank = open to all.
      audience: text(raw.audience).split(/\s*[,;\n]\s*/).filter(Boolean).slice(0, 3).map((a) => a.slice(0, 40)),
      status,
      featured,
    };
  }

  function compareEvents(a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const ta = a.startTime || '99:99';
    const tb = b.startTime || '99:99';
    if (ta !== tb) return ta < tb ? -1 : 1;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.title.localeCompare(b.title);
  }

  function passesFilter(ev) {
    return state.filters.size === 0 || state.filters.has(ev.category);
  }

  function hasEnded(ev, now) {
    if (ev.date < now.iso) return true;
    if (ev.date > now.iso) return false;
    if (ev.endTime) return minutesOf(ev.endTime) <= now.minutes;
    return false; // no end time: treat as on for the whole day
  }

  function eventsInMonth(y, m) {
    const prefix = y + '-' + pad(m + 1) + '-';
    return state.events.filter((ev) => ev.date.startsWith(prefix) && passesFilter(ev));
  }

  function eventsOn(iso) {
    return state.events.filter((ev) => ev.date === iso && passesFilter(ev));
  }

  function groupByDate(list) {
    const map = new Map();
    list.forEach((ev) => {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date).push(ev);
    });
    return map;
  }

  /* ---------------------------------------------------------------
     Visit counter (GoatCounter). Does nothing until GOATCOUNTER_CODE is set.
     --------------------------------------------------------------- */
  function loadCounter() {
    const code = text(CONFIG.GOATCOUNTER_CODE).toLowerCase();
    if (!/^[a-z0-9-]+$/.test(code)) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://gc.zgo.at/count.js';
    script.setAttribute('data-goatcounter', 'https://' + code + '.goatcounter.com/count');
    document.head.appendChild(script);
  }

  // Public visit count in the footer (site total from GoatCounter), shown as an
  // odometer whose digits roll into place when the footer scrolls into view.
  async function showVisitCount() {
    const code = text(CONFIG.GOATCOUNTER_CODE).toLowerCase();
    if (!CONFIG.SHOW_VISIT_COUNT || !/^[a-z0-9-]+$/.test(code) || !els.visits) return;
    try {
      const res = await fetch('https://' + code + '.goatcounter.com/counter/TOTAL.json', { cache: 'no-store' });
      if (!res.ok) return; // setting not switched on yet, or no data
      const data = await res.json();
      const raw = text(data && data.count);
      if (!/^[\d,.\s]+$/.test(raw)) return;
      const total = parseInt(raw.replace(/\D/g, ''), 10);
      const min = Math.max(1, Number(CONFIG.VISIT_COUNT_MIN) || 1);
      if (!Number.isFinite(total) || total < min) return;
      renderOdometer(total);
    } catch (e) {
      /* counter unavailable: show nothing */
    }
  }

  function renderOdometer(total) {
    const shown = total.toLocaleString('en-IN'); // 1,23,456 style
    const since = text(CONFIG.VISIT_COUNT_SINCE);
    const label = (total === 1 ? 'visit' : 'visits') + (since ? ' since ' + since : '');
    // Like a real meter, small numbers get faded leading zeros: 6 → 0006.
    const MIN_WHEELS = 4;
    const realDigits = shown.replace(/\D/g, '').length;
    const pad = Math.max(0, MIN_WHEELS - realDigits);
    const chars = Array(pad).fill('p').concat(Array.from(shown));
    const wheels = pad + realDigits;
    let i = 0;
    const cells = chars.map((ch) => {
      if (ch !== 'p' && !/\d/.test(ch)) return h('span', { class: 'odo__sep' }, ch);
      const index = i++;
      const digit = ch === 'p' ? 0 : Number(ch);
      const strip = h('span', { class: 'odo__strip' });
      // Two turns of 0–9, so every wheel spins a full lap before it lands.
      for (let n = 0; n < 20; n += 1) strip.appendChild(h('span', null, String(n % 10)));
      return h('span', {
        class: 'odo__cell' + (ch === 'p' ? ' odo__cell--pad' : '') + (index === wheels - 1 ? ' odo__cell--last' : ''),
        style: '--d:' + (digit + 10) + ';--i:' + index,
      }, strip);
    });
    const odo = h('span', { class: 'odo', 'aria-hidden': 'true' }, cells);
    els.visits.replaceChildren(
      h('span', { class: 'visually-hidden' }, shown + ' ' + label),
      odo,
      h('span', { class: 'visits__label', 'aria-hidden': 'true' }, label)
    );
    els.visits.hidden = false;

    const roll = () => requestAnimationFrame(() => requestAnimationFrame(() => odo.classList.add('is-rolled')));
    if (!('IntersectionObserver' in window)) { roll(); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      roll();
    }, { threshold: 0.6 });
    io.observe(odo);
  }

  // Counts a click, e.g. track('register', ev) → "register-NH-002".
  // Clicks made before the counter script has loaded are queued briefly.
  const trackQueue = [];
  let trackTimer = null;

  function counterReady() {
    return Boolean(window.goatcounter && typeof window.goatcounter.count === 'function');
  }

  function flushTrackQueue() {
    while (trackQueue.length && counterReady()) {
      try { window.goatcounter.count(trackQueue.shift()); } catch (e) { /* ignore */ }
    }
  }

  function track(action, ev) {
    if (!/^[a-z0-9-]+$/i.test(text(CONFIG.GOATCOUNTER_CODE))) return;
    trackQueue.push({ path: action + (ev ? '-' + ev.id : ''), title: ev ? ev.title : action, event: true });
    if (counterReady()) {
      flushTrackQueue();
      return;
    }
    if (trackTimer) return;
    let tries = 0;
    trackTimer = setInterval(() => {
      tries += 1;
      if (counterReady() || tries > 40) {
        clearInterval(trackTimer);
        trackTimer = null;
        flushTrackQueue();
        trackQueue.length = 0;
      }
    }, 250);
  }

  /* ---------------------------------------------------------------
     Creator credit and contact links
     --------------------------------------------------------------- */
  function creatorHandle() {
    return text(CONFIG.CREATOR_INSTAGRAM).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
  }

  function avatar(small) {
    const name = text(CONFIG.CREATOR_NAME) || 'A';
    const box = h('span', { class: 'avatar' + (small ? ' avatar--small' : ''), 'aria-hidden': 'true' });
    const initial = name.charAt(0).toUpperCase();
    const photo = text(CONFIG.CREATOR_PHOTO);
    if (photo) {
      const img = h('img', { src: photo, alt: '', loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', () => { img.remove(); box.textContent = initial; });
      box.appendChild(img);
    } else {
      box.textContent = initial;
    }
    return box;
  }

  function renderCreator() {
    const name = text(CONFIG.CREATOR_NAME);
    if (!name) return;
    const handle = creatorHandle();
    const site = safeUrl(CONFIG.CREATOR_SITE_URL);
    const hasPhoto = Boolean(text(CONFIG.CREATOR_PHOTO));
    const igUrl = handle ? 'https://www.instagram.com/' + handle + '/' : '';
    // With a photo, the photo is the Instagram link; without one, a text link
    const photo = hasPhoto
      ? (igUrl
        ? h('a', {
          class: 'creator__photo', href: igUrl, target: '_blank', rel: 'noopener noreferrer',
          'aria-label': name + ' on Instagram (@' + handle + ')', title: name + ' on Instagram (@' + handle + ')',
          onclick: () => track('creator-instagram'),
        }, avatar(false))
        : avatar(false))
      : null;
    els.creator.replaceChildren(...[
      photo,
      h('div', { class: 'creator__text' },
        h('p', { class: 'creator__by' }, 'Made by ' + name),
        h('p', { class: 'creator__links' },
          !hasPhoto && igUrl
            ? h('a', { href: igUrl, target: '_blank', rel: 'noopener noreferrer', onclick: () => track('creator-instagram') }, 'Instagram @' + handle)
            : null,
          site ? h('a', {
            class: 'creator__site', href: site, target: '_blank', rel: 'noopener noreferrer',
            onclick: () => track('creator-site'),
          }, site.replace(/^https?:\/\//, '').replace(/\/$/, '')) : null)),
    ].filter(Boolean));
    els.creator.hidden = false;
  }

  /* ---------------------------------------------------------------
     Links to a single event (#event=NH-002) for sharing
     --------------------------------------------------------------- */
  function eventLink(ev) {
    return window.location.href.split('#')[0] + '#event=' + encodeURIComponent(ev.id);
  }

  function eventIdFromHash() {
    const match = /^#event=(.+)$/.exec(window.location.hash || '');
    if (!match) return '';
    try { return decodeURIComponent(match[1]); } catch (e) { return ''; }
  }

  function setEventHash(ev) {
    try {
      const base = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', ev ? base + '#event=' + encodeURIComponent(ev.id) : base);
    } catch (e) {
      /* file:// pages in some browsers refuse this; sharing still works */
    }
  }

  let pendingEventId = '';
  let viewChosenByVisitor = false;

  // If nothing is left this month, open on the month of the next event
  // (e.g. on 31 October with no more October events, show November).
  function pickStartMonth() {
    const now = nowInCity();
    const upcoming = state.events.filter((ev) => ev.status === 'Published' && !hasEnded(ev, now));
    if (!upcoming.length) return;
    const thisMonth = now.y + '-' + pad(now.m + 1) + '-';
    if (upcoming.some((ev) => ev.date.startsWith(thisMonth))) return;
    const p = parseIso(upcoming[0].date);
    state.view = { y: p.y, m: p.m };
  }

  function openPendingEvent() {
    if (!pendingEventId || !state.loaded) return;
    const ev = state.events.find((e) => e.id === pendingEventId);
    pendingEventId = '';
    if (!ev) {
      if (!viewChosenByVisitor) { pickStartMonth(); renderAll(); }
      return;
    }
    viewChosenByVisitor = true;
    const p = parseIso(ev.date);
    state.view = { y: p.y, m: p.m };
    renderAll();
    openEvent(ev.id);
  }

  function shareText(ev) {
    const when = [longDate(ev.date), timeRange(ev)].filter(Boolean).join(', ');
    return [ev.title, when, placeLabel(ev), eventLink(ev)].filter(Boolean).join('\n');
  }

  // Phone share sheet (Instagram, Telegram, Messages...). Hidden where the browser has none.
  function nativeShareButton(ev) {
    if (typeof navigator.share !== 'function') return null;
    const btn = h('button', { type: 'button', class: 'ev__choice' }, 'Other apps');
    btn.addEventListener('click', () => {
      const when = [longDate(ev.date), timeRange(ev)].filter(Boolean).join(', ');
      const body = [ev.title, when, placeLabel(ev)].filter(Boolean).join('\n');
      navigator.share({ title: ev.title, text: body, url: eventLink(ev) })
        .then(() => track('share', ev), () => { /* share sheet closed */ });
    });
    return btn;
  }

  function followUrl() {
    const handle = creatorHandle();
    return handle ? 'https://www.instagram.com/' + handle + '/' : '';
  }

  // "Event updates and more on Instagram: Follow @handle"
  function followLine(action, ev) {
    const url = followUrl();
    if (!url) return null;
    return h('p', { class: 'follow-line' },
      'Event updates and more on Instagram: ',
      h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', onclick: () => track(action, ev) },
        'Follow @' + creatorHandle()));
  }

  function renderFollowLine() {
    const line = followLine('follow-upcoming');
    if (!line || !els.upcomingFollow) return;
    els.upcomingFollow.replaceChildren(...Array.from(line.childNodes));
    els.upcomingFollow.hidden = false;
  }

  // "New home!" bar
  const NEW_HOME_KEY = 'nagpur-happenings:newhome-dismissed';
  function showNewHome() {
    const bar = document.getElementById('newhome');
    if (!bar || !CONFIG.SHOW_NEW_HOME) return;
    const until = text(CONFIG.NEW_HOME_UNTIL);
    if (until && nowInCity().iso > until) return;
    try { if (localStorage.getItem(NEW_HOME_KEY) === '1') return; } catch (e) { /* storage blocked: just show it */ }
    bar.hidden = false;
    document.getElementById('newhome-close').addEventListener('click', () => {
      bar.hidden = true;
      try { localStorage.setItem(NEW_HOME_KEY, '1'); } catch (e) { /* ignore */ }
      track('newhome-dismiss');
    });
  }

  // Footer box: "Also by Arinjay"
  function renderAlsoBy() {
    const items = (Array.isArray(CONFIG.ALSO_BY) ? CONFIG.ALSO_BY : [])
      .filter((item) => item && text(item.name))
      .map((item) => {
        const name = text(item.name);
        const url = safeUrl(item.url);
        const slug = norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const go = () => track('also-' + slug);
        const linkAttrs = { href: url, target: '_blank', rel: 'noopener noreferrer', onclick: go };
        const logoSrc = /^assets\/[\w.-]+\.(webp|png|jpe?g|svg)$/.test(text(item.logo)) ? text(item.logo) : '';
        const img = logoSrc
          ? h('img', { class: 'also__logo' + (item.round ? ' also__logo--round' : ''), src: logoSrc, alt: '', width: 56, height: 56, loading: 'lazy', decoding: 'async' })
          : null;
        return h('li', { class: 'also__item' + (img ? ' also__item--logo' : '') },
          img ? (url ? h('a', Object.assign({ class: 'also__logo-link', tabindex: '-1', 'aria-hidden': 'true' }, linkAttrs), img) : img) : null,
          h('div', { class: 'also__body' },
            url ? h('a', Object.assign({ class: 'also__name' }, linkAttrs), name) : h('p', { class: 'also__name' }, name),
            text(item.note) ? h('p', { class: 'also__note' }, text(item.note)) : null,
            url && text(item.linkLabel)
              ? h('p', { class: 'also__link' }, h('a', linkAttrs, text(item.linkLabel), h('span', { 'aria-hidden': 'true' }, ' →')))
              : null));
      });
    if (!items.length || !els.alsoBy) return;
    const who = text(CONFIG.CREATOR_NAME);
    els.alsoBy.replaceChildren(
      h('h2', { class: 'also__title', id: 'also-title' }, who ? 'Also by ' + who : 'Also from us'),
      h('ul', { class: 'also__list' }, items));
    els.alsoBy.hidden = false;
  }

  function copyToClipboard(value) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
    return new Promise((resolve, reject) => {
      const area = h('textarea', { readonly: true, style: 'position:fixed;top:-100px;opacity:0' });
      area.value = value;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand && document.execCommand('copy');
      area.remove();
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  function mapsUrl(ev) {
    const query = [ev.venue, ev.area, 'Nagpur'].filter(Boolean).join(', ');
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  /* ---------------------------------------------------------------
     Status bar (loading, errors, setup, sample data)
     --------------------------------------------------------------- */
  function setStatus(kind, message, action) {
    const box = els.status;
    if (!kind) {
      box.hidden = true;
      box.replaceChildren();
      return;
    }
    box.className = 'status status--' + kind;
    const children = [h('p', { class: 'status__text' }, message)];
    if (action) {
      children.push(h('button', { type: 'button', class: 'btn btn--small', onclick: action.onClick }, action.label));
    }
    box.replaceChildren(...children);
    box.hidden = false;
  }

  const retryAction = { label: 'Try again', onClick: () => loadEvents(true) };

  /* ---------------------------------------------------------------
     Loading events
     --------------------------------------------------------------- */
  function isConfigured() {
    const url = text(CONFIG.EVENTS_API_URL);
    return /^https:\/\/\S+$/i.test(url) && !/paste|your[_-]?/i.test(url);
  }

  function readCache() {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || !Array.isArray(cached.events) || typeof cached.savedAt !== 'number') return null;
      return cached;
    } catch (e) {
      return null;
    }
  }

  function writeCache(events, days, organisers) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), events, days: days || [], organisers: organisers || [] }));
    } catch (e) {
      /* storage full or blocked: carry on without caching */
    }
  }

  async function fetchEvents() {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = (Number(CONFIG.REQUEST_TIMEOUT_SECONDS) || 12) * 1000;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      const response = await fetch(CONFIG.EVENTS_API_URL, {
        method: 'GET',
        cache: 'no-store',
        redirect: 'follow',
        signal: controller ? controller.signal : undefined,
      });
      if (!response.ok) throw new Error('The events feed answered with HTTP ' + response.status + '.');
      const body = await response.text();
      let data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        throw new Error('The events feed did not return JSON. In Apps Script, check the deployment is a Web app with access set to "Anyone".');
      }
      if (!data || data.ok === false) throw new Error((data && data.error) || 'The events feed reported an error.');
      if (!Array.isArray(data.events)) throw new Error('The events feed has no "events" list.');
      return { events: data.events, days: Array.isArray(data.days) ? data.days : [], organisers: Array.isArray(data.organisers) ? data.organisers : [] };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function applyEvents(rawEvents, rawDays, rawOrganisers) {
    state.events = rawEvents
      .map((raw, i) => normalizeEvent(raw, i))
      .filter(Boolean)
      .sort(compareEvents);
    state.days = new Map();
    (Array.isArray(rawDays) ? rawDays : []).forEach((d) => {
      const date = text(d && d.date);
      const name = text(d && d.name).slice(0, 60);
      if (!name || !parseIso(date)) return;
      if (!state.days.has(date)) state.days.set(date, []);
      state.days.get(date).push(name);
    });
    state.logos = new Map();
    (Array.isArray(rawOrganisers) ? rawOrganisers : []).forEach((o) => {
      const key = norm(o && o.name);
      const url = imageUrl(o && o.logoUrl);
      if (key && url) state.logos.set(key, url);
    });
    state.loaded = true;
    if (!viewChosenByVisitor && !pendingEventId) pickStartMonth();
    renderAll();
    openPendingEvent();
  }

  async function loadEvents(force) {
    if (state.sample) return;
    if (!isConfigured()) {
      showSetupMessage();
      return;
    }
    if (loading) return;

    const cached = readCache();
    const age = cached ? Date.now() - cached.savedAt : Infinity;
    const fresh = cached && age >= 0 && age < CACHE_MS;
    if (cached) applyEvents(cached.events, cached.days, cached.organisers);
    if (fresh && !force) {
      setStatus('');
      return;
    }

    loading = true;
    const showLoading = setTimeout(() => setStatus('loading', 'Loading events…'), 300);
    try {
      const feed = await fetchEvents();
      writeCache(feed.events, feed.days, feed.organisers);
      applyEvents(feed.events, feed.days, feed.organisers);
      setStatus('');
    } catch (err) {
      console.error('[Nagpur Happenings] Could not load events:', err);
      if (cached) {
        setStatus('stale', 'Showing events saved on ' + savedAtLabel(cached.savedAt) + '. The latest list couldn’t be loaded.', retryAction);
      } else {
        setStatus('error', 'Events couldn’t be loaded. Check your internet connection, then try again.', retryAction);
      }
    } finally {
      clearTimeout(showLoading);
      loading = false;
    }
  }

  function showSetupMessage() {
    console.info('[Nagpur Happenings] EVENTS_API_URL is empty. Add your Apps Script web app URL at the top of script.js.');
    setStatus(
      'setup',
      'The events feed isn’t connected yet. Add your Google Apps Script web app URL to EVENTS_API_URL at the top of script.js (see README, step 3).',
      { label: 'Preview with sample events', onClick: loadSample }
    );
  }

  function loadSample() {
    if (window.NH_SAMPLE_DATA) {
      useSample();
      return;
    }
    const script = document.createElement('script');
    script.src = CONFIG.SAMPLE_DATA_URL;
    script.onload = useSample;
    script.onerror = () => setStatus('error', 'The sample file wasn’t found at ' + CONFIG.SAMPLE_DATA_URL + '.');
    document.head.appendChild(script);
  }

  function useSample() {
    const data = window.NH_SAMPLE_DATA;
    if (!data || !Array.isArray(data.events)) {
      setStatus('error', 'The sample file is missing its events list.');
      return;
    }
    state.sample = true;
    const wantsEvent = Boolean(pendingEventId);
    applyEvents(data.events, data.days, data.organisers);
    if (state.events.length && !wantsEvent) {
      const first = parseIso(state.events[0].date);
      state.view = { y: first.y, m: first.m };
      renderAll();
    }
    setStatus('sample', 'Showing illustrative sample events for November 2026. These are not real, confirmed Nagpur events.');
  }

  /* ---------------------------------------------------------------
     Rendering: filters
     --------------------------------------------------------------- */
  function buildFilters() {
    const all = h('button', {
      type: 'button', class: 'filter filter--all', 'aria-pressed': 'true',
      onclick: () => { state.filters.clear(); onFiltersChanged(); },
    }, 'All events');
    els.filterButtons = [all];
    const buttons = CATEGORIES.map((c) => {
      const btn = h('button', {
        type: 'button', class: 'filter cat-' + c.key, 'aria-pressed': 'false', 'data-cat': c.key,
        onclick: () => {
          if (state.filters.has(c.key)) state.filters.delete(c.key);
          else state.filters.add(c.key);
          if (state.filters.size === CATEGORIES.length) state.filters.clear();
          onFiltersChanged();
        },
      },
      h('span', { class: 'dot', 'aria-hidden': 'true' }),
      h('span', { class: 'filter__full' }, c.name),
      h('span', { class: 'filter__short', 'aria-hidden': 'true' }, c.short));
      els.filterButtons.push(btn);
      return btn;
    });
    els.filters.replaceChildren(all, ...buttons);
  }

  function onFiltersChanged() {
    els.filterButtons.forEach((btn) => {
      const key = btn.getAttribute('data-cat');
      const pressed = key ? state.filters.has(key) : state.filters.size === 0;
      btn.setAttribute('aria-pressed', String(pressed));
    });
    renderAll();
  }

  /* ---------------------------------------------------------------
     Rendering: calendar grid
     --------------------------------------------------------------- */
  function buildWeekdays() {
    const items = [];
    for (let i = 0; i < 7; i++) {
      const dow = (WEEK_START + i) % 7;
      items.push(h('li', { class: dow === 0 || dow === 6 ? 'is-weekend' : null },
        h('span', { class: 'wd-full' }, WEEKDAYS_SHORT[dow]),
        h('span', { class: 'wd-short' }, WEEKDAYS[dow].charAt(0))));
    }
    els.weekdays.replaceChildren(...items);
  }

  function chip(ev) {
    const time = ev.startTime ? timeLabel(ev.startTime, true) : '';
    const bits = [time, ev.title].filter(Boolean).join(' ');
    const extra = [categoryName(ev.category)];
    if (ev.status === 'Cancelled') extra.push('cancelled');
    if (ev.featured) extra.push('featured');
    let cls = 'chip cat-' + ev.category;
    if (ev.status === 'Cancelled') cls += ' chip--cancelled';
    if (ev.featured) cls += ' chip--featured';
    return h('button', {
      type: 'button', class: cls, title: ev.title,
      'aria-label': bits + ', ' + extra.join(', '),
      onclick: () => openEvent(ev.id),
    },
    time ? h('span', { class: 'chip__time' }, time) : null,
    h('span', { class: 'chip__title' }, ev.title));
  }

  function renderCalendar(now) {
    const { y, m } = state.view;
    els.monthName.textContent = MONTHS[m];
    els.monthYear.textContent = String(y);

    const byDate = groupByDate(eventsInMonth(y, m));
    const lead = (weekdayOf(y, m, 1) - WEEK_START + 7) % 7;
    const total = daysInMonth(y, m);
    const cellCount = Math.ceil((lead + total) / 7) * 7;
    const cells = [];

    for (let i = 0; i < cellCount; i++) {
      const day = i - lead + 1;
      if (day < 1 || day > total) {
        // Squares before the 1st and after the last day stay blank
        cells.push(h('li', { class: 'day day--outside', 'aria-hidden': 'true' }));
        continue;
      }

      const iso = isoDate(y, m, day);
      const dow = weekdayOf(y, m, day);
      const list = byDate.get(iso) || [];
      const isToday = iso === now.iso;
      const label = WEEKDAYS[dow] + ' ' + day + ' ' + MONTHS[m];
      const countText = list.length ? (list.length === 1 ? '1 event' : list.length + ' events') : 'no events';

      const special = dayNames(iso);
      let cls = 'day';
      if (special) cls += ' day--special';
      if (dow === 0 || dow === 6) cls += ' day--weekend';
      if (isToday) cls += ' day--today';
      else if (iso < now.iso) cls += ' day--past';
      if (list.length) cls += ' day--has-events';

      const cell = h('li', { class: cls, 'aria-current': isToday ? 'date' : null },
        h('div', { class: 'day__head' },
          h('span', { class: 'day__num', 'aria-hidden': 'true' }, String(day)),
          special ? h('span', { class: 'day__label', 'aria-hidden': 'true', title: special }, special) : null,
          h('span', { class: 'visually-hidden' }, label + (isToday ? ', today' : '') + (special ? ', ' + special : '') + ', ' + countText)));

      if (list.length) {
        cell.appendChild(h('ul', { class: 'day__events' },
          list.slice(0, MAX_PER_DAY).map((ev) => h('li', null, chip(ev)))));
        if (list.length > MAX_PER_DAY) {
          cell.appendChild(h('button', {
            type: 'button', class: 'day__more',
            'aria-label': 'Show all ' + list.length + ' events on ' + label,
            onclick: () => openDay(iso),
          }, '+' + (list.length - MAX_PER_DAY) + ' more'));
        }
        // Mobile view: coloured dots plus one big tap target for the day
        cell.appendChild(h('span', { class: 'day__dots', 'aria-hidden': 'true' },
          list.slice(0, 4).map((ev) => h('i', { class: 'dot cat-' + ev.category + (ev.status === 'Cancelled' ? ' dot--cancelled' : '') }))));
        cell.appendChild(h('button', {
          type: 'button', class: 'day__tap',
          'aria-label': label + (special ? ', ' + special : '') + ', ' + countText,
          onclick: () => openDay(iso),
        }));
      }
      cells.push(cell);
    }
    els.grid.replaceChildren(...cells);
    els.grid.setAttribute('data-rows', String(cellCount / 7));

    // Empty-month note
    if (state.loaded && byDate.size === 0) {
      const msg = state.filters.size
        ? 'No events in the selected categories in ' + MONTHS[m] + '. '
        : 'Nothing listed for ' + MONTHS[m] + ' yet. ';
      els.calNote.replaceChildren(msg, submitInlineLink('Know of something happening? Submit an event.'));
      els.calNote.hidden = false;
    } else {
      els.calNote.hidden = true;
    }
  }

  /* ---------------------------------------------------------------
     Rendering: event rows (month list on mobile + Coming Up)
     --------------------------------------------------------------- */
  function tag(label, cls) {
    return h('span', { class: 'tag' + (cls ? ' ' + cls : '') }, label);
  }

  function dateLeaf(iso, now) {
    const p = parseIso(iso);
    return h('p', { class: 'leaf' + (iso === now.iso ? ' leaf--today' : '') },
      h('span', { class: 'leaf__month' }, MONTHS_SHORT[p.m]),
      h('span', { class: 'leaf__day' }, String(p.d)),
      h('span', { class: 'leaf__weekday' }, iso === now.iso ? 'Today' : WEEKDAYS_SHORT[weekdayOf(p.y, p.m, p.d)]));
  }

  function eventRow(ev, opts) {
    const now = opts.now;
    let cls = 'event-row cat-' + ev.category;
    if (ev.featured) cls += ' event-row--featured';
    if (ev.status === 'Cancelled') cls += ' event-row--cancelled';
    if (hasEnded(ev, now)) cls += ' event-row--past';

    const titleTag = 'h' + (opts.level || 3);
    const time = timeRange(ev);
    const place = placeLabel(ev);
    const price = priceLabel(ev);

    return h('li', { class: cls },
      opts.showDate ? dateLeaf(ev.date, now) : null,
      h('div', { class: 'event-row__body' },
        h(titleTag, { class: 'event-row__title' },
          h('button', { type: 'button', class: 'event-row__open', onclick: () => openEvent(ev.id, opts.backTo) }, ev.title)),
        h('p', { class: 'event-row__meta' },
          h('span', { class: 'event-row__cat' }, h('i', { class: 'dot', 'aria-hidden': 'true' }), categoryName(ev.category)),
          time ? h('span', null, time) : null,
          place ? h('span', null, place) : null)),
      h('p', { class: 'event-row__tags' },
        ev.status === 'Cancelled' ? tag('Cancelled', 'tag--cancelled') : null,
        ev.featured && ev.status !== 'Cancelled' ? tag('Featured', 'tag--featured') : null,
        ev.status !== 'Cancelled' ? ev.audience.map((a) => tag(a, 'tag--audience')) : null,
        price && ev.status !== 'Cancelled' ? tag(price, ev.priceType === 'Free' ? 'tag--free' : 'tag--paid') : null));
  }

  // "Show all" button under a long list. Clicking it re-renders the lists.
  function listToggle(controls, expanded, moreLabel, onToggle) {
    return h('button', {
      type: 'button', class: 'list-toggle', 'aria-controls': controls, 'aria-expanded': expanded ? 'true' : 'false',
      onclick: onToggle,
    }, expanded ? 'Show fewer' : moreLabel, h('span', { class: 'list-toggle__chev', 'aria-hidden': 'true' }));
  }

  function renderAgenda(now) {
    const { y, m } = state.view;
    const list = eventsInMonth(y, m);
    const byDate = groupByDate(list);
    const prefix = y + '-' + pad(m + 1) + '-';
    const dates = new Set(byDate.keys());
    state.days.forEach((names, iso) => { if (iso.startsWith(prefix)) dates.add(iso); });
    els.agendaTitle.textContent = 'Events in ' + MONTHS[m];
    els.agenda.hidden = list.length === 0;
    const groups = [];
    const allDates = Array.from(dates).sort();
    // Long months collapse to the next few days (from today, in the current month)
    const monthKey = y + '-' + m;
    const expanded = state.agendaOpen === monthKey;
    let shown = allDates;
    if (!expanded && allDates.length > AGENDA_DAYS_SHOWN) {
      const fromToday = allDates.filter((iso) => iso >= now.iso);
      shown = (fromToday.length ? fromToday : allDates).slice(0, AGENDA_DAYS_SHOWN);
    }
    shown.forEach((iso) => {
      const items = byDate.get(iso) || [];
      const p = parseIso(iso);
      const dow = weekdayOf(p.y, p.m, p.d);
      const special = dayNames(iso);
      groups.push(h('li', { class: 'agenda__day' + (iso === now.iso ? ' agenda__day--today' : '') + (items.length ? '' : ' agenda__day--quiet'), id: 'agenda-' + iso },
        h('h4', { class: 'agenda__date' },
          h('span', { class: 'agenda__num' }, String(p.d)),
          h('span', { class: 'agenda__wd' }, (iso === now.iso ? 'Today, ' : '') + WEEKDAYS[dow]),
          special ? h('span', { class: 'agenda__special' }, special) : null),
        items.length
          ? h('ol', { class: 'event-list event-list--compact' }, items.map((ev) => eventRow(ev, { now, level: 5 })))
          : null));
    });
    els.agendaList.replaceChildren(...groups);
    els.agendaMore.replaceChildren(shown.length < allDates.length || expanded
      ? listToggle('agenda-list', expanded, 'Show all ' + allDates.length + ' days in ' + MONTHS[m], () => {
        state.agendaOpen = expanded ? null : monthKey;
        renderAgenda(nowInCity());
        if (expanded) els.agenda.scrollIntoView({ block: 'start' });
      })
      : '');
  }

  function renderUpcoming(now) {
    const list = state.events
      .filter((ev) => ev.status === 'Published' && passesFilter(ev) && !hasEnded(ev, now))
      .slice(0, UPCOMING_LIMIT);
    const expanded = state.upcomingOpen;
    const shown = expanded ? list : list.slice(0, UPCOMING_SHOWN);
    els.upcomingList.replaceChildren(...shown.map((ev) => eventRow(ev, { now, showDate: true, level: 3 })));
    els.upcomingMore.replaceChildren(list.length > UPCOMING_SHOWN
      ? listToggle('upcoming-list', expanded, 'Show ' + (list.length - UPCOMING_SHOWN) + ' more', () => {
        state.upcomingOpen = !expanded;
        renderUpcoming(nowInCity());
        if (expanded) els.upcoming.scrollIntoView({ block: 'start' });
      })
      : '');

    if (!state.loaded) {
      els.upcomingEmpty.hidden = true;
    } else if (!list.length) {
      els.upcomingEmpty.replaceChildren(
        state.filters.size ? 'No upcoming events in the selected categories. ' : 'No upcoming events listed yet. ',
        submitInlineLink('Organising one? Submit it.'));
      els.upcomingEmpty.hidden = false;
    } else {
      els.upcomingEmpty.hidden = true;
    }
  }

  function renderAll() {
    const now = nowInCity();
    renderCalendar(now);
    renderAgenda(now);
    renderUpcoming(now);
  }

  /* ---------------------------------------------------------------
     Dialogs: event details and "all events on this day"
     --------------------------------------------------------------- */
  function openDialog(dialog) {
    if (dialog.open) return;
    lastFocus = document.activeElement;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    }
  }

  function showInDialog(nodes, mode) {
    const dialog = els.eventDialog;
    dialog.classList.toggle('dialog--event', mode === 'event');
    els.dialogContent.replaceChildren(...nodes.filter(Boolean));
    const wasOpen = dialog.open;
    openDialog(dialog);
    els.dialogContent.scrollTop = 0;
    if (wasOpen) {
      const title = els.dialogContent.querySelector('#dialog-title');
      if (title) title.focus();
    }
  }

  function contactNode(contact) {
    const value = text(contact);
    if (!value) return null;
    if (isEmail(value)) return h('a', { href: 'mailto:' + value }, value);
    if (/^\+?\d[\d\s-]{6,}$/.test(value)) return h('a', { href: 'tel:' + value.replace(/[\s-]/g, '') }, value);
    const looksLikeSite = /^(https?:\/\/|www\.)/i.test(value) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(value);
    const url = looksLikeSite ? safeUrl(/^https?:\/\//i.test(value) ? value : 'https://' + value.replace(/^\/+/, '')) : '';
    if (url) {
      return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, value.replace(/^https?:\/\//i, '').replace(/\/$/, ''));
    }
    return h('span', null, value);
  }


  /* ---------------------------------------------------------------
     Icons (outline, 24px grid)
     --------------------------------------------------------------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    calendar: [['rect', { x: 3.5, y: 5, width: 17, height: 15.5, rx: 2 }], ['path', { d: 'M8 3v4M16 3v4M3.5 10h17' }]],
    calendarPlus: [['rect', { x: 3.5, y: 5, width: 17, height: 15.5, rx: 2 }], ['path', { d: 'M8 3v4M16 3v4M3.5 10h17M12 12.6v5M9.5 15.1h5' }]],
    pin: [['path', { d: 'M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z' }], ['circle', { cx: 12, cy: 10.5, r: 2.3 }]],
    users: [['circle', { cx: 9, cy: 8.5, r: 3.2 }], ['path', { d: 'M3.5 19.5v-.8A4.2 4.2 0 0 1 7.7 14.5h2.6a4.2 4.2 0 0 1 4.2 4.2v.8M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.3 14.6a4.2 4.2 0 0 1 3.2 4.1v.8' }]],
    ticket: [['path', { d: 'M3.5 6.5h17v3a2.5 2.5 0 0 0 0 5v3h-17v-3a2.5 2.5 0 0 0 0-5z' }], ['path', { d: 'M14.5 7v1.4M14.5 11.3v1.4M14.5 15.6V17' }]],
    person: [['circle', { cx: 12, cy: 8, r: 3.5 }], ['path', { d: 'M5 20a7 7 0 0 1 14 0' }]],
    share: [['circle', { cx: 17.5, cy: 5.5, r: 2.3 }], ['circle', { cx: 6.5, cy: 12, r: 2.3 }], ['circle', { cx: 17.5, cy: 18.5, r: 2.3 }], ['path', { d: 'M8.6 10.8l6.8-4M8.6 13.2l6.8 4' }]],
    arrow: [['path', { d: 'M7 17 17 7M9 7h8v8' }]],
  };
  function icon(name, size = 18) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    [['viewBox', '0 0 24 24'], ['width', size], ['height', size], ['fill', 'none'], ['stroke', 'currentColor'],
      ['stroke-width', '1.7'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true'], ['focusable', 'false'],
    ].forEach(([k, v]) => svg.setAttribute(k, String(v)));
    svg.setAttribute('class', 'icon');
    (ICONS[name] || []).forEach(([tag, attrs]) => {
      const el = document.createElementNS(SVG_NS, tag);
      Object.keys(attrs).forEach((k) => el.setAttribute(k, String(attrs[k])));
      svg.appendChild(el);
    });
    return svg;
  }

  /* ---------------------------------------------------------------
     Add to calendar: Google Calendar link and an .ics file
     (Apple Calendar, Outlook, Proton). Times are Nagpur time.
     --------------------------------------------------------------- */
  function stampUtc(iso, hhmm, addMinutes) {
    const p = parseIso(iso);
    const [hh, mm] = hhmm.split(':').map(Number);
    const d = new Date(Date.UTC(p.y, p.m, p.d, hh, mm) - 330 * 60000 + (addMinutes || 0) * 60000);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
  }
  function stampDay(iso, addDays) {
    const p = parseIso(iso);
    const d = new Date(Date.UTC(p.y, p.m, p.d + (addDays || 0)));
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  }
  function calendarTimes(ev) {
    if (!ev.startTime) return { allDay: true, start: stampDay(ev.date), end: stampDay(ev.date, 1) };
    let end;
    if (ev.endTime) {
      end = minutesOf(ev.endTime) > minutesOf(ev.startTime)
        ? stampUtc(ev.date, ev.endTime)
        : stampUtc(ev.date, ev.endTime, 24 * 60); // ends after midnight
    } else {
      end = stampUtc(ev.date, ev.startTime, 120); // no end time: assume 2 hours
    }
    return { allDay: false, start: stampUtc(ev.date, ev.startTime), end };
  }
  function calendarDetails(ev) {
    return [
      ev.description.length > 600 ? ev.description.slice(0, 597) + '…' : ev.description,
      ev.registrationUrl ? 'Register: ' + ev.registrationUrl : '',
      'Details: ' + eventLink(ev),
    ].filter(Boolean).join('\n\n');
  }
  function calendarPlace(ev) {
    return [ev.venue, ev.area, 'Nagpur'].filter(Boolean).join(', ');
  }
  function googleCalendarUrl(ev) {
    const t = calendarTimes(ev);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(ev.title)
      + '&dates=' + t.start + '/' + t.end
      + '&details=' + encodeURIComponent(calendarDetails(ev))
      + '&location=' + encodeURIComponent(calendarPlace(ev))
      + '&ctz=Asia%2FKolkata';
  }
  function icsEscape(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function icsFold(line) {
    // Lines longer than 75 bytes are folded, as the calendar format requires
    const enc = new TextEncoder();
    const out = [];
    let cur = '', bytes = 0;
    for (const ch of line) {
      const n = enc.encode(ch).length;
      if (bytes + n > 74) { out.push(cur); cur = ' '; bytes = 1; }
      cur += ch; bytes += n;
    }
    out.push(cur);
    return out.join('\r\n');
  }
  function icsText(ev) {
    const t = calendarTimes(ev);
    const now = new Date();
    const stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    const host = (location.hostname || 'nagpurhappenings.in').replace(/[^\w.-]/g, '');
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nagpur Happenings//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + icsEscape(ev.id + '@' + host),
      'DTSTAMP:' + stamp,
      t.allDay ? 'DTSTART;VALUE=DATE:' + t.start : 'DTSTART:' + t.start,
      t.allDay ? 'DTEND;VALUE=DATE:' + t.end : 'DTEND:' + t.end,
      'SUMMARY:' + icsEscape(ev.title),
      'LOCATION:' + icsEscape(calendarPlace(ev)),
      'DESCRIPTION:' + icsEscape(calendarDetails(ev)),
      'URL:' + eventLink(ev),
      'END:VEVENT', 'END:VCALENDAR',
    ].map(icsFold).join('\r\n') + '\r\n';
  }
  function fileSlug(title) {
    return (norm(title).slice(0, 40) || 'event');
  }

  /* ---------------------------------------------------------------
     Event popup: a card with picture, key facts and three actions
     --------------------------------------------------------------- */
  function eventImage(ev) {
    if (ev.coverImageUrl) return { src: ev.coverImageUrl, kind: 'poster' };
    const logo = state.logos.get(norm(ev.organiserName));
    return logo ? { src: logo, kind: 'logo' } : null;
  }

  function eventMedia(ev) {
    const p = parseIso(ev.date);
    const img = eventImage(ev);
    const media = h('div', { class: 'ev__media cat-' + ev.category + ' ' + (img ? 'ev__media--' + img.kind : 'ev__media--tile') },
      h('p', { class: 'ev__tile', 'aria-hidden': 'true' }, categoryName(ev.category)));
    if (img) {
      const picture = h('img', {
        class: 'ev__img', src: img.src, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer',
        alt: img.kind === 'logo' ? (ev.organiserName || 'Organiser') + ' logo' : 'Poster for ' + ev.title,
      });
      picture.addEventListener('error', () => {
        (picture.parentElement && picture.parentElement.classList.contains('ev__img-link') ? picture.parentElement : picture).remove();
        media.classList.remove('ev__media--poster', 'ev__media--logo');
        media.classList.add('ev__media--tile');
      });
      media.appendChild(img.kind === 'poster'
        ? h('a', { class: 'ev__img-link', href: img.src, target: '_blank', rel: 'noopener noreferrer', onclick: () => track('poster', ev) }, picture)
        : picture);
    }
    media.appendChild(h('p', { class: 'ev__date', 'aria-hidden': 'true' },
      h('span', { class: 'ev__date-wd' }, WEEKDAYS_SHORT[weekdayOf(p.y, p.m, p.d)]),
      h('span', { class: 'ev__date-d' }, String(p.d)),
      h('span', { class: 'ev__date-m' }, MONTHS_SHORT[p.m])));
    if (ev.status !== 'Cancelled' && ev.priceType) {
      const free = ev.priceType === 'Free';
      media.appendChild(h('p', { class: 'ev__price ev__price--' + (free ? 'free' : 'paid'), 'aria-hidden': 'true' },
        free ? 'Free entry' : (ev.ticketPrice ? formatPrice(ev.ticketPrice) : 'Paid')));
    }
    return media;
  }

  function factRow(iconName, label, ...lines) {
    const content = lines.flat().filter(Boolean);
    if (!content.length) return null;
    return h('div', { class: 'facts__row' },
      h('dt', null, icon(iconName, 19), h('span', { class: 'visually-hidden' }, label)),
      h('dd', null, content.map((line, i) => (i ? [h('br'), line] : line))));
  }

  function backLink(backTo) {
    if (!backTo) return null;
    let label, open;
    if (typeof backTo === 'string') {
      const p = parseIso(backTo);
      label = 'All events on ' + p.d + ' ' + MONTHS[p.m];
      open = () => openDay(backTo);
    } else {
      ({ label, open } = backTo);
    }
    return h('button', { type: 'button', class: 'dialog__back', onclick: open }, chevronLeft(), label);
  }

  // A button that shows/hides a small panel of choices under the action buttons
  function disclosure(btn, panel, others) {
    btn.addEventListener('click', () => {
      const open = panel.hidden;
      others.forEach(([b, p]) => { p.hidden = true; b.setAttribute('aria-expanded', 'false'); });
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  function openEvent(id, backTo) {
    const ev = state.events.find((e) => e.id === id);
    if (!ev) return;
    const now = nowInCity();
    const cancelled = ev.status === 'Cancelled';
    const ended = hasEnded(ev, now);

    // Short lede under the title; long descriptions continue below the actions
    const desc = ev.description;
    const firstPara = desc.split(/\n\s*\n/)[0];
    const sentence = (firstPara.match(/^.{20,180}?[.!?](?=\s|$)/) || [])[0];
    const lede = desc.length <= 180 ? desc : (sentence || firstPara.slice(0, 150).replace(/\s+\S*$/, '') + '…');
    const restOfDesc = desc.length <= 180 ? '' : desc;

    const area = ev.area ? h('span', { class: 'tag tag--place' }, icon('pin', 14), ev.area) : null;
    const chips = h('p', { class: 'dialog__tags cat-' + ev.category },
      h('span', { class: 'tag tag--category' }, h('i', { class: 'dot', 'aria-hidden': 'true' }), categoryName(ev.category)),
      area,
      ev.featured && !cancelled ? tag('Featured', 'tag--featured') : null,
      !cancelled ? ev.audience.map((a) => tag(a, 'tag--audience')) : null);

    const where = ev.area ? ev.area + ', Nagpur' : (ev.venue ? 'Nagpur' : '');
    const maps = ev.venue || ev.area
      ? h('a', { class: 'maps-link', href: mapsUrl(ev), target: '_blank', rel: 'noopener noreferrer', onclick: () => track('maps', ev) }, 'Open in Google Maps')
      : null;
    const special = dayNames(ev.date);
    const facts = h('dl', { class: 'facts' },
      factRow('calendar', 'When', longDate(ev.date), timeRange(ev), special ? h('span', { class: 'facts__special' }, special) : null),
      factRow('pin', 'Where', ev.venue, where, maps),
      factRow('ticket', 'Entry', priceLabel(ev)),
      ev.audience.length ? factRow('person', 'Who can join', ev.audience.join(', ')) : null,
      factRow('users', 'Organiser', ev.organiserName ? h('span', null, 'Organised by ', h('strong', null, ev.organiserName)) : null, contactNode(ev.organiserContact)));

    // Actions: Register, Share (WhatsApp / other apps / copy link), Add to calendar
    const copyBtn = h('button', { type: 'button', class: 'ev__choice' }, 'Copy link');
    copyBtn.addEventListener('click', () => {
      copyToClipboard(eventLink(ev)).then(
        () => { copyBtn.textContent = 'Link copied'; track('copylink', ev); },
        () => { copyBtn.textContent = 'Copy failed'; });
      setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 2500);
    });
    const shareBtn = h('button', { type: 'button', class: 'btn btn--line', 'aria-expanded': 'false', 'aria-controls': 'ev-share' }, icon('share'), 'Share');
    const shareMenu = h('div', { class: 'ev__menu', id: 'ev-share', hidden: true },
      h('a', {
        class: 'ev__choice', href: 'https://wa.me/?text=' + encodeURIComponent(shareText(ev)),
        target: '_blank', rel: 'noopener noreferrer', onclick: () => track('whatsapp', ev),
      }, 'WhatsApp'),
      nativeShareButton(ev),
      copyBtn);
    const canAdd = !cancelled && !ended;
    const calBtn = canAdd ? h('button', { type: 'button', class: 'btn btn--line', 'aria-expanded': 'false', 'aria-controls': 'ev-cal' }, icon('calendarPlus'), 'Add to calendar') : null;
    const calMenu = canAdd ? h('div', { class: 'ev__menu', id: 'ev-cal', hidden: true },
      h('a', { class: 'ev__choice', href: googleCalendarUrl(ev), target: '_blank', rel: 'noopener noreferrer', onclick: () => track('calendar-google', ev) }, 'Google Calendar'),
      h('a', {
        class: 'ev__choice', href: 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsText(ev)),
        download: fileSlug(ev.title) + '.ics', onclick: () => track('calendar-ics', ev),
      }, 'Apple, Outlook or Proton (.ics)')) : null;
    disclosure(shareBtn, shareMenu, calBtn ? [[calBtn, calMenu]] : []);
    if (calBtn) disclosure(calBtn, calMenu, [[shareBtn, shareMenu]]);

    const register = ev.registrationUrl && !cancelled && !ended
      ? h('a', { class: 'btn btn--accent', href: ev.registrationUrl, target: '_blank', rel: 'noopener noreferrer', onclick: () => track('register', ev) },
        'Register / More info', icon('arrow', 17))
      : null;
    const actions = h('div', { class: 'dialog__actions ev__actions' }, register, shareBtn, calBtn, shareMenu, calMenu);

    // "Something wrong or changed?" box
    const changedLinks = [];
    const handle = creatorHandle();
    if (handle) {
      changedLinks.push(h('a', {
        class: 'btn btn--line', href: 'https://ig.me/m/' + handle, target: '_blank', rel: 'noopener noreferrer',
        onclick: () => track('update-dm', ev),
      }, 'Message on Instagram'));
    }
    const email = text(CONFIG.CONTACT_EMAIL);
    if (isEmail(email)) {
      const subject = 'Update: ' + ev.title + ' (' + ev.id + ')';
      changedLinks.push(h('a', {
        class: 'btn btn--line', href: 'mailto:' + email + '?subject=' + encodeURIComponent(subject),
        onclick: () => track('update-email', ev),
      }, 'Email'));
    }

    const body = h('div', { class: 'ev__body' },
      backLink(backTo),
      chips,
      h('h2', { class: 'dialog__title' + (cancelled ? ' is-cancelled' : ''), id: 'dialog-title', tabindex: '-1', 'data-event-id': ev.id }, ev.title),
      cancelled ? h('p', { class: 'notice notice--cancelled' }, 'This event has been cancelled.')
        : ended ? h('p', { class: 'notice' }, 'This event has ended.') : null,
      lede ? h('p', { class: 'ev__lede' }, lede) : null,
      facts,
      actions,
      restOfDesc ? h('div', { class: 'dialog__desc' },
        h('h3', { class: 'dialog__subhead' }, 'About this event'),
        restOfDesc.split(/\n\s*\n/).map((para) => h('p', null, para))) : null,
      h('p', { class: 'dialog__disclaimer' },
        'Listed for information only. Nagpur Happenings does not organise this event or handle bookings and payments. ' +
        'Details can change, so confirm with the organiser before you go or pay.'),
      followLine('follow-event', ev),
      changedLinks.length ? h('div', { class: 'changed' },
        text(CONFIG.CREATOR_PHOTO) ? avatar(true) : null,
        h('p', { class: 'changed__text' }, 'Something wrong or changed? Tell ' + (text(CONFIG.CREATOR_NAME) || 'us') + '.'),
        h('p', { class: 'changed__links' }, changedLinks)) : null);

    showInDialog([h('article', { class: 'ev' }, eventMedia(ev), body)], 'event');
    setEventHash(ev);
    track('open', ev);
  }

  /* ---------------------------------------------------------------
     Quick views: Today / This weekend / Next 7 days
     --------------------------------------------------------------- */
  const QUICK = {
    today: { title: 'Today', empty: 'for today' },
    weekend: { title: 'This weekend', empty: 'for this weekend' },
    week: { title: 'Next 7 days', empty: 'for the next 7 days' },
  };
  function addDaysIso(now, n) {
    const d = new Date(Date.UTC(now.y, now.m, now.d + n));
    return isoDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  function quickRange(kind, now) {
    if (kind === 'today') return { from: now.iso, to: now.iso };
    if (kind === 'weekend') {
      const dow = weekdayOf(now.y, now.m, now.d); // 0 = Sunday
      if (dow === 0) return { from: now.iso, to: now.iso };
      const toSat = dow === 6 ? 0 : 6 - dow;
      return { from: addDaysIso(now, toSat), to: addDaysIso(now, toSat + 1) };
    }
    return { from: now.iso, to: addDaysIso(now, 6) };
  }
  function rangeLabel(from, to) {
    const a = parseIso(from), b = parseIso(to);
    const day = (p) => WEEKDAYS_SHORT[weekdayOf(p.y, p.m, p.d)] + ' ' + p.d;
    if (from === to) return longDate(from);
    if (a.m === b.m) return day(a) + ' – ' + day(b) + ' ' + MONTHS[b.m];
    return day(a) + ' ' + MONTHS_SHORT[a.m] + ' – ' + day(b) + ' ' + MONTHS_SHORT[b.m];
  }
  function openQuick(kind) {
    const q = QUICK[kind];
    if (!q) return;
    const now = nowInCity();
    const r = quickRange(kind, now);
    const list = state.events.filter((ev) => ev.date >= r.from && ev.date <= r.to && passesFilter(ev));
    const byDate = groupByDate(list);
    const dates = new Set(byDate.keys());
    state.days.forEach((names, iso) => { if (iso >= r.from && iso <= r.to) dates.add(iso); });
    const back = { label: q.title, open: () => openQuick(kind) };
    const groups = Array.from(dates).sort().map((iso) => {
      const items = byDate.get(iso) || [];
      const p = parseIso(iso);
      const special = dayNames(iso);
      return h('li', { class: 'agenda__day' + (iso === now.iso ? ' agenda__day--today' : '') + (items.length ? '' : ' agenda__day--quiet') },
        h('h3', { class: 'agenda__date' },
          h('span', { class: 'agenda__num' }, String(p.d)),
          h('span', { class: 'agenda__wd' }, (iso === now.iso ? 'Today, ' : '') + WEEKDAYS[weekdayOf(p.y, p.m, p.d)]),
          special ? h('span', { class: 'agenda__special' }, special) : null),
        items.length ? h('ol', { class: 'event-list event-list--compact' }, items.map((ev) => eventRow(ev, { now, level: 4, backTo: back }))) : null);
    });
    track('quick-' + kind);
    setEventHash(null);
    showInDialog([
      h('h2', { class: 'dialog__title', id: 'dialog-title', tabindex: '-1' }, q.title),
      h('p', { class: 'dialog__sub' }, rangeLabel(r.from, r.to)),
      list.length
        ? h('ol', { class: 'agenda__days quick-days' }, groups)
        : h('p', { class: 'empty-note' },
          'Nothing listed ' + q.empty + ' yet' + (state.filters.size ? ' in the selected categories' : '') + '. ',
          submitInlineLink('Know of something? Submit it.')),
    ], 'list');
  }

  function openDay(iso) {
    const list = eventsOn(iso);
    if (!list.length) return;
    if (list.length === 1) {
      openEvent(list[0].id);
      return;
    }
    const now = nowInCity();
    setEventHash(null);
    showInDialog([
      h('h2', { class: 'dialog__title', id: 'dialog-title', tabindex: '-1' }, longDate(iso)),
      dayNames(iso) ? h('p', { class: 'dialog__special' }, dayNames(iso)) : null,
      h('ol', { class: 'event-list event-list--compact event-list--dialog' },
        list.map((ev) => eventRow(ev, { now, level: 3, backTo: iso }))),
    ], 'list');
  }

  function chevronLeft() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M14.5 5.5 8 12l6.5 6.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  // About popup, optionally scrolled to a section (guidelines, privacy)
  function openAbout(section) {
    openDialog(els.aboutDialog);
    const content = els.aboutDialog.querySelector('.dialog__content');
    content.scrollTop = 0;
    const target = section ? document.getElementById(section) : null;
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }

  function wireDialogs() {
    [els.eventDialog, els.aboutDialog].forEach((dialog) => {
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closeDialog(dialog); // click on the backdrop
      });
      dialog.addEventListener('close', () => {
        if (dialog === els.eventDialog && eventIdFromHash()) setEventHash(null);
        if (lastFocus && document.contains(lastFocus) && typeof lastFocus.focus === 'function') lastFocus.focus();
        lastFocus = null;
      });
      dialog.querySelectorAll('[data-close-dialog]').forEach((btn) => {
        btn.addEventListener('click', () => closeDialog(dialog));
      });
    });
    els.aboutBtn.addEventListener('click', () => openAbout());
  }

  /* ---------------------------------------------------------------
     Links from settings: Google Form, Instagram, contact email
     --------------------------------------------------------------- */
  function submitUrl() {
    return safeUrl(CONFIG.SUBMIT_FORM_URL);
  }

  // Until a Google Form is set, "Submit" opens an Instagram message instead.
  function submitDmUrl() {
    const handle = creatorHandle();
    return handle ? 'https://ig.me/m/' + handle : '';
  }

  function submitInlineLink(label) {
    const url = submitUrl() || submitDmUrl();
    return url
      ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label)
      : h('a', { href: '#submit' }, label);
  }

  function applyLinks() {
    const formUrl = submitUrl();
    const dmUrl = formUrl ? '' : submitDmUrl();
    document.querySelectorAll('[data-submit-link]').forEach((link) => {
      if (formUrl || dmUrl) {
        link.href = formUrl || dmUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.addEventListener('click', () => track(formUrl ? 'submit-form' : 'submit-dm'));
      }
    });
    const requestUrl = safeUrl(CONFIG.REQUEST_FORM_URL) || formUrl;
    document.querySelectorAll('[data-request-link]').forEach((link) => {
      if (requestUrl) {
        link.href = requestUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.addEventListener('click', () => track('request-form'));
      } else {
        (link.closest('li') || link).hidden = true;
      }
    });
    if (dmUrl) {
      els.submitNote.textContent = 'Send your event details to @' + creatorHandle() + ' on Instagram. Every submission is reviewed before it appears on the calendar.';
    } else if (!formUrl) {
      els.submitButton.removeAttribute('href');
      els.submitButton.setAttribute('aria-disabled', 'true');
      els.submitButton.setAttribute('role', 'link');
      els.submitButton.classList.add('is-disabled');
      els.submitNote.textContent = 'The submission form opens soon. Every submission is reviewed before it appears on the calendar.';
    }

    const instagram = safeUrl(CONFIG.INSTAGRAM_URL);
    if (instagram) els.instagramLink.href = instagram;
    else els.instagramItem.hidden = true;

    const email = text(CONFIG.CONTACT_EMAIL);
    if (isEmail(email)) els.contactLink.href = 'mailto:' + email;
    else els.contactItem.hidden = true;
  }

  /* ---------------------------------------------------------------
     Month navigation
     --------------------------------------------------------------- */
  function shiftMonth(delta) {
    viewChosenByVisitor = true;
    let { y, m } = state.view;
    m += delta;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    state.view = { y, m };
    renderAll();
  }

  function goToday() {
    viewChosenByVisitor = true;
    const now = nowInCity();
    state.view = { y: now.y, m: now.m };
    renderAll();
  }

  /* ---------------------------------------------------------------
     Start
     --------------------------------------------------------------- */
  function init() {
    const byId = (id) => document.getElementById(id);
    Object.assign(els, {
      monthName: byId('month-name'),
      monthYear: byId('month-year'),
      filters: byId('filters'),
      status: byId('status'),
      weekdays: byId('weekdays'),
      grid: byId('grid'),
      calNote: byId('cal-note'),
      agenda: byId('agenda'),
      agendaTitle: byId('agenda-title'),
      agendaList: byId('agenda-list'),
      agendaMore: byId('agenda-more'),
      upcoming: byId('upcoming'),
      upcomingList: byId('upcoming-list'),
      upcomingMore: byId('upcoming-more'),
      upcomingEmpty: byId('upcoming-empty'),
      upcomingFollow: byId('upcoming-follow'),
      alsoBy: byId('also-by'),
      eventDialog: byId('event-dialog'),
      dialogContent: byId('dialog-content'),
      aboutDialog: byId('about-dialog'),
      aboutBtn: byId('about-btn'),
      submitButton: byId('submit-button'),
      submitNote: byId('submit-note'),
      instagramLink: byId('instagram-link'),
      instagramItem: byId('instagram-item'),
      contactLink: byId('contact-link'),
      contactItem: byId('contact-item'),
      creator: byId('creator'),
      visits: byId('visits'),
    });

    buildWeekdays();
    buildFilters();
    document.querySelectorAll('[data-quick]').forEach((btn) => {
      btn.addEventListener('click', () => openQuick(btn.dataset.quick));
    });
    document.querySelectorAll('[data-about]').forEach((btn) => {
      btn.addEventListener('click', () => openAbout(btn.dataset.about));
    });
    wireDialogs();
    applyLinks();
    renderCreator();
    renderFollowLine();
    renderAlsoBy();
    showNewHome();
    loadCounter();
    showVisitCount();
    pendingEventId = eventIdFromHash();
    window.addEventListener('hashchange', () => {
      const id = eventIdFromHash();
      if (id && !(els.eventDialog.open && els.dialogContent.querySelector('[data-event-id="' + CSS.escape(id) + '"]'))) {
        pendingEventId = id;
        openPendingEvent();
      }
    });

    byId('prev-month').addEventListener('click', () => shiftMonth(-1));
    byId('next-month').addEventListener('click', () => shiftMonth(1));
    byId('today-btn').addEventListener('click', goToday);

    const now = nowInCity();
    state.view = { y: now.y, m: now.m };
    renderAll(); // the calendar shows straight away, even before events arrive

    // Refresh "today" and stale data when someone comes back to an open tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      renderAll();
      if (state.loaded && !state.sample) loadEvents(false);
    });

    if (new URLSearchParams(window.location.search).has('sample')) loadSample();
    else loadEvents(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
