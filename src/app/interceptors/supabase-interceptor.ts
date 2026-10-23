import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { SUPABASE_REST_URL } from '../supabase';

export const supabaseInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(SUPABASE_REST_URL)) {
    return next(request);
  }

  const headers: Record<string, string> = { apikey: environment.supabaseKey };
  const token = inject(AuthService).token();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(request.clone({ setHeaders: headers }));
};
