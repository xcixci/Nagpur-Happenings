# Nagpur Happenings

A monthly calendar of offline events in Nagpur: book clubs, board games and chess, poetry and open mics, music, theatre, workshops, talks, walks and community meetups.

- **Website:** plain HTML, CSS and JavaScript. Hosted free on GitHub Pages.
- **Event database:** a Google Sheet you edit by hand.
- **Data feed:** a small Google Apps Script that publishes the sheet as read-only JSON.
- **Submissions:** a Google Form. Every submission is reviewed by you before it goes live.

No server, no paid services, no logins, no build step.

---

## What's in the folder

```
nagpur-happenings/
├── index.html                  The page
├── styles.css                  All styling (colours and fonts at the top)
├── script.js                   Calendar logic; your settings are at the very top
├── og-card-source.html         Source for the link-preview image (not part of the live page)
├── assets/
│   ├── favicon.svg             Zero Mile milestone icon
│   ├── tiger-coat.svg          Tiger stripes in the header (and preview card)
│   ├── tiger-coat-orange.svg   Faint stripes in the footer
│   ├── og-card.png             Preview image shown when the link is shared
│   └── fonts/                  Mukta + Tiro Devanagari Marathi (self-hosted, open licence)
├── data/
│   └── sample-events.js        Illustrative sample events for previewing (not real events)
├── google-apps-script/
│   └── Code.gs                 Paste this into Apps Script (step 2)
└── google-sheets/
    ├── events-template.csv             Empty-ish template: headers + 3 example rows
    ├── days-template.csv               Festivals and special days for the "Days" tab
    └── sample-events-november-2026.csv 24 illustrative rows for November 2026
```

> **About the sample data:** every sample event is invented for testing. The organisers are fictional, the links go to example.com and every description starts with "Illustrative example, not a confirmed event." Don't publish them as real listings.

## Try it before setting anything up

Double-click `index.html` to open it in your browser. You'll see the current month and a note saying the events feed isn't connected yet. Click **Preview with sample events** to see November 2026 filled in.

You can also add `?sample` to the address (for example `index.html?sample`) to jump straight to the sample preview.

---

## Step 1: Create the Google Sheet

