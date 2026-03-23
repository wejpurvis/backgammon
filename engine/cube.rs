// Doubling cube logic

use crate::{Player, game::{GameState, Phase, CubeOwner}};

pub fn can_double(state: &GameState) -> bool {
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

#[cfg(test)]
mod tests {
    use super::*;
    fn base_state() -> GameState {
        GameState::new()
    }

    #[test]
    fn test_cube_double_and_accept() {
        let state = base_state(); // cube_value=1, cube_owner=Centre, phase=Rolling
        assert!(can_double(&state));

        let offered = offer_double(&state);
        assert_eq!(offered.phase, Phase::CubeOffered);
        assert_eq!(offered.cube_value, 1);

        let accepted = accept_double(&offered);
        assert_eq!(accepted.cube_value, 2);
        assert_eq!(accepted.cube_owner, CubeOwner::Black); // White offered, Black accepted → Black owns
        assert_eq!(accepted.phase, Phase::Rolling);
    }

    #[test]
    fn test_cube_reject() {
        // Reject is handled in lib.rs (returns winner info); cube logic just tracks state.
        // Here we verify that after accepting once, White can no longer double (Black owns cube).
        let state = base_state();
        let offered = offer_double(&state);
        let accepted = accept_double(&offered); // Black now owns cube at 2

        // White tries to double — should be blocked (Black owns cube)
        let white_turn = GameState {
            current_player: Player::White,
            ..accepted.clone()
        };
        assert!(!can_double(&white_turn), "White cannot double when Black owns cube");

        // Black's turn — should be allowed
        let black_turn = GameState {
            current_player: Player::Black,
            ..accepted.clone()
        };
        assert!(can_double(&black_turn), "Black can double when Black owns cube");
    }

    #[test]
    fn test_cannot_double_mid_move() {
        let mut state = base_state();
        state.phase = Phase::Moving;
        assert!(!can_double(&state), "Cannot double during Moving phase");
    }
}
