/**
 * Happenings: read-only sheet feed
 * ---------------------------------------------------------------
 * Paste this whole file into Extensions → Apps Script on the city's
 * v2 Google Sheet, then deploy it as a Web app.
 * This is a new sheet. Do not paste it into the live v1 sheet.
 *
 * What it does
 *  - Reads the Events tab, plus the optional Organisers, Venues,
 *    Sponsors, Days and Lists tabs.
 *  - A tab that is not in the sheet comes back as an empty list.
 *  - Events: Published rows, and Cancelled rows. Never Draft.
 *  - Organisers: blank status and Listed. Never Hidden.
 *  - Returns only the headers listed below, using those header names.
 *    src/lib/sheet-map.ts is what turns a header into a field name.
 *    A header ending in "(private)" is never sent. Other unlisted
 *    columns stay in the sheet.
 *  - Dates are YYYY-MM-DD and times are HH:MM. The build shows them
 *    in words.
 *  - Sends JSON. It has no doPost, so nobody can write to the sheet
 *    through this URL.
 */

// ---------------- Settings ----------------

var SHEET_NAME = 'Events';
var ORGANISERS_SHEET_NAME = 'Organisers';
var VENUES_SHEET_NAME = 'Venues';
var SPONSORS_SHEET_NAME = 'Sponsors';
var DAYS_SHEET_NAME = 'Days';
var LISTS_SHEET_NAME = 'Lists';

// true: cancelled events are sent too. false: Published only.
var INCLUDE_CANCELLED = true;

// Seconds to reuse a prepared response before reading the sheet again.
// Editing the sheet clears this cache (see onEdit).
var CACHE_SECONDS = 300;

// Leave empty when this script is attached to the sheet.
// Only fill this in for a standalone Apps Script project.
var SPREADSHEET_ID = '';

// Header text in row 1. The first alias is the name sent in the JSON.
// Matching ignores case, spaces and punctuation.
// Keep these header strings identical to src/lib/sheet-map.ts.
var EVENT_FIELDS = [
  field_('Event ID', ['Event ID', 'ID']),
  field_('Title', ['Title', 'Event Title', 'Event Name']),
  field_('Category', ['Category']),
  field_('Sub-category', ['Sub-category', 'Subcategory', 'Sub category']),
  field_('Date', ['Date', 'Event Date']),
  field_('Start Time', ['Start Time', 'Start']),
  field_('End Time', ['End Time', 'End']),
  field_('Venue ID', ['Venue ID']),
  field_('Venue', ['Venue']),
  field_('Area', ['Area', 'Locality', 'Area / Locality', 'Area/Locality']),
  field_('Organiser ID', ['Organiser ID', 'Organizer ID']),
  field_('Organiser Name', ['Organiser Name', 'Organizer Name', 'Organiser', 'Organizer']),
  field_('Organiser Contact', ['Organiser Contact', 'Organizer Contact']),
  field_('Description', ['Description', 'Details']),
  field_('Registration URL', ['Registration URL', 'Registration Link', 'Register URL', 'Tickets URL']),
  field_('Free or Paid', ['Free or Paid', 'Free/Paid', 'Free / Paid', 'Pricing']),
  field_('Ticket Price', ['Ticket Price', 'Price']),
  field_('Cover Image URL', ['Cover Image URL', 'Image URL', 'Cover Image']),
  field_('Who can join', ['Who can join', 'Who Can Attend', 'Audience', 'Eligibility']),
  field_('Vibe tags', ['Vibe tags', 'Vibe', 'Tags']),
  field_('Status', ['Status']),
  field_('Featured', ['Featured'])
];

var ORGANISER_FIELDS = [
  field_('ID', ['ID', 'Organiser ID', 'Organizer ID']),
  field_('Name', ['Name', 'Organiser Name', 'Organizer Name', 'Organiser', 'Organizer']),
  field_('Type', ['Type']),
  field_('Category', ['Category']),
  field_('Sub-category', ['Sub-category', 'Subcategory', 'Sub category']),
  field_('Tagline', ['Tagline']),
  field_('Description', ['Description', 'Details']),
  field_('Logo URL', ['Logo URL', 'Logo', 'Image URL', 'Image']),
  field_('Instagram URL', ['Instagram URL', 'Instagram']),
  field_('WhatsApp URL', ['WhatsApp URL', 'WhatsApp']),
  field_('Other links', ['Other links', 'Other Links']),
  field_('Founded', ['Founded']),
  field_('Languages', ['Languages']),
  field_('Meeting frequency', ['Meeting frequency', 'Meeting Frequency']),
  field_('Usual time', ['Usual time', 'Usual Time']),
  field_('Area', ['Area', 'Locality']),
  field_('Turnout', ['Turnout']),
  field_('Price type', ['Price type', 'Price Type']),
  field_('Typical price', ['Typical price', 'Typical Price']),
  field_('Alcohol', ['Alcohol']),
  field_('How to join', ['How to join', 'How to Join']),
  field_('Tags', ['Tags']),
  field_('Founders', ['Founders']),
  field_('Other cities', ['Other cities', 'Other Cities']),
  field_('Status', ['Status']),
  field_('Verified', ['Verified'])
];

