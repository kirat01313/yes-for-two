import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

@Component({
  imports: [TranslatePipe],
  selector: 'app-settings',
  styleUrl: './settings.css',
  templateUrl: './settings.html',
})
export class Settings implements OnInit, OnDestroy {
  readonly language = inject(LanguageService);
  readonly location = signal<LocationPermission>('unknown');

  private permission?: PermissionStatus;

  async ngOnInit(): Promise<void> {
    try {
      this.permission = await navigator.permissions.query({ name: 'geolocation' });
      this.location.set(this.permission.state);
      this.permission.onchange = () => this.location.set(this.permission?.state ?? 'unknown');
    } catch {
      this.location.set('unknown');
    }
  }

  ngOnDestroy(): void {
    if (this.permission) {
      this.permission.onchange = null;
    }
  }
}