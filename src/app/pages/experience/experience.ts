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
import { Subscription, map, of, switchMap } from 'rxjs';
import { ChoiceOption, ChoiceSelector } from '../../components/choice-selector/choice-selector';
import { PageHero } from '../../components/page-hero/page-hero';
import { StatusNotice } from '../../components/status-notice/status-notice';
import { SuggestionCard } from '../../components/suggestion-card/suggestion-card';
import { EXPERIENCE_GROUPS, EXPERIENCE_TYPES } from '../../data/categories';
import { PHRASES_FOR_TWO } from '../../data/phrases';
import { PanelDirective } from '../../directives/panel.directive';
import { Text } from '../../models/language';
import { City, NearbyPlace } from '../../models/place';
import { RequestStatus } from '../../models/program';
import { Suggestion } from '../../models/suggestion';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { GeoService } from '../../services/geo.service';
import { LanguageService } from '../../services/language.service';
import { PlacesService } from '../../services/places.service';
import { WikipediaService } from '../../services/wikipedia.service';
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
  selector: 'app-experience',
  styleUrl: './experience.css',
  templateUrl: './experience.html',
})
export class Experience implements OnDestroy {
  private readonly geo = inject(GeoService);
  private readonly places = inject(PlacesService);
  private readonly wikipedia = inject(WikipediaService);
  private readonly injector = inject(Injector);
  readonly language = inject(LanguageService);

  @ViewChild('result') result?: ElementRef<HTMLElement>;

  readonly heroImage =
    'https://images.pexels.com/photos/2253869/pexels-photo-2253869.jpeg?auto=compress&cs=tinysrgb&w=1920';
  readonly heroFocus = '50% 62%';
  readonly distances = [1, 2, 3, 5, 8];

  readonly types: ChoiceOption[] = EXPERIENCE_TYPES.map((type) => ({
    value: type.value,
    name: type.name,
    icon: type.icon,
    group: EXPERIENCE_GROUPS.find((group) => group.value === type.group)?.name,
  }));

  readonly form = new FormGroup({
    city: new FormControl('Braga', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    radius: new FormControl(3, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(8)],
    }),
    types: choiceGroup(EXPERIENCE_TYPES.map((type) => type.value)),
  });

  readonly status = signal<RequestStatus>('idle');
  readonly searchedCity = signal('');
  readonly message = signal<{ title: Text; text: Text }>({ title: '', text: '' });
  readonly suggestion = signal<Suggestion | null>(null);

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
    const types = selectedValues(this.form.controls.types);

    this.searchedCity.set(city);
    this.status.set('loading');
    this.showResult();
    this.request?.unsubscribe();

    this.request = this.geo
      .findCity(city)
      .pipe(
        switchMap((found) => {
          if (!found) throw new Error('city-not-found');
          return this.places
            .findExperiences(found, radius, types)
            .pipe(map((experiences) => ({ found, experiences })));
        }),
        switchMap(({ found, experiences }) => {
          if (experiences.length === 0) return of(null);
          const withPhoto = experiences.filter((place) => place.tags['wikipedia']);
          const chosen = pickRandom(
            withPhoto.length && Math.random() < 0.6 ? withPhoto : experiences,
          );
          return this.wikipedia
            .image(chosen.tags['wikipedia'])
            .pipe(map((image) => ({ found, chosen, image })));
        }),
      )
      .subscribe({
        next: (result) => {
          if (!result) {
            this.status.set('empty');
            return;
          }
          this.suggestion.set(this.toSuggestion(result.chosen, result.found, result.image));
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
      en: `Looking for experiences in ${city}…`,
      pt: `A procurar experiências em ${city}…`,
    };
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  private showResult(): void {
    afterNextRender(() => this.result?.nativeElement.scrollIntoView({ behavior: 'smooth' }), {
      injector: this.injector,
    });
  }

  private toSuggestion(place: NearbyPlace, city: City, image: string | null): Suggestion {
    return {
      type: 'experience',
      name: place.name,
      address: place.street,
      place: place.street ? `${place.street}, ${city.name}` : city.name,
      category: place.category,
      icon: place.icon,
      image,
      lat: place.lat,
      lon: place.lon,
      mapUrl: googleMapsLink(place.name, city.name),
      phrase: pickRandom(PHRASES_FOR_TWO),
      distanceKm: place.distance,
    };
  }
}
