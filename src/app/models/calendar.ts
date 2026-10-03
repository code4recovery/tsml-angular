import { Meeting } from './meeting';
import { typeLabel, ATTENDANCE_CODES } from './meeting-types';

/**
 * Calendar exports for a meeting.
 *
 * Both outputs describe a WEEKLY recurring event pinned to the meeting's own
 * IANA time zone, so a 7:00 pm meeting stays at 7:00 pm after a DST change.
 * The .ics file carries a generated VTIMEZONE block so Outlook desktop
 * (which ignores bare IANA TZIDs) also gets it right.
 */

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_DURATION = 60; // minutes, when the feed has no end_time
const MINUTE = 60_000;
const DAY = 86_400_000;

export interface CalendarEvent {
  title: string;
  /** Local wall-clock start/end in the meeting's zone, as YYYYMMDDTHHMMSS */
  start: string;
  end: string;
  timezone: string;
  rrule: string;
  location: string;
  description: string;
  url: string;
  uid: string;
}

/** Returns null for meetings that can't be put on a calendar (by appointment, closed). */
export function toCalendarEvent(m: Meeting, pageUrl: string): CalendarEvent | null {
  if (m.day === null || m.minutes === null || m.attendance === 'inactive') return null;

  // First occurrence: the next m.day on or after today, in the meeting's zone.
  const today = datePartsInZone(Date.now(), m.timezone);
  const offsetDays = (m.day - today.weekday + 7) % 7;
  const startDate = Date.UTC(today.year, today.month - 1, today.day + offsetDays);

  const endMinutes = parseMinutes(m.endTime);
  let duration = DEFAULT_DURATION;
  if (endMinutes !== null) {
    duration = endMinutes > m.minutes ? endMinutes - m.minutes : endMinutes + 1440 - m.minutes;
  }

  const startMs = startDate + m.minutes * MINUTE;
  const endMs = startMs + duration * MINUTE;

  return {
    title: m.name,
    start: wallClock(startMs),
    end: wallClock(endMs),
    timezone: m.timezone,
    rrule: `FREQ=WEEKLY;BYDAY=${RRULE_DAYS[m.day]}`,
    location: eventLocation(m),
    description: eventDescription(m, pageUrl),
    url: pageUrl,
    uid: `${m.slug}-${m.day}@${safeHost(pageUrl)}`,
  };
}

