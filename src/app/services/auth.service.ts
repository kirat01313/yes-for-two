import { Injectable, computed, signal } from '@angular/core';
import { AuthError, Session, createClient } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type SignUpResult = 'signed-in' | 'confirm-email';

const KNOWN_ERRORS = [
  'invalid_credentials',
  'email_not_confirmed',
  'user_already_exists',
  'weak_password',
  'same_password',
  'over_email_send_rate_limit',
  'over_request_rate_limit',
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private client = createClient(environment.supabaseUrl, environment.supabaseKey);
  private session = signal<Session | null>(null);

  readonly user = computed(() => this.session()?.user ?? null);
  readonly signedIn = computed(() => this.session() !== null);
  readonly email = computed(() => this.user()?.email ?? '');

  readonly name = computed(() => {
    const name = this.user()?.user_metadata?.['name'];
    return typeof name === 'string' ? name.trim() : '';
  });

  readonly initial = computed(() => (this.name() || this.email()).charAt(0).toUpperCase());

  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.client.auth.getSession().then(({ data }) => this.session.set(data.session));
    this.client.auth.onAuthStateChange((_event, session) => this.session.set(session));
  }

  token(): string | null {
    return this.session()?.access_token ?? null;
  }

  signIn(email: string, password: string): Observable<void> {
    return from(this.client.auth.signInWithPassword({ email, password })).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      }),
    );
  }

  signUp(email: string, password: string): Observable<SignUpResult> {
    const emailRedirectTo = new URL('sign-in', document.baseURI).href;
    return from(this.client.auth.signUp({ email, password, options: { emailRedirectTo } })).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data.session ? 'signed-in' : 'confirm-email';
      }),
    );
  }

  saveName(name: string): Observable<void> {
    return from(this.client.auth.updateUser({ data: { name } })).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      }),
    );
  }

  changePassword(newPassword: string): Observable<void> {
    return from(this.client.auth.updateUser({ password: newPassword })).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      }),
    );
  }

  storage() {
    return this.client.storage;
  }

  signOut(): Observable<void> {
    return from(this.client.auth.signOut()).pipe(map(() => undefined));
  }

  errorKey(error: unknown): string {
    const code = (error as AuthError)?.code ?? '';
    return KNOWN_ERRORS.includes(code) ? `auth.errors.${code}` : 'auth.errors.unknown';
  }
}