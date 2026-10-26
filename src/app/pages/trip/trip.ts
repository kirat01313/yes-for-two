import { CurrencyPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Observable,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  switchMap,
} from 'rxjs';
import { ChoiceSelector } from '../../components/choice-selector/choice-selector';
import { PageHero } from '../../components/page-hero/page-hero';
import { StatusNotice } from '../../components/status-notice/status-notice';
import { SuggestionCard } from '../../components/suggestion-card/suggestion-card';
import { DESTINATION_TYPES, REGIONS } from '../../data/categories';
import { TRIP_PHRASES } from '../../data/phrases';
import { PanelDirective } from '../../directives/panel.directive';
import { Destination, DestinationType, Region } from '../../models/destination';
import { Airport, FlightTrip } from '../../models/flight';
import { Text, Translated } from '../../models/language';
import { RequestStatus } from '../../models/program';
import { Phrase, Suggestion } from '../../models/suggestion';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DestinationsService, TripData } from '../../services/destinations.service';
import { FlightsService } from '../../services/flights.service';
import { GeoService } from '../../services/geo.service';
import { LanguageService } from '../../services/language.service';
import { WeatherService } from '../../services/weather.service';
import { WikipediaService } from '../../services/wikipedia.service';
import { pickRandom } from '../../utils/geo';
import { choiceGroup, selectedValues } from '../../utils/validators';

const DAY = 24 * 60 * 60 * 1000;
const AFFILIATE_MARKER = '793721';
const DEFAULT_NIGHT_PRICE = 100;

interface Candidate {
  trip: FlightTrip;
  destination: Destination;
  nights: number;
  total: number;
}

@Component({
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    TranslatePipe,
    PageHero,
    ChoiceSelector,
    StatusNotice,
    SuggestionCard,
    PanelDirective,
  ],
  selector: 'app-trip',
  styleUrl: './trip.css',
  templateUrl: './trip.html',
})
export class Trip implements OnInit, OnDestroy {
  private readonly flights = inject(FlightsService);
  private readonly destinations = inject(DestinationsService);
  private readonly weather = inject(WeatherService);
  private readonly wikipedia = inject(WikipediaService);
  private readonly geo = inject(GeoService);
  private readonly injector = inject(Injector);
  readonly language = inject(LanguageService);

  @ViewChild('result') result?: ElementRef<HTMLElement>;

  readonly heroImage =
    'https://images.pexels.com/photos/19808376/pexels-photo-19808376.jpeg?auto=compress&cs=tinysrgb&w=1920';
  readonly budgets = [150, 250, 400, 600, 1000, 1500, 2500];
  readonly nightRanges = [
    { value: '2-3', min: 2, max: 3 },
    { value: '4-5', min: 4, max: 5 },
    { value: '6-9', min: 6, max: 9 },
  ];
  readonly types = DESTINATION_TYPES;
  readonly regions = REGIONS;

  readonly form = new FormGroup({
    origin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    budget: new FormControl(400, { nonNullable: true, validators: [Validators.required] }),
    nights: new FormControl('2-3', { nonNullable: true, validators: [Validators.required] }),
    types: choiceGroup(DESTINATION_TYPES.map((type) => type.value)),
    regions: choiceGroup(REGIONS.map((region) => region.value)),
  });

  readonly originOptions = signal<Airport[]>([]);
  readonly status = signal<RequestStatus>('idle');
  readonly message = signal<{ title: Text; text: Text }>({ title: '', text: '' });
  readonly suggestion = signal<Suggestion | null>(null);

  private origin: Airport | null = null;
  private request?: Subscription;
  private originSearch?: Subscription;

