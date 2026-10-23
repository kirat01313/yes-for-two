import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({ name: 'distance', pure: false })
export class DistancePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(km: number | undefined): string {
    if (km === undefined) return '';

    const distance =
      km.toLocaleString(this.language.locale(), {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + ' km';
    const walkingMinutes = Math.max(1, Math.round(km * 12.5));

    if (walkingMinutes > 45) return distance;
    return `${distance} · ${walkingMinutes} ${this.language.translate('places.walk')}`;
  }
}
