import { Routes } from '@angular/router';
import { LayoutComponent } from '../dashboard/layout/layout.component';
import { RequestsListComponent } from './pages/requests-list/requests-list.component';

export const ARCADE_REQUESTS_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: RequestsListComponent }
    ]
  }
];
