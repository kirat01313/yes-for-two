import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, map, switchMap } from 'rxjs';
import { StatusNotice } from '../../components/status-notice/status-notice';
import { SuggestionCard } from '../../components/suggestion-card/suggestion-card';
import { CUISINES } from '../../data/categories';
import { DINNER_PHRASES, PHRASES_FOR_TWO } from '../../data/phrases';
import { Text } from '../../models/language';
import { City, NearbyPlace } from '../../models/place';
import { RequestStatus } from '../../models/program';
import { Suggestion } from '../../models/suggestion';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { GeoService } from '../../services/geo.service';
import { LanguageService } from '../../services/language.service';
import { PlacesService } from '../../services/places.service';
import { googleMapsLink, pickRandom } from '../../utils/geo';

@Component({
  imports: [ReactiveFormsModule, DecimalPipe, TranslatePipe, StatusNotice, SuggestionCard],
  selector: 'app-restaurant',
  styleUrl: './restaurant.css',
  templateUrl: './restaurant.html',
})
export class Restaurant implements OnDestroy {
  private readonly geo = inject(GeoService);
  private readonly places = inject(PlacesService);
  readonly language = inject(LanguageService);

  readonly distances = [0.5, 1, 2, 3, 5];

  readonly form = new FormGroup({
    city: new FormControl('Braga', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    radius: new FormControl(2, { nonNullable: true, validators: [Validators.required] }),
  });

  readonly status = signal<RequestStatus>('idle');
  readonly searchedCity = signal('');
  readonly message = signal<{ title: Text; text: Text }>({ title: '', text: '' });
  readonly suggestion = signal<Suggestion | null>(null);

  private request?: Subscription;

  draw(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { city, radius } = this.form.getRawValue();
    const cuisines = CUISINES.map((cuisine) => cuisine.value);

    this.searchedCity.set(city);
    this.status.set('loading');
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
                  text: 'restaurantPage.notFoundText',
                }
              : { title: 'restaurantPage.errorTitle', text: 'restaurantPage.errorText' },
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

  ngOnDestroy(): void {
    this.request?.unsubscribe();
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
