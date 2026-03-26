import { useState, useCallback, useRef } from 'react'
import {
  new_game,
  roll_dice,
  get_legal_moves,
  apply_move,
  is_game_over,
  pip_count,
  offer_double,
  can_offer_double,
  accept_double,
  reject_double,
} from '@engine/backgammon_engine'
import { GameState, MatchState, MoveSequence, GameOverResult, Move, Player, GameMode } from '../types'
import Board, { AnimMove } from '../components/Board'
import Cube from '../components/Cube'
import WinDots from '../components/WinDots'
import GameOverModal from '../components/GameOverModal'

interface Props {
  matchLength: number
  mode: GameMode
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

export default function GameScreen({ matchLength, mode: _mode, onNewGame }: Props) {
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
  const [noLegalMoves, setNoLegalMoves] = useState(false)
  const [gameResult, setGameResult] = useState<GameOverResult | null>(null)

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animKeyRef = useRef(0)

  const pipCount = JSON.parse(pip_count(JSON.stringify(gameState))) as { white: number; black: number }
  const canDouble = gameState.phase === 'Rolling' && can_offer_double(JSON.stringify(gameState))

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
    // Higher die on the left
    const initialOrder: [number, number] = rolled.dice[0] >= rolled.dice[1] ? [0, 1] : [1, 0]

    if (seqs.length === 0) {
      // Keep the rolled state visible (dice with ✕ overlay) until player acknowledges
      setGameState(rolled)
      setDiceOrder(initialOrder)
      setNoLegalMoves(true)
      setTurnStartState(null)
      setOriginalSeqs([])
      setLegalSeqs([])
      setPendingMoves([])
    } else {
      setGameState(rolled)
      setTurnStartState(rolled)
      setOriginalSeqs(seqs)
      setLegalSeqs(seqs)
      setPendingMoves([])
      setDiceOrder(initialOrder)
    }
  }, [gameState])

  // Player acknowledges a no-legal-moves roll by clicking the red ✕
  const handlePass = useCallback(() => {
    if (!noLegalMoves) return
    const advanced: GameState = JSON.parse(apply_move(JSON.stringify(gameState), JSON.stringify({ moves: [] })))
    setGameState(advanced)
    setNoLegalMoves(false)
    setTurnStartState(null)
    setLegalSeqs([])
    setPendingMoves([])
    setDiceOrder([0, 1])
  }, [gameState, noLegalMoves])

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
    if (noLegalMoves) return
    if (pendingMoves.length > 0) return
    if (gameState.dice[0] === gameState.dice[1]) return  // doubles: swap is a no-op
    setDiceOrder(prev => [prev[1], prev[0]] as [number, number])
  }, [noLegalMoves, pendingMoves, gameState.dice])

  const handleDouble = useCallback(() => {
    const newStateJson = offer_double(JSON.stringify(gameState))
    setGameState(JSON.parse(newStateJson))
  }, [gameState])

  const handleAccept = useCallback(() => {
    const newStateJson = accept_double(JSON.stringify(gameState))
    setGameState(JSON.parse(newStateJson))
  }, [gameState])

  const handleReject = useCallback(() => {
    const resultJson = reject_double(JSON.stringify(gameState))
    setGameResult(JSON.parse(resultJson))
  }, [gameState])

  // Click on a checker (or point).
  // Tries left die first; if only the right die is legal, plays that automatically.
  const handlePointClick = useCallback((pointIndex: number) => {
    if (gameState.phase !== 'Moving') return
    if (noLegalMoves) return          // board non-interactive until player clicks ✕
    if (pointIndex === -1) return     // bear-off zone click — player clicks the checker
    if (pendingMoves.length >= maxMoves) return  // awaiting ✓ confirmation

    const player = gameState.current_player
    const step = pendingMoves.length
    const isDoubles = gameState.dice[0] === gameState.dice[1]

    // Index of the die currently assigned to the left position for this step
    const leftDieIdx = isDoubles ? 0 : diceOrder[Math.min(step, 1)]
    const leftDie = gameState.dice[leftDieIdx]
    const leftDest = computeDest(pointIndex, leftDie, player)
    const leftMatch = legalSeqs.find(
      s => s.moves[step]?.from === pointIndex && s.moves[step]?.to === leftDest
    )

    let destToPlay = leftDest
    let activeOrder = diceOrder

    if (leftMatch) {
      // Left die is legal — play it
    } else if (!isDoubles) {
      // Try the right die
      const rightDieIdx = leftDieIdx === 0 ? 1 : 0
      const rightDie = gameState.dice[rightDieIdx]
      const rightDest = computeDest(pointIndex, rightDie, player)
      const rightMatch = legalSeqs.find(
        s => s.moves[step]?.from === pointIndex && s.moves[step]?.to === rightDest
      )
      if (!rightMatch) return  // neither die works — silent no-op

      // Swap order so the right die becomes left, keeping subsequent steps correct
      destToPlay = rightDest
      activeOrder = [diceOrder[1], diceOrder[0]] as [number, number]
      setDiceOrder(activeOrder)
    } else {
      return  // doubles and left die illegal — no-op
    }

    const move: Move = { from: pointIndex, to: destToPlay, player }
    const newPending = [...pendingMoves, move]
    const newFiltered = originalSeqs.filter(s => matchesPrefix(s.moves, newPending))
    const displayState = applyPartialMove(gameState, move)

    setPendingMoves(newPending)
    setGameState(displayState)
    setLegalSeqs(newFiltered)
    triggerMoveEffects(pointIndex, destToPlay, player)
  }, [gameState, noLegalMoves, legalSeqs, pendingMoves, diceOrder, originalSeqs, maxMoves, triggerMoveEffects])

  return (
    <div className="flex flex-col items-center gap-2 p-6 w-full max-w-5xl">

      {/* Top info line — Black; cube die at spine when value == 1 */}
      <div className="relative flex items-center justify-between w-full max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-muted-foreground">Wins:</span>
          <WinDots score={matchState.score_black} target={matchState.target} filled="●" empty="○" />
        </div>
        {gameState.cube_value === 1 && (
          <div className="absolute left-[47.61%] -translate-x-1/2 flex items-center justify-center"
            style={{
              width: 24, height: 24, borderRadius: 3,
              backgroundColor: 'hsl(var(--board-frame))',
              border: '1px solid hsl(var(--board-frame-highlight))',
              color: 'white', fontSize: 11, fontWeight: 'bold', fontFamily: 'Inter, sans-serif',
            }}
          >
            {gameState.cube_value}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-muted-foreground">Pips:</span>
          <span className="font-body text-sm text-foreground font-medium">
            {pipCount.black}
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
        cubeValue={gameState.cube_value}
        cubeOwner={gameState.cube_owner}
        noLegalMoves={noLegalMoves}
        flashDest={flashDest}
        animMove={animMove}
        onPointClick={handlePointClick}
        onRoll={handleRoll}
        onSwap={handleDieSwap}
        onConfirm={handleConfirm}
        onUndo={gameState.phase === 'Moving' && !noLegalMoves ? handleUndo : undefined}
        onPass={handlePass}
      />

      {/* Bottom info line — White; Double button absolutely positioned at the spine */}
      <div className="relative flex items-center justify-between w-full max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-muted-foreground">Wins:</span>
          <WinDots score={matchState.score_white} target={matchState.target} filled="●" empty="○" />
        </div>
        {canDouble && (
          <button
            onClick={handleDouble}
            className="absolute left-[47.61%] -translate-x-1/2 text-xs font-body border border-primary/30 text-foreground hover:bg-primary/10 px-2 py-0.5 rounded transition-colors"
          >
            Double
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-muted-foreground">Pips:</span>
          <span className="font-body text-sm text-foreground font-medium">
            {pipCount.white}
          </span>
        </div>
      </div>

      {/* Cube modal — fixed-positioned, no layout impact */}
      <Cube
        cubeValue={gameState.cube_value}
        cubeOwner={gameState.cube_owner}
        offerPending={gameState.phase === 'CubeOffered'}
        onAccept={handleAccept}
        onReject={handleReject}
      />

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
