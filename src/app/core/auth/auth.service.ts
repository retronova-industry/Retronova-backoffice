import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { AdminMe } from '../models/admin.model';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentAdmin: AdminMe | null = null;

  constructor(
    private firebaseAuth: AngularFireAuth,
    private http: HttpClient
  ) {
    this.firebaseAuth.authState.pipe(
      switchMap(firebaseUser => {
        if (firebaseUser) {
          return this.http.get<AdminMe>(`${environment.apiUrl}/admin/me`).pipe(
            catchError(() => of(null))
          );
        }
        return of(null);
      })
    ).subscribe(admin => {
      this.currentAdmin = admin;
    });
  }

  login(email: string, password: string): Observable<AdminMe | null> {
    return from(this.firebaseAuth.signInWithEmailAndPassword(email, password)).pipe(
      switchMap(credential => {
        if (!credential.user) {
          throw new Error('Login failed');
        }
        return this.http.get<AdminMe>(`${environment.apiUrl}/admin/me`).pipe(
          catchError(() => of(null))
        );
      }),
      tap(admin => {
        this.currentAdmin = admin;
      })
    );
  }

  logout(): Observable<void> {
    return from(this.firebaseAuth.signOut()).pipe(
      tap(() => {
        this.currentAdmin = null;
      })
    );
  }

  getCurrentUser(): AdminMe | null {
    return this.currentAdmin;
  }

  isAuthenticated(): Observable<boolean> {
    return this.firebaseAuth.authState.pipe(
      map(user => !!user)
    );
  }

  getFirebaseToken(): Observable<string | null> {
    return this.firebaseAuth.idToken;
  }
}