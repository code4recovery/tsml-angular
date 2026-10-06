import { Attendance, Meeting, RawMeeting } from './meeting';
import { typeLabel } from './meeting-types';
import { SETTINGS } from '../settings';

const clean = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

const toNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};

function validTimezone(tz: unknown): string {
  const s = clean(tz);
  if (s) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: s });
      return s;
    } catch {
      /* unknown zone: fall through to the default */
    }
  }
  return SETTINGS.timezone;
}

function parseTime(t: unknown): { time: string | null; minutes: number | null } {
  const s = clean(t);
  const m = s?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { time: null, minutes: null };
  const h = +m[1], min = +m[2];
  return { time: `${String(h).padStart(2, '0')}:${m[2]}`, minutes: h * 60 + min };
}

/** "10:22 pm" / "7:00 am" / "Noon" / "Midnight" → 24h time. */
function parseFormattedTime(t: unknown): { time: string | null; minutes: number | null } {
  const s = clean(t)?.toLowerCase();
  if (!s) return { time: null, minutes: null };
  if (s === 'noon') return parseTime('12:00');
  if (s === 'midnight') return parseTime('00:00');
  const m = s.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/);
  if (!m) return { time: null, minutes: null };
  let h = +m[1] % 12;
  if (m[3] === 'p') h += 12;
  return parseTime(`${h}:${m[2]}`);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Convert a UTC instant (e.g. timeUTC / nextEventUTC) to the meeting's local
 * weekday and wall-clock time. Using the instant itself keeps DST correct.
 */
function localFromUtc(iso: unknown, tz: string): { day: number; time: string; minutes: number } | null {
  const s = clean(iso);
  if (!s) return null;
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return null;
  let fmt = zoneFormatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    zoneFormatters.set(tz, fmt);
  }
  const p = Object.fromEntries(fmt.formatToParts(ms).map((x) => [x.type, x.value]));
  const day = WEEKDAYS.indexOf(p['weekday']);
  const h = +p['hour'] % 24;
  const min = +p['minute'];
  if (day < 0 || !Number.isFinite(h) || !Number.isFinite(min)) return null;
  return { day, time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, minutes: h * 60 + min };
}

/** Language codes → Meeting Guide type codes (English is the default, so it's not tagged). */
const LANGUAGE_TYPES: Record<string, string> = {
  es: 'S', fr: 'FR', he: 'HE', ja: 'JA', ko: 'KOR', pl: 'POL', pt: 'POR', pa: 'PUN', ru: 'RUS',
};

function collectTypes(r: RawMeeting): string[] {
  const base = Array.isArray(r.types) ? r.types : String(r.types ?? '').split(',');
  const langs = (r.languages ?? []).map((l) => LANGUAGE_TYPES[String(l).toLowerCase()]);
  const all = [...base, clean(r.type), ...(r.formats ?? []), ...(r.features ?? []), ...(r.communities ?? []), ...langs]
    .map((t) => String(t ?? '').trim())
    .filter(Boolean);
  return [...new Set(all)];
}

const ATTENDANCE_VALUES: Attendance[] = ['in_person', 'online', 'hybrid', 'inactive'];

function parseDays(day: RawMeeting['day']): Array<number | null> {
  const list = Array.isArray(day) ? day : [day];
  const days = list
    .map((d) => (d === null || d === undefined || d === '' ? null : Number(d)))
    .filter((d): d is number | null => d === null || (Number.isInteger(d) && d >= 0 && d <= 6));
  return days.length ? [...new Set(days)] : [null];
}

function buildAddress(r: RawMeeting): string | null {
  if (clean(r.formatted_address)) return clean(r.formatted_address);
  const parts = [r.address, r.city, [r.state, r.postal_code].filter(Boolean).join(' ')]
    .map(clean)
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** Mirrors tsml-ui's attendance rules. */
function attendanceOf(types: string[], online: boolean, address: string | null): Attendance {
  const closed = types.includes('TC');
  const inPerson = !!address && !closed;
  if (inPerson && online) return 'hybrid';
  if (online) return 'online';
  if (inPerson) return 'in_person';
  return 'inactive';
}

export function normalizeMeetings(raw: RawMeeting[]): Meeting[] {
  const out: Meeting[] = [];

  for (const r of raw ?? []) {
    if (!r || !clean(r.slug) || !clean(r.name)) continue;

    const types = collectTypes(r);
    const timezone = validTimezone(r.timezone);

    // Prefer an explicit local `time`; otherwise derive it from the UTC instant
    // (tsml-ui cached feeds), then fall back to the human-readable time_formatted.
    let { time, minutes } = parseTime(r.time);
    const fromUtc = localFromUtc(r.timeUTC ?? r.nextEventUTC, timezone);
    if (time === null && fromUtc) ({ time, minutes } = fromUtc);
    if (time === null) ({ time, minutes } = parseFormattedTime(r.time_formatted));

    const hasDay = r.day !== null && r.day !== undefined && r.day !== '' && !(Array.isArray(r.day) && !r.day.length);
    const days = hasDay ? parseDays(r.day) : fromUtc ? [fromUtc.day] : [null];

    const address = buildAddress(r);
    const region = clean(r.sub_region)
      ? `${clean(r.region)} › ${clean(r.sub_region)}`
      : clean(r.regions?.join(' › ')) ?? clean(r.region);
    const conferenceUrl = clean(r.conference_url);
    const conferencePhone = clean(r.conference_phone);
    const declared = clean(r.attendance_option) as Attendance | null;
    const attendance =
      declared && ATTENDANCE_VALUES.includes(declared)
        ? declared
        : attendanceOf(types, !!(conferenceUrl || conferencePhone), address);

    const base = {
      slug: clean(r.slug)!,
      name: clean(r.name)!,
      time,
      endTime: parseTime(r.end_time).time,
      minutes,
      types,
      notes: clean(r.notes),
      location: clean(r.location),
      locationNotes: clean(r.location_notes),
      address,
      region,
      group: clean(r.group),
      groupNotes: clean(r.group_notes),
      conferenceUrl,
      conferenceUrlNotes: clean(r.conference_url_notes),
      conferencePhone,
      conferencePhoneNotes: clean(r.conference_phone_notes),
      latitude: toNumber(r.latitude),
      longitude: toNumber(r.longitude),
      updated: clean(r.updated),
      timezone,
      attendance,
      haystack: [r.name, r.location, address, region, r.group, r.notes, r.location_notes, ...types.map(typeLabel)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };

    for (const day of days) {
      out.push({ ...base, day, key: `${base.slug}-${day ?? 'appt'}` });
    }
  }
  return out;
}
