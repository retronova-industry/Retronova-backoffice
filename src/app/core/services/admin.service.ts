import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

export interface AdminStats {
  active_users: number;
  total_arcades: number;
  total_games: number;
  active_promo_codes: number;
  total_tickets_in_circulation: number;
  ticket_revenue: {
    current_month: number;
    previous_month: number;
    currency: string;
  };
  top_games: Array<{
    game_id: number;
    name: string;
    play_count: number;
  }>;
  arcade_occupancy: {
    total_arcades: number;
    occupied_arcades: number;
    occupancy_rate: number;
    arcades: Array<{
      arcade_id: number;
      name: string;
      active_reservations: number;
      occupancy_rate: number;
    }>;
  };
  reservations_evolution: Array<{
    date: string;
    reservations: number;
  }>;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private apiService: ApiService) {}
  
  getStats(): Observable<AdminStats> {
    return this.apiService.get<AdminStats>('/admin/stats');
  }
  
  getDeletedUsers(): Observable<User[]> {
    return this.apiService.get<User[]>('/admin/users/deleted');
  }
  
  restoreUser(userId: number): Observable<any> {
    return this.apiService.put(`/admin/users/${userId}/restore`, {});
  }
}