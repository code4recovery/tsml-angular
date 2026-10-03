import { Component, ElementRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { Filters } from '../../models/filters';
import { ATTENDANCE_OPTIONS, AttendanceFilter, DAYS, TIME_BUCKETS, TimeBucket } from '../../models/meeting-types';
import { TypeLabelPipe } from '../../pipes/type-label-pipe';
import { SETTINGS } from '../../settings';

@Component({
  selector: 'tsml-filter-bar',
  imports: [TypeLabelPipe],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class FilterBar {
  private host = inject(ElementRef<HTMLElement>);

  readonly filters = input.required<Filters>();
  readonly regions = input<string[]>([]);
  readonly types = input<string[]>([]);
  readonly changed = output<Partial<Filters>>();

  readonly timeBuckets = TIME_BUCKETS;
  readonly attendanceOptions = ATTENDANCE_OPTIONS;
  readonly days = Array.from({ length: 7 }, (_, i) => {
    const d = (i + SETTINGS.weekStart) % 7;
    return { value: d, label: DAYS[d] };
  });

  readonly typeMenuOpen = signal(false);
  readonly searchText = signal('');
  private searchTimer?: ReturnType<typeof setTimeout>;

  readonly typeButtonLabel = computed(() => {
    const n = this.filters().types.length;
    return n === 0 ? 'Any type' : n === 1 ? '1 type' : `${n} types`;
  });

  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return !!(f.search || f.region || f.time || f.types.length || f.attendance || f.day === 'any');
  });

  constructor() {
    // Keep the search box in sync when the URL changes (back button, reset).
    effect(() => this.searchText.set(this.filters().search));
  }

  onSearch(value: string) {
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.changed.emit({ search: value }), 250);
  }

  onRegion(value: string) {
    this.changed.emit({ region: value || null });
  }

  onDay(value: string) {
    this.changed.emit({ day: value === 'any' ? 'any' : +value });
  }

  onTime(value: string) {
    this.changed.emit({ time: (value || null) as TimeBucket | null });
  }

  onAttendance(value: string) {
    this.changed.emit({ attendance: (value || null) as AttendanceFilter | null });
  }

  toggleType(code: string, checked: boolean) {
    const current = this.filters().types;
    this.changed.emit({ types: checked ? [...current, code] : current.filter((t) => t !== code) });
  }

  clearTypes() {
    this.changed.emit({ types: [] });
  }

  reset() {
    clearTimeout(this.searchTimer);
    this.typeMenuOpen.set(false);
    this.changed.emit({ search: '', region: null, day: new Date().getDay(), time: null, types: [], attendance: null });
  }

  onDocumentClick(e: MouseEvent) {
    const menu = this.host.nativeElement.querySelector('.types');
    if (this.typeMenuOpen() && menu && !menu.contains(e.target as Node)) this.typeMenuOpen.set(false);
  }

  onEscape() {
    this.typeMenuOpen.set(false);
  }
}
