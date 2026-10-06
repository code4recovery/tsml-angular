/**
 * App settings. Point `feedUrl` at any Meeting Guide–format JSON feed,
 * e.g. the one exposed by the 12 Step Meeting List WordPress plugin:
 *   https://example.org/wp-admin/admin-ajax.php?action=meetings
 * (the feed must allow CORS from wherever this app is hosted).
 */
export const SETTINGS = {
  title: 'Find a meeting',
  feedUrl: 'https://hacoaa.org/wp-admin/admin-ajax.php?action=meetings', //'http://localhost:5001/api/v1/meetings?hours=168', //'meetings.json',
  /** First day of the week in the day dropdown: 0 = Sunday, 1 = Monday */
  weekStart: 0,
  /** Day to show when no ?day= is in the URL: 'today' or 'any' */
  defaultDay: 'today' as 'today' | 'any',
  /**
   * IANA time zone for meetings that don't carry their own `timezone` field.
   * Used for calendar links so weekly events stay at the right local time across DST.
   */
  timezone: 'America/Los_Angeles',
};
