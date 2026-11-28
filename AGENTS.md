# AGENTS.md — Happenings (city events calendars)

Read this before every task. If a request conflicts with these rules, stop and ask.
If a request is ambiguous, ask one question instead of guessing.

Work only on the `v2` branch. `legacy/` is the v1 site, kept for reference: read it to
port features, never edit it. It is deleted at launch.

## What this is
A free events calendar for one city at a time: nagpurhappenings.in first, more cities
later, plus a national hub that lists the cities. It helps small communities (book clubs,
board games, hobby groups, workshops, meetups) find their audience.
It lists events. It never sells tickets.

## Never build
- Logins, sign-ups, user accounts, passwords or OTPs.
- Ticketing, carts, payments or registrations for events. Link to the organiser's own page.
- Comments, ratings or reviews.
- Supabase or any database, AI intake, push notifications (later phases, not v2).
- Tracking cookies, or any analytics other than Umami.
- Stock photos, or invented events, communities, numbers or testimonials.

## Stack
- Astro with static output. Every page shows its full content with JavaScript turned off.
- Tailwind CSS v4. Brand values live only in the theme tokens.
- Small islands of plain JS for filters, share and add-to-calendar. No React unless asked.
- Hosting: Cloudflare Pages. GitHub Actions builds on every push and every hour
  (to pick up new events), then deploys with Wrangler.
- Step 7 must rebuild the site every day just after midnight IST, so the
  no-JavaScript calendar matches the day in Asia/Kolkata. With JavaScript, today
  is worked out in the visitor's browser.
- Analytics: Umami, website ID from the city config.

## One codebase, many cities
- Never hard-code a city's name, domain, phone number, colours, Sheet or analytics ID.
  They live in `cities/<city>.json`.
- The build reads `CITY` (e.g. `CITY=nagpur`). Each city is its own Cloudflare Pages
  project built from this repo. `CITY=hub` builds the national hub.
- Each city has its own Google Sheet. City-specific design is a small override in its
  config, never a copied file.

`cities/nagpur.json` holds: `slug`, `name`, `name_local` (नागपूर), `domain`, `id_prefix`
(Nagpur keeps NH because NH links are already shared; new cities get a 3-letter code,
e.g. NSK for Nashik, so prefixes never clash),
`whatsapp_number`, `whatsapp_channel_url`, `instagram_url`, `contact_email`,
`organiser_form_url` (directory sign-up form; empty hides the button), `feed_url`,
`umami_website_id`, `timezone` (Asia/Kolkata), `theme` overrides, `footer` (the
"Made by Arinjay" credit and its links only; no "Also by" box).

## Data
Source of truth: the city's Google Sheet, served as JSON by its Apps Script feed.
The build saves a snapshot to `data/<city>/`. If the feed fails, build from the last
snapshot. Never publish an empty calendar.

Sheet headers stay human-readable ("Start Time"). The mapping to field names lives in one
file, `src/lib/sheet-map.ts`. All JSON fields are snake_case, so they can move to Supabase
later without renaming. Categories, sub-categories and tags come from the Sheet's Lists
tab (A Category on every row, B Sub-category, D Tag, E Tag group), served by the feed.
There is no separate `categories.json`; the directory form reads the same tab.

Dates and times are stored as `YYYY-MM-DD` and 24-hour `HH:MM` (for sorting and schema),
but are never shown that way. See Design for how they are shown.

events: `id` (NH-025, never changes) · `slug` · `city` · `title` · `category` ·
`sub_category` · `date` · `start_time` · `end_time` ·
`venue_id` · `area` · `organiser_id` · `organiser_name` · `organiser_contact` ·
`description` · `registration_url` ·
`price_type` (free | paid) · `ticket_price` (INR) · `cover_image_url` ·
`who_can_join` [] · `vibe_tags` [] · `status` (published | draft | cancelled) · `featured`

organisers (public): `id` (ORG-001) · `slug` · `name` ·
`type` (community | chapter | ngo | organisation) · `category` · `sub_category` · `tagline`
(max 100 characters, shown on cards) · `description` (about 100 words) · `logo_url` ·
`instagram_url` · `whatsapp_url` · `other_links` · `founded` (shown as "Since 2022") ·
`languages` [] · `meeting_frequency` · `usual_time` · `area` · `turnout` · `price_type`
(free | paid | mixed) · `typical_price` · `alcohol` (never | sometimes | usually) ·
`how_to_join` · `tags` [] (max 5, from the Lists tab) · `founders` · `other_cities` ·
`status` (listed | hidden) · `verified` (bool)

organisers (private, never on pages, feeds or the API): `meetups_last_6_months` ·
`contact_name` · `contact_whatsapp` · `contact_email` · `contact_role` · `backup_contact` ·
`open_to` []. In the Sheet their headers end in "(private)", and the feed's allowlist
never includes them.

