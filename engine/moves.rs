// Legal move generation

use serde::{Serialize, Deserialize};
use crate::{Player, board::Board};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Move {
    pub from: u8,
    pub to: u8,
    pub player: Player,
}

// Sentinel values:
// from=0  → White entering from bar
// from=25 → Black entering from bar
// to=0    → White bearing off
// to=25   → Black bearing off

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MoveSequence {
    pub moves: Vec<Move>,
}

pub(crate) fn apply_single_move(board: &Board, mv: Move) -> Board {
    let mut b = board.clone();

    // Remove checker from source
    match mv.player {
        Player::White => {
            if mv.from == 0 {
                b.points[0] -= 1; // remove from White bar
            } else {
                b.points[mv.from as usize] -= 1;
            }
        }
        Player::Black => {
            if mv.from == 25 {
                b.points[25] += 1; // remove from Black bar (magnitude decreases)
            } else {
                b.points[mv.from as usize] += 1; // Black checkers are negative
            }
        }
    }

    // Handle destination
    match mv.player {
        Player::White => {
            if mv.to == 0 {
                b.off_white += 1;
            } else {
                let to = mv.to as usize;
                if b.points[to] == -1 {
                    // Hit Black blot — send to bar
                    b.points[to] = 0;
                    b.points[25] -= 1;
                }
                b.points[to] += 1;
            }
        }
        Player::Black => {
            if mv.to == 25 {
                b.off_black += 1;
            } else {
                let to = mv.to as usize;
                if b.points[to] == 1 {
                    // Hit White blot — send to bar
                    b.points[to] = 0;
                    b.points[0] += 1;
                }
                b.points[to] -= 1;
            }
        }
    }

    b
}

fn dice_permutations(dice: &[u8]) -> Vec<Vec<u8>> {
    if dice.len() == 2 && dice[0] == dice[1] {
        vec![vec![dice[0], dice[0], dice[0], dice[0]]]
    } else if dice.len() == 2 {
        vec![vec![dice[0], dice[1]], vec![dice[1], dice[0]]]
    } else {
        vec![dice.to_vec()]
    }
}

fn get_moves_for_die(board: &Board, player: Player, die: u8) -> Vec<Move> {
    match player {
        Player::White => {
            if board.checkers_on_bar(Player::White) > 0 {
                // Must enter from bar; entry point = 25 - die
                let to = 25u8.saturating_sub(die);
                if to >= 1 && to <= 24 && board.is_open(to as usize, Player::White) {
                    return vec![Move { from: 0, to, player: Player::White }];
                }
                return vec![];
            }
            let mut moves = Vec::new();
            for from in 1usize..=24 {
                if board.points[from] > 0 {
                    let to_signed = from as i8 - die as i8;
                    if to_signed >= 1 {
                        let to = to_signed as u8;
                        if board.is_open(to as usize, Player::White) {
                            moves.push(Move { from: from as u8, to, player: Player::White });
                        }
                    } else if to_signed == 0 {
                        if board.all_in_home(Player::White) {
                            moves.push(Move { from: from as u8, to: 0, player: Player::White });
                        }
                    } else {
                        // Overshoot
                        if board.all_in_home(Player::White) {
                            let blocked = (from + 1..=6).any(|p| board.points[p] > 0);
                            if !blocked {
                                moves.push(Move { from: from as u8, to: 0, player: Player::White });
                            }
                        }
                    }
                }
            }
            moves
        }
        Player::Black => {
            if board.checkers_on_bar(Player::Black) > 0 {
                // Must enter from bar; entry point = die
                let to = die;
                if to >= 1 && to <= 24 && board.is_open(to as usize, Player::Black) {
                    return vec![Move { from: 25, to, player: Player::Black }];
                }
                return vec![];
            }
            let mut moves = Vec::new();
            for from in 1usize..=24 {
                if board.points[from] < 0 {
                    let to_val = from as i32 + die as i32;
                    if to_val <= 24 {
                        let to = to_val as u8;
                        if board.is_open(to as usize, Player::Black) {
                            moves.push(Move { from: from as u8, to, player: Player::Black });
                        }
                    } else if to_val == 25 {
                        if board.all_in_home(Player::Black) {
                            moves.push(Move { from: from as u8, to: 25, player: Player::Black });
                        }
                    } else {
                        // Overshoot
                        if board.all_in_home(Player::Black) {
                            let blocked = (19..from).any(|p| board.points[p] < 0);
                            if !blocked {
                                moves.push(Move { from: from as u8, to: 25, player: Player::Black });
                            }
                        }
                    }
                }
            }
            moves
        }
    }
}

