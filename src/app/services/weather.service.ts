import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { OpenMeteoResponse } from '../models/api-responses';
import { DayForecast } from '../models/destination';

const DAY = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  forecast(lat: number, lon: number, from: string): Observable<DayForecast[]> {
    const start = new Date(from);
    if (start.getTime() - Date.now() > 13 * DAY) return of([]);

    const params = {
      latitude: lat,
      longitude: lon,
      daily: 'temperature_2m_max,temperature_2m_min,weather_code',
      start_date: start.toISOString().slice(0, 10),
      end_date: new Date(start.getTime() + 2 * DAY).toISOString().slice(0, 10),
      timezone: 'auto',
    };

    return this.http
      .get<OpenMeteoResponse>('https://api.open-meteo.com/v1/forecast', { params })
      .pipe(
        map(({ daily }) =>
          daily.time.map((date, index) => ({
            date,
            max: Math.round(daily.temperature_2m_max[index]),
            min: Math.round(daily.temperature_2m_min[index]),
            code: daily.weather_code[index],
            icon: this.icon(daily.weather_code[index]),
          })),
        ),
        catchError(() => of([])),
      );
  }

  private icon(code: number): string {
    if (code === 0) return 'sunny';
    if (code <= 2) return 'partly_cloudy_day';
    if (code === 3) return 'cloud';
    if (code <= 48) return 'foggy';
    if (code <= 67 || (code >= 80 && code <= 82)) return 'rainy';
    if (code <= 77 || code === 85 || code === 86) return 'weather_snowy';
    return 'thunderstorm';
  }
}
