import React from "react";
import type { CubeOwner } from "../types";

interface CubeProps {
  cubeValue: number;
  cubeOwner: CubeOwner;
  offerPending: boolean;
  showDoubleButton: boolean;
  onDouble?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

const Cube: React.FC<CubeProps> = ({
  cubeValue,
  offerPending,
  showDoubleButton,
  onDouble,
  onAccept,
  onReject,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center shadow-lg border border-primary/20"
        style={{ backgroundColor: "hsl(var(--cube-face))" }}
      >
        <span className="font-display text-xl font-bold" style={{ color: "hsl(var(--cube-foreground))" }}>
          {cubeValue}
        </span>
      </div>

      {showDoubleButton && (
        <button
          onClick={onDouble}
          className="text-xs font-body border border-primary/30 text-foreground hover:bg-primary/10 px-2 py-1 rounded transition-colors"
        >
          Double
        </button>
      )}

      {offerPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="font-display text-2xl text-foreground mb-2 text-center">Double Offered</h3>
            <p className="text-muted-foreground font-body text-sm text-center mb-6">
              Your opponent offers to double the stakes to{" "}
              <span className="text-primary font-semibold">{cubeValue * 2}</span>.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onAccept}
                className="bg-primary text-primary-foreground hover:bg-primary/80 font-body px-4 py-2 rounded text-sm transition-colors"
              >
                Accept
              </button>
              <button
                onClick={onReject}
                className="border border-destructive/50 text-destructive hover:bg-destructive/10 font-body px-4 py-2 rounded text-sm transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cube;
