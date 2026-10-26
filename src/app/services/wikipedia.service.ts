import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, retry, switchMap } from 'rxjs';
import { WikipediaGeoResponse, WikipediaSummary } from '../models/api-responses';
import { KnownPlace } from '../models/place';
import { distanceKm } from '../utils/geo';

const NOT_INTERESTING =
  /freguesia|concelho|munic[ií]pio|distrito|aldeia|lugar de|estrada|autoestrada|esta[cç][aã]o|escola|universidade|hospital|clube|empresa|bairro|avenida|rua|parish|municipality|district|village|road|motorway|station|school|university|hospital|club|company|neighbou?rhood|street|avenue/i;

const ICONS: [RegExp, string][] = [
  [
    /igreja|capela|catedral|bas[ií]lica|santu[aá]rio|mosteiro|convento|church|chapel|cathedral|basilica|sanctuary|monastery|convent/i,
    'church',
  ],
  [/castelo|forte|muralha|torre|castle|fort|wall|tower/i, 'fort'],
  [/museu|galeria|museum|gallery/i, 'museum'],
  [/jardim|parque|mata|serra|garden|park|forest|mountain/i, 'park'],
  [/pal[aá]cio|solar|casa|palace|manor|house/i, 'castle'],
  [/pra[cç]a|largo|square/i, 'location_city'],
  [/fonte|chafariz|fountain/i, 'water_drop'],
  [/teatro|cinema|theatre|theater/i, 'theater_comedy'],
  [/caf[eé]|restaurante|restaurant/i, 'local_cafe'],
  [/miradouro|monte|viewpoint|hill/i, 'landscape'],
];

const TYPE_WORDS =
  /\b(?:igreja|capela|catedral|bas[ií]lica|santu[aá]rio|mosteiro|convento|castelo|forte|muralha|torre|museu|galeria|jardim|parque|mata|pal[aá]cio|solar|casa|pra[cç]a|largo|fonte|chafariz|teatro|cinema|miradouro|ponte|arco|monumento|est[aá]tua|caf[eé]|church|chapel|cathedral|basilica|monastery|convent|castle|fort|tower|museum|gallery|garden|park|palace|house|square|fountain|theatre|bridge|arch|monument|statue)/i;

@Injectable({ providedIn: 'root' })
export class WikipediaService {
  private readonly http = inject(HttpClient);

  image(title: string | undefined): Observable<string | null> {
    if (!title) return of(null);

    let lang = 'pt';
    let page = title;
    const separator = title.indexOf(':');
    if (separator > 0 && separator <= 3) {
      lang = title.slice(0, separator);
      page = title.slice(separator + 1);
    }

    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.replaceAll(' ', '_'))}`;

    return this.http.get<WikipediaSummary>(url).pipe(
      map((summary) => summary.thumbnail?.source.replace(/\/\d+px-/, '/960px-') ?? null),
      catchError(() => of(null)),
    );
  }

  placeImage(
    name: string,
    city: string,
    lat: number,
    lon: number,
    lang: string,
  ): Observable<string | null> {
    return this.searchImage(`${name} ${city}`, lat, lon, lang).pipe(
      switchMap((image) =>
        image
          ? of(image)
          : this.nearbyPlaces(lat, lon, lang).pipe(
              map((places) => places.find((place) => place.distance <= 1)?.image ?? null),
            ),
      ),
      switchMap((image) => (image ? of(image) : this.image(`${lang}:${city}`))),
      catchError(() => of(null)),
    );
  }

  nearbyPlaces(lat: number, lon: number, lang: string): Observable<KnownPlace[]> {
    const params = {
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'geosearch',
      ggscoord: `${lat}|${lon}`,
      ggsradius: 10000,
      ggslimit: 50,
      prop: 'pageimages|coordinates|description',
      piprop: 'thumbnail',
      pithumbsize: 960,
      colimit: 50,
    };

    return this.http
      .get<WikipediaGeoResponse>(`https://${lang}.wikipedia.org/w/api.php`, { params })
      .pipe(
        map((response) =>
          Object.values(response.query?.pages ?? {})
            .filter((page) => page.thumbnail && page.coordinates?.length)
            .filter((page) => !NOT_INTERESTING.test(page.description ?? ''))
            .filter((page) => page.title.length <= 40)
            .map((page) => {
              const description = page.description ?? '';
              const point = page.coordinates![0];
              return {
                id: String(page.pageid),
                name: page.title.replace(/\s*\(.*\)$/, ''),
                type: this.typeOf(description, page.title, lang),
                icon:
                  ICONS.find(([pattern]) => pattern.test(`${description} ${page.title}`))?.[1] ??
                  'photo_camera',
                image: page.thumbnail!.source,
                lat: point.lat,
                lon: point.lon,
                distance: distanceKm(lat, lon, point.lat, point.lon),
              };
            })
            .sort((a, b) => a.distance - b.distance),
        ),
        retry({ count: 1, delay: 1500 }),
        catchError(() => of([])),
      );
  }

  private searchImage(
    text: string,
    lat: number,
    lon: number,
    lang: string,
  ): Observable<string | null> {
    const params = {
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: text,
      gsrlimit: 5,
      prop: 'pageimages|coordinates',
      piprop: 'thumbnail',
      pithumbsize: 960,
    };

    return this.http
      .get<WikipediaGeoResponse>(`https://${lang}.wikipedia.org/w/api.php`, { params })
      .pipe(
        map((response) => {
          const page = Object.values(response.query?.pages ?? {})
            .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
            .find((page) => {
              const point = page.coordinates?.[0];
              return page.thumbnail && point && distanceKm(lat, lon, point.lat, point.lon) <= 2;
            });
          return page?.thumbnail?.source ?? null;
        }),
        catchError(() => of(null)),
      );
  }

  private typeOf(description: string, title: string, lang: string): string {
    const first = description.split(/\s+(?:em|in|na|no)\s+|,/)[0].trim();
    const fallback = lang === 'pt' ? 'Lugar a visitar' : 'Place to visit';
    const type = first && first.length <= 28 ? first : (title.match(TYPE_WORDS)?.[0] ?? fallback);
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
