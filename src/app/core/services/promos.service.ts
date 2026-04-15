// src/app/core/services/promos.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, tap, catchError, throwError, map } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment.development';
import { 
  PromoCode,
  UsePromoCodeRequest,
  PromoCodeResponse,
  PromoHistory,
  CreatePromoCodeRequest
} from '../models/promo.model';

type PromoStatus = 'active' | 'exhausted' | 'limited' | 'single_use' | 'inactive';

/**
 * Gestion du cache des promos
 */
class PromoCacheManager {
  private readonly cacheTimeMs = 5 * 60 * 1000; // 5 minutes
  private readonly cache = new Map<string, { data: any; timestamp: number }>();

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeMs) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  remove(key: string): void {
    this.cache.delete(key);
  }
}

@Injectable({
  providedIn: 'root'
})
export class PromosService {
  private readonly apiService = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}`;
  private readonly adminBaseUrl = `${environment.apiUrl}/admin`;
  private readonly cacheManager = new PromoCacheManager();
  
  // Subjects pour l'état réactif
  private readonly promosSubject = new BehaviorSubject<PromoCode[]>([]);
  readonly promos$ = this.promosSubject.asObservable();
  
  /**
   * Utilise un code promo
   */
  usePromoCode(data: UsePromoCodeRequest): Observable<PromoCodeResponse> {
    return this.apiService.post<PromoCodeResponse>(`${this.baseUrl}/promos/use`, data).pipe(
      tap(() => this.clearCache()),
      catchError(this.handleError)
    );
  }
  
  /**
   * Récupère l'historique des codes utilisés
   */
  getHistory(): Observable<PromoHistory[]> {
    return this.apiService.get<PromoHistory[]>(`${this.baseUrl}/promos/history`).pipe(
      catchError(this.handleError)
    );
  }
  
  /**
   * Crée un nouveau code promo (Admin)
   */
  createPromoCode(data: CreatePromoCodeRequest): Observable<any> {
    return this.apiService.post(`/admin/promo-codes`, data).pipe(
      tap(() => {
        this.clearCache();
        this.refreshPromos();
      }),
      catchError(this.handleError)
    );
  }
  
  /**
   * Liste tous les codes promo (Admin)
   */
  listPromoCodes(): Observable<PromoCode[]> {
    return this.apiService.get<PromoCode[]>(`/admin/promo-codes`).pipe(
      catchError(this.handleError)
    );
  }
  
  /**
   * Récupère tous les codes promo avec cache
   */
  getAllPromos(): Observable<PromoCode[]> {
    const cached = this.cacheManager.get<PromoCode[]>('all_promos');
    if (cached) {
      return of(cached);
    }

    return this.listPromoCodes().pipe(
      tap(promos => {
        this.cacheManager.set('all_promos', promos);
        this.promosSubject.next(promos);
      })
    );
  }
  
  /**
   * Récupère un code promo par ID
   */
  getPromoById(id: number): Observable<PromoCode> {
    const cached = this.cacheManager.get<PromoCode>(`promo_${id}`);
    if (cached) {
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    // Comme l'API ne fournit pas d'endpoint pour récupérer un seul promo,
    // on récupère tous les promos et on filtre
    return this.getAllPromos().pipe(
      map(promos => {
        const promo = promos.find(p => p.id === id);
        if (!promo) {
          throw new Error('Code promo non trouvé');
        }
        this.cacheManager.set(`promo_${id}`, promo);
        return promo;
      })
    );
  }
  
  /**
   * Met à jour un code promo
   */
  updatePromo(id: number, data: Partial<CreatePromoCodeRequest>): Observable<any> {
    // L'API ne fournit pas d'endpoint de mise à jour, on simule
    return this.http.put(`${this.adminBaseUrl}/promo-codes/${id}`, data).pipe(
      tap(() => {
        this.cacheManager.remove(`promo_${id}`);
        this.clearCache();
        this.refreshPromos();
      }),
      catchError(this.handleError)
    );
  }
  
  /**
   * Active ou désactive un code promo (toggle)
   */
  togglePromoActive(id: number): Observable<PromoCode> {
    return this.http.post<PromoCode>(`${this.adminBaseUrl}/promo-codes/${id}/toggle-active`, {}).pipe(
      tap(() => {
        this.cacheManager.remove(`promo_${id}`);
        this.clearCache();
        this.refreshPromos();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Supprime un code promo
   */
  deletePromo(id: number): Observable<any> {
    // L'API ne fournit pas d'endpoint de suppression, on simule
    return this.http.delete(`${this.adminBaseUrl}/promo-codes/${id}`).pipe(
      tap(() => {
        this.clearCache();
        this.refreshPromos();
      }),
      catchError(this.handleError)
    );
  }
  
  /**
   * Exporte les codes promo en CSV
   */
  exportPromos(): Observable<Blob> {
    const headers = { 'Accept': 'text/csv' };
    
    return this.getAllPromos().pipe(
      map(promos => {
        // Créer le CSV manuellement
        const csv = this.convertToCSV(promos);
        return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      })
    );
  }
  
  /**
   * Calcule le pourcentage d'utilisation d'un code
   */
  calculateUsagePercentage(promo: PromoCode): number {
    if (!promo.usage_limit) return 0;
    return Math.min(100, Math.round((promo.current_uses / promo.usage_limit) * 100));
  }
  
  /**
   * Détermine le statut d'un code promo
   */
  getPromoStatus(promo: PromoCode): PromoStatus {
    // Code épuisé
    if (promo.usage_limit && promo.current_uses >= promo.usage_limit) {
      return 'exhausted';
    }
    
    // Usage unique global déjà utilisé
    if (promo.is_single_use_global && promo.current_uses > 0) {
      return 'exhausted';
    }
    
    // Usage unique par utilisateur
    if (promo.is_single_use_per_user && !promo.is_single_use_global && !promo.usage_limit) {
      return 'single_use';
    }
    
    // Usage limité (approche de la limite)
    if (promo.usage_limit && promo.current_uses >= promo.usage_limit * 0.8) {
      return 'limited';
    }
    
    // Actif
    return 'active';
  }
  
  /**
   * Rafraîchit la liste des promos
   */
  private refreshPromos(): void {
    this.getAllPromos().subscribe();
  }
  
  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cacheManager.clear();
  }
  
  /**
   * Convertit les promos en CSV
   */
  private convertToCSV(promos: PromoCode[]): string {
    const headers = ['ID', 'Code', 'Tickets', 'Utilisations', 'Limite', 'Usage unique global', 'Usage unique/utilisateur', 'Statut'];
    const rows = promos.map(promo => [
      promo.id,
      promo.code,
      promo.tickets_reward,
      promo.current_uses,
      promo.usage_limit || 'Illimité',
      promo.is_single_use_global ? 'Oui' : 'Non',
      promo.is_single_use_per_user ? 'Oui' : 'Non',
      this.getPromoStatus(promo)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  /**
   * Gestion centralisée des erreurs
   */
  private handleError = (error: any): Observable<never> => {
    console.error('Erreur service promos:', error);
    
    let errorMessage = 'Une erreur inattendue s\'est produite';
    
    if (error.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur';
    } else if (error.status === 400) {
      errorMessage = error.error?.detail || 'Code promo invalide';
    } else if (error.status === 404) {
      errorMessage = 'Code promo introuvable';
    } else if (error.status === 409) {
      errorMessage = 'Ce code promo existe déjà';
    } else if (error.status >= 500) {
      errorMessage = 'Erreur serveur, veuillez réessayer plus tard';
    }
    
    return throwError(() => ({ ...error, message: errorMessage }));
  };
}