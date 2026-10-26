import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { EMPTY, Observable, Subscription, catchError, map, merge, of, switchMap } from 'rxjs';
import { City, KnownPlace } from '../../models/place';
import { RequestStatus } from '../../models/program';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { GeoService } from '../../services/geo.service';
import { LanguageService } from '../../services/language.service';
import { WikipediaService } from '../../services/wikipedia.service';
import { googleMapsLink } from '../../utils/geo';

interface Highlight extends KnownPlace {
  mapUrl: string;
}

const DEFAULT_CITY: City = { name: 'Braga', lat: 41.5503, lon: -8.42 };
const HOW_MANY = 12;
const MINIMUM = 4;

@Component({
  imports: [TranslatePipe],
  selector: 'app-nearby',
  styleUrl: './nearby.css',
  templateUrl: './nearby.html',
})
export class Nearby implements AfterViewInit, OnDestroy {
  private readonly geo = inject(GeoService);
  private readonly wikipedia = inject(WikipediaService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly language = inject(LanguageService);

  readonly status = signal<RequestStatus>('idle');
  readonly highlights = signal<Highlight[]>([]);
  readonly placeName = signal('');
  readonly usedLocation = signal(false);

  readonly repeatedQueue = computed(() => [...this.highlights(), ...this.highlights()]);
  readonly duration = computed(() => `${this.highlights().length * 5}s`);

  private observer?: IntersectionObserver;
  private request?: Subscription;
  private started = false;

  constructor() {
    effect(() => {
      this.language.lang();
      untracked(() => {
        if (!this.started) return;
        this.highlights.set([]);
        this.load(this.usedLocation());
      });
    });
  }

  ngAfterViewInit(): void {
    this.started = true;
    this.load(false);

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.observer?.disconnect();
          this.load(true);
        }
      },
      { rootMargin: '0px 0px 100% 0px' },
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.request?.unsubscribe();
  }

  load(withLocation: boolean): void {
    this.request?.unsubscribe();

    const hasPlaces = this.highlights().length > 0;
    if (!hasPlaces) this.status.set('loading');

    const inDefaultCity$ = hasPlaces
      ? EMPTY
      : this.searchIn([DEFAULT_CITY]).pipe(map((result) => ({ ...result, near: false })));

    const aroundYou$ = !withLocation
      ? EMPTY
      : this.geo.currentLocation().pipe(
          catchError(() => EMPTY),
          switchMap((position) =>
            this.geo.placeName(position.lat, position.lon).pipe(
              catchError(() => of(null)),
              switchMap((name) =>
                this.geo
                  .nearbyCentres(position.lat, position.lon)
                  .pipe(
                    map((centres) => [
                      { name: name ?? DEFAULT_CITY.name, ...position },
                      ...centres.slice(0, 3),
                    ]),
                  ),
              ),
            ),
          ),
          switchMap((cities) => this.searchIn(cities)),
          map((result) => ({ ...result, near: true })),
        );

    this.request = merge(inDefaultCity$, aroundYou$).subscribe({
      next: ({ city, places, near }) => {
        if (!near && this.usedLocation()) return;
        if (near && places.length === 0) return;

        this.usedLocation.set(near);
        this.placeName.set(city.name);
        this.highlights.set(
          places
            .slice(0, HOW_MANY)
            .map((place) => ({ ...place, mapUrl: googleMapsLink(place.name, city.name) })),
        );
        this.status.set(places.length ? 'success' : 'empty');
      },
      error: () => {
        if (this.status() === 'loading') this.status.set('error');
      },
    });
  }

  shortDistance(km: number): string {
    return km.toLocaleString(this.language.locale(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  private searchIn(cities: City[]): Observable<{ city: City; places: KnownPlace[] }> {
    const [first, ...rest] = cities;
    return this.wikipedia
      .nearbyPlaces(first.lat, first.lon, this.language.lang())
      .pipe(
        switchMap((places) =>
          places.length >= MINIMUM || rest.length === 0
            ? of({ city: first, places })
            : this.searchIn(rest),
        ),
      );
  }
}
