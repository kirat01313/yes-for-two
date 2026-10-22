import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

@Component({
  imports: [RouterLink, RouterLinkActive, TranslatePipe, AccountMenu],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  readonly language = inject(LanguageService);
  readonly auth = inject(AuthService);

  readonly links = computed(() =>
    ALL_LINKS.filter((link) => link.path !== '/memories' || this.auth.signedIn()),
  );
}
