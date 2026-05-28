import { Routes } from '@angular/router';
import { LayoutComponent } from '../dashboard/layout/layout.component';
import { TeamListComponent } from './pages/team-list/team-list.component';
import { OwnersListComponent } from './pages/owners-list/owners-list.component';

export const TEAM_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: TeamListComponent }
    ]
  }
];

export const OWNERS_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: OwnersListComponent }
    ]
  }
];
