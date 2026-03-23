import React from "react";
import type { Player } from "../types";

interface CheckerProps {
  player: Player;
  x: number;
  y: number;
  radius?: number;
  selected?: boolean;
  onClick?: () => void;
}

const Checker: React.FC<CheckerProps> = ({
  player,
  x,
  y,
  radius = 15,
  selected = false,
  onClick,
}) => {
  const isLight = player === "White";

  return (
    <g onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      {/* Selection ring */}
      {selected && (
        <circle
          cx={x}
          cy={y}
          r={radius + 4}
          fill="none"
          stroke="hsl(var(--checker-selected))"
          strokeWidth={2.5}
          opacity={0.8}
        />
      )}
      {/* Shadow */}
      <circle cx={x} cy={y + 1.5} r={radius} fill="hsl(0 0% 0% / 0.25)" />
      {/* Main body */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={isLight ? "hsl(var(--checker-light))" : "hsl(var(--checker-dark))"}
        stroke={isLight ? "hsl(var(--checker-light-stroke))" : "hsl(var(--checker-dark-stroke))"}
        strokeWidth={1}
      />
      {/* Inner ring for depth */}
      <circle
        cx={x}
        cy={y}
        r={radius * 0.7}
        fill="none"
        stroke={isLight ? "hsl(40 30% 75% / 0.4)" : "hsl(0 0% 20% / 0.4)"}
        strokeWidth={0.8}
      />
    </g>
  );
};

export default Checker;
