// GameState, phase management, win detection

use crate::{Player, board::Board};
use crate::moves::{Move, MoveSequence, apply_single_move};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Phase {
    Rolling,
    Moving,
    GameOver,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WinType {
    Normal,
    Gammon,
    Backgammon,
}

#[derive(Clone, Debug)]
pub struct GameState {
    pub board: Board,
    pub current_player: Player,
    pub dice: (u8, u8),
    pub phase: Phase,
}

#[cfg(not(target_arch = "wasm32"))]
pub fn roll_dice() -> (u8, u8) {
    use std::time::SystemTime;
    let nanos = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(12345);
    let d1 = ((nanos % 6) + 1) as u8;
    let d2 = (((nanos / 7) % 6) + 1) as u8;
    (d1, d2)
}

#[cfg(target_arch = "wasm32")]
pub fn roll_dice() -> (u8, u8) {
    (1, 1) // replaced by js_sys in Phase 2
}

pub fn apply_move(state: &GameState, mv: Move) -> GameState {
    GameState {
        board: apply_single_move(&state.board, mv),
        current_player: state.current_player,
        dice: state.dice,
        phase: state.phase,
    }
}

pub fn apply_sequence(state: &GameState, seq: &MoveSequence) -> GameState {
    let mut board = state.board.clone();
    for &mv in &seq.moves {
        board = apply_single_move(&board, mv);
    }
    let next_player = match state.current_player {
        Player::White => Player::Black,
        Player::Black => Player::White,
    };
    GameState {
        board,
        current_player: next_player,
        dice: (0, 0),
        phase: Phase::Rolling,
    }
}

pub fn is_game_over(board: &Board) -> Option<(Player, WinType)> {
    if board.off_white == 15 {
        Some((Player::White, classify_win(board, Player::White)))
    } else if board.off_black == 15 {
        Some((Player::Black, classify_win(board, Player::Black)))
    } else {
        None
    }
}

fn classify_win(board: &Board, winner: Player) -> WinType {
    let (loser_off, loser_on_bar, loser_in_winners_home) = match winner {
        Player::White => {
            let loser_off = board.off_black;
            let on_bar = board.points[25] < 0;
            let in_home = (1usize..=6).any(|p| board.points[p] < 0);
            (loser_off, on_bar, in_home)
        }
        Player::Black => {
            let loser_off = board.off_white;
            let on_bar = board.points[0] > 0;
            let in_home = (19usize..=24).any(|p| board.points[p] > 0);
            (loser_off, on_bar, in_home)
        }
    };

    if loser_off > 0 {
        WinType::Normal
    } else if loser_on_bar || loser_in_winners_home {
        WinType::Backgammon
    } else {
        WinType::Gammon
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gammon_detection() {
        // White has borne off all 15; Black has 15 checkers on board (not bar, not in 1–6)
        let mut points = [0i8; 26];
        points[10] = -15; // All Black checkers in the outfield
        let board = Board { points, off_white: 15, off_black: 0 };
        let result = is_game_over(&board);
        assert_eq!(result, Some((Player::White, WinType::Gammon)));
    }

    #[test]
    fn test_backgammon_detection() {
        // White has borne off all 15; Black has a checker on the bar
        let mut points = [0i8; 26];
        points[25] = -15; // All Black checkers on bar
        let board = Board { points, off_white: 15, off_black: 0 };
        let result = is_game_over(&board);
        assert_eq!(result, Some((Player::White, WinType::Backgammon)));
    }
}
