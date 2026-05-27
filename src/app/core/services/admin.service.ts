import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/user.model';
import { AdminListItem, AdminRole, OwnerListItem, UnassignedArcade } from '../models/admin.model';

export interface AdminStats {
  active_users: number;
  total_arcades: number;
  total_games: number;
  active_promo_codes: number;
  total_tickets_in_circulation: number;
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

  listAdmins(role?: AdminRole): Observable<AdminListItem[]> {
    const path = role ? `/admin/admins/?role=${role}` : '/admin/admins/';
    return this.apiService.get<AdminListItem[]>(path);
  }

  deleteAdmin(adminId: number): Observable<any> {
    return this.apiService.delete(`/admin/admins/${adminId}`);
  }

  inviteArcadeOwner(email: string, arcadeId?: number | null): Observable<any> {
    const payload: { email: string; arcade_id?: number } = { email };
    if (arcadeId != null) {
      payload.arcade_id = arcadeId;
    }
    return this.apiService.post('/admin/invitations/', payload);
  }

  inviteSuperAdmin(email: string): Observable<any> {
    return this.apiService.post('/admin/invitations/super-admin', { email });
  }

  listOwners(): Observable<OwnerListItem[]> {
    return this.apiService.get<OwnerListItem[]>('/admin/owners');
  }

  listUnassignedArcades(): Observable<UnassignedArcade[]> {
    return this.apiService.get<UnassignedArcade[]>('/admin/arcades/unassigned');
  }

  assignArcadeToOwner(adminId: number, arcadeId: number): Observable<any> {
    return this.apiService.put(`/admin/owners/${adminId}/arcades/${arcadeId}`, {});
  }

  unassignArcadeFromOwner(adminId: number, arcadeId: number): Observable<any> {
    return this.apiService.delete(`/admin/owners/${adminId}/arcades/${arcadeId}`);
  }
}
