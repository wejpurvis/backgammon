export type Player = 'White' | 'Black'

export type Phase = 'Rolling' | 'Moving' | 'CubeOffered' | 'GameOver'

export type WinType = 'Normal' | 'Gammon' | 'Backgammon'

export type CubeOwner = 'Centre' | 'White' | 'Black'

export interface Board {
  points: number[]   // [i8; 26]: index 0 = White bar (positive), 25 = Black bar (negative)
  off_white: number
  off_black: number
}

export interface GameState {
  board: Board
  current_player: Player
  dice: [number, number]
  phase: Phase
  cube_value: number
  cube_owner: CubeOwner
}

export interface MatchState {
  score_white: number
  score_black: number
  target: number
  games_played: number
  crawford_done: boolean
  is_crawford_game: boolean
}

export interface Move {
  from: number
  to: number
  player: Player
}

export interface MoveSequence {
  moves: Move[]
}

export interface GameOverResult {
  winner: Player
  win_type: WinType
  points: number
}
