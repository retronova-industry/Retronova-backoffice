import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleService, AdminRole } from '../services/role.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { map, switchMap, take, of } from 'rxjs';

export const superAdminGuard: CanActivateFn = (_route, _state) => {
  const roleService = inject(RoleService);
  const router = inject(Router);
  const firebaseAuth = inject(AngularFireAuth);

  return firebaseAuth.authState.pipe(
    take(1),
    switchMap(user => user ? user.getIdTokenResult() : of(null)),
    map(result => {
      const role = result?.claims?.['role'] as AdminRole;
      if (role === 'super_admin') return true;
      return router.createUrlTree(['/dashboard']);
    })
  );
};

export const arcadeOwnerGuard: CanActivateFn = (_route, _state) => {
  const router = inject(Router);
  const firebaseAuth = inject(AngularFireAuth);

  return firebaseAuth.authState.pipe(
    take(1),
    switchMap(user => user ? user.getIdTokenResult() : of(null)),
    map(result => {
      const role = result?.claims?.['role'] as AdminRole;
      if (role === 'super_admin' || role === 'arcade_owner') return true;
      return router.createUrlTree(['/auth/login']);
    })
  );
};
