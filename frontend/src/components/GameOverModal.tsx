import type { GameOverResult, MatchState } from "../types";

interface Props {
  result: GameOverResult;
  matchState: MatchState;
  isMatchOver: boolean;
  onNextGame: () => void;
  onMainMenu: () => void;
}

export default function GameOverModal({ result, matchState, isMatchOver, onNextGame, onMainMenu }: Props) {
  const winner = result.winner;

  const checkerCircle = (
    <div
      className="w-14 h-14 rounded-full border-4 border-primary"
      style={{
        backgroundColor: winner === "White"
          ? "hsl(var(--checker-light))"
          : "hsl(var(--checker-dark))",
      }}
    />
  );

  if (isMatchOver) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-xl p-10 shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center gap-5">
          {checkerCircle}
          <h2 className="font-display text-3xl text-foreground text-center">
            {winner} wins the match!
          </h2>
          <p className="font-body text-muted-foreground text-lg">
            White {matchState.score_white} — Black {matchState.score_black}
          </p>
          <button
            onClick={onMainMenu}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-display text-lg h-12 rounded-md transition-colors"
          >
            Main Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-10 shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center gap-5">
        {checkerCircle}
        <h2 className="font-display text-3xl text-foreground">{winner} wins</h2>
        <p className="font-body text-primary text-xl font-semibold">
          +{result.points} {result.points === 1 ? "point" : "points"}
        </p>
        <p className="font-body text-muted-foreground text-sm">
          White {matchState.score_white} - Black {matchState.score_black} (First to {matchState.target})
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onNextGame}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/80 font-display text-lg h-12 rounded-md transition-colors"
          >
            Next Game
          </button>
          <button
            onClick={onMainMenu}
            className="flex-1 border border-border text-foreground hover:bg-secondary font-display text-lg h-12 rounded-md transition-colors"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