/** Google Calendar "create event" link (opens a prefilled form; nothing is saved until the user confirms). */
export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${e.start}/${e.end}`,
    ctz: e.timezone,
    recur: `RRULE:${e.rrule}`,
    details: e.description,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** RFC 5545 iCalendar document for the event. */
export function buildIcs(e: CalendarEvent, now = Date.now()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TSML-Ang//Meeting Finder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vtimezone(e.timezone, now),
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;TZID=${e.timezone}:${e.start}`,
    `DTEND;TZID=${e.timezone}:${e.end}`,
    `RRULE:${e.rrule}`,
    `SUMMARY:${escapeText(e.title)}`,
    e.location ? `LOCATION:${escapeText(e.location)}` : '',
    e.description ? `DESCRIPTION:${escapeText(e.description)}` : '',
    `URL:${e.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.map(fold).join('\r\n') + '\r\n';
}

export function icsFilename(m: Meeting): string {
  return `${m.slug}.ics`;
}

/* ---------- event text ---------- */

function eventLocation(m: Meeting): string {
  if (m.attendance === 'online') return m.conferenceUrl ?? 'Online';
  return [m.location, m.address].filter(Boolean).join(', ');
}

function eventDescription(m: Meeting, pageUrl: string): string {
  const parts: string[] = [];
  const types = m.types.filter((t) => !ATTENDANCE_CODES.has(t)).map(typeLabel);
  if (types.length) parts.push(types.join(', '));
  if (m.notes) parts.push(m.notes);
  if (m.attendance === 'online' || m.attendance === 'hybrid') {
    if (m.conferenceUrl) parts.push(`Join online: ${m.conferenceUrl}`);
    if (m.conferenceUrlNotes) parts.push(m.conferenceUrlNotes);
    if (m.conferencePhone) parts.push(`Join by phone: ${m.conferencePhone}`);
  }
  if (m.locationNotes) parts.push(m.locationNotes);
  parts.push(`Meeting details: ${pageUrl}`);
  return parts.join('\n\n');
}

/* ---------- time zone helpers ---------- */

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string, kind: 'date' | 'offset'): Intl.DateTimeFormat {
  const key = `${kind}:${tz}`;
  let f = formatters.get(key);
  if (!f) {
    f =
      kind === 'date'
        ? new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short',
          })
        : new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    formatters.set(key, f);
  }
  return f;
}

function datePartsInZone(ms: number, tz: string) {
  const p: Record<string, string> = {};
  for (const part of formatter(tz, 'date').formatToParts(new Date(ms))) p[part.type] = part.value;
  return { year: +p['year'], month: +p['month'], day: +p['day'], weekday: WEEKDAYS_SHORT.indexOf(p['weekday']) };
}

/** UTC offset in minutes for an instant in a zone (e.g. -420 for PDT). */
function offsetMinutes(ms: number, tz: string): number {
  const name = formatter(tz, 'offset')
    .formatToParts(new Date(ms))
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = name?.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
  if (!match) return 0; // "GMT" = UTC
  return (match[1] === '-' ? -1 : 1) * (+match[2] * 60 + +(match[3] ?? 0));
}

/**
 * Builds a VTIMEZONE from the zone's actual transitions, found via Intl.
 * Uses last year's transitions as the observance start so every future
 * event date is covered by a preceding onset.
 */
function vtimezone(tz: string, now: number): string[] {
  const year = new Date(now).getUTCFullYear() - 1;
  const yearStart = Date.UTC(year, 0, 1);
  const transitions: { at: number; from: number; to: number }[] = [];

  let prevMs = yearStart;
  let prev = offsetMinutes(prevMs, tz);
  for (let d = 1; d <= 366; d++) {
    const ms = yearStart + d * DAY;
    const off = offsetMinutes(ms, tz);
    if (off !== prev) {
      // Binary search to the minute the offset flips.
      let lo = prevMs;
      let hi = ms;
      while (hi - lo > MINUTE) {
        const mid = lo + Math.floor((hi - lo) / 2 / MINUTE) * MINUTE;
        if (offsetMinutes(mid, tz) === prev) lo = mid;
        else hi = mid;
      }
      transitions.push({ at: hi, from: prev, to: off });
      prev = off;
    }
    prevMs = ms;
  }

  const out = ['BEGIN:VTIMEZONE', `TZID:${tz}`];
  if (!transitions.length) {
    const off = formatOffset(prev);
    out.push('BEGIN:STANDARD', 'DTSTART:19700101T000000', `TZOFFSETFROM:${off}`, `TZOFFSETTO:${off}`, 'END:STANDARD');
  } else {
    const maxOffset = Math.max(...transitions.map((t) => t.to));
    for (const t of transitions) {
      // Onset is expressed in the wall-clock time *before* the change.
      const local = new Date(t.at + t.from * MINUTE);
      const kind = transitions.length > 1 && t.to === maxOffset ? 'DAYLIGHT' : 'STANDARD';
      out.push(
        `BEGIN:${kind}`,
        `DTSTART:${wallClock(local.getTime())}`,
        `TZOFFSETFROM:${formatOffset(t.from)}`,
        `TZOFFSETTO:${formatOffset(t.to)}`,
        `RRULE:FREQ=YEARLY;BYMONTH=${local.getUTCMonth() + 1};BYDAY=${nthWeekday(local)}`,
        `END:${kind}`
      );
    }
  }
  out.push('END:VTIMEZONE');
  return out;
}

/** "2SU" for the second Sunday, "-1SU" for the last Sunday of the month. */
function nthWeekday(d: Date): string {
  const day = d.getUTCDate();
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const n = day + 7 > daysInMonth ? -1 : Math.ceil(day / 7);
  return `${n}${RRULE_DAYS[d.getUTCDay()]}`;
}

/* ---------- formatting ---------- */

const pad = (n: number) => String(n).padStart(2, '0');

/** Treats ms as a wall-clock value and formats YYYYMMDDTHHMMSS (no zone). */
function wallClock(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`
  );
}

function utcStamp(ms: number): string {
  return wallClock(ms) + 'Z';
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}

function parseMinutes(time: string | null): number | null {
  const m = time?.match(/^(\d{1,2}):(\d{2})/);
  return m ? +m[1] * 60 + +m[2] : null;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545 §3.1: fold lines longer than 75 octets, never splitting a UTF-8 character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const chunks: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    const limit = chunks.length ? 74 : 75; // continuation lines start with a space
    if (bytes + size > limit) {
      chunks.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  chunks.push(current);
  return chunks.join('\r\n ');
}

function safeHost(url: string): string {
  try {
    return new URL(url).host || 'tsml-ang';
  } catch {
    return 'tsml-ang';
  }
}
