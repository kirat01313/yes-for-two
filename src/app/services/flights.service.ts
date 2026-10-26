import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { Airport, FlightsResponse } from '../models/flight';
import { SUPABASE_FUNCTIONS_URL } from '../supabase';
import { LanguageService } from './language.service';

interface WhereAmIResponse {
  iata?: string;
  name?: string;
  country_name?: string;
}

interface PlaceResult {
  code: string;
  name: string;
  country_name: string;
}

@Injectable({ providedIn: 'root' })
export class FlightsService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  trips(origin: string): Observable<FlightsResponse> {
    return this.http.get<FlightsResponse>(`${SUPABASE_FUNCTIONS_URL}/flight-prices`, {
      params: { origin },
    });
  }

  airportFromIp(): Observable<Airport | null> {
    return this.http
      .get<WhereAmIResponse>('https://www.travelpayouts.com/whereami', {
        params: { locale: this.language.lang() },
      })
      .pipe(
        map((response) =>
          response.iata && response.name
            ? { code: response.iata, name: response.name, country: response.country_name ?? '' }
            : null,
        ),
        catchError(() => of(null)),
      );
  }

  searchCities(term: string): Observable<Airport[]> {
    return this.http
      .get<PlaceResult[]>('https://autocomplete.travelpayouts.com/places2', {
        params: { term, locale: this.language.lang(), 'types[]': 'city' },
      })
      .pipe(
        map((results) =>
          results.slice(0, 6).map((result) => ({
            code: result.code,
            name: result.name,
            country: result.country_name,
          })),
        ),
        catchError(() => of([])),
      );
  }
}
