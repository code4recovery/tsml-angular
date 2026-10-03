import { ParamMap, Params } from '@angular/router';
import { Meeting } from './meeting';
import { AttendanceFilter, TIME_BUCKETS, TimeBucket } from './meeting-types';
import { SETTINGS } from '../settings';

export interface Filters {
  search: string;
  region: string | null;
  day: number | 'any';
  time: TimeBucket | null;
  types: string[];
  attendance: AttendanceFilter | null;
}

const today = () => new Date().getDay();

/** Read filters from the URL, same query-string style as tsml-ui (?day=1&type=O,D&search=…). */
export function filtersFromParams(p: ParamMap): Filters {
  const dayParam = p.get('day');
  let day: Filters['day'];
  if (dayParam === 'any') day = 'any';
  else if (dayParam !== null && /^[0-6]$/.test(dayParam)) day = +dayParam;
  else day = SETTINGS.defaultDay === 'any' ? 'any' : today();

  const time = p.get('time') as TimeBucket | null;
  const attendance = p.get('attendance') as AttendanceFilter | null;

  return {
    search: p.get('search') ?? '',
    region: p.get('region'),
    day,
    time: TIME_BUCKETS.some((b) => b.id === time) ? time : null,
    types: (p.get('type') ?? '').split(',').filter(Boolean),
    attendance: ['in_person', 'online', 'inactive'].includes(attendance ?? '') ? attendance : null,
  };
}

/** Write filters back to the URL. null removes a param. */
export function filtersToParams(f: Filters): Params {
  return {
    search: f.search.trim() || null,
    region: f.region || null,
    day: String(f.day),
    time: f.time || null,
    type: f.types.length ? f.types.join(',') : null,
    attendance: f.attendance || null,
  };
}

function inBucket(m: Meeting, bucket: TimeBucket): boolean {
  if (bucket === 'appointment') return m.day === null || m.minutes === null;
  if (m.minutes === null) return false;
  const b = TIME_BUCKETS.find((x) => x.id === bucket)!;
  return b.from! <= b.to! ? m.minutes >= b.from! && m.minutes <= b.to! : m.minutes >= b.from! || m.minutes <= b.to!;
}

export function applyFilters(meetings: Meeting[], f: Filters): Meeting[] {
  const words = f.search.toLowerCase().split(/\s+/).filter(Boolean);
  const start = today();

  return meetings
    .filter((m) => {
      if (f.attendance === 'inactive') {
        if (m.attendance !== 'inactive') return false;
      } else {
        if (m.attendance === 'inactive') return false;
        if (f.attendance === 'in_person' && m.attendance === 'online') return false;
        if (f.attendance === 'online' && m.attendance === 'in_person') return false;
      }
      if (f.day !== 'any' && m.day !== f.day) return false;
      if (f.region && !(m.region === f.region || m.region?.startsWith(f.region + ' › '))) return false;
      if (f.time && !inBucket(m, f.time)) return false;
      if (f.types.length && !f.types.every((t) => m.types.includes(t))) return false;
      if (words.length && !words.every((w) => m.haystack.includes(w))) return false;
      return true;
    })
    .sort((a, b) => {
      // Days start from today, like tsml-ui; appointment meetings go last.
      const da = a.day === null ? 99 : (a.day - start + 7) % 7;
      const db = b.day === null ? 99 : (b.day - start + 7) % 7;
      return da - db || (a.minutes ?? 9999) - (b.minutes ?? 9999) || a.name.localeCompare(b.name);
    });
}
