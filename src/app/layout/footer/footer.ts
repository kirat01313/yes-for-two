import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-footer',
  styleUrl: './footer.css',
  templateUrl: './footer.html',
})
export class Footer {
  readonly year = new Date().getFullYear();

  readonly links = [
    { path: '/restaurant', label: 'nav.restaurant' },
    { path: '/experience', label: 'nav.experience' },
    { path: '/trip', label: 'nav.trip' },
    { path: '/memories', label: 'nav.memories' },
  ];
}
