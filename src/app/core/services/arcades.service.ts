import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { 
  Arcade, 
  ArcadeCreate, 
  ArcadeUpdate, 
  ArcadeGameAssignment,
  QueueItem
} from '../models/arcade.model';

@Injectable({
  providedIn: 'root'
})
export class ArcadesService {
  private readonly apiService = inject(ApiService);
  
  // Signal pour la liste des bornes en cache
  private readonly arcadesSignal = signal<Arcade[]>([]);
  readonly arcades = this.arcadesSignal.asReadonly();

  /**
   * Récupère toutes les bornes d'arcade
   */
  getAllArcades(): Observable<Arcade[]> {
    return this.apiService.get<Arcade[]>('/arcades').pipe(
      tap(arcades => this.arcadesSignal.set(arcades))
    );
  }

  /**
   * Récupère une borne par son ID
   */
  getArcadeById(id: number): Observable<Arcade> {
    return this.apiService.get<Arcade>(`/arcades/${id}`);
  }

  /**
   * Récupère la file d'attente d'une borne (avec clé API)
   */
  getArcadeQueue(arcadeId: number): Observable<QueueItem[]> {
    return this.apiService.get<QueueItem[]>(`/arcades/${arcadeId}/queue`);
  }

  /**
   * Récupère la configuration d'une borne (avec clé API)
   */
  getArcadeConfig(arcadeId: number): Observable<any> {
    return this.apiService.get(`/arcades/${arcadeId}/config`);
  }

  /**
   * Crée une nouvelle borne (admin)
   */
  createArcade(arcadeData: ArcadeCreate): Observable<any> {
    return this.apiService.post<any>('/admin/arcades', arcadeData);
  }

  /**
   * Assigne un jeu à une borne (admin)
   */
  assignGameToArcade(assignment: ArcadeGameAssignment): Observable<any> {
    return this.apiService.put(`/admin/arcades/${assignment.arcade_id}/games`, assignment);
  }

  /**
   * Retire le jeu d'un slot (admin)
   */
  removeGameFromSlot(arcadeId: number, slotNumber: number): Observable<void> {
    return this.apiService.delete<void>(`/admin/arcades/${arcadeId}/games/${slotNumber}`);
  }

  /**
   * Met à jour une borne (admin)
   */
  updateArcade(id: number, arcadeData: ArcadeUpdate): Observable<Arcade> {
    return this.apiService.put<Arcade>(`/admin/arcades/${id}`,
      arcadeData
    ).pipe(
      tap(updatedArcade => {
        this.arcadesSignal.update(arcades => 
          arcades.map(arcade => arcade.id === id ? updatedArcade : arcade)
        );
      })
    );
  }

  /**
   * Supprime une borne (admin)
   */
  deleteArcade(id: number): Observable<void> {
    return this.apiService.delete<void>(`/admin/arcades/${id}`).pipe(
      tap(() => {
        this.arcadesSignal.update(arcades => 
          arcades.filter(arcade => arcade.id !== id)
        );
      })
    );
  }

  /**
   * Efface le cache des bornes
   */
  clearCache(): void {
    this.arcadesSignal.set([]);
  }
}