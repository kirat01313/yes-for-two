import { Pipe, PipeTransform, inject } from '@angular/core';
import { en } from '../i18n/en';
import { pt } from '../i18n/pt';
import { Text } from '../models/language';
import { LanguageService } from '../services/language.service';

const DICTIONARIES = { en, pt };

@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private language = inject(LanguageService);

  transform(value: Text): string {
    const lang = this.language.lang();

    if (typeof value !== 'string') {
      return value[lang];
    }

    let current: unknown = DICTIONARIES[lang];
    for (const key of value.split('.')) {
      current = (current as Record<string, unknown> | undefined)?.[key];
    }

    return typeof current === 'string' ? current : value;
  }
}