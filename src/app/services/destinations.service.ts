import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, shareReplay } from 'rxjs';
import { CountryCost, Destination } from '../models/destination';
import { SUPABASE_REST_URL } from '../supabase';

const DESTINATION_COLUMNS = [
  'name_en',
  'name_pt',
  'country_en',
  'country_pt',
  'wikipedia_en',
  'image',
  'lat',
  'lon',
  'phrase_en',
  'phrase_pt',
  'types',
  'iata',
  'country_code',
].join(',');

export interface TripData {
  destinations: Map<string, Destination>;
  nights: Map<string, number>;
}

@Injectable({ providedIn: 'root' })
export class DestinationsService {
  private readonly http = inject(HttpClient);

  private readonly data$ = forkJoin({
    destinations: this.http.get<Destination[]>(`${SUPABASE_REST_URL}/destinations`, {
      params: { select: DESTINATION_COLUMNS, iata: 'not.is.null' },
    }),
    costs: this.http.get<CountryCost[]>(`${SUPABASE_REST_URL}/country_costs`, {
      params: { select: 'country_code,night' },
    }),
  }).pipe(
    map(({ destinations, costs }) => ({
      destinations: new Map(destinations.map((destination) => [destination.iata!, destination])),
      nights: new Map(costs.map((cost) => [cost.country_code, cost.night])),
    })),
    shareReplay(1),
  );

  tripData(): Observable<TripData> {
    return this.data$;
  }
}
