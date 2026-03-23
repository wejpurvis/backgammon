// WASM exports via wasm-bindgen

pub mod board;
pub mod moves;
pub mod game;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Player {
    White,
    Black,
}