1. Go to [sheets.new](https://sheets.new) and name the spreadsheet, for example *Nagpur Happenings: Events*.
2. **File → Import → Upload** and choose `google-sheets/events-template.csv`
   (or `sample-events-november-2026.csv` if you want example rows to play with).
   - Import location: **Replace current sheet**
   - Separator: **Detect automatically**. The "convert text to numbers, dates and formulas" box can be on or off; the script handles both.
3. Rename the tab at the bottom to exactly **`Events`** (double-click the tab name).
4. **File → Settings → Time zone:** choose *(GMT+05:30) India Standard Time*, then **Save settings**.
5. Optional but recommended: add dropdowns so typos can't creep in. Select a column, then **Data → Data validation → Add rule → Dropdown**:
   - **Category:** `Books & Literature`, `Board Games & Chess`, `Arts & Culture`, `Music & Entertainment`, `Learning & Workshops`, `Communities & Social`, `Outdoors & Recreation`, `Other`
   - **Status:** `Draft`, `Published`, `Cancelled`, `Completed`
   - **Free or Paid:** `Free`, `Paid`
   - **Featured:** `Yes`, `No`

### Columns

Keep these header names in row 1. The order doesn't matter, and extra columns (for example *Internal notes* or *Submitter phone*) are fine: the feed only ever publishes the columns below.

| Column | What to enter | Example |
|---|---|---|
| Event ID | Any unique code. If blank, one is generated from the row number. | `NH-014` |
| Title | Event name. Required. Marathi/Hindi works. | `Book club: short stories` |
| Category | One of the 8 categories above. Anything else shows as *Other*. | `Books & Literature` |
| Date | `YYYY-MM-DD` or `DD/MM/YYYY` (day first), or a real date cell. Required. | `2026-11-14` |
| Start Time | 24-hour `18:00` or `6:00 PM`. Optional. | `18:30` |
| End Time | Same format. Optional. | `20:00` |
| Venue | Name of the place | `Courtyard Café` |
| Area | Locality in Nagpur | `Dharampeth` |
| Description | A few sentences. Blank lines start new paragraphs. | |
| Organiser Name | Person or group | `Nagpur Readers Circle` |
| Organiser Contact | Email, phone number or website. Optional. | `hello@example.com` |
| Registration URL | Link for the **Register** button. Must start with `https://` or `www.` | `https://…` |
| Ticket Price | Number in rupees or short text. Optional. | `300` |
| Free or Paid | `Free` or `Paid` | `Paid` |
| Cover Image URL | Optional direct link to an image (`https://…jpg`) | |
| Status | `Draft`, `Published`, `Cancelled` or `Completed` | `Published` |
| Featured | `Yes` or `No` | `No` |
| Who can join | Optional. Leave blank when it's open to all. Up to 3, separated by commas. Shown as a purple tag. Use *Neurodivergent-friendly* only when the organiser says so. | `Kids 6–12`, `18+`, `Women only, Neurodivergent-friendly` |

**What each status does on the website**

| Status | Calendar | Coming Up list | Use it for |
|---|---|---|---|
| Draft | hidden | hidden | Submissions you're still checking |
| Published | shown | shown (until it ends) | Live events |
| Cancelled | shown, struck through, marked *Cancelled* | hidden | Telling people who planned to go |
| Completed | hidden | hidden | Keeping old events in the sheet for your records |

### Optional: festivals and special days ("Days" tab)

Add a second tab called **`Days`** with two columns, **Date** and **Name**:

| Date | Name |
|---|---|
| 2026-11-08 | Diwali |
| 2026-11-26 | Constitution Day |

These show as small orange labels beside the date on big screens, as an orange mark under the date on phones (with the name in the month list), and inside event pop-ups for that day. They are not events: they don't appear in *Coming Up* and category filters don't hide them. Import `google-sheets/days-template.csv` to start. Next year, just add the new dates.

Want cancelled events to disappear completely instead? Set `INCLUDE_CANCELLED = false` at the top of `Code.gs` and redeploy (see the note at the end of step 2).

---

## Step 2: Publish the sheet as a read-only feed (Apps Script)

1. In your Google Sheet: **Extensions → Apps Script**. A code editor opens in a new tab.
2. Delete everything in the editor's `Code.gs` and paste in the whole of `google-apps-script/Code.gs` from this folder. Click the save icon. You can rename the project (top left) to *Nagpur Happenings feed*.
3. **Check it works (optional, recommended).** In the function dropdown at the top choose **`testFeed`**, then click **Run**.
   - Google asks for permission the first time: **Review permissions** → pick your account → you'll see "Google hasn't verified this app". That's expected for your own script: click **Advanced → Go to Nagpur Happenings feed (unsafe) → Allow**.
   - The *Execution log* at the bottom shows your events as JSON.
4. **Deploy → New deployment.** Click the gear icon next to *Select type* and choose **Web app**.
   - Description: `Events feed`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** (authorise again if asked).
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy…/exec`.
6. Paste that URL into a new browser tab. You should see text starting with `{"ok":true,…`. That's your feed.

**Is this safe?** Yes:
- *Execute as Me* means the script reads the sheet on your behalf. **The sheet itself stays private**; visitors never get access to it.
- The feed only returns Published (and Cancelled) rows, and only the columns listed above.
- The script has no `doPost`, so nobody can add or change anything through this URL. There are no passwords or keys in the website code.

**When you edit Code.gs later:** **Deploy → Manage deployments → pencil icon → Version: New version → Deploy.** The URL stays the same. (Editing the *sheet* doesn't need this; only editing the *code* does.)

---

## Step 3: Connect the website to your feed

Open `script.js` in any text editor (Notepad, TextEdit, VS Code, or directly on GitHub later). The settings are at the very top:

```js
const NH_CONFIG = {
  EVENTS_API_URL: 'https://script.google.com/macros/s/AKfy…/exec',   // from step 2
  SUBMIT_FORM_URL: 'https://forms.gle/…',                           // from step 4
  INSTAGRAM_URL: 'https://www.instagram.com/arinjayxci/',
  CONTACT_EMAIL: 'community@arinjay.email',
  CREATOR_NAME: 'Arinjay',
  CREATOR_INSTAGRAM: 'arinjayxci',
  CREATOR_SITE_URL: 'https://xci.cx',
  CREATOR_PHOTO: '',              // e.g. 'assets/arinjay.jpg'
  GOATCOUNTER_CODE: '',           // from step 7
  ...
};
```

Paste each link **between the quotes** and save. Leave a value as `''` if you don't have it yet: an empty Instagram or Contact hides that footer link, and an empty form link makes the submit button say "The submission form opens soon".

**Before going live, create the address `community@arinjay.email`** in Proton Mail, where you manage the addresses for arinjay.email. The Contact link and every "Email" button on event pop-ups use it.

**Your photo:** save a square photo (around 300×300 px, under 100 KB) as `assets/arinjay.jpg`, upload it with the rest, and set `CREATOR_PHOTO: 'assets/arinjay.jpg'`. It appears in the footer credit and next to "Something wrong or changed? Tell Arinjay" in every event pop-up. Until then, an orange circle with your initial shows instead.

Other settings in the same block:

| Setting | Default | What it does |
|---|---|---|
| `CACHE_MINUTES` | `10` | How long a visitor's browser reuses the events it downloaded |
| `REQUEST_TIMEOUT_SECONDS` | `12` | When to stop waiting for the feed and show the retry message |
| `UPCOMING_LIMIT` | `8` | Number of events in *Coming Up in Nagpur* |
| `MAX_EVENTS_PER_DAY` | `3` | Events shown in a calendar square before "+N more" |
| `WEEK_STARTS_ON` | `1` | `1` = Monday first, `0` = Sunday first |
| `TIMEZONE` | `Asia/Kolkata` | "Today" and past/upcoming are worked out in Nagpur time, whatever the visitor's device timezone |
| `CREATOR_…` | your details | The "Made by" credit in the footer and the Instagram button in event pop-ups |
| `GOATCOUNTER_CODE` | empty | Turns on the visit counter (step 7) |
| `SHOW_VISIT_COUNT` | `true` | Shows the odometer visit count in the footer (step 7) |
| `VISIT_COUNT_SINCE` | `31 Oct 2026` | The date in "visits since …" |
| `VISIT_COUNT_MIN` | `1` | Keeps the odometer hidden until the total reaches this number |

Open `index.html` again: your real events should load.

---

## Step 4: Set up the Google Form for submissions

The script `google-apps-script/CreateForm.gs` builds the form for you. It starts with one question, *What would you like to do?*, which leads to one of two short sections:

- **Submit an event:** title, category, date, times, venue, area, description, organiser, contact, link, price, *Who can join?*, poster, and the submitter's email or phone.
- **Request a kind of event:** what they wish was happening in Nagpur, which community could run it, and an optional email or phone.

1. Open the events Sheet → **Extensions → Apps Script**.
2. Click **+** next to *Files* → **Script**, name it `CreateForm`, paste the whole of `CreateForm.gs`, and **Save**.
3. Pick `createSubmissionForm` in the function menu, click **Run**, and allow access.
4. Open **Execution log**. It shows *Link to share*. Paste that link into `SUBMIT_FORM_URL` in `script.js`.
5. Optional, for the **Request an event** buttons: open the form editor → **⋮** (top right) → **Get pre-filled link** → tick *Request a kind of event…* → **Get link** → **Copy link**, and paste it into `REQUEST_FORM_URL`. The Request buttons then open the form with that answer already chosen. Do the same with *Submit an event…* ticked and use that for `SUBMIT_FORM_URL` if you like.

Answers land in a new *Form Responses* tab, **not** in `Events`, so nothing goes live by itself. Spam can't reach the website; you just delete it. Requests (ideas) appear in the same tab with the event columns empty.
If spam ever becomes annoying: form **Settings → Responses → Collect email addresses → Verified**. People then have to sign in with Google to submit, which stops most bots.

Running the script again does not make a second form; it just shows the links again.

**Reviewing a submission:** read the new row in *Form Responses 1*, check the details with the organiser if needed, then copy the fields into a new row in `Events`, give it an Event ID, and set Status to `Published`.

---

## Step 5: Upload the project to GitHub

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Click **+ → New repository**. Name it, for example, `nagpur-happenings`. Choose **Public** (GitHub Pages is free for public repositories). Click **Create repository**.
3. On the new repository page click **uploading an existing file**.
4. Open this project folder on your computer, select **everything inside it** (`index.html`, `styles.css`, `script.js`, `README.md` and the `assets`, `data`, `google-apps-script`, `google-sheets` folders) and drag it into the browser. Chrome and Edge keep the folders intact.
   Upload the *contents* of the folder, so that `index.html` sits at the top level of the repository, not inside a subfolder.
5. Click **Commit changes**.

## Step 6: Turn on GitHub Pages

1. In the repository: **Settings → Pages**.
2. Under *Build and deployment*, Source: **Deploy from a branch**. Branch: **main**, folder **/ (root)**. Click **Save**.
3. Wait a minute or two and refresh. The page shows your site address, for example `https://your-username.github.io/nagpur-happenings/`.

**Changing settings later:** open `script.js` on GitHub, click the pencil icon, edit, then **Commit changes**. The site updates within a couple of minutes.

**Turn on the link preview:** open `index.html` on GitHub (pencil icon) and replace both `YOUR-SITE-ADDRESS` with your real address, for example `your-username.github.io/nagpur-happenings`. Commit. Now when the link is pasted into WhatsApp or Instagram it shows the orange tiger-stripe card (`assets/og-card.png`) instead of a bare link. WhatsApp caches previews, so test with a link you haven't shared before.

A custom domain (like `nagpurhappenings.in`) can be added under **Settings → Pages → Custom domain** once you own one. If you add one, update `YOUR-SITE-ADDRESS` to match.

## Step 7: Turn on the visit counter (optional, free)

1. Sign up at [goatcounter.com](https://www.goatcounter.com) (free for non-commercial sites). Pick a code, e.g. `nagpurhappenings`; your dashboard will be `nagpurhappenings.goatcounter.com`.
2. Put the code in `script.js`: `GOATCOUNTER_CODE: 'nagpurhappenings'`. Commit.
3. For the public odometer in the footer: in GoatCounter, **Settings → Main → Allow adding visitor counts on your website**. The wheels roll into place when a visitor scrolls to the footer.
4. Don't count yourself: on each browser you use, open your site with `#toggle-goatcounter` at the end of the address and reload until a popup says tracking is disabled. WhatsApp and Instagram open links in their own built-in browsers, so do it in those too. Or add your IP under **Settings → Tracking → Ignore IPs**.

It counts page visits without cookies, so no cookie banner is needed. It also counts clicks, each tagged with the event ID:

| In the dashboard | Means |
|---|---|
| `open-NH-012` | Someone opened that event's details |
| `register-NH-012` | Clicked Register (useful proof for organisers) |
| `whatsapp-NH-012`, `copylink-NH-012` | Shared it |
| `maps-NH-012` | Asked for directions |
| `update-dm-…`, `update-email-…` | Reported a change |
| `submit-form` | Opened the submission form |
| `creator-instagram`, `creator-site` | Clicked your links in the footer |

---

## Sharing an event

Every event pop-up has **Share on WhatsApp** and **Copy link**. The link looks like `…/nagpur-happenings/#event=NH-012` and opens the calendar straight to that event. You can build these links yourself for Instagram stories and bios: your site address + `#event=` + the Event ID.

Each pop-up also has **Open in Google Maps** (searches the venue and area) and **Something wrong or changed? Tell Arinjay**, with buttons to message @arinjayxci on Instagram or email community@arinjay.email. The email subject is filled in with the event name and ID, so you know which row to fix.

## Updating the feed script (Code.gs)

When `Code.gs` changes (for example, the *Who can join* column was added on 31 Oct 2026), the live feed keeps running the old copy until you publish the new one. Your feed link stays the same:

1. Apps Script → open `Code.gs` → select all → paste the new version → **Save**.
2. **Deploy → Manage deployments** → click the pencil on your web app → **Version: New version** → **Deploy**.

Don't use *New deployment*: that makes a new link, and the website would still read the old one.

## Day to day

- **Add an event:** new row in `Events`, Status `Published`.
- **Feature an event:** set Featured to `Yes`. It gets an orange outline on the calendar and a *Featured* tag in the lists. The order stays chronological.
- **Cancel an event:** change Status to `Cancelled`. Don't delete the row; people who saw it will see it's off.
- **After it's over:** nothing to do. Past events stay on the calendar (dimmed) and drop out of *Coming Up* automatically. Mark them `Completed` only if you want them off the calendar.

**How quickly changes appear:** editing the sheet clears the feed's own cache straight away. A visitor who loaded the site in the last 10 minutes keeps their saved copy until it expires (see `CACHE_MINUTES`). To check a change immediately, open the site in a private/incognito window.

---

## Feed format (for reference)

`GET` your `/exec` URL returns:

```json
{
  "ok": true,
  "source": "Nagpur Happenings",
  "timezone": "Asia/Kolkata",
  "generatedAt": "2026-10-30T21:45:00+05:30",
  "count": 1,
  "events": [
    {
      "id": "NH-012",
      "title": "Unplugged acoustic evening",
      "category": "Music & Entertainment",
      "date": "2026-11-14",
      "startTime": "19:00",
      "endTime": "21:00",
      "venue": "Courtyard Café",
      "area": "Civil Lines",
      "description": "Four acoustic acts…",
      "organiserName": "…",
      "organiserContact": "https://…",
      "registrationUrl": "https://…",
      "ticketPrice": "200",
      "priceType": "Paid",
      "coverImageUrl": "",
      "status": "Published",
      "featured": true
    }
  ]
}
```

If something is wrong with the sheet, it returns `{"ok": false, "error": "…"}` with a plain explanation, for example `There is no tab named "Events".`

Dates are always `YYYY-MM-DD` and times always 24-hour `HH:MM`, whatever format you typed in the sheet. Events are sorted by date and time.

---

## Troubleshooting

**"The events feed isn't connected yet."**
`EVENTS_API_URL` in `script.js` is empty or doesn't start with `https://`. Paste the `/exec` URL from step 2. (This message, with its *Preview with sample events* button, is also what visitors see until you connect the feed.)

**"Events couldn't be loaded."**
Open your `/exec` URL in a private/incognito window.
- If it asks you to sign in, the deployment isn't set to *Anyone*. Go to **Deploy → Manage deployments → pencil**, set *Who has access* to **Anyone**, and deploy.
- If it shows `"ok": false`, the error message says what to fix (usually the tab name or missing headers).
- If it loads fine there, check you copied the whole URL (it ends in `/exec`, not `/dev`).

The calendar still works while the feed is down, and visitors who loaded events recently keep seeing their saved copy with a note.

**An event isn't showing.**
Check that: Status is exactly `Published`; the Title isn't blank; the Date is `2026-11-14` or `14/11/2026` style; you're looking at the right month; no category filter is switched on; your cache has expired (try a private window).

**I changed Code.gs but nothing changed.**
Code changes need a new version: **Deploy → Manage deployments → pencil → New version → Deploy**.

**Times look wrong.**
Use `18:00` or `6:00 PM`. A bare `6` is ignored because it could mean morning or evening.

---

## Ready for later (not built yet)

The data already supports what paid listings would need: *Free or Paid*, *Ticket Price*, external *Registration URL* for the organiser's own ticketing, and *Featured* for promoted listings. The website takes no payments itself.

## Credits

- Fonts: [Mukta](https://github.com/EkType/Mukta) by Ek Type and [Tiro Devanagari Marathi](https://github.com/TiroTypeworks/Indigo) by Tiro Typeworks, both under the SIL Open Font License (licence files in `assets/fonts/`). Both include Devanagari, so Marathi and Hindi event titles display properly.
- Sample events are fictional.
