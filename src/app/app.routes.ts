import { Routes, UrlMatcher } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

const homeMatcher: UrlMatcher = segments => (
  segments.length === 0 ? { consumed: [] } : null
);

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'arcade-machines',
    canActivate: [authGuard],
    loadChildren: () => import('./features/arcade-machines/arcade-machines.routes').then(m => m.ARCADE_MACHINES_ROUTES)
  },
  {
    path: 'games',
    canActivate: [authGuard],
    loadChildren: () => import('./features/games/games.routes').then(m => m.GAMES_ROUTES)
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES)
  },
  {
    path: 'statistics',
    canActivate: [authGuard],
    loadChildren: () => import('./features/statistics/statistics.routes').then(m => m.STATISTICS_ROUTES)
  },
  {
    path: 'parties',
    canActivate: [authGuard],
    loadChildren: () => import('./features/parties/parties.routes').then(m => m.PARTIES_ROUTES)
  },

  {
    path: 'promos',
    canActivate: [authGuard],
    loadChildren: () => import('./features/promos/promos.routes').then(m => m.PROMOS_ROUTES)
  },

  {
    path: 'reservations',
    canActivate: [authGuard],
    loadChildren: () => import('./features/reservations/reservations.routes').then(m => m.RESERVATIONS_ROUTES)
  },
  {
    matcher: homeMatcher,
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/pages/home/home.component').then(m => m.HomeComponent)
      }
    ]
  }
];
