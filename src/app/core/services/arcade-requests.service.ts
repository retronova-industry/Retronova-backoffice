import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type ArcadeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ArcadeRequestPayload {
  nom: string;
  description?: string;
  localisation: string;
  latitude: number;
  longitude: number;
}

export interface ArcadeRequest {
  id: number;
  nom: string;
  description: string | null;
  localisation: string;
  latitude: number;
  longitude: number;
  status: ArcadeRequestStatus;
  rejection_reason: string | null;
  created_arcade_id: number | null;
  requester: { id: number; email: string } | null;
  reviewer: { id: number; email: string } | null;
  reviewed_at: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ArcadeRequestsService {
  constructor(private apiService: ApiService) {}

  submit(payload: ArcadeRequestPayload): Observable<{ message: string; request_id: number }> {
    return this.apiService.post('/admin/arcade-requests/', payload);
  }

  list(statusFilter?: ArcadeRequestStatus): Observable<ArcadeRequest[]> {
    const path = statusFilter ? `/admin/arcade-requests/?status_filter=${statusFilter}` : '/admin/arcade-requests/';
    return this.apiService.get<ArcadeRequest[]>(path);
  }

  pendingCount(): Observable<{ count: number }> {
    return this.apiService.get<{ count: number }>('/admin/arcade-requests/pending-count');
  }

  approve(requestId: number): Observable<{ message: string; arcade_id: number; request_id: number }> {
    return this.apiService.post(`/admin/arcade-requests/${requestId}/approve`, {});
  }

  reject(requestId: number, reason?: string): Observable<{ message: string; request_id: number }> {
    return this.apiService.post(`/admin/arcade-requests/${requestId}/reject`, { rejection_reason: reason ?? null });
  }
}
