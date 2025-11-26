import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Party } from '../models/party.model';
import { Game } from '../models/game.model';

@Injectable({
  providedIn: 'root'
})
export class PartiesService {
  constructor(private apiService: ApiService) {}
  
  // NOTE: The backend exposes /api/v1/games rather than /api/v1/parties; adapt accordingly.
  // We keep the Party model type to avoid API-wide refactors but the data may differ.
  getAllParties(includeDeleted: boolean = false): Observable<Party[]> {
    return this.apiService.get<Game[]>('/games', { include_deleted: includeDeleted }).pipe(
      map(games => games.map(g => this.gameToParty(g)))
    );
  }
  
  getActiveParties(): Observable<Party[]> {
    return this.apiService.get<Game[]>('/games', { done: false, cancel: false }).pipe(
      map(games => games.map(g => this.gameToParty(g)))
    );
  }
  
  getCompletedParties(): Observable<Party[]> {
    return this.apiService.get<Game[]>('/games', { done: true }).pipe(
      map(games => games.map(g => this.gameToParty(g)))
    );
  }
  
  getPartiesByMachine(machineId: string): Observable<Party[]> {
    return this.apiService.get<Game[]>('/games', { machine_id: machineId }).pipe(
      map(games => games.map(g => this.gameToParty(g)))
    );
  }
  
  getActivePartiesByMachine(machineId: string): Observable<Party[]> {
    return this.apiService.get<Game[]>('/games', { machine_id: machineId, done: false, cancel: false }).pipe(
      map(games => games.map(g => this.gameToParty(g)))
    );
  }
  
  getPartyById(id: string, includeDeleted: boolean = false): Observable<Party> {
    return this.apiService.get<Game>(`/games/${id}`, { include_deleted: includeDeleted }).pipe(
      map(g => this.gameToParty(g))
    );
  }

  private gameToParty(g: Game): Party {
    return {
      id: (g.id as unknown) as any,
      player1_id: null as any,
      player2_id: null as any,
      game_id: (g.id as unknown) as any,
      machine_id: null as any,
      total_score: null,
      p1_score: null,
      p2_score: null,
      password: null,
      done: false,
      cancel: false,
      bar: null,
      created_at: (g.created_at as unknown) as Date,
      updated_at: (g.updated_at as unknown) as Date,
      deleted_at: (g.deleted_at as unknown) as Date | null,
      is_deleted: !!g.is_deleted
    } as Party;
  }
}