import React from "react";
import type { Phase, Player } from "../types";

const pipPositions: Record<number, [number, number][]> = {
  1: [[25, 25]],
  2: [[14, 14], [36, 36]],
  3: [[14, 14], [25, 25], [36, 36]],
  4: [[14, 14], [36, 14], [14, 36], [36, 36]],
  5: [[14, 14], [36, 14], [25, 25], [14, 36], [36, 36]],
  6: [[14, 14], [36, 14], [14, 25], [36, 25], [14, 36], [36, 36]],
};

export const Die: React.FC<{
  value: number;
  dark?: boolean;
  used?: boolean;
  onClick?: () => void;
}> = ({ value, dark = false, used = false, onClick }) => {
  const gradId = dark ? "die-grad-dark" : "die-grad-light";
  const filterId = dark ? "die-shadow-dark" : "die-shadow-light";

  return (
    <svg
      width="44" height="44" viewBox="0 0 50 50"
      style={{ opacity: used ? 0.35 : 1, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <defs>
        <radialGradient id={gradId} cx="30%" cy="30%" r="70%">
          {dark ? (
            <>
              <stop offset="0%" stopColor="#2A2A2A" />
              <stop offset="100%" stopColor="#0D0D0D" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E0DC" />
            </>
          )}
        </radialGradient>
        <filter id={filterId} x="-10%" y="-5%" width="120%" height="130%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.4)" />
        </filter>
      </defs>
      <rect
        x="2" y="2" width="46" height="46" rx="8"
        fill={`url(#${gradId})`}
        filter={`url(#${filterId})`}
        stroke={dark ? "#333" : "#C8C4BC"}
        strokeWidth="0.5"
      />
      {pipPositions[value]?.map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py + 0.5} r="4" fill={dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
          <circle cx={px} cy={py} r="3.5" fill={dark ? "#E8E8E8" : "#1A1A1A"} />
        </g>
      ))}
    </svg>
  );
};

interface DiceProps {
  dice: [number, number];
  phase: Phase;
  currentPlayer: Player;
  /** Which die index (0 or 1) is in each position: [leftIndex, rightIndex] */
  diceOrder?: [number, number];
  /** How many moves have been committed this turn */
  movesUsed?: number;
  /** Total moves needed to complete this turn (2 normally, 4 for doubles) */
  maxMoves?: number;
  /** True when the roll produced no legal moves — shows red ✕ on each die */
  noLegalMoves?: boolean;
  onRoll?: () => void;
  onSwap?: () => void;
  onConfirm?: () => void;
  /** Called when player clicks ✕ to acknowledge a no-legal-moves roll */
  onPass?: () => void;
}

const Dice: React.FC<DiceProps> = ({
  dice,
  phase,
  currentPlayer,
  diceOrder,
  movesUsed = 0,
  maxMoves = 0,
  noLegalMoves = false,
  onRoll,
  onSwap,
  onConfirm,
  onPass,
}) => {
  const dark = currentPlayer === "Black";
  const order: [number, number] = diceOrder ?? [0, 1];
  const isDoubles = dice[0] === dice[1];

  if (phase === "Rolling") {
    return (
      <button
        onClick={onRoll}
        className="font-body text-xs tracking-wide px-3 py-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors border border-primary/30"
      >
        Roll
      </button>
    );
  }

  if (phase === "Moving" && (dice[0] > 0 || dice[1] > 0)) {
    // Die i is "used" if its position in order has been passed
    const isDieUsed = (i: number) => {
      if (noLegalMoves) return false;
      const pos = order[0] === i ? 0 : 1;
      return pos < movesUsed;
    };

    // Pixel left offset for each die: left die at 0, right die at 56 (44 + 12)
    const leftOf = (i: number) => (order[0] === i ? 0 : 56);
    const zOf = (i: number) => (order[0] === i ? 2 : 1);

    // Swap disabled when no legal moves exist or before first move for doubles
    const canSwap = !noLegalMoves && movesUsed === 0 && !isDoubles && !!onSwap;
    const allUsed = !noLegalMoves && maxMoves > 0 && movesUsed >= maxMoves;

    return (
      <div style={{ position: "relative", width: 100, height: 44, userSelect: "none" }}>
        {/* Die for dice[0] */}
        <div style={{
          position: "absolute",
          top: 0,
          left: leftOf(0),
          transition: "left 280ms ease-in-out",
          zIndex: zOf(0),
        }}>
          <Die
            value={dice[0]}
            dark={dark}
            used={isDieUsed(0)}
            onClick={canSwap ? onSwap : undefined}
          />
        </div>

        {/* Die for dice[1] */}
        <div style={{
          position: "absolute",
          top: 0,
          left: leftOf(1),
          transition: "left 280ms ease-in-out",
          zIndex: zOf(1),
        }}>
          <Die
            value={dice[1]}
            dark={dark}
            used={isDieUsed(1)}
            onClick={canSwap ? onSwap : undefined}
          />
        </div>

        {/* Red ✕ centred over both dice — shown when roll produced no legal moves */}
        {noLegalMoves && (
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", zIndex: 4,
            }}
            onClick={onPass}
          >
            <span style={{
              fontSize: 22, fontWeight: 700, lineHeight: 1,
              fontFamily: "Inter, sans-serif",
              color: "#EF4444",
              textShadow: "0 0 10px rgba(239,68,68,0.6)",
            }}>✕</span>
          </div>
        )}

        {/* Confirmation tick — appears when all moves are done */}
        {allUsed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 3,
            }}
            onClick={onConfirm}
          >
            <span style={{
              fontSize: 22,
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              color: "hsl(var(--primary))",
              textShadow: "0 0 10px hsl(var(--primary) / 0.6)",
              lineHeight: 1,
            }}>
              ✓
            </span>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default Dice;
