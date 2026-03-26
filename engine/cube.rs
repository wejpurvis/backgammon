// Doubling cube logic

use crate::{Player, game::{GameState, Phase, CubeOwner}, board::Board, match_state};

/// Returns true if the two sides still have potential contact — i.e. the game
/// is not yet a pure race. Doubling is only legal while contact exists.
///
/// Contact exists when:
///   - Either player has checkers on the bar (must re-enter through opponent territory), OR
///   - The highest-numbered point holding a White checker is greater than the
///     lowest-numbered point holding a Black checker.
pub fn has_contact(board: &Board) -> bool {
    // Bar checkers: White bar = points[0] > 0, Black bar = points[25] < 0
    if board.points[0] > 0 || board.points[25] < 0 {
        return true;
    }
    let white_max = (1usize..=24).rev().find(|&p| board.points[p] > 0);
    let black_min = (1usize..=24).find(|&p| board.points[p] < 0);
    match (white_max, black_min) {
        (Some(w), Some(b)) => w > b,
        _ => false,
    }
}

pub fn can_offer_double(state: &GameState) -> bool {
    if state.phase != Phase::Rolling {
        return false;
    }
    if !has_contact(&state.board) {
        return false;
    }
    match state.cube_owner {
        CubeOwner::Centre => true,
        CubeOwner::White => matches!(state.current_player, Player::White),
        CubeOwner::Black => matches!(state.current_player, Player::Black),
    }
}

/// Offer the doubling cube. Moves phase to CubeOffered; opponent must respond.
pub fn offer_double(state: &GameState) -> GameState {
    GameState {
        phase: Phase::CubeOffered,
        ..state.clone()
    }
}

/// Opponent accepts: cube doubles, ownership transfers, play resumes.
pub fn accept_double(state: &GameState) -> GameState {
    // The offering player is current_player; cube ownership goes to the accepting side
    let new_owner = match state.current_player {
        Player::White => CubeOwner::Black,
        Player::Black => CubeOwner::White,
    };
    GameState {
        cube_value: state.cube_value * 2,
        cube_owner: new_owner,
        phase: Phase::Rolling,
        ..state.clone()
    }
}

/// Opponent rejects: offerer wins at current cube value.
pub fn reject_double(state: &GameState) -> match_state::MatchResult {
    match_state::MatchResult {
        winner: state.current_player,
        points_awarded: state.cube_value as u32,
        outcome_type: crate::game::WinType::Normal,
        cube_value: state.cube_value,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_has_contact_starting_position() {
        let state = GameState::new();
        assert!(has_contact(&state.board), "Starting position always has contact");
    }

    #[test]
    fn test_has_contact_pure_race() {
        // All White checkers below all Black checkers → pure race, no contact
        let mut points = [0i8; 26];
        points[5] = 15;  // White: all 15 on point 5
        points[10] = -15; // Black: all 15 on point 10 (higher than White)
        let board = Board { points, off_white: 0, off_black: 0 };
        assert!(!has_contact(&board), "Pure race: White max (5) < Black min (10)");
    }

    #[test]
    fn test_cannot_double_in_race() {
        let mut points = [0i8; 26];
        points[5] = 15;
        points[10] = -15;
        let state = GameState {
            board: Board { points, off_white: 0, off_black: 0 },
            ..GameState::new()
        };
        assert!(!can_offer_double(&state), "Cannot double when no contact exists");
    }

    #[test]
    fn test_cube_starts_at_one() {
        let state = GameState::new();
        assert_eq!(state.cube_value, 1);
        assert_eq!(state.cube_owner, CubeOwner::Centre);
    }

    #[test]
    fn test_cannot_double_after_roll() {
        let mut state = GameState::new();
        state.phase = Phase::Moving;
        assert!(!can_offer_double(&state), "Cannot double during Moving phase");
    }

    #[test]
    fn test_accept_doubles_value() {
        let state = GameState::new();
        let offered = offer_double(&state);
        assert_eq!(offered.phase, Phase::CubeOffered);
        assert_eq!(offered.cube_value, 1);
        let accepted = accept_double(&offered);
        assert_eq!(accepted.cube_value, 2);
        assert_eq!(accepted.cube_owner, CubeOwner::Black); // White offered → Black owns
        assert_eq!(accepted.phase, Phase::Rolling);
    }

    #[test]
    fn test_reject_awards_current_cube_value() {
        let state = GameState::new(); // cube_value = 1
        let offered = offer_double(&state);
        let result = reject_double(&offered);
        assert_eq!(result.points_awarded, 1, "Reject awards current cube value, not doubled");
        assert_eq!(result.winner, Player::White); // White offered (current_player)
    }

    #[test]
    fn test_cannot_double_if_opponent_owns_cube() {
        let state = GameState::new();
        let offered = offer_double(&state);
        let accepted = accept_double(&offered); // Black now owns cube at 2

        let white_turn = GameState { current_player: Player::White, ..accepted.clone() };
        assert!(!can_offer_double(&white_turn), "White cannot double when Black owns cube");

        let black_turn = GameState { current_player: Player::Black, ..accepted.clone() };
        assert!(can_offer_double(&black_turn), "Black can double when Black owns cube");
    }
}
