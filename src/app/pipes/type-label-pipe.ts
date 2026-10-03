import { Pipe, PipeTransform } from '@angular/core';
import { typeLabel } from '../models/meeting-types';

@Pipe({ name: 'typeLabel' })
export class TypeLabelPipe implements PipeTransform {
  transform(code: string): string {
    return typeLabel(code);
  }
}