var LIST_FIELDS = [
  field_('Category', ['Category']),
  field_('Sub-category', ['Sub-category', 'Subcategory', 'Sub category']),
  field_('Tag', ['Tag']),
  field_('Tag group', ['Tag group', 'Tag Group'])
];

var VENUE_FIELDS = [
  field_('ID', ['ID', 'Venue ID']),
  field_('Name', ['Name', 'Venue']),
  field_('Area', ['Area', 'Locality', 'Area / Locality', 'Area/Locality']),
  field_('Address', ['Address']),
  field_('Maps URL', ['Maps URL', 'Map URL', 'Google Maps', 'Maps']),
  field_('Website URL', ['Website URL', 'Website']),
  field_('Instagram URL', ['Instagram URL', 'Instagram'])
];

var SPONSOR_FIELDS = [
  field_('ID', ['ID', 'Sponsor ID']),
  field_('Name', ['Name', 'Sponsor']),
  field_('Logo URL', ['Logo URL', 'Logo', 'Image URL']),
  field_('Link URL', ['Link URL', 'Link', 'URL', 'Website URL', 'Website']),
  field_('Placement', ['Placement']),
  field_('Start Date', ['Start Date']),
  field_('End Date', ['End Date']),
  field_('Status', ['Status'])
];

var DATE_HEADERS = { 'Date': true, 'Start Date': true, 'End Date': true };
var TIME_HEADERS = { 'Start Time': true, 'End Time': true };

var CACHE_KEY = 'happenings-feed-v2';

function field_(header, aliases) {
  return { header: header, aliases: aliases };
}

// ---------------- Web app entry point ----------------

