/**
 * Nagpur Happenings: read-only events feed
 * ---------------------------------------------------------------
 * Paste this whole file into Extensions → Apps Script in your events
 * Google Sheet, then deploy it as a Web app (see README, step 2).
 *
 * What it does
 *  - Reads the "Events" tab.
 *  - Returns only rows whose Status is "Published" (plus "Cancelled"
 *    rows, so visitors can see a cancellation; switch that off below).
 *  - Never returns Draft or Completed rows, and never returns columns
 *    that aren't listed in COLUMN_ALIASES (so private notes stay private).
 *  - Sends JSON. It has no doPost, so nobody can write to your sheet
 *    through this URL.
 */

// ---------------- Settings ----------------

// Name of the tab that holds your events.
var SHEET_NAME = 'Events';

// true: cancelled events are sent too (shown as "Cancelled" on the calendar,
//       never in the upcoming list).
// false: strictly Published events only.
var INCLUDE_CANCELLED = true;

// Seconds to reuse a prepared response before reading the sheet again.
// Editing the sheet clears this cache automatically (see onEdit below).
var CACHE_SECONDS = 300;

// Leave empty when this script is attached to the sheet (the normal setup).
// Only fill this in if you created a standalone Apps Script project.
var SPREADSHEET_ID = '';

// ---------------- Column names ----------------
// Header text in row 1 → field name in the JSON. Matching ignores case,
// spaces and punctuation, so "Event ID", "event id" and "event_id" all work.
var COLUMN_ALIASES = {
  id: ['Event ID', 'ID'],
  title: ['Title', 'Event Title', 'Event Name', 'Name'],
  category: ['Category'],
  date: ['Date', 'Event Date'],
  startTime: ['Start Time', 'Start'],
  endTime: ['End Time', 'End'],
  venue: ['Venue'],
  area: ['Area', 'Locality', 'Area / Locality', 'Area/Locality'],
  description: ['Description', 'Details'],
  organiserName: ['Organiser Name', 'Organizer Name', 'Organiser', 'Organizer'],
  organiserContact: ['Organiser Contact', 'Organizer Contact', 'Organiser Website', 'Contact'],
  registrationUrl: ['Registration URL', 'Registration Link', 'Register URL', 'Tickets URL'],
  ticketPrice: ['Ticket Price', 'Price'],
  priceType: ['Free or Paid', 'Free/Paid', 'Free / Paid', 'Pricing'],
  coverImageUrl: ['Cover Image URL', 'Image URL', 'Cover Image'],
  status: ['Status'],
  featured: ['Featured']
};

var CACHE_KEY = 'nagpur-happenings-feed-v1';

// ---------------- Web app entry point ----------------

function doGet(e) {
  var body;
  try {
    var refresh = e && e.parameter && e.parameter.refresh === '1';
    body = getFeedJson_(refresh);
  } catch (err) {
    body = JSON.stringify({
      ok: false,
      error: 'The events sheet could not be read. ' + (err && err.message ? err.message : String(err))
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

// Simple trigger: runs whenever someone edits the sheet, so changes show quickly.
function onEdit(e) {
  try {
    CacheService.getScriptCache().remove(CACHE_KEY);
  } catch (err) {
    // Not fatal: the cache expires on its own after CACHE_SECONDS.
  }
}

// ---------------- Reading the sheet ----------------

function buildFeed_() {
  var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet found. Open the script from the sheet (Extensions → Apps Script) or set SPREADSHEET_ID.');
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('There is no tab named "' + SHEET_NAME + '".');

  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Kolkata';
  var range = sheet.getDataRange();
  var values = range.getValues();
  var shown = range.getDisplayValues();
  if (!values.length || (values.length === 1 && values[0].join('') === '')) return feed_([], tz);

  var columns = mapColumns_(values[0]);
  if (columns.title === undefined || columns.date === undefined || columns.status === undefined) {
    throw new Error('Row 1 needs at least these headers: Title, Date, Status.');
  }

  var events = [];
  for (var r = 1; r < values.length; r++) {
    var event = readRow_(values[r], shown[r], columns, tz, r + 1);
    if (event) events.push(event);
  }

  events.sort(function (a, b) {
    var ka = a.date + ' ' + (a.startTime || '99:99');
    var kb = b.date + ' ' + (b.startTime || '99:99');
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  return feed_(events, tz);
}

function feed_(events, tz) {
  return {
    ok: true,
    source: 'Nagpur Happenings',
    timezone: tz,
    generatedAt: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ssXXX"),
    count: events.length,
    events: events
  };
}

function mapColumns_(headerRow) {
  var lookup = {};
  Object.keys(COLUMN_ALIASES).forEach(function (field) {
    COLUMN_ALIASES[field].forEach(function (alias) {
      lookup[normKey_(alias)] = field;
    });
  });
  var columns = {};
  headerRow.forEach(function (header, index) {
    var field = lookup[normKey_(header)];
    if (field && columns[field] === undefined) columns[field] = index;
  });
  return columns;
}

function readRow_(row, shownRow, columns, tz, rowNumber) {
  function cell(field) {
    var i = columns[field];
    return i === undefined ? '' : String(shownRow[i] === null || shownRow[i] === undefined ? '' : shownRow[i]).trim();
  }
  function raw(field) {
    var i = columns[field];
    return i === undefined ? '' : row[i];
  }

  var title = cell('title');
  if (!title) return null;

  var status = canonicalStatus_(cell('status'));
  if (status !== 'Published' && !(INCLUDE_CANCELLED && status === 'Cancelled')) return null;

  var date = toIsoDate_(raw('date'), cell('date'), tz);
  if (!date) return null; // skip rows without a readable date

  return {
    id: cell('id') || 'row-' + rowNumber,
    title: title,
    category: cell('category') || 'Other',
    date: date,
    startTime: toTime_(cell('startTime')),
    endTime: toTime_(cell('endTime')),
    venue: cell('venue'),
    area: cell('area'),
    description: cell('description'),
    organiserName: cell('organiserName'),
    organiserContact: cell('organiserContact'),
    registrationUrl: cell('registrationUrl'),
    ticketPrice: cell('ticketPrice'),
    priceType: canonicalPriceType_(cell('priceType')),
    coverImageUrl: cell('coverImageUrl'),
    status: status,
    featured: /^(yes|y|true|1)$/i.test(cell('featured'))
  };
}

// ---------------- Cleaning values ----------------

function normKey_(value) {
  return String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
}

function canonicalStatus_(value) {
  var v = normKey_(value);
  if (v === 'published') return 'Published';
  if (v === 'cancelled' || v === 'canceled') return 'Cancelled';
  if (v === 'draft') return 'Draft';
  if (v === 'completed') return 'Completed';
  return '';
}

function canonicalPriceType_(value) {
  var v = normKey_(value);
  if (v === 'free') return 'Free';
  if (v === 'paid') return 'Paid';
  return '';
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

// Accepts "18:00", "18:00:00", "6:00 PM", "6 pm", "6.30 pm". Returns "HH:MM" or "".
function toTime_(shownValue) {
  var s = String(shownValue || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return '';
  var match = /^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?$/.exec(s);
  if (!match) return '';
  var hour = +match[1];
  var minute = match[2] ? +match[2] : 0;
  var meridiem = match[3] ? match[3].charAt(0) : '';
  if (!match[2] && !meridiem) return ''; // a bare number like "6" is too ambiguous
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
// Run this once from the editor (select testFeed, click Run) to check
// your sheet. It writes the JSON to the execution log.
function testFeed() {
  Logger.log(getFeedJson_(true));
}
