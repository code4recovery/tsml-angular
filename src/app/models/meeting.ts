/** A meeting as it appears in a Meeting Guide–format JSON feed. */
export interface RawMeeting {
  name: string;
  slug: string;
  day?: number | string | Array<number | string> | null;
  time?: string | null;
  end_time?: string | null;
  types?: string[] | string | null;
  notes?: string | null;
  location?: string | null;
  location_notes?: string | null;
  formatted_address?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  region?: string | null;
  regions?: string[] | null;
  sub_region?: string | null;
  group?: string | null;
  group_notes?: string | null;
  conference_url?: string | null;
  conference_url_notes?: string | null;
  conference_phone?: string | null;
  conference_phone_notes?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  url?: string | null;
  updated?: string | null;
  /** IANA time zone, e.g. "America/New_York" (optional in the Meeting Guide spec) */
  timezone?: string | null;

  /* ---- Fields used by tsml-ui / 12 Step Meeting List "cached" feeds ----
   * These feeds often omit `day` and `time` and instead carry the next
   * occurrence as a UTC instant, plus a human-readable local time. */
  /** Next occurrence as an ISO UTC instant, e.g. "2026-10-06T05:22:00.000Z" */
  timeUTC?: string | null;
  nextEventUTC?: string | null;
  /** Local display time, e.g. "10:22 pm", "Noon" */
  time_formatted?: string | null;
  /** 'in_person' | 'online' | 'hybrid' | 'inactive' */
  attendance_option?: string | null;
  /** Type codes split into categories */
  formats?: string[] | null;
  features?: string[] | null;
  communities?: string[] | null;
  /** "O" (open) or "C" (closed) */
  type?: string | null;
  /** ISO language codes, e.g. ["en"], ["es"] */
  languages?: string[] | null;
}

export type Attendance = 'in_person' | 'online' | 'hybrid' | 'inactive';

/** Normalized meeting used throughout the app. */
export interface Meeting {
  /** Unique per occurrence (slug + day), since one feed entry can list several days. */
  key: string;
  slug: string;
  name: string;
  /** 0 = Sunday … 6 = Saturday; null = by appointment */
  day: number | null;
  /** "HH:MM" 24h, or null */
  time: string | null;
  endTime: string | null;
  /** Minutes after midnight, for sorting and time-of-day filtering */
  minutes: number | null;
  types: string[];
  notes: string | null;
  location: string | null;
  locationNotes: string | null;
  address: string | null;
  region: string | null;
  group: string | null;
  groupNotes: string | null;
  conferenceUrl: string | null;
  conferenceUrlNotes: string | null;
  conferencePhone: string | null;
  conferencePhoneNotes: string | null;
  latitude: number | null;
  longitude: number | null;
  updated: string | null;
  /** IANA time zone (falls back to SETTINGS.timezone) */
  timezone: string;
  attendance: Attendance;
  /** Lower-cased blob for search */
  haystack: string;
}