function doGet(e) {
  var body;
  try {
    var refresh = e && e.parameter && e.parameter.refresh === '1';
    body = getFeedJson_(refresh);
  } catch (err) {
    body = JSON.stringify({
      ok: false,
      error: 'The sheet could not be read. ' + (err && err.message ? err.message : String(err))
    });
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function getFeedJson_(skipCache) {
  var cache = CacheService.getScriptCache();
  if (!skipCache) {
    var hit = cache.get(CACHE_KEY);
    if (hit) return hit;
  }
  var json = JSON.stringify(buildFeed_());
  // Script cache values must be under 100 KB.
  if (json.length < 95000) cache.put(CACHE_KEY, json, CACHE_SECONDS);
  return json;
}

// Simple trigger: runs when someone edits the sheet, so changes show quickly.
function onEdit(e) {
  try {
    CacheService.getScriptCache().remove(CACHE_KEY);
  } catch (err) {
    // The cache expires on its own after CACHE_SECONDS.
  }
}

// ---------------- Reading the sheet ----------------

function buildFeed_() {
  var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet found. Open the script from the sheet (Extensions → Apps Script) or set SPREADSHEET_ID.');
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Kolkata';
  var events = readEvents_(ss, tz);
  var lists = readLists_(ss);
  return {
    ok: true,
    source: ss.getName(),
    timezone: tz,
    generated_at: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    count: events.length,
    events: events,
    days: readDays_(ss, tz),
    organisers: readOrganisers_(ss, tz),
    venues: readNamedRows_(ss, VENUES_SHEET_NAME, VENUE_FIELDS, tz),
    sponsors: readNamedRows_(ss, SPONSORS_SHEET_NAME, SPONSOR_FIELDS, tz),
    categories: lists.categories,
    tags: lists.tags
  };
}

function readEvents_(ss, tz) {
  var sheet = ss.getSheetByName(SHEET_NAME) || findEventsSheet_(ss);
  if (!sheet) throw new Error('There is no tab named "' + SHEET_NAME + '", and no other tab has Title, Date and Status headers in row 1.');

  var range = sheet.getDataRange();
  var values = range.getValues();
  var shown = range.getDisplayValues();
  if (!values.length) throw new Error('The Events tab is empty. Row 1 needs at least these headers: Title, Date, Status.');

  var columns = mapFields_(values[0], EVENT_FIELDS);
  if (columns['Title'] === undefined || columns['Date'] === undefined || columns['Status'] === undefined) {
    throw new Error('Row 1 needs at least these headers: Title, Date, Status.');
  }

  var events = [];
  for (var r = 1; r < values.length; r++) {
    var row = rowObject_(values[r], shown[r], columns, tz);
    if (!row['Title']) continue;
    var status = canonicalStatus_(row['Status']);
    if (status !== 'Published' && !(INCLUDE_CANCELLED && status === 'Cancelled')) continue;
    if (!row['Date']) continue;
    row['Status'] = status;
    events.push(row);
  }

  events.sort(function (a, b) {
    var ka = a['Date'] + ' ' + (a['Start Time'] || '99:99');
    var kb = b['Date'] + ' ' + (b['Start Time'] || '99:99');
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return events;
}

// Missing tab, or a tab with no Name column: an empty list.
function readNamedRows_(ss, sheetName, fields, tz) {
  var table = readTable_(ss, sheetName, fields);
  if (!table || table.columns['Name'] === undefined) return [];
  var rows = [];
  for (var r = 1; r < table.values.length; r++) {
    var row = rowObject_(table.values[r], table.shown[r], table.columns, tz);
    if (!row['Name']) continue;
    rows.push(row);
  }
  return rows;
}

// Blank status counts as listed. Hidden rows stay in the sheet.
function readOrganisers_(ss, tz) {
  var table = readTable_(ss, ORGANISERS_SHEET_NAME, ORGANISER_FIELDS);
  if (!table || table.columns['Name'] === undefined) return [];
  var hasStatus = table.columns['Status'] !== undefined;
  var rows = [];
  for (var r = 1; r < table.values.length; r++) {
    var row = rowObject_(table.values[r], table.shown[r], table.columns, tz);
    if (!row['Name']) continue;
    if (hasStatus && !isListed_(row['Status'])) continue;
    if (hasStatus) row['Status'] = 'Listed';
    rows.push(row);
  }
  return rows;
}

function readTable_(ss, sheetName, fields) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  var range = sheet.getDataRange();
  var values = range.getValues();
  var shown = range.getDisplayValues();
  if (!values.length) return null;
  return {
    columns: mapFields_(values[0], fields),
    values: values,
    shown: shown
  };
}

// Lists tab: categories (with sub-categories) and tags (with tag group).
// A missing tab is two empty lists. Column C, and any "(private)" header, stay out.
function readLists_(ss) {
  var empty = { categories: [], tags: [] };
  var table = readTable_(ss, LISTS_SHEET_NAME, LIST_FIELDS);
  if (!table) return empty;
  var categories = [];
  var tags = [];
  var seenCategories = {};
  var seenTags = {};
  for (var r = 1; r < table.values.length; r++) {
    var row = rowObject_(table.values[r], table.shown[r], table.columns, '');
    var category = row['Category'] || '';
    var sub = row['Sub-category'] || '';
    if (category || sub) {
      var categoryKey = category + '\n' + sub;
      if (!seenCategories[categoryKey]) {
        seenCategories[categoryKey] = true;
        categories.push({ 'Category': category, 'Sub-category': sub });
      }
    }
    var tag = row['Tag'] || '';
    var group = row['Tag group'] || '';
    if (tag || group) {
      var tagKey = tag + '\n' + group;
      if (!seenTags[tagKey]) {
        seenTags[tagKey] = true;
        tags.push({ 'Tag': tag, 'Tag group': group });
      }
    }
  }
  return { categories: categories, tags: tags };
}

// Days tab: one row per day, columns Date and Name. { date, name }.
function readDays_(ss, tz) {
  var sheet = ss.getSheetByName(DAYS_SHEET_NAME);
  if (!sheet) return [];
  var range = sheet.getDataRange();
  var values = range.getValues();
  var shown = range.getDisplayValues();
  if (values.length < 2) return [];
  var dateCol = -1, nameCol = -1;
  values[0].forEach(function (header, i) {
    if (isPrivateHeader_(header)) return;
    var key = normKey_(header);
    if (dateCol < 0 && key === 'date') dateCol = i;
    if (nameCol < 0 && (key === 'name' || key === 'day' || key === 'festival' || key === 'occasion' || key === 'label')) nameCol = i;
  });
  if (dateCol < 0 || nameCol < 0) return [];
  var days = [];
  for (var r = 1; r < values.length; r++) {
    var name = String(shown[r][nameCol] || '').trim();
    var date = toIsoDate_(values[r][dateCol], shown[r][dateCol], tz);
    if (name && date) days.push({ date: date, name: name.slice(0, 60) });
  }
  days.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return days;
}

// Fallback when no tab is called "Events": the first tab whose row 1 has
// Title, Date and Status.
function findEventsSheet_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var lastCol = sheets[i].getLastColumn();
    if (lastCol < 1) continue;
    var cols = mapFields_(sheets[i].getRange(1, 1, 1, lastCol).getValues()[0], EVENT_FIELDS);
    if (cols['Title'] !== undefined && cols['Date'] !== undefined && cols['Status'] !== undefined) return sheets[i];
  }
  return null;
}

function mapFields_(headerRow, fields) {
  var lookup = {};
  fields.forEach(function (field) {
    field.aliases.forEach(function (alias) {
      var key = normKey_(alias);
      if (lookup[key] === undefined) lookup[key] = field.header;
    });
  });
  var columns = {};
  headerRow.forEach(function (header, index) {
    if (isPrivateHeader_(header)) return;
    var name = lookup[normKey_(header)];
    if (name && columns[name] === undefined) columns[name] = index;
  });
  return columns;
}

function rowObject_(rawRow, shownRow, columns, tz) {
  var out = {};
  Object.keys(columns).forEach(function (header) {
    var i = columns[header];
    var raw = rawRow[i];
    var shown = shownRow[i];
    if (DATE_HEADERS[header]) out[header] = toIsoDate_(raw, shown, tz);
    else if (TIME_HEADERS[header]) out[header] = toTime_(shown, raw, tz);
    else out[header] = shown == null ? '' : String(shown).trim();
  });
  return out;
}

// ---------------- Cleaning values ----------------

function normKey_(value) {
  return String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
}

function isPrivateHeader_(header) {
  return /\(private\)\s*$/i.test(String(header || '').trim());
}

function canonicalStatus_(value) {
  var v = normKey_(value);
  if (v === 'published') return 'Published';
  if (v === 'cancelled' || v === 'canceled') return 'Cancelled';
  if (v === 'draft') return 'Draft';
  return '';
}

function isListed_(value) {
  var v = normKey_(value);
  return !v || v === 'listed';
}

// Accepts a real date cell, "2026-11-14" or "14/11/2026" (day first).
function toIsoDate_(rawValue, shownValue, tz) {
  var y, m, d, match;
  if (Object.prototype.toString.call(rawValue) === '[object Date]' && !isNaN(rawValue.getTime())) {
    return Utilities.formatDate(rawValue, tz, 'yyyy-MM-dd');
  }
  var s = String(shownValue || rawValue || '').trim();
  if ((match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
    y = +match[1]; m = +match[2]; d = +match[3];
  } else if ((match = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s))) {
    d = +match[1]; m = +match[2]; y = +match[3];
  } else {
    return '';
  }
  var check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return '';
  return y + '-' + pad2_(m) + '-' + pad2_(d);
}

// Accepts a time cell, "18:00", "6:00 PM", "6 pm", "6.30 pm". Returns "HH:MM" or "".
function toTime_(shownValue, rawValue, tz) {
  if (Object.prototype.toString.call(rawValue) === '[object Date]' && !isNaN(rawValue.getTime())) {
    return Utilities.formatDate(rawValue, tz, 'HH:mm');
  }
  if (typeof rawValue === 'number' && isFinite(rawValue) && rawValue >= 0 && rawValue < 1) {
    var total = Math.round(rawValue * 24 * 60);
    var hour = Math.floor(total / 60);
    var minute = total % 60;
    if (hour > 23) return '';
    return pad2_(hour) + ':' + pad2_(minute);
  }
  var s = String(shownValue || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return '';
  var match = /^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?$/.exec(s);
  if (!match) return '';
  var hour = +match[1];
  var minute = match[2] ? +match[2] : 0;
  var meridiem = match[3] ? match[3].charAt(0) : '';
  if (!match[2] && !meridiem) return '';
  if (meridiem) {
    if (hour < 1 || hour > 12) return '';
    if (meridiem === 'p' && hour !== 12) hour += 12;
    if (meridiem === 'a' && hour === 12) hour = 0;
  }
  if (hour > 23 || minute > 59) return '';
  return pad2_(hour) + ':' + pad2_(minute);
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

// ---------------- Optional helper ----------------
// Run this once from the editor (select testFeed, click Run) to check the sheet.
function testFeed() {
  Logger.log(getFeedJson_(true));
}
