import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Checker from '../components/Checker'
import { Die } from '../components/Dice'
import Dice from '../components/Dice'
import ScoreBoard from '../components/ScoreBoard'
import GameOverModal from '../components/GameOverModal'
import type { MatchState, GameOverResult } from '../types'

// ── Checker ───────────────────────────────────────────────────────────────────

describe('Checker', () => {
  it('renders for White player', () => {
    const { container } = render(<svg><Checker player="White" x={50} y={50} /></svg>)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBeGreaterThan(0)
  })

  it('renders for Black player', () => {
    const { container } = render(<svg><Checker player="Black" x={50} y={50} /></svg>)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBeGreaterThan(0)
  })

  it('adds a selection ring when selected=true', () => {
    const { container: sel } = render(<svg><Checker player="White" x={50} y={50} selected={true} /></svg>)
    const { container: unsel } = render(<svg><Checker player="White" x={50} y={50} selected={false} /></svg>)
    const selCircles = sel.querySelectorAll('circle').length
    const unselCircles = unsel.querySelectorAll('circle').length
    expect(selCircles).toBe(unselCircles + 1)
  })
})

// ── Die ───────────────────────────────────────────────────────────────────────

describe('Die', () => {
  it.each([1, 2, 3, 4, 5, 6])('renders value %i without error', (value) => {
    const { container } = render(<Die value={value} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders dark die', () => {
    const { container } = render(<Die value={3} dark={true} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

// ── Dice ──────────────────────────────────────────────────────────────────────

describe('Dice', () => {
  it('shows Roll button when phase is Rolling', () => {
    render(<Dice dice={[0, 0]} phase="Rolling" currentPlayer="White" onRoll={() => {}} />)
    expect(screen.getByText('Roll')).toBeInTheDocument()
  })

  it('shows die faces when phase is Moving', () => {
    const { container } = render(
      <Dice dice={[3, 5]} phase="Moving" currentPlayer="White" />
    )
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(2)
  })

  it('renders nothing when phase is Moving and dice are zero', () => {
    const { container } = render(
      <Dice dice={[0, 0]} phase="Moving" currentPlayer="White" />
    )
    expect(container.firstChild).toBeNull()
  })
})

// ── ScoreBoard ────────────────────────────────────────────────────────────────

describe('ScoreBoard', () => {
  const matchState: MatchState = {
    score_white: 2,
    score_black: 1,
    target: 5,
    games_played: 3,
    crawford_done: false,
    is_crawford_game: false,
  }

  it('shows match target', () => {
    render(<ScoreBoard matchState={matchState} currentPlayer="White" />)
    expect(screen.getByText(/First to 5/i)).toBeInTheDocument()
  })

  it('shows player scores', () => {
    render(<ScoreBoard matchState={matchState} currentPlayer="White" />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('highlights the active player', () => {
    const { container } = render(<ScoreBoard matchState={matchState} currentPlayer="Black" />)
    // The active player row has bg-secondary class
    const activeBadge = container.querySelector('.bg-secondary')
    expect(activeBadge).not.toBeNull()
    expect(activeBadge?.textContent).toContain('Black')
  })
})

// ── GameOverModal ─────────────────────────────────────────────────────────────

describe('GameOverModal', () => {
  const makeResult = (winner: 'White' | 'Black', win_type: string, points: number): GameOverResult =>
    ({ winner, win_type: win_type as GameOverResult['win_type'], points, cube_value: 1 })

  const matchState: MatchState = {
    score_white: 1,
    score_black: 0,
    target: 5,
    games_played: 1,
    crawford_done: false,
    is_crawford_game: false,
  }

  const defaultProps = {
    matchState,
    isMatchOver: false,
    onNextGame: () => {},
    onMainMenu: () => {},
  }

  it('shows the winner name', () => {
    render(<GameOverModal result={makeResult('White', 'Normal', 1)} {...defaultProps} />)
    expect(screen.getByText(/White wins/i)).toBeInTheDocument()
  })

  it('shows point count', () => {
    render(<GameOverModal result={makeResult('White', 'Normal', 2)} {...defaultProps} />)
    expect(screen.getByText(/2 points/i)).toBeInTheDocument()
  })

  it('renders Next Game button when match is not over', () => {
    render(<GameOverModal result={makeResult('Black', 'Normal', 1)} {...defaultProps} />)
    expect(screen.getByText('Next Game')).toBeInTheDocument()
  })

  it('renders Main Menu button', () => {
    render(<GameOverModal result={makeResult('Black', 'Normal', 1)} {...defaultProps} />)
    expect(screen.getByText('Main Menu')).toBeInTheDocument()
  })

  it('shows match over state with only Main Menu', () => {
    render(<GameOverModal result={makeResult('White', 'Normal', 5)} {...defaultProps} isMatchOver={true} />)
    expect(screen.getByText(/wins the match/i)).toBeInTheDocument()
    expect(screen.queryByText('Next Game')).toBeNull()
    expect(screen.getByText('Main Menu')).toBeInTheDocument()
  })
})