  ngOnInit(): void {
    this.flights.airportFromIp().subscribe((airport) => {
      if (airport && this.form.controls.origin.pristine) this.chooseOrigin(airport);
    });

    this.originSearch = this.form.controls.origin.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => (term.trim().length >= 2 ? this.flights.searchCities(term) : of([]))),
      )
      .subscribe((options) => {
        this.originOptions.set(options);
        this.origin = this.matchOrigin(this.form.controls.origin.value);
      });
  }

  useNearestAirport(): void {
    this.geo
      .currentLocation()
      .pipe(
        switchMap(({ lat, lon }) => this.geo.placeName(lat, lon)),
        switchMap((name) => (name ? this.flights.searchCities(name) : of([]))),
      )
      .subscribe((options) => {
        if (options[0]) {
          this.chooseOrigin(options[0]);
          this.form.controls.origin.markAsDirty();
        }
      });
  }

  draw(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { origin, budget, nights } = this.form.getRawValue();
    const range = this.nightRanges.find((item) => item.value === nights)!;
    const types = selectedValues(this.form.controls.types) as DestinationType[];
    const regions = selectedValues(this.form.controls.regions);

    this.status.set('loading');
    this.showResult();
    this.request?.unsubscribe();

    this.request = this.resolveOrigin(origin)
      .pipe(
        switchMap((airport) => {
          if (!airport) throw new Error('origin-not-found');
          return forkJoin({
            flights: this.flights.trips(airport.code),
            data: this.destinations.tripData(),
          });
        }),
        map(({ flights, data }) => {
          if (flights.trips.length === 0) throw new Error('no-flights');
          const from = flights.origin;
          const candidates = flights.trips
            .filter((trip) => trip.destination !== from.code)
            .map((trip) => this.toCandidate(trip, data))
            .filter((candidate) => candidate.nights >= range.min && candidate.nights <= range.max)
            .filter((candidate) => candidate.total <= budget)
            .filter((candidate) => regions.includes(candidate.destination.region))
            .filter((candidate) =>
              candidate.destination.types.some((type) => types.includes(type)),
            );
          return { from, candidates };
        }),
        switchMap(({ from, candidates }) => {
          if (candidates.length === 0) return of(null);
          const chosen = pickRandom(candidates);
          const { destination, trip } = chosen;
          const wikipediaTitle = destination.wikipedia_en || destination.name_en;
          return forkJoin({
            image: destination.image
              ? of(destination.image)
              : this.wikipedia.image(`en:${wikipediaTitle}`),
            forecast: this.weather.forecast(destination.lat, destination.lon, trip.departureAt),
          }).pipe(map(({ image, forecast }) => ({ from, chosen, image, forecast })));
        }),
      )
      .subscribe({
        next: (result) => {
          if (!result) {
            this.message.set({ title: 'tripPage.emptyTitle', text: 'tripPage.emptyText' });
            this.status.set('empty');
            return;
          }
          const { from, chosen, image, forecast } = result;
          this.suggestion.set(this.toSuggestion(chosen, from.name, types, image, forecast));
          this.status.set('success');
        },
        error: (error: Error) => {
          if (error.message === 'origin-not-found') {
            this.message.set({
              title: {
                en: `We couldn't find “${origin}”.`,
                pt: `Não encontrámos «${origin}».`,
              },
              text: 'search.notFoundText',
            });
            this.status.set('empty');
          } else if (error.message === 'no-flights') {
            this.message.set({
              title: {
                en: `We have no flights from ${origin} right now.`,
                pt: `Não temos voos a partir de ${origin} neste momento.`,
              },
              text: 'tripPage.noFlightsText',
            });
            this.status.set('empty');
          } else {
            this.status.set('error');
          }
        },
      });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.originSearch?.unsubscribe();
  }

  private chooseOrigin(airport: Airport): void {
    this.origin = airport;
    this.originOptions.set([airport]);
    this.form.controls.origin.setValue(airport.name, { emitEvent: false });
  }

  private matchOrigin(name: string): Airport | null {
    const wanted = name.trim().toLowerCase();
    return this.originOptions().find((option) => option.name.toLowerCase() === wanted) ?? null;
  }

  private resolveOrigin(name: string): Observable<Airport | null> {
    const matched = this.origin?.name.toLowerCase() === name.trim().toLowerCase();
    if (matched) return of(this.origin);
    return this.flights.searchCities(name).pipe(map((options) => options[0] ?? null));
  }

  private toCandidate(trip: FlightTrip, data: TripData): Candidate {
    const destination = data.destinations.get(trip.destination) ?? this.unknownDestination(trip);
    const night = data.nights.get(trip.countryCode) ?? DEFAULT_NIGHT_PRICE;
    const nights = Math.round(
      (Date.parse(trip.returnAt.slice(0, 10)) - Date.parse(trip.departureAt.slice(0, 10))) / DAY,
    );
    return { trip, destination, nights, total: Math.round(trip.price + (night / 2) * nights) };
  }

  private unknownDestination(trip: FlightTrip): Destination {
    const region: Region =
      trip.countryCode === 'PT'
        ? 'portugal'
        : this.isEurope(trip.countryCode)
          ? 'europe'
          : 'beyond';
    return {
      id: 0,
      name_en: trip.name.en,
      name_pt: trip.name.pt,
      country_en: trip.country.en,
      country_pt: trip.country.pt,
      wikipedia_en: '',
      wikipedia_pt: '',
      image: null,
      lat: trip.lat,
      lon: trip.lon,
      flight: 0,
      night: 0,
      phrase_en: '',
      phrase_pt: '',
      types: ['city'],
      region,
      iata: trip.destination,
      country_code: trip.countryCode,
    };
  }

  private isEurope(countryCode: string): boolean {
    return [
      'AD',
      'AL',
      'AT',
      'BA',
      'BE',
      'BG',
      'BY',
      'CH',
      'CY',
      'CZ',
      'DE',
      'DK',
      'EE',
      'ES',
      'FI',
      'FR',
      'GB',
      'GR',
      'HR',
      'HU',
      'IE',
      'IS',
      'IT',
      'LI',
      'LT',
      'LU',
      'LV',
      'MC',
      'MD',
      'ME',
      'MK',
      'MT',
      'NL',
      'NO',
      'PL',
      'RO',
      'RS',
      'RU',
      'SE',
      'SI',
      'SK',
      'SM',
      'TR',
      'UA',
      'VA',
    ].includes(countryCode);
  }

  private showResult(): void {
    afterNextRender(() => this.result?.nativeElement.scrollIntoView({ behavior: 'smooth' }), {
      injector: this.injector,
    });
  }

  private phraseFor(destination: Destination, types: DestinationType[]): Phrase {
    if (destination.phrase_en && destination.phrase_pt) {
      return { text: { en: destination.phrase_en, pt: destination.phrase_pt } };
    }
    const matching = destination.types.filter((type) => types.includes(type));
    return pickRandom(TRIP_PHRASES[pickRandom(matching.length ? matching : destination.types)]);
  }

  private toSuggestion(
    { trip, destination, nights, total }: Candidate,
    from: Translated,
    types: DestinationType[],
    image: string | null,
    forecast: Suggestion['forecast'],
  ): Suggestion {
    return {
      type: 'trip',
      name: { en: destination.name_en, pt: destination.name_pt },
      address: '',
      place: {
        en: `${destination.country_en}, from ${from.en}`,
        pt: `${destination.country_pt}, a partir de ${from.pt}`,
      },
      category: { en: destination.country_en, pt: destination.country_pt },
      icon: 'flight',
      image,
      lat: destination.lat,
      lon: destination.lon,
      mapUrl: `https://www.aviasales.com${trip.link}&marker=${AFFILIATE_MARKER}`,
      linkText: 'card.seeFlights',
      phrase: this.phraseFor(destination, types),
      nights,
      pricePerPerson: total,
      forecast,
      dates: { from: trip.departureAt, to: trip.returnAt },
    };
  }
}
