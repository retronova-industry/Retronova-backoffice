import { Routes, UrlMatcher } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { superAdminGuard, arcadeOwnerGuard } from './core/auth/role.guard';

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
    canActivate: [authGuard, arcadeOwnerGuard],
    loadChildren: () => import('./features/arcade-machines/arcade-machines.routes').then(m => m.ARCADE_MACHINES_ROUTES)
  },
  {
    path: 'games',
    canActivate: [authGuard, superAdminGuard],
    loadChildren: () => import('./features/games/games.routes').then(m => m.GAMES_ROUTES)
  },
  {
    path: 'users',
    canActivate: [authGuard, superAdminGuard],
    loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES)
  },
  {
    path: 'statistics',
    canActivate: [authGuard, arcadeOwnerGuard],
    loadChildren: () => import('./features/statistics/statistics.routes').then(m => m.STATISTICS_ROUTES)
  },
  {
    path: 'parties',
    canActivate: [authGuard, arcadeOwnerGuard],
    loadChildren: () => import('./features/parties/parties.routes').then(m => m.PARTIES_ROUTES)
  },
  {
    path: 'promos',
    canActivate: [authGuard, arcadeOwnerGuard],
    loadChildren: () => import('./features/promos/promos.routes').then(m => m.PROMOS_ROUTES)
  },
  {
    path: 'arcade-requests',
    canActivate: [authGuard, arcadeOwnerGuard],
    loadChildren: () => import('./features/arcade-requests/arcade-requests.routes').then(m => m.ARCADE_REQUESTS_ROUTES)
  },
  {
    path: 'team',
    canActivate: [authGuard, superAdminGuard],
    loadChildren: () => import('./features/admins/admins.routes').then(m => m.TEAM_ROUTES)
  },
  {
    path: 'owners',
    canActivate: [authGuard, superAdminGuard],
    loadChildren: () => import('./features/admins/admins.routes').then(m => m.OWNERS_ROUTES)
  },
  {
    path: 'reservations',
    canActivate: [authGuard, arcadeOwnerGuard],
    loadChildren: () => import('./features/reservations/reservations.routes').then(m => m.RESERVATIONS_ROUTES)
  },
  {
    matcher: homeMatcher,
    canActivate: [authGuard, arcadeOwnerGuard],
    loadComponent: () => import('./features/dashboard/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/pages/home/home.component').then(m => m.HomeComponent)
      }
    ]
  }
];
