import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap, timeout } from 'rxjs';
import {
  CUISINES,
  CUISINE_NAMES,
  EXPERIENCE_TYPES,
  PLACE_TYPES,
  experiencesQuery,
} from '../data/categories';
import { NominatimResult, OverpassResponse } from '../models/api-responses';
import { City, NearbyPlace, Place } from '../models/place';
import { distanceKm } from '../utils/geo';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const RESTAURANT_RADIUS_KM = 5;
const EXPERIENCE_RADIUS_KM = 8;
const CACHE_DAY = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private readonly http = inject(HttpClient);

  findRestaurants(city: City, radiusKm: number, cuisines: string[]): Observable<NearbyPlace[]> {
    const radius = RESTAURANT_RADIUS_KM * 1000;
    const query = `nwr["amenity"="restaurant"]["name"](around:${radius},${city.lat},${city.lon});`;
    const chosen = CUISINES.filter((cuisine) => cuisines.includes(cuisine.value));
    const acceptsOther = cuisines.includes('other');

    return this.allNearby('restaurants', city, query, ['restaurants']).pipe(
      map((places) =>
        places
          .map((place) => this.toNearbyPlace(place, city))
          .filter((place) => place.distance <= radiusKm)
          .filter((place) => !place.tags['brand'])
          .filter((place) => {
            const matching = CUISINES.filter((cuisine) => cuisine.matches(place.tags));
            if (matching.length === 0) return acceptsOther;
            return matching.some((cuisine) => chosen.includes(cuisine));
          })
          .map((place) => {
            const first = (place.tags['cuisine'] ?? '').split(';')[0].trim();
            const cuisine = CUISINES.find((item) => item.matches(place.tags));
            return {
              ...place,
              category: CUISINE_NAMES[first] ??
                cuisine?.name ?? { en: 'Restaurant', pt: 'Restaurante' },
              icon: cuisine?.icon ?? 'restaurant',
            };
          }),
      ),
    );
  }

  findExperiences(city: City, radiusKm: number, types: string[]): Observable<NearbyPlace[]> {
    const radius = EXPERIENCE_RADIUS_KM * 1000;
    const acceptedTags = EXPERIENCE_TYPES.filter((type) => types.includes(type.value)).flatMap(
      (type) => type.tags,
    );
    const words = ['museums', 'parks', 'bars', 'theatres'];

    return this.allNearby(
      'experiences',
      city,
      experiencesQuery(radius, city.lat, city.lon),
      words,
    ).pipe(
      map((places) =>
        places
          .map((place) => this.toNearbyPlace(place, city))
          .filter((place) => place.distance <= radiusKm)
          .map((place) => ({
            place,
            key: place.tags['tourism'] ?? place.tags['amenity'] ?? place.tags['leisure'] ?? '',
          }))
          .filter(({ key }) => acceptedTags.includes(key))
          .map(({ place, key }) => {
            const type = PLACE_TYPES[key] ?? {
              name: { en: 'Experience', pt: 'Experiência' },
              icon: 'explore',
            };
            return { ...place, category: type.name, icon: type.icon };
          }),
      ),
    );
  }

  private allNearby(kind: string, city: City, query: string, words: string[]): Observable<Place[]> {
    const key = `yes-for-two:places:${kind}:${city.lat.toFixed(3)},${city.lon.toFixed(3)}`;
    const cached = this.readCache(key);
    if (cached) return of(cached);

    return this.overpass(query).pipe(
      timeout(8000),
      catchError(() => this.nominatim(words, city.name)),
      map((places) => places.filter((place) => place.name && place.lat && place.lon)),
      tap((places) => {
        if (places.length) this.writeCache(key, places);
      }),
      catchError(() => of([])),
    );
  }

  private overpass(query: string): Observable<Place[]> {
    const body = 'data=' + encodeURIComponent(`[out:json][timeout:25];(${query});out center tags;`);
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    return this.http.post<OverpassResponse>(OVERPASS_URL, body, { headers }).pipe(
      map((response) =>
        response.elements.map((element) => ({
          id: element.type + element.id,
          name: element.tags['name'] ?? '',
          lat: element.lat ?? element.center?.lat ?? 0,
          lon: element.lon ?? element.center?.lon ?? 0,
          tags: element.tags,
        })),
      ),
    );
  }

  private nominatim(words: string[], city: string): Observable<Place[]> {
    const requests = words.map((word) =>
      this.http
        .get<NominatimResult[]>(NOMINATIM_URL, {
          params: {
            q: `${word} in ${city}`,
            format: 'jsonv2',
            limit: 40,
            extratags: 1,
            addressdetails: 1,
          },
        })
        .pipe(catchError(() => of([] as NominatimResult[]))),
    );

    return forkJoin(requests).pipe(
      map((lists) =>
        lists.flat().map((result) => ({
          id: result.osm_type + result.osm_id,
          name: result.name,
          lat: Number(result.lat),
          lon: Number(result.lon),
          tags: {
            ...result.extratags,
            [result.category]: result.type,
            'addr:street': result.address?.road,
            'addr:housenumber': result.address?.house_number,
          },
        })),
      ),
    );
  }

  private toNearbyPlace(place: Place, city: City): NearbyPlace {
    const street = [place.tags['addr:street'], place.tags['addr:housenumber']]
      .filter(Boolean)
      .join(', ');
    return {
      ...place,
      street,
      distance: distanceKm(city.lat, city.lon, place.lat, place.lon),
      category: '',
      icon: '',
    };
  }

  private readCache(key: string): Place[] | null {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (saved && Date.now() - saved.time < CACHE_DAY) return saved.places;
    } catch {
      return null;
    }
    return null;
  }

  private writeCache(key: string, places: Place[]): void {
    try {
      localStorage.setItem(key, JSON.stringify({ time: Date.now(), places }));
    } catch {
      return;
    }
  }
}
