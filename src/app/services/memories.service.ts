import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { Memory, NewMemory } from '../models/memory';
import { Suggestion } from '../models/suggestion';
import { SUPABASE_REST_URL } from '../supabase';
import { todayIso } from '../utils/validators';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';

const PENDING_KEY = 'yes-for-two:pending-yes';

@Injectable({ providedIn: 'root' })
export class MemoriesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly url = `${SUPABASE_REST_URL}/memories`;
  private readonly returnRow = new HttpHeaders({ Prefer: 'return=representation' });

  list(): Observable<Memory[]> {
    return this.http.get<Memory[]>(this.url, {
      params: { select: '*', order: 'date.desc,created_at.desc' },
    });
  }

  add(memory: NewMemory): Observable<Memory> {
    return this.http
      .post<Memory[]>(this.url, memory, { headers: this.returnRow })
      .pipe(map(([row]) => row));
  }

  update(id: number, changes: Partial<Memory>): Observable<Memory> {
    return this.http
      .patch<Memory[]>(this.url, changes, { params: { id: `eq.${id}` }, headers: this.returnRow })
      .pipe(map(([row]) => row));
  }

  saveSuggestion(suggestion: Suggestion): Observable<Memory> {
    const translate = (value: Suggestion['name']) => this.language.translate(value);
    return this.add({
      type: suggestion.type,
      name: translate(suggestion.name),
      category: translate(suggestion.category),
      place: translate(suggestion.place),
      nights: suggestion.nights ?? null,
      price: suggestion.pricePerPerson ?? null,
      icon: suggestion.icon,
      image: suggestion.image,
      lat: suggestion.lat,
      lon: suggestion.lon,
      date: todayIso(),
      went: false,
      note: '',
      origin: 'draw',
    });
  }

  sayYes(suggestion: Suggestion): Observable<Memory | null> {
    if (this.auth.signedIn()) return this.saveSuggestion(suggestion);
    this.saveLater(suggestion);
    this.router.navigate(['/sign-in'], { queryParams: { returnTo: '/memories' } });
    return of(null);
  }

  hasPending(): boolean {
    try {
      return sessionStorage.getItem(PENDING_KEY) !== null;
    } catch {
      return false;
    }
  }

  savePending(): Observable<Memory | null> {
    let suggestion: Suggestion | null = null;
    try {
      const saved = sessionStorage.getItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      suggestion = saved ? (JSON.parse(saved) as Suggestion) : null;
    } catch {
      suggestion = null;
    }
    return suggestion ? this.saveSuggestion(suggestion) : of(null);
  }

  private saveLater(suggestion: Suggestion): void {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(suggestion));
    } catch {
      return;
    }
  }
}
