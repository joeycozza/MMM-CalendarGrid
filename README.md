# MMM-CalendarGrid

A MagicMirror² module that displays a full-month calendar grid with colored event pills, plus a companion `MMM-TodayEvents` sidebar showing today's agenda in large text.

Built for full CSS control and responsiveness — works on any screen size without configuration changes.

## Features

- Month grid with colored event pills per day cell
- Per-calendar color coding
- All-day and timed events
- Multi-day events shown as repeated pills in each spanned day
- Static "+ X more" overflow label
- Today's date highlighted
- Other-month padding days dimmed
- `MMM-TodayEvents` sidebar reads the same data feed — no double config
- Fully responsive via CSS `clamp()` and `fr` units

## Install

```bash
cd ~/MagicMirror/modules
git clone https://github.com/youruser/MMM-CalendarGrid
cd MMM-CalendarGrid
npm install
```

## MagicMirror Config

Add **both** entries to `config/config.js`. `MMM-TodayEvents` must be in the same module directory as `MMM-CalendarGrid` — they share the same node_helper.

```js
{
  module: "MMM-CalendarGrid",
  position: "bottom_bar",   // adjust to your layout
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
    updateInterval: 30 * 60 * 1000,  // 30 minutes (ms)
    maxEventsPerDay: 5,               // shows "+X more" beyond this
    startOnMonday: false,             // true for Mon–Sun week layout
    showOtherMonthDays: true,         // show dimmed prev/next month days
  },
},
{
  module: "MMM-TodayEvents",
  position: "top_right",
  config: {
    title: "TODAY",     // sidebar header label
    maxEvents: 10,      // max events to list
  },
},
```

## Config Reference

### MMM-CalendarGrid

| Option | Default | Description |
|---|---|---|
| `calendars` | `[]` | Array of `{ url, color, name }` objects |
| `updateInterval` | `1800000` | Refresh interval in ms (default 30 min) |
| `maxEventsPerDay` | `5` | Max pills per day cell before "+ X more" |
| `startOnMonday` | `false` | Start week on Monday instead of Sunday |
| `showOtherMonthDays` | `true` | Show dimmed prev/next month filler days |

### MMM-TodayEvents

| Option | Default | Description |
|---|---|---|
| `title` | `"TODAY"` | Header label above the event list |
| `maxEvents` | `10` | Max events to display |
