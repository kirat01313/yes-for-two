import { Pipe, PipeTransform, inject } from '@angular/core';
import { Text } from '../models/language';
import { LanguageService } from '../services/language.service';

@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private language = inject(LanguageService);

  transform(value: Text): string {
    return this.language.translate(value);
  }
}
