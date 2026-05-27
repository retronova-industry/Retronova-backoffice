import { Routes } from '@angular/router';
import { LayoutComponent } from '../dashboard/layout/layout.component';
import { UsersListComponent } from './pages/users-list/users-list.component';
import { UserDetailComponent } from './pages/user-detail/user-detail.component';
import { UsersTrashComponent } from './pages/users-trash/users-trash.component';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: UsersListComponent },
      { path: 'trash', component: UsersTrashComponent },
      { path: ':id', component: UserDetailComponent }
    ]
  }
];