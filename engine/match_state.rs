// Match state — scores, target, Crawford rule

use serde::{Serialize, Deserialize};
use crate::Player;
use crate::game::WinType;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MatchState {
    pub score_white: u32,
    pub score_black: u32,
    pub target: u32,
    pub games_played: u32,
    pub crawford_done: bool,
    pub is_crawford_game: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MatchResult {
    pub winner: Player,
    pub points_awarded: u32,
    pub outcome_type: WinType,
    pub cube_value: u8,
}

impl MatchState {
    pub fn new(target: u32) -> Self {
        MatchState {
            score_white: 0,
            score_black: 0,
            target,
            games_played: 0,
            crawford_done: false,
            is_crawford_game: false,
        }
    }
}

pub fn is_match_over(state: &MatchState) -> Option<Player> {
    if state.score_white >= state.target {
        Some(Player::White)
    } else if state.score_black >= state.target {
        Some(Player::Black)
    } else {
        None
    }
}

pub fn record_game_result(state: &MatchState, result: &MatchResult) -> MatchState {
    let mut s = state.clone();

    match result.winner {
        Player::White => s.score_white += result.points_awarded,
        Player::Black => s.score_black += result.points_awarded,
    }
    s.games_played += 1;

    // Crawford rule: the game after one player first reaches target-1 is played without the cube
    let was_crawford = s.is_crawford_game;
    if was_crawford {
        s.crawford_done = true;
        s.is_crawford_game = false;
    } else if !state.crawford_done {
        let w_at_minus1 = s.score_white == s.target.saturating_sub(1);
        let b_at_minus1 = s.score_black == s.target.saturating_sub(1);
        if w_at_minus1 || b_at_minus1 {
            s.is_crawford_game = true;
        }
    }

    s
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_match_score_update() {
        let ms = MatchState::new(5);
        let result = MatchResult {
            winner: Player::White,
            points_awarded: 2,
            outcome_type: WinType::Gammon,
            cube_value: 1,
        };
        let ms2 = record_game_result(&ms, &result);
        assert_eq!(ms2.score_white, 2);
        assert_eq!(ms2.score_black, 0);
        assert_eq!(ms2.games_played, 1);
    }

    #[test]
    fn test_match_over_at_target() {
        let mut ms = MatchState::new(5);
        ms.score_white = 4;
        let result = MatchResult {
            winner: Player::White,
            points_awarded: 1,
            outcome_type: WinType::Normal,
            cube_value: 1,
        };
        let ms2 = record_game_result(&ms, &result);
        assert_eq!(is_match_over(&ms2), Some(Player::White));
    }

    #[test]
    fn test_match_not_over_before_target() {
        let mut ms = MatchState::new(5);
        ms.score_white = 3;
        let result = MatchResult {
            winner: Player::White,
            points_awarded: 1,
            outcome_type: WinType::Normal,
            cube_value: 1,
        };
        let ms2 = record_game_result(&ms, &result);
        assert_eq!(is_match_over(&ms2), None);
    }
}
