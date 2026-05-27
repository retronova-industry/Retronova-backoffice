import { Injectable, inject, signal, computed } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, of } from 'rxjs';

export type AdminRole = 'super_admin' | 'arcade_owner' | null;

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly firebaseAuth = inject(AngularFireAuth);

  private readonly claims$ = this.firebaseAuth.authState.pipe(
    switchMap(user => user ? user.getIdTokenResult() : of(null)),
    map(result => result?.claims ?? null)
  );

  private readonly claimsSignal = toSignal(this.claims$, { initialValue: null });

  readonly role = computed<AdminRole>(() => {
    const claims = this.claimsSignal();
    return (claims?.['role'] as AdminRole) ?? null;
  });

  readonly isSuperAdmin = computed(() => this.role() === 'super_admin');
  readonly isArcadeOwner = computed(() => this.role() === 'arcade_owner');
  readonly hasAnyRole = computed(() => this.role() !== null);
}
