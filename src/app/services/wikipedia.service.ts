import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { WikipediaSummary } from '../models/api-responses';

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
}
