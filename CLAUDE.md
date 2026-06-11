# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A pair of MagicMirror² (MM2) modules shipped from one repo folder (`MMM-CalendarGrid/`):
- **MMM-CalendarGrid** — a full-month calendar grid with colored event pills.
- **MMM-TodayEvents** — a companion sidebar listing today's agenda in large text.

These run inside a MagicMirror² installation (Electron). There is no standalone build, no test suite, and no lint config — `package.json` declares only the `node-ical` runtime dependency and no scripts. "Running" means dropping this folder into `~/MagicMirror/modules/` and starting MagicMirror (`cd ~/MagicMirror && npm start`); errors print to that terminal.

## Architecture — the one thing to understand

There is a **single node_helper for both modules**, and it lives in this (the CalendarGrid) folder. Data flows in one direction through two notification hops:

1. `MMM-CalendarGrid.js` `start()` sends a `GET_CALENDAR_EVENTS` **socket** notification to `node_helper.js` with the calendar config.
2. `node_helper.js` fetches every ICS feed, normalizes events, and broadcasts one `CALENDAR_EVENTS` **socket** notification (a flat sorted array) back to the CalendarGrid frontend.
3. `MMM-CalendarGrid.js` re-broadcasts that same array as a **module** notification (`sendNotification`, line 28) so other modules on the page can hear it.
4. `MMM-TodayEvents.js` listens for that module notification via `notificationReceived` — it has **no node_helper and never fetches anything itself**.

Consequence (easy to break): **MMM-TodayEvents shows nothing unless MMM-CalendarGrid is also active**, because CalendarGrid owns the helper and the re-broadcast. Keep both files in this same folder.

Two distinct notification systems are in play — don't conflate them:
- `sendSocketNotification` / `socketNotificationReceived` = frontend ↔ node_helper (backend).
- `sendNotification` / `notificationReceived` = frontend module ↔ other frontend modules.

## node_helper.js specifics

- Fetches a fixed **3-month window** (prev month → next month) on every refresh so month-to-month feels seamless; events outside it are dropped (`fetchAllCalendars`).
- Recurring events (`event.rrule`) are expanded with `rrule.between(...)` and filtered against `EXDATE` exclusions by `toDateString()` comparison. If expansion throws, it falls back to one single event.
- All-day detection is heuristic (`normalizeEvent`): checks `event.start.dateOnly` and absence of `getHours`/`getMinutes`. ICS all-day quirks live here.
- Output event schema (the contract both frontends depend on): `{ id, title, start (ISO), end (ISO), allDay, color, calendarName }`. `color` and `calendarName` come from the matched calendar config entry, not the ICS.
- The refresh `setInterval` is reset each time `GET_CALENDAR_EVENTS` arrives.

## Frontend rendering notes

- `getDom()` dispatches on `getActiveView()` (the `view` config option) to per-view renderers: `renderMonth` / `renderWeek` / `render3Day` / `renderAgenda` / `render2Week`. Adding a view = new renderer + a `case` in the switch + a `.mmm-cg-<view>` CSS modifier (added to the wrapper by `getDom`). `week`/`2week` reuse `buildDayCell` via `buildDayCells`; `3day`/`agenda` use the larger `buildEventRow` instead of pills.
- `view: "rotate"` cycles `rotateViews` on a `setInterval`. That timer is created **once in `start()` via `setupRotation()` (never in `getDom`)** to avoid stacking intervals across re-renders, and cleared in `stop()`. It is distinct from `updateInterval`, which is the node_helper re-fetch cadence.
- The grid is built fresh in `getDom()` every `updateDom()` — no diffing, no resize listeners. Responsiveness is pure CSS (`clamp()` + `fr` units in the `.css` files). Tune sizing in CSS, not JS.
- `buildCells()` pads the month with prev/next-month "other-month" days to fill complete 7-cell rows; `startOnMonday` shifts the day-of-week math.
- A day's events come from `getEventsForDay()`, which uses overlap (`start <= dayEnd && end >= dayStart`) so multi-day events appear in every spanned cell.
- Cell CSS classes set by JS: `.today`, `.other-month`, `.past` (current-month days before today). Pills get per-calendar `borderLeftColor` and a translucent `backgroundColor` via `hexToRgba()` inline.
- `formatTime()` is duplicated in both frontend modules — change both if you touch it.

## Editing guidance

- The README is the user-facing config reference (all options, CSS class tables, troubleshooting). Keep it in sync when you change `defaults`, CSS class names, or the event schema.
- Module folder name must stay exactly `MMM-CalendarGrid` — MM2 resolves modules by folder name.
