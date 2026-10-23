import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { AccountMenu } from '../account-menu/account-menu';

interface MenuLink {
  path: string;
  label: string;
}

const ALL_LINKS: MenuLink[] = [
  { path: '/', label: 'nav.home' },
  { path: '/restaurant', label: 'nav.restaurant' },
  { path: '/experience', label: 'nav.experience' },
  { path: '/trip', label: 'nav.trip' },
  { path: '/memories', label: 'nav.memories' },
];

const IMAGE_PATHS = ['/'];

@Component({
  imports: [RouterLink, RouterLinkActive, TranslatePipe, AccountMenu],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
  host: {
    '[class.over-image]': 'hasImage()',
    '[class.transparent]': 'hasImage() && atTop()',
    '(window:scroll)': 'checkScroll()',
    '(window:resize)': 'checkScroll()',
  },
})
export class Header {
  private readonly router = inject(Router);
  readonly language = inject(LanguageService);
  readonly auth = inject(AuthService);

  readonly links = computed(() =>
    ALL_LINKS.filter((link) => link.path !== '/memories' || this.auth.signedIn()),
  );

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly hasImage = computed(() => IMAGE_PATHS.includes(this.url().split(/[?#]/)[0]));
  readonly atTop = signal(true);

  constructor() {
    afterNextRender(() => this.checkScroll());
  }

  checkScroll(): void {
    this.atTop.set(window.scrollY < window.innerHeight - 80);
  }
}
