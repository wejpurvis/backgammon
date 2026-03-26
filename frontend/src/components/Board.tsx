import React, { useEffect, useRef, useState } from "react";
import type { Board as BoardType, Player, Phase, CubeOwner } from "../types";
import Checker from "./Checker";
import Dice from "./Dice";

// ── Flying checker animation ───────────────────────────────────────────────

export interface AnimMove {
  from: number
  to: number
  player: Player
  key: number
}

interface FlyingCheckerProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  player: Player
  radius: number
}

const DURATION = 350

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

const FlyingChecker: React.FC<FlyingCheckerProps> = ({ fromX, fromY, toX, toY, player, radius }) => {
  const [pos, setPos] = useState({ x: fromX, y: fromY })
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const animate = (time: number) => {
      if (!startRef.current) startRef.current = time
      const t = Math.min((time - startRef.current) / DURATION, 1)
      const e = easeInOut(t)
      setPos({ x: fromX + (toX - fromX) * e, y: fromY + (toY - fromY) * e })
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [fromX, fromY, toX, toY])

  return (
    <g transform={`translate(${pos.x} ${pos.y})`} pointerEvents="none">
      <Checker player={player} x={0} y={0} radius={radius} />
    </g>
  )
}

// ── Layout constants (from Lovable) ───────────────────────────────────────────
const FRAME = 16;
const BAR_W = 30;
const TRAY_W = 32;
const POINT_W = 48;
const POINT_H = 180;
const CHECKER_R = 14;
const CHECKER_SPACING = 26;

const PLAY_W = 12 * POINT_W + BAR_W;
const BOARD_W = FRAME * 2 + PLAY_W + TRAY_W;
const BOARD_H = 440;

const HALF_LEFT_CX = FRAME + 3 * POINT_W;
const HALF_RIGHT_CX = FRAME + 9 * POINT_W + BAR_W;

interface BoardProps {
  board: BoardType;
  currentPlayer: Player;
  phase: Phase;
  dice: [number, number];
  diceOrder: [number, number];
  movesUsed: number;
  maxMoves: number;
  cubeValue: number;
  cubeOwner: CubeOwner;
  /** Source point to flash with a brief green glow (1–24), or null */
  flashDest?: number | null;
  /** Checker currently in-flight — renders a smooth animated copy */
  animMove?: AnimMove | null;
  noLegalMoves?: boolean;
  onPointClick?: (point: number) => void;
  onRoll?: () => void;
  onSwap?: () => void;
  onConfirm?: () => void;
  onUndo?: () => void;
  onPass?: () => void;
}

