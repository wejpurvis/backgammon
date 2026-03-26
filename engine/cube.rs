// Doubling cube logic

use crate::{Player, game::{GameState, Phase, CubeOwner}, match_state};

pub fn can_offer_double(state: &GameState) -> bool {
    if state.phase != Phase::Rolling {
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
