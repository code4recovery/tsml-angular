import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Params } from '@angular/router';
import { Meeting, RawMeeting } from '../models/meeting';
import { normalizeMeetings } from '../models/normalize';
import { ATTENDANCE_CODES, typeLabel } from '../models/meeting-types';
import { SETTINGS } from '../settings';

@Injectable({ providedIn: 'root' })
export class MeetingsStore {
  private http = inject(HttpClient);

  readonly meetings = signal<Meeting[]>([]);
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly errorMessage = signal<string | null>(null);

  /** Last list query params, so detail pages can link back to the same filtered view. */
  readonly lastListParams = signal<Params>({});

  /** Top-level regions present in the data. */
  readonly regions = computed(() =>
    [...new Set(this.meetings().map((m) => m.region?.split(' › ')[0]).filter((r): r is string => !!r))].sort(
      (a, b) => a.localeCompare(b)
    )
  );

  /** Content types present in the data, sorted by label (attendance codes excluded). */
  readonly availableTypes = computed(() =>
    [...new Set(this.meetings().flatMap((m) => m.types))]
      .filter((t) => !ATTENDANCE_CODES.has(t))
      .sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)))
  );

  constructor() {
    this.load();
  }

  load(url = SETTINGS.feedUrl): void {
    this.status.set('loading');
    this.http.get<RawMeeting[]>(url).subscribe({
      next: (raw) => {
        if (!Array.isArray(raw)) {
          this.fail('The meeting feed did not return a list of meetings.');
          return;
        }
        this.meetings.set(normalizeMeetings(raw));
        this.status.set('ready');
      },
      error: (err) => this.fail(`Couldn't load meetings from ${url} (${err.status || 'network error'}).`),
    });
  }

  /** All occurrences of a meeting (one per day). */
  bySlug(slug: string): Meeting[] {
    return this.meetings().filter((m) => m.slug === slug);
  }

  private fail(msg: string) {
    this.errorMessage.set(msg);
    this.status.set('error');
  }
}
