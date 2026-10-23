import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LanguageService } from './services/language.service';

@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private title = inject(Title);
  private language = inject(LanguageService);
  private key = signal('titles.home');

  constructor() {
    super();
    effect(() => this.title.setTitle(this.language.translate(this.key())));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.set(this.buildTitle(snapshot) ?? 'titles.home');
  }
}
