import type { GameOverResult } from "../types";

const WIN_TYPE_LABEL: Record<string, string> = {
  Normal: "Win",
  Gammon: "Gammon",
  Backgammon: "Backgammon",
};

interface Props {
  result: GameOverResult;
  onNewGame: () => void;
}

export default function GameOverModal({ result, onNewGame }: Props) {
  const label = WIN_TYPE_LABEL[result.win_type] ?? result.win_type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-10 shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center gap-5">
        <div
          className="w-14 h-14 rounded-full border-4 border-primary"
          style={{
            backgroundColor: result.winner === "White"
              ? "hsl(var(--checker-light))"
              : "hsl(var(--checker-dark))",
          }}
        />
        <h2 className="font-display text-3xl text-foreground">{result.winner} Wins</h2>
        <p className="font-body text-muted-foreground text-lg">
          {result.cube_value > 1
            ? `${label} × ${result.cube_value} = ${result.points} points`
            : `${label} — ${result.points} ${result.points === 1 ? "point" : "points"}`}
        </p>
        <button
          onClick={onNewGame}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-display text-lg h-12 rounded-md transition-colors"
        >
          New Game
        </button>
      </div>
    </div>
  );
}
