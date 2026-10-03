import { Pipe, PipeTransform } from '@angular/core';

/** "19:30" → "7:30 pm"; "12:00" → "Noon"; "00:00" → "Midnight" */
@Pipe({ name: 'meetingTime' })
export class MeetingTimePipe implements PipeTransform {
  transform(time: string | null | undefined): string {
    if (!time) return 'Appointment';
    const [h, m] = time.split(':').map(Number);
    if (h === 12 && m === 0) return 'Noon';
    if ((h === 0 || h === 24) && m === 0) return 'Midnight';
    const suffix = h < 12 || h === 24 ? 'am' : 'pm';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}
