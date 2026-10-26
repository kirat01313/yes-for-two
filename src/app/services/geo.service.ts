import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { PhotonResponse } from '../models/api-responses';
import { City } from '../models/place';
import { LanguageService } from './language.service';

const PHOTON_URL = 'https://photon.komoot.io';
const PLACE_TYPES = ['city', 'town', 'village', 'district', 'locality', 'county', 'state'];

@Injectable({ providedIn: 'root' })
export class GeoService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  findCity(name: string): Observable<City | null> {
    return this.http
      .get<PhotonResponse>(`${PHOTON_URL}/api/`, {
        params: { q: name, limit: 5, lang: this.photonLang() },
      })
      .pipe(
        map((response) => {
          const place =
            response.features.find((feature) =>
              PLACE_TYPES.includes(feature.properties.type ?? ''),
            ) ?? response.features[0];
          if (!place) return null;
          const [lon, lat] = place.geometry.coordinates;
          return { name: place.properties.name ?? name, lat, lon };
        }),
      );
  }

  placeName(lat: number, lon: number): Observable<string | null> {
    return this.http
      .get<PhotonResponse>(`${PHOTON_URL}/reverse`, {
        params: { lat, lon, lang: this.photonLang() },
      })
      .pipe(
        map((response) => {
          const properties = response.features[0]?.properties;
          if (!properties) return null;
          return (
            properties.city ?? properties.town ?? properties.village ?? properties.name ?? null
          );
        }),
      );
  }

  nearbyCentres(lat: number, lon: number): Observable<City[]> {
    const params = new HttpParams({
      fromObject: {
        lat,
        lon,
        radius: 50,
        limit: 6,
        lang: this.photonLang(),
        osm_tag: ['place:city', 'place:town'],
      },
    });

    return this.http.get<PhotonResponse>(`${PHOTON_URL}/reverse`, { params }).pipe(
      map((response) =>
        response.features
          .filter((feature) => feature.properties.name)
          .sort(
            (a, b) =>
              Number(b.properties.osm_value === 'city') - Number(a.properties.osm_value === 'city'),
          )
          .map((feature) => ({
            name: feature.properties.name!,
            lon: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1],
          })),
      ),
      catchError(() => of([])),
    );
  }

  currentLocation(): Observable<{ lat: number; lon: number }> {
    return new Observable((observer) => {
      if (!navigator.geolocation) {
        observer.error(new Error('Geolocation is not available'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          observer.next({ lat: position.coords.latitude, lon: position.coords.longitude });
          observer.complete();
        },
        (error) => observer.error(error),
        { timeout: 10000 },
      );
    });
  }

  private photonLang(): string {
    return this.language.lang() === 'en' ? 'en' : 'default';
  }
}
