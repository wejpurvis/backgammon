import { useState, useCallback, useRef } from 'react'
import {
  new_game,
  roll_dice,
  get_legal_moves,
  apply_move,
  is_game_over,
} from '@engine/backgammon_engine'
import { GameState, MatchState, MoveSequence, GameOverResult, Move, Player } from '../types'
import Board, { AnimMove } from '../components/Board'
import Cube from '../components/Cube'
import WinDots from '../components/WinDots'
import GameOverModal from '../components/GameOverModal'

interface Props {
  matchLength: number
  onNewGame: () => void
}

function matchesPrefix(seqMoves: Move[], prefix: Move[]): boolean {
  if (seqMoves.length < prefix.length) return false
  return prefix.every((m, i) => seqMoves[i].from === m.from && seqMoves[i].to === m.to)
}

// Apply one move via WASM, then restore turn context so the board reflects
// the partial move while the turn stays with the current player.
function applyPartialMove(state: GameState, move: Move): GameState {
  const partial: MoveSequence = { moves: [move] }
  const advanced: GameState = JSON.parse(apply_move(JSON.stringify(state), JSON.stringify(partial)))
  return { ...advanced, current_player: state.current_player, dice: state.dice, phase: state.phase }
}

// Given a source point and die value, compute the expected destination.
// Returns the engine sentinel (0 = White bear-off, 25 = Black bear-off) for
// over-roll cases.
function computeDest(from: number, die: number, player: Player): number {
  if (player === 'White') {
    if (from === 0) return 25 - die          // White bar entry
    const d = from - die
    return d <= 0 ? 0 : d                    // bear-off sentinel or normal
  } else {
    if (from === 25) return die              // Black bar entry
    const d = from + die
    return d >= 25 ? 25 : d                  // bear-off sentinel or normal
  }
}

