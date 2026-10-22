import { Injectable, computed, effect, signal } from '@angular/core';
import { Lang } from '../models/language';

const STORAGE_KEY = 'yes-for-two:lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly lang = signal<Lang>(this.initialLang());

  readonly locale = computed(() => (this.lang() === 'pt' ? 'pt-PT' : 'en-GB'));

  constructor() {
    effect(() => {
      document.documentElement.lang = this.locale();
      try {
        localStorage.setItem(STORAGE_KEY, this.lang());
      } catch {
        return;
      }
    });
  }

  set(lang: Lang): void {
    this.lang.set(lang);
  }

  toggle(): void {
    this.lang.update((current) => (current === 'en' ? 'pt' : 'en'));
  }

  private initialLang(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'pt') {
        return saved;
      }
    } catch {
      return 'en';
    }
    return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
  }
}