The directory is called "Organisers" everywhere (pages, data, Sheet tab). Each profile
shows its `type` under the name. `alcohol` of sometimes or usually shows an "Alcohol
served" label. `founders` shows only when filled in. No logo → category tile.
Organisers sign up through the form; NH copies approved rows into the Organisers tab by
hand. Nothing from the form publishes by itself.

venues: `id` (V-001) · `slug` · `name` · `area` · `address` · `maps_url` · `website_url` ·
`instagram_url`

sponsors: `id` (S-001) · `name` · `logo_url` · `link_url` · `placement` (site | weekend) ·
`start_date` · `end_date` · `status` (live | off)

Rules:
- The build makes slugs. Nobody types them. Event slug = title (first 6 words) + date +
  ID: `book-club-evening-28-nov-2026-nh025`. The ID at the end is what keeps old links
  working when an event is renamed or postponed.
- Cancelled events stay on the calendar and on their event page, in their place,
  with the title struck through and marked Cancelled. Drafts never appear.
- Only `listed` organisers appear anywhere: pages, feeds, sitemap.
- Events are alcohol-free unless `vibe_tags` contains "Alcohol served".
- If an event's organiser or venue isn't in its tab yet, show the plain name without a
  link. Never fail the build over it.

## Pages and URLs
- `/` calendar: Today, Weekend, 7 days, month view, and the filters in Design.
  "Today" uses the day layout and "7 days" the week layout described below.
- `/calendar/<yyyy>-<mm>/`: one page per month ("Events in Nagpur, December 2026").
  Month navigation goes back to the first month with events and forward to the last
  month with a listed event, at most 12 months ahead. Never hard-code an end date, and
  never show empty future months. Every date in the month view links to its day page.
  A day with events shows its number in bold green; empty days use a lighter, muted
  number. Today stays the filled green circle with the orange dot. Under 640px a day
  shows up to 3 dots and the grid has no inner cell borders; weekend shading and the
  outer edge stay. From 640px the cell shows event names and a green underlined
  "+N more", and hovering a day with events gives the cell a subtle green border.
- `/calendar/<yyyy>-<mm>-<dd>/`: one page per day with at least one listed event
  ("Events in Nagpur on Saturday, 28 November 2026"). Events in start-time order.
  Events that start at the same time share one time heading with a count
  ("6:30 PM · 3 events"), and every card shows its time range so overlaps are visible.
  Previous/next arrows jump to the nearest day with events. Filters and Free entry
  work here. Under the title, small links go to that day's week page ("See the whole
  week") and its month page ("All of November").
