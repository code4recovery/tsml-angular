/**
 * Meeting type codes from the Meeting Guide spec
 * (https://github.com/code4recovery/spec), same codes tsml-ui understands.
 */
export const MEETING_TYPES: Record<string, string> = {
  '11': '11th Step Meditation',
  '12x12': '12 Steps & 12 Traditions',
  A: 'Secular',
  ABSI: 'As Bill Sees It',
  AL: 'Concurrent with Alateen',
  'AL-AN': 'Concurrent with Al-Anon',
  ASL: 'American Sign Language',
  B: 'Big Book',
  BA: 'Babysitting Available',
  BE: 'Newcomer',
  BI: 'Bisexual',
  BRK: 'Breakfast',
  C: 'Closed',
  CAN: 'Candlelight',
  CF: 'Child-Friendly',
  D: 'Discussion',
  DB: 'Digital Basket',
  DD: 'Dual Diagnosis',
  DR: 'Daily Reflections',
  EN: 'English',
  FF: 'Fragrance Free',
  FR: 'French',
  G: 'Gay',
  GR: 'Grapevine',
  H: 'Birthday',
  HE: 'Hebrew',
  HY: 'Hybrid',
  JA: 'Japanese',
  KOR: 'Korean',
  L: 'Lesbian',
  LGBTQ: 'LGBTQ',
  LIT: 'Literature',
  LS: 'Living Sober',
  M: 'Men',
  MED: 'Meditation',
  N: 'Native American',
  NDG: 'Indigenous',
  O: 'Open',
  ONL: 'Online',
  OUT: 'Outdoor',
  P: 'Professionals',
  POC: 'People of Color',
  POL: 'Polish',
  POR: 'Portuguese',
  PUN: 'Punjabi',
  RUS: 'Russian',
  S: 'Spanish',
  SEN: 'Seniors',
  SM: 'Smoking Permitted',
  SP: 'Speaker',
  ST: 'Step Study',
  T: 'Transgender',
  TC: 'Location Temporarily Closed',
  TR: 'Tradition Study',
  W: 'Women',
  X: 'Wheelchair Access',
  XB: 'Wheelchair-Accessible Bathroom',
  XT: 'Cross Talk Permitted',
  Y: 'Young People',
};

/** Codes that describe attendance rather than meeting content; kept out of the type filter. */
export const ATTENDANCE_CODES = new Set(['ONL', 'TC', 'HY']);

export function typeLabel(code: string): string {
  return MEETING_TYPES[code] ?? code;
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export type TimeBucket = 'morning' | 'midday' | 'evening' | 'night' | 'appointment';

/** Same windows tsml-ui uses (they overlap on purpose). Minutes after midnight. */
export const TIME_BUCKETS: { id: TimeBucket; label: string; from?: number; to?: number }[] = [
  { id: 'morning', label: 'Morning', from: 4 * 60, to: 11 * 60 + 59 },
  { id: 'midday', label: 'Midday', from: 11 * 60, to: 16 * 60 + 59 },
  { id: 'evening', label: 'Evening', from: 16 * 60, to: 20 * 60 + 59 },
  { id: 'night', label: 'Night', from: 21 * 60, to: 4 * 60 + 59 },
  { id: 'appointment', label: 'By appointment' },
];

export const ATTENDANCE_OPTIONS = [
  { id: 'in_person', label: 'In person' },
  { id: 'online', label: 'Online' },
  { id: 'inactive', label: 'Temporarily closed' },
] as const;

export type AttendanceFilter = (typeof ATTENDANCE_OPTIONS)[number]['id'];

export const ATTENDANCE_LABELS: Record<string, string> = {
  in_person: 'In person',
  online: 'Online',
  hybrid: 'Hybrid',
  inactive: 'Temporarily closed',
};
