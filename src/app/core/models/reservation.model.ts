export enum ReservationStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Reservation {
  id: number;
  player_id: number;
  player2_id?: number;
  arcade_id: number;
  game_id: number;
  unlock_code: string;
  status: ReservationStatus;
  tickets_used: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted: boolean;
}

export interface CreateReservationRequest {
  arcade_id: number;
  game_id: number;
  player2_id?: number;
}

export interface ReservationResponse {
  id: number;
  unlock_code: string;
  status: ReservationStatus;
  arcade_name: string;
  game_name: string;
  player_pseudo: string;
  player2_pseudo?: string;
  tickets_used: number;
  position_in_queue?: number;
  created_at?: string;
}