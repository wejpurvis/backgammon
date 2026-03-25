import { useState } from "react";
import type { GameMode } from "../types";

interface Props {
  onStart: (matchLength: number, mode: GameMode) => void;
}

const matchOptions = [1, 3, 5, 7];

export default function SetupScreen({ onStart }: Props) {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [matchLength, setMatchLength] = useState(5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
        <h1 className="font-display text-4xl text-foreground text-center mb-1">Will's Backgammon</h1>
        <p className="font-body text-sm text-muted-foreground text-center mb-8">Set up your match</p>

        {/* Mode selection */}
        <div className="mb-8">
          <label className="font-body text-xs text-muted-foreground uppercase tracking-widest block mb-3">
            Mode
          </label>
          <div className="flex gap-3">
            {([
              { value: "single" as GameMode, label: "Single Player", sub: "vs AI" },
              { value: "two-player" as GameMode, label: "Two Player", sub: "local" },
            ] as const).map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`flex-1 py-4 rounded-md transition-colors border flex flex-col items-center gap-1 ${
                  mode === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                }`}
              >
                <span className="font-display text-base">{label}</span>
                <span className={`font-body text-xs ${mode === value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Match length */}
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
          onClick={() => mode && onStart(matchLength, mode)}
          disabled={mode === null}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed font-display text-lg h-12 rounded-md transition-colors"
        >
          Start Match
        </button>
      </div>
    </div>
  );
}
