import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlMatcher } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

const homeMatcher: UrlMatcher = segments => (
  segments.length === 0 ? { consumed: [] } : null
);

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'arcade-machines',
    canActivate: [authGuard],
    loadChildren: () => import('./features/arcade-machines/arcade-machines.module').then(m => m.ArcadeMachinesModule)
  },
  {
    path: 'games',
    canActivate: [authGuard],
    loadChildren: () => import('./features/games/games.module').then(m => m.GamesModule)
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadChildren: () => import('./features/users/users.module').then(m => m.UsersModule)
  },
  {
    path: 'statistics',
    canActivate: [authGuard],
    loadChildren: () => import('./features/statistics/statistics.module').then(m => m.StatisticsModule)
  },
  {
    path: 'parties',
    canActivate: [authGuard],
    loadChildren: () => import('./features/parties/parties.module').then(m => m.PartiesModule)
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

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
