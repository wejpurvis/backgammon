import { useState } from "react";

interface Props {
  onStart: (matchLength: number) => void;
}

const matchOptions = [1, 3, 5, 7];

export default function SetupScreen({ onStart }: Props) {
  const [matchLength, setMatchLength] = useState(5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
        <h1 className="font-display text-4xl text-foreground text-center mb-1">Backgammon</h1>
        <p className="font-body text-sm text-muted-foreground text-center mb-8">Set up your match</p>

        <div className="mb-8">
          <label className="font-body text-xs text-muted-foreground uppercase tracking-widest block mb-3">
            Match Length
          </label>
          <div className="flex gap-2">
            {matchOptions.map((len) => (
              <button
                key={len}
                onClick={() => setMatchLength(len)}
                className={`flex-1 py-3 rounded-md font-display text-xl transition-colors border ${
                  matchLength === len
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                }`}
              >
                {len}
              </button>
            ))}
          </div>
          <p className="font-body text-xs text-muted-foreground mt-1 text-center">
            {matchLength === 1 ? "Single game" : `First to ${matchLength} points`}
          </p>
        </div>

        <button
          onClick={() => onStart(matchLength)}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-display text-lg h-12 rounded-md transition-colors"
        >
          Start Match
        </button>
      </div>
    </div>
  );
}
