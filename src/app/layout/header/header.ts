import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

interface MenuLink {
  path: string;
  label: string;
}

@Component({
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  readonly language = inject(LanguageService);

  readonly links: MenuLink[] = [
    { path: '/', label: 'nav.home' },
    { path: '/restaurant', label: 'nav.restaurant' },
    { path: '/experience', label: 'nav.experience' },
    { path: '/trip', label: 'nav.trip' },
    { path: '/memories', label: 'nav.memories' },
  ];
}