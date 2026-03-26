// WASM exports via wasm-bindgen

pub mod board;
pub mod moves;
pub mod game;
pub mod cube;
pub mod match_state;

use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Player {
    White,
    Black,
}

// ── Dice rolling ─────────────────────────────────────────────────────────────

#[cfg(target_arch = "wasm32")]
fn roll_dice_impl() -> (u8, u8) {
    use js_sys::Math;
    let d1 = (Math::random() * 6.0).floor() as u8 + 1;
    let d2 = (Math::random() * 6.0).floor() as u8 + 1;
    (d1, d2)
}

#[cfg(not(target_arch = "wasm32"))]
fn roll_dice_impl() -> (u8, u8) {
    use std::time::SystemTime;
    let nanos = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(12345);
    let d1 = ((nanos % 6) + 1) as u8;
    let d2 = (((nanos / 7) % 6) + 1) as u8;
    (d1, d2)
}

// ── Response types ────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct NewGameResponse {
    game: game::GameState,
    match_state: match_state::MatchState,
}

#[derive(Serialize)]
struct GameOverResult {
    winner: Player,
    win_type: game::WinType,
    points: u32,
    cube_value: u8,
}

#[derive(Serialize)]
struct RespondToDoubleResponse {
    accepted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    state: Option<game::GameState>,
    #[serde(skip_serializing_if = "Option::is_none")]
    winner: Option<Player>,
    #[serde(skip_serializing_if = "Option::is_none")]
    points: Option<u32>,
}

// ── WASM exports ──────────────────────────────────────────────────────────────

/// Returns JSON `{"game": GameState, "match_state": MatchState}`.
#[wasm_bindgen]
pub fn new_game(match_length: u8) -> String {
    let response = NewGameResponse {
        game: game::GameState::new(),
        match_state: match_state::MatchState::new(match_length as u32),
    };
    serde_json::to_string(&response).unwrap()
}

/// Rolls dice and advances phase to Moving. Takes/returns JSON GameState.
#[wasm_bindgen]
pub fn roll_dice(state_json: &str) -> String {
    let mut state: game::GameState = serde_json::from_str(state_json).unwrap();
    state.dice = roll_dice_impl();
    state.phase = game::Phase::Moving;
    serde_json::to_string(&state).unwrap()
}

/// Returns JSON array of legal `MoveSequence`s based on the dice in state.
#[wasm_bindgen]
pub fn get_legal_moves(state_json: &str) -> String {
    let state: game::GameState = serde_json::from_str(state_json).unwrap();
    let dice = [state.dice.0, state.dice.1];
    let seqs = moves::get_legal_sequences(&state.board, state.current_player, &dice);
    serde_json::to_string(&seqs).unwrap()
}

/// Applies a full `MoveSequence` and returns JSON GameState for the next player.
#[wasm_bindgen]
pub fn apply_move(state_json: &str, sequence_json: &str) -> String {
    let state: game::GameState = serde_json::from_str(state_json).unwrap();
    let seq: moves::MoveSequence = serde_json::from_str(sequence_json).unwrap();
    let new_state = game::apply_sequence(&state, &seq);
    serde_json::to_string(&new_state).unwrap()
}

/// Returns JSON `null` if ongoing, or `{winner, win_type, points}` if game over.
#[wasm_bindgen]
pub fn is_game_over(state_json: &str) -> String {
    let state: game::GameState = serde_json::from_str(state_json).unwrap();
    match game::is_game_over(&state.board) {
        None => "null".to_string(),
        Some((winner, win_type)) => {
            let base = match win_type {
                game::WinType::Normal => 1u32,
                game::WinType::Gammon => 2,
                game::WinType::Backgammon => 3,
            };
            serde_json::to_string(&GameOverResult {
                winner,
                win_type,
                points: base * state.cube_value as u32,
                cube_value: state.cube_value,
            })
            .unwrap()
        }
    }
}

/// Offers the doubling cube. Returns JSON GameState with `phase: "CubeOffered"`.
#[wasm_bindgen]
pub fn offer_double(state_json: &str) -> String {
    let state: game::GameState = serde_json::from_str(state_json).unwrap();
    serde_json::to_string(&cube::offer_double(&state)).unwrap()
}

/// Accept or reject a cube offer.
/// Accept → `{"accepted": true, "state": GameState}`
/// Reject → `{"accepted": false, "winner": Player, "points": u32}`
#[wasm_bindgen]
pub fn respond_to_double(state_json: &str, accept: bool) -> String {
    let state: game::GameState = serde_json::from_str(state_json).unwrap();
    if accept {
        serde_json::to_string(&RespondToDoubleResponse {
            accepted: true,
            state: Some(cube::accept_double(&state)),
            winner: None,
            points: None,
        })
        .unwrap()
    } else {
        // Rejector concedes — the offering player (current_player) wins at current cube value
        serde_json::to_string(&RespondToDoubleResponse {
            accepted: false,
            state: None,
            winner: Some(state.current_player),
            points: Some(state.cube_value as u32),
        })
        .unwrap()
    }
}

/// Returns true if the current player is allowed to offer the cube.
#[wasm_bindgen]
pub fn can_offer_double(state_json: &str) -> bool {
    let state: game::GameState = serde_json::from_str(state_json).unwrap();
    cube::can_offer_double(&state)
}

/// Opponent accepts the cube offer. Returns JSON GameState with doubled cube value.
#[wasm_bindgen]
pub fn accept_double(state_json: &str) -> String {
    let state: game::GameState = serde_json::from_str(state_json).unwrap();
    serde_json::to_string(&cube::accept_double(&state)).unwrap()
}

/// Opponent rejects (resigns) the cube offer. Returns JSON GameOverResult.
#[wasm_bindgen]
pub fn reject_double(state_json: &str) -> String {
    let state: game::GameState = serde_json::from_str(state_json).unwrap();
    let result = cube::reject_double(&state);
    serde_json::to_string(&GameOverResult {
        winner: result.winner,
        win_type: result.outcome_type,
        points: result.points_awarded,
        cube_value: result.cube_value,
    })
    .unwrap()
}

/// Returns JSON `{"white": u32, "black": u32}` pip counts for the current board.
/// White: each checker at point p contributes p pips; bar checker = 25.
/// Black: each checker at point p contributes (25-p) pips; bar checker = 25.
#[wasm_bindgen]
pub fn pip_count(state_json: &str) -> String {
    let state: game::GameState = serde_json::from_str(state_json).unwrap();
    let board = &state.board;
    let mut white: u32 = board.points[0] as u32 * 25;
    let mut black: u32 = board.points[25].unsigned_abs() as u32 * 25;
    for p in 1usize..=24 {
        let v = board.points[p];
        if v > 0 { white += v as u32 * p as u32; }
        else if v < 0 { black += (-v) as u32 * (25 - p as u32); }
    }
    format!("{{\"white\":{},\"black\":{}}}", white, black)
}

/// Records a completed game result and returns the updated JSON `MatchState`.
#[wasm_bindgen]
pub fn get_match_state(match_json: &str, result_json: &str) -> String {
    let ms: match_state::MatchState = serde_json::from_str(match_json).unwrap();
    let result: match_state::MatchResult = serde_json::from_str(result_json).unwrap();
    serde_json::to_string(&match_state::record_game_result(&ms, &result)).unwrap()
}
