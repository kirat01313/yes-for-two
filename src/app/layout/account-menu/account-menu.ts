import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-account-menu',
  styleUrl: './account-menu.css',
  templateUrl: './account-menu.html',
})
export class AccountMenu {
  readonly auth = inject(AuthService);
  private language = inject(LanguageService);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  @ViewChild('toggleButton') toggleButton?: ElementRef<HTMLButtonElement>;

  readonly open = signal(false);

  readonly displayName = computed(
    () => this.auth.name() || this.language.translate('account.yourAccount'),
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  toggle(): void {
    this.open.update((open) => !open);
  }

  signOut(): void {
    this.auth.signOut().subscribe(() => {
      this.open.set(false);
      this.router.navigateByUrl('/');
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.toggleButton?.nativeElement.focus();
  }
}
