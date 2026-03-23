// GameState, phase management, win detection

use serde::{Serialize, Deserialize};
use crate::{Player, board::Board};
use crate::moves::{Move, MoveSequence, apply_single_move};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Phase {
    Rolling,
    Moving,
    CubeOffered,
    GameOver,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum WinType {
    Normal,
    Gammon,
    Backgammon,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum CubeOwner {
    Centre,
    White,
    Black,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GameState {
    pub board: Board,
    pub current_player: Player,
    pub dice: (u8, u8),
    pub phase: Phase,
    pub cube_value: u8,
    pub cube_owner: CubeOwner,
}

impl GameState {
    pub fn new() -> Self {
        GameState {
            board: Board::new(),
            current_player: Player::White,
            dice: (0, 0),
            phase: Phase::Rolling,
            cube_value: 1,
            cube_owner: CubeOwner::Centre,
        }
    }
}

pub fn apply_move(state: &GameState, mv: Move) -> GameState {
    GameState {
        board: apply_single_move(&state.board, mv),
        current_player: state.current_player,
        dice: state.dice,
        phase: state.phase,
        cube_value: state.cube_value,
        cube_owner: state.cube_owner,
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
        cube_value: state.cube_value,
        cube_owner: state.cube_owner,
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
        let mut points = [0i8; 26];
        points[10] = -15;
        let board = Board { points, off_white: 15, off_black: 0 };
        let result = is_game_over(&board);
        assert_eq!(result, Some((Player::White, WinType::Gammon)));
    }

    #[test]
    fn test_backgammon_detection() {
        let mut points = [0i8; 26];
        points[25] = -15;
        let board = Board { points, off_white: 15, off_black: 0 };
        let result = is_game_over(&board);
        assert_eq!(result, Some((Player::White, WinType::Backgammon)));
    }

    #[test]
    fn test_points_calculation() {
        // Gammon = 2 * cube_value
        let mut points = [0i8; 26];
        points[10] = -15;
        let board = Board { points, off_white: 15, off_black: 0 };
        let (_, win_type) = is_game_over(&board).unwrap();
        let cube_value = 4u32;
        let pts = match win_type {
            WinType::Normal => 1,
            WinType::Gammon => 2,
            WinType::Backgammon => 3,
        } * cube_value;
        assert_eq!(pts, 8, "Gammon × cube 4 = 8 points");

        // Backgammon × cube 2 = 6
        let mut points2 = [0i8; 26];
        points2[25] = -15;
        let board2 = Board { points: points2, off_white: 15, off_black: 0 };
        let (_, win_type2) = is_game_over(&board2).unwrap();
        let pts2 = match win_type2 {
            WinType::Normal => 1,
            WinType::Gammon => 2,
            WinType::Backgammon => 3,
        } * 2u32;
        assert_eq!(pts2, 6, "Backgammon × cube 2 = 6 points");
    }
}
