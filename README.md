# MMM-CalendarGrid

A MagicMirror² module that displays a full-month calendar grid with colored event pills, plus a companion `MMM-TodayEvents` sidebar showing today's agenda in large text.

Built for full CSS control and responsiveness — works on any screen size without configuration changes.

## Features

- Month grid with colored event pills per day cell
- Per-calendar color coding
- All-day and timed events
- Multi-day events shown as repeated pills in each spanned day
- Static "+ X more" overflow label when a day exceeds `maxEventsPerDay`
- Today's date highlighted
- Other-month padding days dimmed
- `MMM-TodayEvents` sidebar reads the same data feed — no double ICS config
- Fully responsive via CSS `clamp()` and `fr` units — no JS resize logic

---

## File Structure

```
MMM-CalendarGrid/
  MMM-CalendarGrid.js     ← MM2 frontend module: builds the month grid DOM
  MMM-CalendarGrid.css    ← Responsive grid + pill styles
  MMM-TodayEvents.js      ← MM2 frontend module: today's events sidebar
  MMM-TodayEvents.css     ← Sidebar styles
  node_helper.js          ← Node backend: fetches + parses ICS feeds, broadcasts events
  package.json            ← npm dep: node-ical
```

### How the two modules share data

`node_helper.js` fetches all configured ICS feeds and broadcasts a single `CALENDAR_EVENTS` socket notification containing a flat array of normalized event objects. Both `MMM-CalendarGrid.js` and `MMM-TodayEvents.js` listen for this notification independently — there is no second fetch, and `MMM-TodayEvents` has no node_helper of its own.

**`MMM-TodayEvents` will not receive data unless `MMM-CalendarGrid` is also active in `config.js`**, since the node_helper lives in the CalendarGrid module folder.

---

## Install

```bash
cd ~/MagicMirror/modules
git clone https://github.com/joeycozza/MMM-CalendarGrid
cd MMM-CalendarGrid
npm install
```

---

## MagicMirror Config

Add **both** entries to `~/MagicMirror/config/config.js` inside the `modules: []` array.

```js
{
  module: "MMM-CalendarGrid",
  position: "bottom_bar",   // adjust to your layout — fills the full region width
  config: {
    calendars: [
      {
        url: "https://calendar.google.com/calendar/ical/yourfeed/basic.ics",
        color: "#4caf7d",
        name: "Family",
      },
      {
        url: "https://calendar.google.com/calendar/ical/yourfeed2/basic.ics",
        color: "#9b7fe8",
        name: "Work",
      },
    ],
    updateInterval: 30 * 60 * 1000,  // 30 minutes in ms
    maxEventsPerDay: 5,               // shows "+X more" beyond this
    startOnMonday: false,             // true for Mon–Sun week layout
    showOtherMonthDays: true,         // show dimmed prev/next month filler days
  },
},
{
  module: "MMM-TodayEvents",
  position: "top_right",
  config: {
    title: "TODAY",     // header label
    maxEvents: 10,      // max events to list
  },
},
```

---

## Config Reference

### MMM-CalendarGrid

| Option | Type | Default | Description |
|---|---|---|---|
| `calendars` | Array | `[]` | Array of `{ url, color, name }` objects. `url` is a valid iCal/ICS URL. `color` is any CSS hex color. `name` is a display label. |
| `updateInterval` | Number | `1800000` | How often to re-fetch feeds, in ms. Default is 30 minutes. |
| `maxEventsPerDay` | Number | `5` | Max event pills shown per day cell. Additional events show as "+ X more". |
| `startOnMonday` | Boolean | `false` | `true` = week starts Monday. `false` = week starts Sunday. |
| `showOtherMonthDays` | Boolean | `true` | Whether to show dimmed padding days from the previous and next month. |

### MMM-TodayEvents

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | String | `"TODAY"` | Header label displayed above the event list. |
| `maxEvents` | Number | `10` | Maximum number of today's events to display. |

---

## CSS Customization

All styles are in `MMM-CalendarGrid.css` and `MMM-TodayEvents.css`. Font sizes use `clamp(min, preferred, max)` so they scale automatically — adjust the values to tune for your screen size.

### Key CSS classes

**MMM-CalendarGrid:**

| Class | What it styles |
|---|---|
| `.mmm-cg-wrapper` | Outer module container |
| `.mmm-cg-header` | Month/year title (e.g. "June 2026") |
| `.mmm-cg-day-label` | Day-of-week header labels (Sun, Mon, …) |
| `.mmm-cg-grid` | The 7-column CSS Grid container |
| `.mmm-cg-cell` | Individual day cell |
| `.mmm-cg-cell.today` | Today's cell — date number gets the blue circle |
| `.mmm-cg-cell.other-month` | Prev/next month filler cells (dimmed) |
| `.mmm-cg-date-num` | The date number inside each cell |
| `.mmm-cg-pill` | An event pill — `border-left-color` and `background-color` are set inline per calendar color |
| `.mmm-cg-pill.all-day` | All-day event pill variant |
| `.mmm-cg-pill-text` | Text inside a pill (truncated with ellipsis) |
| `.mmm-cg-more` | The "+ X more" overflow label |

**MMM-TodayEvents:**

| Class | What it styles |
|---|---|
| `.mmm-te-wrapper` | Outer module container |
| `.mmm-te-header` | "TODAY" title |
| `.mmm-te-list` | Event list container |
| `.mmm-te-event` | Individual event row — `border-left-color` set inline per calendar color |
| `.mmm-te-time` | Time label (e.g. "9am") |
| `.mmm-te-title` | Event title in large text |
| `.mmm-te-empty` | "No events today" message |

---

## Event Object Schema

The node_helper broadcasts an array of event objects with this shape:

```js
{
  id: String,           // unique identifier (uid or generated)
  title: String,        // event summary
  start: String,        // ISO 8601 datetime string
  end: String,          // ISO 8601 datetime string
  allDay: Boolean,      // true if no specific time
  color: String,        // hex color from calendar config
  calendarName: String, // name from calendar config
}
```

---

## Troubleshooting

**Module not found / not loading**
- Confirm the folder is named exactly `MMM-CalendarGrid` inside `~/MagicMirror/modules/`
- Run `npm install` inside the module folder
- Check MM2 logs: `cd ~/MagicMirror && npm start` — errors print to the terminal

**No events showing**
- Verify your ICS URL is publicly accessible (test it in a browser — it should download a `.ics` file)
- Check the MM2 console for `[MMM-CalendarGrid] Failed to fetch` errors
- Google Calendar: make sure the calendar is shared as "public" and you're using the **ICS** link (not the HTML link)

**MMM-TodayEvents shows nothing**
- Confirm `MMM-CalendarGrid` is also in your `config.js` and loaded — it owns the node_helper that broadcasts data
- Both modules must be in the same folder (`MMM-CalendarGrid/`)

**Updating**
```bash
cd ~/MagicMirror/modules/MMM-CalendarGrid
git pull
npm install
```
