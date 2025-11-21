export type GameMode = 'voice' | 'text';

export type GameStatus = 
  | 'waiting' 
  | 'starting' 
  | 'word_reveal' 
  | 'discussion' 
  | 'voting' 
  | 'results' 
  | 'finished';

export interface Player {
  id: string;
  name: string;
  is_impostor: boolean;
  is_leader: boolean;
  points: number;
  has_answered?: boolean;
  answer?: string;
  vote?: string;
  is_voted_out?: boolean;
}

export interface Game {
  id: string;
  code: string;
  status: GameStatus;
  mode: GameMode;
  round_time: number; // en segundos
  current_round: number;
  max_rounds: number;
  current_word?: string;
  impostor_id?: string;
  leader_id: string;
  created_at: string;
  players: Player[];
  votes?: Record<string, string>; // player_id -> voted_player_id
  round_started_at?: string;
  current_turn_player_id?: string;
}

export interface GameSettings {
  mode: GameMode;
  roundTime: number;
  maxRounds: number;
}

