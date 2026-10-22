import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  return auth.signedIn() ? true : router.createUrlTree(['/sign-in'], { queryParams: { returnTo: state.url } });
};