export default function GameScreen({ matchLength, onNewGame }: Props) {
  // Lazy initialisers: new_game() is called exactly once per mount.
  const [gameState, setGameState] = useState<GameState>(() => {
    const r = JSON.parse(new_game(matchLength)) as { game: GameState; match_state: MatchState }
    return r.game
  })
  const [matchState] = useState<MatchState>(() => {
    const r = JSON.parse(new_game(matchLength)) as { game: GameState; match_state: MatchState }
    return r.match_state
  })
  const [turnStartState, setTurnStartState] = useState<GameState | null>(null)
  const [originalSeqs, setOriginalSeqs] = useState<MoveSequence[]>([])
  const [legalSeqs, setLegalSeqs] = useState<MoveSequence[]>([])
  const [pendingMoves, setPendingMoves] = useState<Move[]>([])
  // diceOrder: which die index (0 or 1) is in the left/right position
  const [diceOrder, setDiceOrder] = useState<[number, number]>([0, 1])
  const [flashDest, setFlashDest] = useState<number | null>(null)
  const [animMove, setAnimMove] = useState<AnimMove | null>(null)
  const [noMovesMsg, setNoMovesMsg] = useState<string | null>(null)
  const [gameResult, setGameResult] = useState<GameOverResult | null>(null)

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animKeyRef = useRef(0)

  // TODO: wire to WASM engine — pip_count not yet exposed
  const pipCount = { white: 167, black: 167 }

  // Number of moves the current roll requires (1 or 2, or up to 4 for doubles).
  const maxMoves = originalSeqs.length > 0 ? originalSeqs[0].moves.length : 0

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Flash the source triangle and launch the flying-checker animation together.
  const triggerMoveEffects = useCallback((from: number, to: number, player: Player) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    // Flash source triangle (1–24 only; bar has no triangle)
    if (from >= 1 && from <= 24) setFlashDest(from)
    // Animated checker for all point-to-point moves
    animKeyRef.current++
    setAnimMove({ from, to, player, key: animKeyRef.current })
    flashTimerRef.current = setTimeout(() => {
      setFlashDest(null)
      setAnimMove(null)
    }, 380)
  }, [])

  // ── Turn lifecycle ─────────────────────────────────────────────────────────

  const completeTurn = useCallback((seq: MoveSequence, fromState: GameState) => {
    const newStateJson = apply_move(JSON.stringify(fromState), JSON.stringify(seq))
    const newState: GameState = JSON.parse(newStateJson)
    const result: GameOverResult | null = JSON.parse(is_game_over(newStateJson))
    setGameState(newState)
    setTurnStartState(null)
    setOriginalSeqs([])
    setLegalSeqs([])
    setPendingMoves([])
    setDiceOrder([0, 1])
    setFlashDest(null)
    setAnimMove(null)
    if (result) setGameResult(result)
  }, [])

  const handleRoll = useCallback(() => {
    if (gameState.phase !== 'Rolling') return
    const rolled: GameState = JSON.parse(roll_dice(JSON.stringify(gameState)))
    const seqs: MoveSequence[] = JSON.parse(get_legal_moves(JSON.stringify(rolled)))

    if (seqs.length === 0) {
      const advanced: GameState = JSON.parse(apply_move(JSON.stringify(rolled), JSON.stringify({ moves: [] })))
      setGameState(advanced)
      setTurnStartState(null)
      setLegalSeqs([])
      setPendingMoves([])
      setDiceOrder([0, 1])
      setNoMovesMsg(`No legal moves for ${rolled.current_player}`)
      setTimeout(() => setNoMovesMsg(null), 2500)
    } else {
      setGameState(rolled)
      setTurnStartState(rolled)
      setOriginalSeqs(seqs)
      setLegalSeqs(seqs)
      setPendingMoves([])
      setDiceOrder([0, 1])
    }
  }, [gameState])

  // Confirm the completed turn — called when the player clicks ✓
  const handleConfirm = useCallback(() => {
    if (pendingMoves.length < maxMoves || !turnStartState) return
    const seqToApply =
      originalSeqs.find(s => matchesPrefix(s.moves, pendingMoves)) ??
      { moves: pendingMoves }
    completeTurn(seqToApply, turnStartState)
  }, [pendingMoves, maxMoves, originalSeqs, turnStartState, completeTurn])

  // Undo the entire turn — restores the board to the state at roll time
  const handleUndo = useCallback(() => {
    if (!turnStartState) return
    setGameState(turnStartState)
    setPendingMoves([])
    setLegalSeqs(originalSeqs)
    setDiceOrder([0, 1])
    setFlashDest(null)
    setAnimMove(null)
  }, [turnStartState, originalSeqs])

  // Swap which die is "left" — only allowed before the first move of a turn
  const handleDieSwap = useCallback(() => {
    if (pendingMoves.length > 0) return
    if (gameState.dice[0] === gameState.dice[1]) return  // doubles: swap is a no-op
    setDiceOrder(prev => [prev[1], prev[0]] as [number, number])
  }, [pendingMoves, gameState.dice])

  // Click on a checker (or point): immediately move by the left die value.
  // Silent no-op if the move is illegal.
  const handlePointClick = useCallback((pointIndex: number) => {
    if (gameState.phase !== 'Moving') return
    if (pointIndex === -1) return  // bear-off zone click — ignored; player clicks the checker
    if (pendingMoves.length >= maxMoves) return  // awaiting ✓ confirmation

    const player = gameState.current_player
    const step = pendingMoves.length

    // The active die at this step
    const isDoubles = gameState.dice[0] === gameState.dice[1]
    const leftDie = isDoubles
      ? gameState.dice[0]
      : gameState.dice[diceOrder[step < 2 ? step : 1]]

    const expectedTo = computeDest(pointIndex, leftDie, player)

    // Check if any current legal sequence has this exact move at this step
    const match = legalSeqs.find(
      s => s.moves[step]?.from === pointIndex && s.moves[step]?.to === expectedTo
    )
    if (!match) return  // illegal with the left die — silent fail

    const move: Move = { from: pointIndex, to: expectedTo, player }
    const newPending = [...pendingMoves, move]
    const newFiltered = originalSeqs.filter(s => matchesPrefix(s.moves, newPending))
    const displayState = applyPartialMove(gameState, move)

    setPendingMoves(newPending)
    setGameState(displayState)
    setLegalSeqs(newFiltered)

    // Flash source triangle + animate checker movement
    triggerMoveEffects(pointIndex, expectedTo, player)
  }, [gameState, legalSeqs, pendingMoves, diceOrder, originalSeqs, maxMoves, triggerMoveEffects])

  return (
    <div className="flex flex-col items-center gap-2 p-6 w-full max-w-5xl">

      {noMovesMsg && (
        <div className="bg-card border border-border text-foreground/80 font-body text-sm px-5 py-2 rounded-md">
          {noMovesMsg}
        </div>
      )}

      {/* Top info line — Black */}
      <div className="flex items-center justify-between w-full max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-muted-foreground">Wins:</span>
          <WinDots score={matchState.score_black} target={matchState.target} filled="●" empty="○" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-muted-foreground">Pips:</span>
          <span className="font-body text-sm text-foreground font-medium">
            {pipCount.black /* TODO: wire to WASM engine */}
          </span>
        </div>
      </div>

      <Board
        board={gameState.board}
        currentPlayer={gameState.current_player}
        phase={gameState.phase}
        dice={gameState.dice}
        diceOrder={diceOrder}
        movesUsed={pendingMoves.length}
        maxMoves={maxMoves}
        flashDest={flashDest}
        animMove={animMove}
        onPointClick={handlePointClick}
        onRoll={handleRoll}
        onSwap={handleDieSwap}
        onConfirm={handleConfirm}
        onUndo={gameState.phase === 'Moving' ? handleUndo : undefined}
      />

      {/* Bottom info line — White */}
      <div className="flex items-center justify-between w-full max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-muted-foreground">Wins:</span>
          <WinDots score={matchState.score_white} target={matchState.target} filled="●" empty="○" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-muted-foreground">Pips:</span>
          <span className="font-body text-sm text-foreground font-medium">
            {pipCount.white /* TODO: wire to WASM engine */}
          </span>
        </div>
      </div>

      {/* Cube — centred below board */}
      <div className="flex justify-center">
        <Cube
          cubeValue={gameState.cube_value}
          cubeOwner={gameState.cube_owner}
          offerPending={gameState.phase === 'CubeOffered'}
          showDoubleButton={false /* TODO: wire to WASM engine */}
          onDouble={() => { /* TODO: wire to WASM engine */ }}
          onAccept={() => { /* TODO: wire to WASM engine */ }}
          onReject={() => { /* TODO: wire to WASM engine */ }}
        />
      </div>

      {gameResult && (
        <GameOverModal
          result={gameResult}
          onNewGame={() => {
            setGameResult(null)
            onNewGame()
          }}
        />
      )}
    </div>
  )
}
