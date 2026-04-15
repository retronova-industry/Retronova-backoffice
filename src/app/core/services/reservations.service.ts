import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { 
  Reservation,
  CreateReservationRequest,
  ReservationResponse
} from '../models/reservation.model';

@Injectable({
  providedIn: 'root'
})
export class ReservationsService {
  private readonly apiService = inject(ApiService);
  
  // Signal pour les réservations de l'utilisateur
  private readonly reservationsSignal = signal<ReservationResponse[]>([]);
  readonly reservations = this.reservationsSignal.asReadonly();

  /**
   * Crée une nouvelle réservation
   */
  createReservation(reservationData: CreateReservationRequest): Observable<ReservationResponse> {
    return this.apiService.post<ReservationResponse>('/reservations', reservationData).pipe(
      tap(newReservation => {
        this.reservationsSignal.update(reservations => [newReservation, ...reservations]);
      })
    );
  }

  /**
   * Récupère les réservations de l'utilisateur connecté
   */
  getAllReservations(): Observable<ReservationResponse[]> {
    return this.apiService.get<ReservationResponse[]>('/admin/reservations/').pipe(
      tap(reservations => this.reservationsSignal.set(reservations))
    );
  }

  /**
   * Récupère une réservation spécifique
   */
  getReservationById(id: number): Observable<ReservationResponse> {
    return this.apiService.get<ReservationResponse>(`/reservations/${id}`);
  }

  /**
   * Annule une réservation
   */
  cancelReservation(id: number): Observable<any> {
    return this.apiService.delete(`/reservations/${id}`).pipe(
      tap(() => {
        this.reservationsSignal.update(reservations => 
          reservations.filter(reservation => reservation.id !== id)
        );
      })
    );
  }

  /**
   * Efface le cache des réservations
   */
  clearCache(): void {
    this.reservationsSignal.set([]);
  }
}