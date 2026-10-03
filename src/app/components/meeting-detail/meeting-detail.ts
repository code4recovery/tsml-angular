import { Component, DOCUMENT, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { buildIcs, googleCalendarUrl, icsFilename, toCalendarEvent } from '../../models/calendar';
import { ATTENDANCE_CODES, ATTENDANCE_LABELS } from '../../models/meeting-types';
import { DayNamePipe } from '../../pipes/day-name-pipe';
import { MeetingTimePipe } from '../../pipes/meeting-time-pipe';
import { TypeLabelPipe } from '../../pipes/type-label-pipe';
import { MeetingsStore } from '../../services/meetings-store';

@Component({
  selector: 'tsml-meeting-detail',
  imports: [RouterLink, DayNamePipe, MeetingTimePipe, TypeLabelPipe],
  templateUrl: './meeting-detail.html',
  styleUrl: './meeting-detail.css',
})
export class MeetingDetail {
  readonly data = inject(MeetingsStore);
  private title = inject(Title);
  private document = inject(DOCUMENT);
  readonly attendanceLabels = ATTENDANCE_LABELS;

  /** Bound from the route (:slug) and query string (?day=) via withComponentInputBinding. */
  readonly slug = input.required<string>();
  readonly day = input<string | undefined>();

  readonly occurrences = computed(() => this.data.bySlug(this.slug()));

  readonly meeting = computed(() => {
    const all = this.occurrences();
    const d = this.day();
    return all.find((m) => String(m.day) === d) ?? all[0] ?? null;
  });

  readonly contentTypes = computed(() => (this.meeting()?.types ?? []).filter((t) => !ATTENDANCE_CODES.has(t)));

  readonly directionsUrl = computed(() => {
    const m = this.meeting();
    if (!m || m.attendance === 'online' || m.attendance === 'inactive') return null;
    const dest = m.latitude !== null && m.longitude !== null ? `${m.latitude},${m.longitude}` : m.address;
    return dest ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}` : null;
  });

  /** Other meetings at the same place, like tsml-ui's location panel. */
  readonly sameLocation = computed(() => {
    const m = this.meeting();
    if (!m?.address) return [];
    return this.data
      .meetings()
      .filter((o) => o.address === m.address && o.slug !== m.slug && o.attendance !== 'inactive')
      .sort((a, b) => (a.day ?? 9) - (b.day ?? 9) || (a.minutes ?? 0) - (b.minutes ?? 0));
  });

  /** Weekly recurring calendar event for this meeting, or null when it can't be scheduled. */
  readonly calendarEvent = computed(() => {
    const m = this.meeting();
    if (!m) return null;
    const { origin } = this.document.location;
    const page = `${origin}/meetings/${encodeURIComponent(m.slug)}${m.day !== null ? `?day=${m.day}` : ''}`;
    return toCalendarEvent(m, page);
  });

  readonly googleCalendarLink = computed(() => {
    const e = this.calendarEvent();
    return e ? googleCalendarUrl(e) : null;
  });

  downloadIcs() {
    const m = this.meeting();
    const e = this.calendarEvent();
    if (!m || !e) return;
    const blob = new Blob([buildIcs(e)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    a.href = url;
    a.download = icsFilename(m);
    this.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  constructor() {
    effect(() => {
      const m = this.meeting();
      if (m) this.title.setTitle(m.name);
    });
  }

  telHref(phone: string) {
    return 'tel:' + phone.replace(/[^\d+,#*]/g, '');
  }
}