- `/calendar/week/<yyyy>-<mm>-<dd>/` (the date is that week's Monday): Monday to Sunday
  as a list grouped by day, never a 7-column grid. Each day heading links to its day
  page and shows the event count; a day with no events is one quiet line ("No events
  listed"). Only weeks with at least one listed event get a page; previous/next arrows
  skip empty weeks and follow the same range limits as months. Filters and Free entry
  work here. Under the title, a small link goes to the month page. A week that runs
  into a second month links to each of those months that has a page.
- Past months, weeks and days are the archive. They are public, linked from the footer
  ("Past events"), not from the main menu.
- `/events/<slug>/`: one page per event. Past events keep their page, marked as ended.
  A small link above the category line goes to that event's day page
  ("← Sunday, 29 November"). Never `history.back()`: someone arriving from WhatsApp
  has no page to return to.
- `/e/<ID>/` stays the short share link and redirects to the event page. Links already
  shared on WhatsApp (e.g. `/e/NH-019/`) must keep working.
- `/organisers/` and `/organisers/<slug>/` (upcoming and past events). Each organiser
  page has a "Notify me" button. It is a demand test, not real notifications: a tap
  records `notify_interest` in Umami and shows "Coming soon. Meanwhile, follow our
  WhatsApp channel" with the channel link.
- `/register/` redirects to `organiser_form_url` (in v1 and v2), so shared sign-up links
  keep working when the form changes.
- `/venues/` and `/venues/<slug>/` (events held there).
- `/this-weekend/`, rebuilt automatically with every build.
- `/blog/` and `/blog/<slug>/` from Markdown in `src/content/blog/`. A post with a future
  `date` stays hidden until that date.
- `/api/events.json`, `/api/organisers.json`, `/api/venues.json`: public upcoming data
  for the PWA and a future app.

## Design
- The new brand lives on the unmerged `brand-refresh` branch; v1 keeps the old look until
  v2 launches. Take colours, fonts, icons, favicon, the link-preview card and the date
  badge from there (`git show origin/brand-refresh:<path>`). Never merge that branch.
- Brand source files live in `brand/`: the vector logo (full, icon, one-line; green and
  cream), the jaali and tiles patterns, and the category icons. Use these for the header,
  favicon, PWA icons and preview cards. Never use the retired orange `NH Logo.png` or
  `NH icon.png`.
- Patterns: jaali only as a quiet background (about 6% on cream, 8% on green), never
  behind event lists; tiles only as corner accents, never behind text.
- Mobile-first. Check every change at 390px wide, then at 1280px.
- Cards: one fixed 1:1 media frame. Show the whole poster (`object-contain`) on brand
  green. Never crop a poster, and never lay anything on it: no date badge, no price
  tag. No poster → organiser logo → category tile. The category tile uses that
  category's icon, cream on green. A list card is a row. Below 640px the thumbnail is
  88px, and beside it sit the title (2 lines), time range, place, organiser, and the
  price or "Free entry". Wider screens keep the larger frame and the same text, and
  add the short date. A day page leaves that date off, because the page is that day.
  On an event page the milestone date badge sits to the left of the title, not on
  the picture.
- Card titles and descriptions: `line-clamp-2`.
- Filters: a "Filters" button, with a count when categories are selected ("Filters (2)"),
  and a "Free entry" switch that fills green when on. Under 640px the view switch
  (Today, Weekend, 7 days, Month) is one full-width segmented control, with Filters and
  Free entry on the next row. From 640px they share one row. Filters opens a bottom
  sheet on phones and a dropdown from 640px up. The panel holds categories, each with
  its icon, in one group so tags can be added later as a second group. A selected
  category, in the panel and as a chip under the row, is filled green with cream
  text, the same as Free entry when it is on. Each chip has ✕, and there is a
  "Clear all". With JavaScript off, every event stays listed.
- Dates: "Sat, 28 Nov" on cards (add the year only if it isn't the current year),
  except on a day page, which shows only the time. "Saturday, 28 November 2026" on
  event pages. Never `2026-11-28` or `28/11/2026`.
- Times: 12-hour with AM/PM, "6:30 PM", ranges "6:30 – 8:00 PM". Never 24-hour.
- Sponsors: at most one live sponsor per placement. `site` is a thin "Supported by" strip
  under the header on every page; `weekend` is one card on `/this-weekend/`. Always
  labelled "Sponsor", links use `rel="sponsored noopener"`, never styled like an event.
  No live sponsor: the slot disappears, and the footer keeps a small "Sponsor
  <city> Happenings" link to WhatsApp.
- Colours: green #0E451C, cream #F9EDD2. Weekend cells use the deeper cream. Orange
  #F16E03 is allowed only for the city dot in the logo and the small dot on the
  top-right edge of today's date circle in the month grid. Never for text or
  backgrounds. All text meets WCAG AA contrast.
- Fonts, self-hosted: Eczar (semibold) for headings, Mukta for body text. Marathi and
  Hindi must render. Light theme only (`color-scheme: only light`).
- Category icons: green line icons (Tabler Icons, MIT), cream when they sit on the
  green category tile. No tiger stripes.
- Keep everything v1 does: the milestone-shaped date badge, Add to calendar (Google + .ics), WhatsApp and native share,
  "Who can join" tags, the quiet look for memorials, vigils and protests, sticky
  "Submit an event" and WhatsApp channel buttons, the floating WhatsApp bubble, and the
  "Made by Arinjay" footer credit. Drop v1's "Also by" box (Orange Hunter, ABS, xci.cx).
- Anyone can submit an event through the WhatsApp button, including new or solo
  organisers who aren't in the directory. Their events show the organiser's plain name.
- PWA: web manifest and home-screen icons only. No push notifications.

## SEO and sharing
- JSON-LD: `Event` on event pages (`location` as Place, `organizer` as Organization,
  `offers` in INR, `isAccessibleForFree`, `eventStatus`); `Organization` on organiser
  pages; `Place` on venue pages; `BreadcrumbList` on all inner pages.
- OpenGraph and Twitter tags on every page. Each event gets a 1200×630 preview card;
  memorials and protests get the quiet design.
- Canonical URL on every page. The build generates `sitemap.xml` and `robots.txt`.
  Don't block AI crawlers.
- UTM tags only on links to organisers' own websites:
  `utm_source=<city>happenings&utm_medium=referral&utm_campaign=<event-slug>`.
  Never on wa.me, Instagram, Google Forms or payment links.

## Analytics (Umami)
Custom events: `register_click`, `share_click`, `whatsapp_click`, `calendar_add`, each
with `event_id` or `organiser_id`; `notify_interest` with `organiser_id`; `sponsor_click`
with `sponsor_id`. Nothing personal.

## How to work
- Before any change bigger than a small fix: state its size (small/medium/large) and
  rough time, offer the cheapest option, and wait for a go-ahead.
- No new dependency without saying why.
- Before saying "done": the build passes, pages are checked at 390px and 1280px,
  JSON-LD validates, and there are no console errors.

## Later, not now
- Sub-category filter, once a category has 10 or more upcoming events.
- Tag filter.
- "Most viewed", from Umami, after launch, once there is real traffic.
