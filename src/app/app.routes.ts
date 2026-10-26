import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { Experience } from './pages/experience/experience';
import { Home } from './pages/home/home';
import { Restaurant } from './pages/restaurant/restaurant';
import { SignIn } from './pages/sign-in/sign-in';
import { Trip } from './pages/trip/trip';

export const routes: Routes = [
  { path: '', component: Home, title: 'titles.home' },
  { path: 'restaurant', component: Restaurant, title: 'titles.restaurant' },
  { path: 'experience', component: Experience, title: 'titles.experience' },
  { path: 'trip', component: Trip, title: 'titles.trip' },
  {
    path: 'memories',
    loadComponent: () => import('./pages/memories/memories').then((m) => m.Memories),
    title: 'titles.memories',
    canActivate: [authGuard],
  },
  {
    path: 'gallery',
    loadComponent: () => import('./pages/gallery/gallery').then((m) => m.Gallery),
    title: 'titles.gallery',
    canActivate: [authGuard],
  },
  { path: 'sign-in', component: SignIn, title: 'titles.signIn' },
  {
    path: 'account',
    loadComponent: () => import('./pages/account/account').then((m) => m.Account),
    title: 'titles.account',
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
    title: 'titles.settings',
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
