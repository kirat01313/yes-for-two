import { DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, map, switchMap } from 'rxjs';
import { ChoiceSelector } from '../../components/choice-selector/choice-selector';
import { PageHero } from '../../components/page-hero/page-hero';
import { StatusNotice } from '../../components/status-notice/status-notice';
import { SuggestionCard } from '../../components/suggestion-card/suggestion-card';
import { CUISINES } from '../../data/categories';
import { DINNER_PHRASES, PHRASES_FOR_TWO } from '../../data/phrases';
import { PanelDirective } from '../../directives/panel.directive';
import { Text } from '../../models/language';
import { City, NearbyPlace } from '../../models/place';
import { RequestStatus } from '../../models/program';
import { Suggestion } from '../../models/suggestion';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { GeoService } from '../../services/geo.service';
import { LanguageService } from '../../services/language.service';
import { MemoriesService } from '../../services/memories.service';
import { PlacesService } from '../../services/places.service';
import { googleMapsLink, pickRandom } from '../../utils/geo';
import { choiceGroup, selectedValues } from '../../utils/validators';

@Component({
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    TranslatePipe,
    PageHero,
    ChoiceSelector,
    StatusNotice,
    SuggestionCard,
    PanelDirective,
  ],
  selector: 'app-restaurant',
  styleUrl: './restaurant.css',
  templateUrl: './restaurant.html',
})
export class Restaurant implements OnDestroy {
  private readonly geo = inject(GeoService);
  private readonly places = inject(PlacesService);
  private readonly injector = inject(Injector);
  private readonly memories = inject(MemoriesService);
  readonly language = inject(LanguageService);

  @ViewChild('result') result?: ElementRef<HTMLElement>;

  readonly heroImage =
    'https://images.pexels.com/photos/36129264/pexels-photo-36129264.jpeg?auto=compress&cs=tinysrgb&w=1920';
  readonly cuisines = CUISINES;
  readonly distances = [0.5, 1, 2, 3, 5];

  readonly form = new FormGroup({
    city: new FormControl('Braga', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    radius: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.5), Validators.max(5)],
    }),
    cuisines: choiceGroup(CUISINES.map((cuisine) => cuisine.value)),
  });

  readonly status = signal<RequestStatus>('idle');
  readonly searchedCity = signal('');
  readonly message = signal<{ title: Text; text: Text }>({ title: '', text: '' });
  readonly suggestion = signal<Suggestion | null>(null);
  readonly memoryId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal(false);

  private request?: Subscription;

  useLocation(): void {
    this.geo
      .currentLocation()
      .pipe(switchMap(({ lat, lon }) => this.geo.placeName(lat, lon)))
      .subscribe({
        next: (name) => {
          if (name) this.form.controls.city.setValue(name);
        },
        error: () => this.form.controls.city.markAsTouched(),
      });
  }

  draw(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { city, radius } = this.form.getRawValue();
    const cuisines = selectedValues(this.form.controls.cuisines);

    this.searchedCity.set(city);
    this.status.set('loading');
    this.memoryId.set(null);
    this.saveError.set(false);
    this.showResult();
    this.request?.unsubscribe();

    this.request = this.geo
      .findCity(city)
      .pipe(
        switchMap((found) => {
          if (!found) throw new Error('city-not-found');
          return this.places
            .findRestaurants(found, radius, cuisines)
            .pipe(map((restaurants) => ({ found, restaurants })));
        }),
      )
      .subscribe({
        next: ({ found, restaurants }) => {
          if (restaurants.length === 0) {
            this.status.set('empty');
            return;
          }
          this.suggestion.set(this.toSuggestion(pickRandom(restaurants), found));
          this.status.set('success');
        },
        error: (error: Error) => {
          this.message.set(
            error.message === 'city-not-found'
              ? {
                  title: { en: `We couldn't find “${city}”.`, pt: `Não encontrámos «${city}».` },
                  text: 'search.notFoundText',
                }
              : { title: 'search.errorTitle', text: 'search.errorText' },
          );
          this.status.set('error');
        },
      });
  }

  loadingTitle(): Text {
    const city = this.searchedCity();
    return {
      en: `Looking for restaurants in ${city}…`,
      pt: `A procurar restaurantes em ${city}…`,
    };
  }

  sayYes(suggestion: Suggestion): void {
    this.saving.set(true);
    this.saveError.set(false);
    this.memories.sayYes(suggestion).subscribe({
      next: (memory) => {
        this.saving.set(false);
        if (memory) this.memoryId.set(memory.id);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  private showResult(): void {
    afterNextRender(() => this.result?.nativeElement.scrollIntoView({ behavior: 'smooth' }), {
      injector: this.injector,
    });
  }

  private toSuggestion(restaurant: NearbyPlace, city: City): Suggestion {
    const cuisine =
      CUISINES.find((item) => item.matches(restaurant.tags)) ?? CUISINES[CUISINES.length - 1];
    return {
      type: 'restaurant',
      name: restaurant.name,
      address: restaurant.street,
      place: restaurant.street ? `${restaurant.street}, ${city.name}` : city.name,
      category: restaurant.category,
      icon: restaurant.icon,
      image: cuisine.image,
      lat: restaurant.lat,
      lon: restaurant.lon,
      mapUrl: googleMapsLink(restaurant.name, city.name),
      phrase: pickRandom([...PHRASES_FOR_TWO, ...DINNER_PHRASES]),
      distanceKm: restaurant.distance,
    };
  }
}
