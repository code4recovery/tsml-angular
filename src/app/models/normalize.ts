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

    const types = (Array.isArray(r.types) ? r.types : String(r.types ?? '').split(','))
      .map((t) => String(t).trim())
      .filter(Boolean);
    const { time, minutes } = parseTime(r.time);
    const address = buildAddress(r);
    const region = clean(r.sub_region)
      ? `${clean(r.region)} › ${clean(r.sub_region)}`
      : clean(r.regions?.join(' › ')) ?? clean(r.region);
    const conferenceUrl = clean(r.conference_url);
    const conferencePhone = clean(r.conference_phone);
    const attendance = attendanceOf(types, !!(conferenceUrl || conferencePhone), address);

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
      timezone: validTimezone(r.timezone),
      attendance,
      haystack: [r.name, r.location, address, region, r.group, r.notes, r.location_notes, ...types.map(typeLabel)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };

    for (const day of parseDays(r.day)) {
      out.push({ ...base, day, key: `${base.slug}-${day ?? 'appt'}` });
    }
  }
  return out;
}