fn collect_sequences(
    board: &Board,
    player: Player,
    remaining_dice: &[u8],
    current: &MoveSequence,
    results: &mut Vec<MoveSequence>,
) {
    if remaining_dice.is_empty() {
        results.push(current.clone());
        return;
    }
    let die = remaining_dice[0];
    let moves = get_moves_for_die(board, player, die);
    if moves.is_empty() {
        if !current.moves.is_empty() {
            results.push(current.clone());
        }
        return;
    }
    for mv in moves {
        let new_board = apply_single_move(board, mv);
        let mut new_current = current.clone();
        new_current.moves.push(mv);
        collect_sequences(&new_board, player, &remaining_dice[1..], &new_current, results);
    }
}

fn die_used(mv: &Move, player: Player) -> u8 {
    match player {
        Player::White => {
            if mv.from == 0 {
                25 - mv.to // bar entry
            } else {
                mv.from - mv.to // normal move or exact bearoff; overshoot returns `from` (approximate)
            }
        }
        Player::Black => {
            if mv.from == 25 {
                mv.to // bar entry
            } else {
                mv.to - mv.from // normal move or exact bearoff
            }
        }
    }
}

pub fn get_legal_sequences(board: &Board, player: Player, dice: &[u8]) -> Vec<MoveSequence> {
    let mut all_seqs: Vec<MoveSequence> = Vec::new();
    for perm in dice_permutations(dice) {
        collect_sequences(board, player, &perm, &MoveSequence { moves: vec![] }, &mut all_seqs);
    }

    // Dedup (order-preserving)
    let mut unique: Vec<MoveSequence> = Vec::new();
    for seq in all_seqs {
        if !unique.contains(&seq) {
            unique.push(seq);
        }
    }

    // Keep only max-length sequences (must use maximum dice)
    let max_len = unique.iter().map(|s| s.moves.len()).max().unwrap_or(0);
    if max_len == 0 {
        return vec![];
    }
    unique.retain(|s| s.moves.len() == max_len);

    // If only 1 move possible with non-doubles, must use the higher die
    if max_len == 1 && dice.len() == 2 && dice[0] != dice[1] {
        let higher = dice.iter().copied().max().unwrap();
        let using_higher: Vec<_> = unique.iter()
            .filter(|s| die_used(&s.moves[0], player) == higher)
            .cloned()
            .collect();
        if !using_higher.is_empty() {
            unique = using_higher;
        }
    }

    unique
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::board::Board;

    fn white_board(points_data: &[(usize, i8)]) -> Board {
        let mut points = [0i8; 26];
        for &(idx, val) in points_data {
            points[idx] = val;
        }
        Board { points, off_white: 0, off_black: 0 }
    }

    #[test]
    fn test_legal_moves_basic() {
        // One White checker at 8, dice [3,5]: both dice should be used
        let board = white_board(&[(8, 1)]);
        let seqs = get_legal_sequences(&board, Player::White, &[3, 5]);
        assert!(!seqs.is_empty(), "Should have legal sequences");
        let max_len = seqs.iter().map(|s| s.moves.len()).max().unwrap();
        assert_eq!(max_len, 2, "Should use both dice");
    }

    #[test]
    fn test_blocked_point() {
        // White checker at 8, Black×2 at 5, die [3]: destination blocked
        let board = white_board(&[(8, 1), (5, -2)]);
        let seqs = get_legal_sequences(&board, Player::White, &[3]);
        assert!(seqs.is_empty(), "Blocked point: no legal moves");
    }

    #[test]
    fn test_hit_blot() {
        // White checker at 8, Black blot at 5, die [3]: move to 5 hits blot
        let board = white_board(&[(8, 1), (5, -1)]);
        let seqs = get_legal_sequences(&board, Player::White, &[3]);
        assert_eq!(seqs.len(), 1);
        let mv = seqs[0].moves[0];
        assert_eq!(mv.from, 8);
        assert_eq!(mv.to, 5);
        // Verify the blot is hit: apply the move and check bar
        let new_board = apply_single_move(&board, mv);
        assert_eq!(new_board.points[5], 1, "White should occupy point 5");
        assert_eq!(new_board.points[25], -1, "Black should be on bar");
    }

    #[test]
    fn test_bar_entry() {
        // White on bar and at point 8; die [4]: only bar entry move allowed
        let board = white_board(&[(0, 1), (8, 1)]);
        let seqs = get_legal_sequences(&board, Player::White, &[4]);
        assert_eq!(seqs.len(), 1);
        let mv = seqs[0].moves[0];
        assert_eq!(mv.from, 0, "Must enter from bar");
        assert_eq!(mv.to, 21, "Die 4 enters at 25-4=21");
    }

    #[test]
    fn test_bar_blocked() {
        // White on bar; Black×2 at all entry points (19–24); die [3]
        let mut points = [0i8; 26];
        points[0] = 1; // White on bar
        for i in 19..=24 {
            points[i] = -2; // Black owns all entry points
        }
        let board = Board { points, off_white: 0, off_black: 0 };
        let seqs = get_legal_sequences(&board, Player::White, &[3]);
        assert!(seqs.is_empty(), "All entry points blocked");
    }

    #[test]
    fn test_bearing_off_exact() {
        // White checker at 4 only; die [4]: exact bear-off
        let board = white_board(&[(4, 1)]);
        let seqs = get_legal_sequences(&board, Player::White, &[4]);
        assert_eq!(seqs.len(), 1);
        assert_eq!(seqs[0].moves[0].to, 0, "Should bear off (to=0)");
    }

    #[test]
    fn test_bearing_off_higher_die() {
        // White checker at 3 only; die [5]: overshoot bear-off (no higher checker)
        let board = white_board(&[(3, 1)]);
        let seqs = get_legal_sequences(&board, Player::White, &[5]);
        assert_eq!(seqs.len(), 1);
        assert_eq!(seqs[0].moves[0].to, 0, "Should bear off via overshoot");
    }

    #[test]
    fn test_doubles() {
        // White: 2 at 6, 1 at 8; dice [4,4]: should produce multi-move sequences
        let board = white_board(&[(6, 2), (8, 1)]);
        let seqs = get_legal_sequences(&board, Player::White, &[4, 4]);
        assert!(!seqs.is_empty(), "Should have legal sequences with doubles");
        let max_len = seqs.iter().map(|s| s.moves.len()).max().unwrap();
        assert!(max_len > 1, "Should use multiple dice with doubles");
    }

    #[test]
    fn test_forced_higher_die() {
        // White checker at 5, Black×2 at 4; dice [1,4]: only die-4 move (5→1) is legal
        let board = white_board(&[(5, 1), (4, -2)]);
        let seqs = get_legal_sequences(&board, Player::White, &[1, 4]);
        assert_eq!(seqs.len(), 1, "Only one legal sequence");
        let mv = seqs[0].moves[0];
        assert_eq!(mv.from, 5);
        assert_eq!(mv.to, 1, "Must use die 4 (5→1), not die 1 (blocked)");
    }
}
