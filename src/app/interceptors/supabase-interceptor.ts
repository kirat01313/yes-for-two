import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { SUPABASE_REST_URL } from '../supabase';

export const supabaseInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(SUPABASE_REST_URL)) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { apikey: environment.supabaseKey } }));
};