const Board: React.FC<BoardProps> = ({
  board,
  currentPlayer,
  phase,
  dice,
  diceOrder,
  movesUsed,
  maxMoves,
  cubeValue,
  cubeOwner,
  noLegalMoves,
  flashDest,
  animMove,
  onPointClick,
  onRoll,
  onSwap,
  onConfirm,
  onUndo,
  onPass,
}) => {
  const getPointX = (pt: number): number => {
    let col: number;
    if (pt >= 13 && pt <= 18) col = pt - 13;
    else if (pt >= 19 && pt <= 24) col = pt - 19 + 6;
    else if (pt >= 7 && pt <= 12) col = 12 - pt;
    else col = 6 - pt + 6; // pt 1–6 → cols 11–6

    const halfIndex = col < 6 ? col : col - 6;
    const isRight = col >= 6;
    const baseX = FRAME + (isRight ? 6 * POINT_W + BAR_W : 0);
    return baseX + halfIndex * POINT_W + POINT_W / 2;
  };

  const isTopPoint = (pt: number) => pt >= 13;

  const renderTriangle = (pt: number) => {
    const x = getPointX(pt);
    const top = isTopPoint(pt);
    const isDark = pt % 2 === 0;
    const tipY = top ? FRAME + POINT_H : BOARD_H - FRAME - POINT_H;
    const baseY = top ? FRAME : BOARD_H - FRAME;
    const pts = `${x - POINT_W / 2},${baseY} ${x + POINT_W / 2},${baseY} ${x},${tipY}`;

    return (
      <g key={`tri-${pt}`}>
        <polygon
          points={pts}
          fill={isDark ? "hsl(var(--triangle-dark))" : "hsl(var(--triangle-light))"}
          stroke="hsl(var(--board-frame) / 0.3)"
          strokeWidth={0.5}
          onClick={() => onPointClick?.(pt)}
          style={{ cursor: onPointClick ? "pointer" : "default" }}
        />
        {/* Transient green flash on move destination — fades out after ~400ms */}
        {flashDest === pt && (
          <polygon
            key={`flash-${pt}`}
            points={pts}
            fill="rgba(74,222,128,0.35)"
            pointerEvents="none"
            style={{ animation: "flash-green-fade 400ms ease-out forwards" }}
          />
        )}
        {/* Point number */}
        <text
          x={x} y={top ? FRAME - 4 : BOARD_H - FRAME + 12}
          textAnchor="middle" fontSize="8" fontFamily="Inter, sans-serif"
          fill="hsl(var(--muted-foreground))"
        >
          {pt}
        </text>
      </g>
    );
  };

  const renderCheckers = (pt: number) => {
    const val = board.points[pt];
    if (val === 0) return null;
    const player: Player = val > 0 ? "White" : "Black";
    const count = Math.abs(val);
    const x = getPointX(pt);
    const top = isTopPoint(pt);
    const maxVisible = Math.min(count, 5);

    return (
      <g key={`chk-${pt}`}>
        {Array.from({ length: maxVisible }).map((_, i) => {
          const y = top
            ? FRAME + CHECKER_R + 4 + i * CHECKER_SPACING
            : BOARD_H - FRAME - CHECKER_R - 4 - i * CHECKER_SPACING;
          return (
            <Checker
              key={i}
              player={player}
              x={x}
              y={y}
              radius={CHECKER_R}
              onClick={() => onPointClick?.(pt)}
            />
          );
        })}
        {count > 5 && (
          <text
            x={x}
            y={top
              ? FRAME + CHECKER_R + 4 + (maxVisible - 1) * CHECKER_SPACING + 1
              : BOARD_H - FRAME - CHECKER_R - 4 - (maxVisible - 1) * CHECKER_SPACING + 1}
            textAnchor="middle" dominantBaseline="central"
            fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif"
            fill={player === "White" ? "hsl(var(--checker-dark))" : "hsl(var(--checker-light))"}
            pointerEvents="none"
          >
            {count}
          </text>
        )}
      </g>
    );
  };

  const barX = FRAME + 6 * POINT_W + BAR_W / 2;

  const renderBarCheckers = () => {
    const wCount = Math.max(0, board.points[0]);
    const bCount = Math.max(0, -board.points[25]);
    const elements: React.ReactNode[] = [];

    // Undo button occupies BOARD_H/2 ±12 (208–232). Stack checkers outward from that gap:
    // White: first center at BOARD_H/2 - 30 (bottom edge 203, 5px above undo top 208)
    // Black: first center at BOARD_H/2 + 30 (top edge 237, 5px below undo bottom 232)
    for (let i = 0; i < Math.min(wCount, 4); i++) {
      elements.push(
        <Checker key={`bw-${i}`} player="White" x={barX}
          y={BOARD_H / 2 - 30 - i * CHECKER_SPACING}
          radius={CHECKER_R - 1}
          onClick={() => onPointClick?.(0)}
        />
      );
    }
    for (let i = 0; i < Math.min(bCount, 4); i++) {
      elements.push(
        <Checker key={`bb-${i}`} player="Black" x={barX}
          y={BOARD_H / 2 + 30 + i * CHECKER_SPACING}
          radius={CHECKER_R - 1}
          onClick={() => onPointClick?.(25)}
        />
      );
    }

    return elements;
  };

  const trayX = FRAME + PLAY_W + TRAY_W / 2;

  const renderBearOff = () => {
    const bearOffDest = currentPlayer === "White" ? 0 : 25;
    const isLegal = phase === "Moving" && (bearOffDest === 0
      ? board.off_white < 15
      : board.off_black < 15);
    const elements: React.ReactNode[] = [];

    elements.push(
      <rect key="bo-hit"
        x={FRAME + PLAY_W} y={FRAME} width={TRAY_W} height={BOARD_H - 2 * FRAME}
        fill="transparent"
        onClick={isLegal ? () => onPointClick?.(-1) : undefined}
        style={{ cursor: isLegal ? "pointer" : "default" }}
      />
    );

    for (let i = 0; i < Math.min(board.off_white, 15); i++) {
      elements.push(
        <rect key={`ow-${i}`} x={trayX - 10} y={BOARD_H - FRAME - 6 - i * 12}
          width={20} height={10} rx={2}
          fill="hsl(var(--checker-light))" stroke="hsl(var(--checker-light-stroke))" strokeWidth={0.5} />
      );
    }
    for (let i = 0; i < Math.min(board.off_black, 15); i++) {
      elements.push(
        <rect key={`ob-${i}`} x={trayX - 10} y={FRAME + 4 + i * 12}
          width={20} height={10} rx={2}
          fill="hsl(var(--checker-dark))" stroke="hsl(var(--checker-dark-stroke))" strokeWidth={0.5} />
      );
    }

    return elements;
  };

  const renderCubeDie = () => {
    const x = barX;
    const cubeY =
      cubeOwner === "Centre" ? BOARD_H / 2
      : cubeOwner === "Black" ? BOARD_H / 2 - 70
      : BOARD_H / 2 + 70;
    const size = 24;
    return (
      <g key="cube-die">
        <rect
          x={x - size / 2} y={cubeY - size / 2}
          width={size} height={size}
          rx={3}
          fill="hsl(var(--board-frame))"
          stroke="hsl(var(--board-frame-highlight))"
          strokeWidth={1}
        />
        <text
          x={x} y={cubeY}
          textAnchor="middle" dominantBaseline="central"
          fontSize="11" fontWeight="bold" fontFamily="Inter, sans-serif"
          fill="white"
        >
          {cubeValue}
        </text>
      </g>
    );
  };

  const showForWhite = currentPlayer === "White";
  const showForBlack = currentPlayer === "Black";

  return (
    <svg
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      className="w-full max-w-4xl"
      style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.5))" }}
    >
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Board frame */}
      <rect x={0} y={0} width={BOARD_W} height={BOARD_H} rx={6} fill="hsl(var(--board-frame))" />
      {/* Felt surface */}
      <rect x={FRAME} y={FRAME} width={PLAY_W} height={BOARD_H - 2 * FRAME} fill="hsl(var(--board-felt))" />
      {/* Center bar */}
      <rect x={FRAME + 6 * POINT_W} y={FRAME} width={BAR_W} height={BOARD_H - 2 * FRAME}
        fill="hsl(var(--bar-color))" />
      {/* Bear-off tray */}
      <rect x={FRAME + PLAY_W} y={FRAME} width={TRAY_W} height={BOARD_H - 2 * FRAME}
        fill="hsl(var(--board-frame-highlight))" />
      <line
        x1={FRAME + PLAY_W} y1={BOARD_H / 2} x2={FRAME + PLAY_W + TRAY_W} y2={BOARD_H / 2}
        stroke="hsl(var(--board-frame) / 0.6)" strokeWidth={1}
      />

      {Array.from({ length: 24 }, (_, i) => renderTriangle(i + 1))}
      {Array.from({ length: 24 }, (_, i) => renderCheckers(i + 1))}
      {renderBarCheckers()}
      {renderBearOff()}
      {cubeValue > 1 && renderCubeDie()}

      {/* Black dice — left half */}
      <foreignObject x={HALF_LEFT_CX - 50} y={BOARD_H / 2 - 25} width={100} height={50}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          {showForBlack && (
            <Dice
              dice={dice}
              phase={phase}
              currentPlayer="Black"
              diceOrder={diceOrder}
              movesUsed={movesUsed}
              maxMoves={maxMoves}
              noLegalMoves={noLegalMoves}
              onRoll={onRoll}
              onSwap={onSwap}
              onConfirm={onConfirm}
              onPass={onPass}
            />
          )}
        </div>
      </foreignObject>

      {/* White dice — right half */}
      <foreignObject x={HALF_RIGHT_CX - 50} y={BOARD_H / 2 - 25} width={100} height={50}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          {showForWhite && (
            <Dice
              dice={dice}
              phase={phase}
              currentPlayer="White"
              diceOrder={diceOrder}
              movesUsed={movesUsed}
              maxMoves={maxMoves}
              noLegalMoves={noLegalMoves}
              onRoll={onRoll}
              onSwap={onSwap}
              onConfirm={onConfirm}
              onPass={onPass}
            />
          )}
        </div>
      </foreignObject>

      {/* Flying checker — animates from source to destination on each move */}
      {animMove && (() => {
        const { from, to, player } = animMove

        const pointSVGX = (pt: number) => {
          let col: number
          if (pt >= 13 && pt <= 18) col = pt - 13
          else if (pt >= 19 && pt <= 24) col = pt - 19 + 6
          else if (pt >= 7 && pt <= 12) col = 12 - pt
          else col = 6 - pt + 6
          const halfIndex = col < 6 ? col : col - 6
          const isRight = col >= 6
          return FRAME + (isRight ? 6 * POINT_W + BAR_W : 0) + halfIndex * POINT_W + POINT_W / 2
        }

        const pointSVGY = (pt: number, stackIdx: number) => {
          const top = pt >= 13
          return top
            ? FRAME + CHECKER_R + 4 + stackIdx * CHECKER_SPACING
            : BOARD_H - FRAME - CHECKER_R - 4 - stackIdx * CHECKER_SPACING
        }

        // Source coords — after applyPartialMove the count at `from` is already reduced,
        // so Math.abs(board.points[from]) gives the 0-based index of the moved checker.
        let fromX: number, fromY: number
        if (from >= 1 && from <= 24) {
          fromX = pointSVGX(from)
          fromY = pointSVGY(from, Math.abs(board.points[from]))
        } else if (from === 0) {
          fromX = barX
          fromY = BOARD_H / 2 - 20 - board.points[0] * CHECKER_SPACING
        } else {
          fromX = barX
          fromY = BOARD_H / 2 + 20 + Math.abs(board.points[25]) * CHECKER_SPACING
        }

        // Destination coords — the new top checker is at Math.abs(board.points[to]) - 1.
        let toX: number, toY: number
        if (to >= 1 && to <= 24) {
          toX = pointSVGX(to)
          toY = pointSVGY(to, Math.abs(board.points[to]) - 1)
        } else if (to === 0) {
          toX = trayX
          toY = BOARD_H - FRAME - 6 - (board.off_white - 1) * 12
        } else {
          toX = trayX
          toY = FRAME + 4 + (board.off_black - 1) * 12
        }

        return (
          <FlyingChecker
            key={animMove.key}
            fromX={fromX} fromY={fromY}
            toX={toX} toY={toY}
            player={player}
            radius={CHECKER_R}
          />
        )
      })()}

      {/* Undo button — vertically centred on the spine (BOARD_H/2) */}
      {onUndo && (
        <foreignObject x={FRAME + 6 * POINT_W} y={BOARD_H / 2 - 12} width={BAR_W} height={24}>
          <button
            onClick={onUndo}
            title="Undo turn"
            style={{
              width: "100%", height: "100%", background: "none", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "hsl(210 10% 50%)", fontSize: "12px", fontFamily: "Inter, sans-serif",
            }}
          >
            ↩
          </button>
        </foreignObject>
      )}
    </svg>
  );
};

export default Board;
