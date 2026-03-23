import React from "react";
import type { MatchState, Player } from "../types";

interface ScoreBoardProps {
  matchState: MatchState;
  currentPlayer: Player;
}

const PlayerBadge: React.FC<{
  label: string;
  score: number;
  active: boolean;
  side: Player;
}> = ({ label, score, active, side }) => (
  <div className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${active ? "bg-secondary" : ""}`}>
    <div
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{
        backgroundColor: side === "White" ? "hsl(var(--checker-light))" : "hsl(var(--checker-dark))",
        border: `1px solid ${side === "White" ? "hsl(var(--checker-light-stroke))" : "hsl(var(--checker-dark-stroke))"}`,
      }}
    />
    <span className="font-display text-lg text-foreground leading-tight">{label}</span>
    <span className="font-display text-2xl text-primary ml-auto font-bold">{score}</span>
  </div>
);

const ScoreBoard: React.FC<ScoreBoardProps> = ({ matchState, currentPlayer }) => {
  const { score_white, score_black, target } = matchState;

  return (
    <div className="bg-card border border-border rounded-lg p-4 w-full max-w-xs">
      <div className="text-center mb-3">
        <span className="font-body text-xs text-muted-foreground uppercase tracking-widest">
          First to {target}
        </span>
      </div>
      <div className="space-y-1">
        <PlayerBadge label="White" score={score_white} active={currentPlayer === "White"} side="White" />
        <div className="text-center font-body text-xs text-muted-foreground">vs</div>
        <PlayerBadge label="Black" score={score_black} active={currentPlayer === "Black"} side="Black" />
      </div>
    </div>
  );
};

export default ScoreBoard;
