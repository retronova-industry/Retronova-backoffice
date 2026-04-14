export interface Arcade {
  id: number;
  nom: string;
  description?: string;
  api_key: string;
  localisation: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted: boolean;
  games?: GameOnArcade[];
}

export interface GameOnArcade {
  id: number;
  nom: string;
  description?: string;
  min_players: number;
  max_players: number;
  ticket_cost: number;
  slot_number: number; // 1 ou 2
}

export interface ArcadeCreate {
  nom: string;
  description: string;
  localisation: string;
  latitude: number;
  longitude: number;
}

export interface ArcadeUpdate {
  nom?: string;
  description?: string;
  localisation?: string;
  latitude?: number;
  longitude?: number;
}

export interface ArcadeGameAssignment {
  arcade_id: number;
  game_id: number;
  slot_number: number;
}

export interface QueueItem {
  id: number;
  player_pseudo: string;
  player2_pseudo?: string;
  game_name: string;
  unlock_code: string;
  position: number;
}