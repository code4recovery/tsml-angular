import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { applyFilters, Filters, filtersFromParams, filtersToParams } from '../../models/filters';
import { ATTENDANCE_LABELS, DAYS, TIME_BUCKETS, typeLabel } from '../../models/meeting-types';
import { DayNamePipe } from '../../pipes/day-name-pipe';
import { MeetingTimePipe } from '../../pipes/meeting-time-pipe';
import { MeetingsStore } from '../../services/meetings-store';
import { FilterBar } from '../filter-bar/filter-bar';

@Component({
  selector: 'tsml-meeting-list',
  imports: [FilterBar, RouterLink, MeetingTimePipe, DayNamePipe],
  templateUrl: './meeting-list.html',
  styleUrl: './meeting-list.css',
})
export class MeetingList {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly data = inject(MeetingsStore);
  readonly attendanceLabels = ATTENDANCE_LABELS;

  /** The URL is the single source of truth for filters. */
  readonly filters = toSignal(this.route.queryParamMap.pipe(map(filtersFromParams)), {
    initialValue: filtersFromParams(this.route.snapshot.queryParamMap),
  });

  readonly results = computed(() => applyFilters(this.data.meetings(), this.filters()));

  /** Plain-language summary of what's shown, like tsml-ui's heading. */
  readonly heading = computed(() => {
    const f = this.filters();
    const parts: string[] = [];
    if (f.attendance) parts.push(ATTENDANCE_LABELS[f.attendance].toLowerCase());
    if (f.types.length) parts.push(f.types.map(typeLabel).join(', '));
    let text = parts.length ? `${parts.join(' ')} meetings` : 'Meetings';
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (f.time) text += ` in the ${TIME_BUCKETS.find((b) => b.id === f.time)!.label.toLowerCase()}`;
    if (f.day !== 'any') text += ` on ${DAYS[f.day]}`;
    if (f.region) text += ` in ${f.region}`;
    if (f.search) text += ` matching “${f.search}”`;
    return text;
  });

  constructor() {
    effect(() => this.data.lastListParams.set(filtersToParams(this.filters())));
  }

  update(patch: Partial<Filters>) {
    const next = { ...this.filters(), ...patch };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(next),
      replaceUrl: 'search' in patch,
    });
  }

  showAnyDay() {
    this.update({ day: 'any' });
  }
}
