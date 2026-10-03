import { Pipe, PipeTransform } from '@angular/core';
import { DAYS } from '../models/meeting-types';

@Pipe({ name: 'dayName' })
export class DayNamePipe implements PipeTransform {
  transform(day: number | null | undefined): string {
    return day === null || day === undefined ? 'By appointment' : DAYS[day];
  }
}
