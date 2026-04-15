import { Injectable, computed, inject, signal } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, throwError, switchMap, map, catchError, tap } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly firebaseAuth = inject(AngularFireAuth);
  private readonly http = inject(HttpClient);

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticatedSignal = computed(() => !!this.currentUser());
  readonly isLoading = signal(false);

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    this.firebaseAuth.authState.pipe(
      switchMap(firebaseUser => {
        if (firebaseUser) {
          return this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(
            catchError(() => of(null))
          );
        }
        return of(null);
      })
    ).subscribe(user => {
      this.setCurrentUser(user);
    });
  }

  login(email: string, password: string): Observable<User | null> {
    this.isLoading.set(true);

    return from(this.firebaseAuth.signInWithEmailAndPassword(email, password)).pipe(
      switchMap(credential => {
        if (!credential.user) {
          return throwError(() => new Error('Login failed'));
        }

        return from(credential.user.getIdToken()).pipe(
          switchMap(token =>
            this.http.get<User>(`${environment.apiUrl}/users/me`, {
              headers: { Authorization: `Bearer ${token}` }
            }).pipe(catchError(() => of(null)))
          )
        );
      }),
      tap(user => {
        if (user) {
          const { password: _, ...safeUser } = user as any;
          this.setCurrentUser(safeUser as User);
        } else {
          this.setCurrentUser(null);
        }

        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        throw error;
      })
    );
  }
  
  logout(): Observable<void> {
    return from(this.firebaseAuth.signOut()).pipe(
      tap(() => {
        this.setCurrentUser(null);
      })
    );
  }
  
  getCurrentUser(): User | null {
    return this.currentUser();
  }
  
  isAuthenticated(): Observable<boolean> {
    return this.firebaseAuth.authState.pipe(
      map(user => !!user)
    );
  }
  
  getFirebaseToken(): Observable<string | null> {
    return this.firebaseAuth.idToken;
  }

  private setCurrentUser(user: User | null): void {
    this.currentUser.set(user);
  }
}
