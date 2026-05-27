import { Injectable, inject, signal, computed } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, of, BehaviorSubject, switchMap, catchError, tap } from 'rxjs';
import { AdminMe } from '../models/admin.model';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly firebaseAuth = inject(AngularFireAuth);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly adminMeUrl = `${environment.apiUrl}/admin/me`;

  private readonly currentAdminSubject = new BehaviorSubject<AdminMe | null>(null);
  readonly currentUser$ = this.currentAdminSubject.asObservable();

  readonly currentUser = signal<AdminMe | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal(false);

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    this.firebaseAuth.authState.pipe(
      switchMap(firebaseUser => {
        if (firebaseUser) {
          return this.http.get<AdminMe>(this.adminMeUrl).pipe(
            catchError(() => of(null))
          );
        }
        return of(null);
      })
    ).subscribe(admin => {
      this.setCurrentUser(admin);
    });
  }

  login(email: string, password: string): Observable<AdminMe | null> {
    this.isLoading.set(true);

    return from(this.firebaseAuth.signInWithEmailAndPassword(email, password)).pipe(
      switchMap(credential => {
        if (!credential.user) {
          throw new Error('Échec de la connexion');
        }
        return this.http.get<AdminMe>(this.adminMeUrl).pipe(
          catchError(() => of(null))
        );
      }),
      tap(admin => {
        this.setCurrentUser(admin);
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
        this.router.navigate(['/auth/login']);
      })
    );
  }

  getFirebaseToken(): Observable<string | null> {
    return this.firebaseAuth.idToken;
  }

  isAuthenticated$(): Observable<boolean> {
    return this.firebaseAuth.authState.pipe(
      switchMap(user => of(!!user))
    );
  }

  getCurrentUser(): AdminMe | null {
    return this.currentUser();
  }

  private setCurrentUser(admin: AdminMe | null): void {
    this.currentUser.set(admin);
    this.currentAdminSubject.next(admin);
  }

  getMe(): Observable<AdminMe> {
    return this.http.get<AdminMe>(this.adminMeUrl).pipe(
      tap(admin => this.setCurrentUser(admin))
    );
  }
}