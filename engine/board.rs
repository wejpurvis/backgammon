// Board state & representation

use std::fmt;
use serde::{Serialize, Deserialize};
use crate::Player;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Board {
    pub(crate) points: [i8; 26],
    pub off_white: u8,
    pub off_black: u8,
}

impl Board {
    pub fn new() -> Self {
        let mut points = [0i8; 26];
        // White (positive): +2@24, +5@13, +3@8, +5@6
        points[24] = 2;
        points[13] = 5;
        points[8] = 3;
        points[6] = 5;
        // Black (negative): -2@1, -5@12, -3@17, -5@19
        points[1] = -2;
        points[12] = -5;
        points[17] = -3;
        points[19] = -5;
        Board { points, off_white: 0, off_black: 0 }
    }

    pub(crate) fn checkers_on_bar(&self, player: Player) -> u8 {
        match player {
            Player::White => self.points[0].max(0) as u8,
            Player::Black => (-self.points[25]).max(0) as u8,
        }
    }

    pub(crate) fn all_in_home(&self, player: Player) -> bool {
        match player {
            Player::White => {
                if self.points[0] > 0 {
                    return false;
                }
                for i in 7..=24 {
                    if self.points[i] > 0 {
                        return false;
                    }
                }
                true
            }
            Player::Black => {
                if self.points[25] < 0 {
                    return false;
                }
                for i in 1..=18 {
                    if self.points[i] < 0 {
                        return false;
                    }
                }
                true
            }
        }
    }

    pub(crate) fn is_open(&self, point: usize, player: Player) -> bool {
        match player {
            Player::White => self.points[point] >= -1,
            Player::Black => self.points[point] <= 1,
        }
    }
}

impl fmt::Display for Board {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "| ")?;
        for i in 13..=24 {
            write!(f, "{:2} ", self.points[i])?;
        }
        writeln!(f, "| Bar: W={} B={}", self.points[0].max(0), (-self.points[25]).max(0))?;
        write!(f, "| ")?;
        for i in (1..=12).rev() {
            write!(f, "{:2} ", self.points[i])?;
        }
        writeln!(f, "| Off: W={} B={}", self.off_white, self.off_black)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_starting_position() {
        let board = Board::new();
        assert_eq!(board.points[24], 2);
        assert_eq!(board.points[13], 5);
        assert_eq!(board.points[8], 3);
        assert_eq!(board.points[6], 5);
        assert_eq!(board.points[1], -2);
        assert_eq!(board.points[12], -5);
        assert_eq!(board.points[17], -3);
        assert_eq!(board.points[19], -5);
        let white_total: i8 = board.points.iter().filter(|&&x| x > 0).sum();
        assert_eq!(white_total, 15);
        let black_total: i8 = board.points.iter().filter(|&&x| x < 0).map(|&x| -x).sum();
        assert_eq!(black_total, 15);
    }

    #[test]
    fn print_board() {
        println!("{}", Board::new());
    }
}
