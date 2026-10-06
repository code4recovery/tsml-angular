# TSML-Ang

An Angular take on [tsml-ui](https://github.com/code4recovery/tsml-ui): a meeting finder for
12 Step Meeting List / Meeting Guide JSON feeds, with filtering by **day**, **time**, **type**,
**region**, **attendance** (in person / online), and free-text search.

## Requirements

Angular 22 needs **Node.js 22.22.3+ or 24.15+** (or 26+) and TypeScript 6.0.

## Run it

```bash
npm install
npm start          # http://localhost:4200
npm run build      # production build in dist/tsml-ang/browser
```

## Point it at your feed

Edit `src/app/settings.ts`:

```ts
feedUrl: 'https://your-site.org/wp-admin/admin-ajax.php?action=meetings',
```

Any feed following the [Meeting Guide spec](https://github.com/code4recovery/spec) works.
The feed has to allow CORS from wherever you host this app. `public/meetings.json` is sample data.

## How it maps to tsml-ui

| tsml-ui | TSML-Ang |
| --- | --- |
| Filters in the query string (`?day=1&type=O,D`) | Same — the URL is the single source of truth, so links and the back button work |
| Defaults to today | `defaultDay: 'today'` (or `'any'`) in settings |
| Time windows: morning / midday / evening / night / appointment | Same windows (`models/meeting-types.ts`) |
| Type filter shows only types present in the feed | Same; multiple types are AND-ed |
| Attendance: in person / online, hybrid matches both | Same rules (`models/normalize.ts`) |
| Table: Time, Name, Location, Address, Region; stacks on mobile | Same |
| Meeting detail with join links, directions, other meetings at the location | Same |

### Add to calendar

Each meeting page has **Google Calendar** and **Download .ics** buttons. Both create a weekly
repeating event in the meeting's time zone (the feed's `timezone` field, or `SETTINGS.timezone`),
so the local time stays put across daylight saving changes. The .ics file includes a generated
`VTIMEZONE` block so Outlook desktop handles it too. Logic lives in `src/app/models/calendar.ts`.
Meetings by appointment or temporarily closed don't get calendar buttons.

Not included yet: the map view, distance/geolocation sorting, and translations.

## Angular 22 notes

- **Zoneless.** No zone.js; change detection is driven by signals (the Angular 21+ default).
- **OnPush by default.** All state is in signals, so components need no explicit strategy.
- **`@angular/build`** application builder, no polyfills.
- **Fetch-based HttpClient** is the default, so `withFetch()` is gone.
- File names follow the current style guide (`meeting-list.ts`, class `MeetingList`).
- Host listeners use the `host` metadata instead of `@HostListener`.

## Layout

```
src/app/
  app.ts, app.config.ts, app.routes.ts
  settings.ts                     feed URL and defaults
  models/meeting.ts               raw feed + normalized types
  models/meeting-types.ts         type codes, days, time windows
  models/normalize.ts             feed → Meeting (multi-day expansion, attendance)
  models/filters.ts               URL ⇄ filters, filtering + sorting
  models/calendar.ts              Google Calendar link + .ics builder
  services/meetings-store.ts      loads feed, exposes signals
  components/filter-bar/          search + dropdowns + type multi-select
  components/meeting-list/        heading, results table
  components/meeting-detail/      single meeting page
  pipes/                          time, day name, type label
```
