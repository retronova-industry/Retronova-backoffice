// src/app/core/auth/auth.service.ts

import { Injectable, inject, signal, computed } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, of, switchMap, catchError, tap } from 'rxjs';
import { User, UserCreate } from '../models/user.model';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly firebaseAuth = inject(AngularFireAuth);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  
  private readonly baseUrl = `${environment.apiUrl}/auth`;
  
  // Source unique de verite: signals Angular pour l'etat d'authentification
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal(false);

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialise l'authentification au démarrage
   */
  private initializeAuth(): void {
    this.firebaseAuth.authState.pipe(
      switchMap(firebaseUser => {
        if (firebaseUser) {
          // Récupérer les infos utilisateur depuis notre API
          return this.http.get<User>(`${this.baseUrl}/me`).pipe(
            catchError(() => of(null))
          );
        }
        return of(null);
      })
    ).subscribe(user => {
      this.setCurrentUser(user);
    });
  }

  /**
   * Connexion avec email/password Firebase
   */
  login(email: string, password: string): Observable<User | null> {
    this.isLoading.set(true);
    
    return from(this.firebaseAuth.signInWithEmailAndPassword(email, password)).pipe(
      switchMap(credential => {
        if (!credential.user) {
          throw new Error('Échec de la connexion');
        }
        
        // Récupérer les infos utilisateur depuis notre API
        return this.http.get<User>(`${this.baseUrl}/me`);
      }),
      tap(user => {
        this.setCurrentUser(user);
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  register(userData: UserCreate): Observable<User> {
    this.isLoading.set(true);
    
    return this.http.post<User>(`${this.baseUrl}/register`, userData).pipe(
      tap(user => {
        this.setCurrentUser(user);
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Déconnexion
   */
  logout(): Observable<void> {
    return from(this.firebaseAuth.signOut()).pipe(
      tap(() => {
        this.setCurrentUser(null);
        this.router.navigate(['/auth/login']);
      })
    );
  }

  /**
   * Récupère le token Firebase pour les requêtes API
   */
  getFirebaseToken(): Observable<string | null> {
    return this.firebaseAuth.idToken;
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated$(): Observable<boolean> {
    return this.firebaseAuth.authState.pipe(
      switchMap(user => of(!!user))
    );
  }

  /**
   * Récupère l'utilisateur actuel
   */
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  /**
   * Met à jour l'utilisateur actuel
   */
  private setCurrentUser(user: User | null): void {
    this.currentUser.set(user);
  }

  /**
   * Récupère les informations de l'utilisateur connecté
   */
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`).pipe(
      tap(user => this.setCurrentUser(user))
    );
  }
}