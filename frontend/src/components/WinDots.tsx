interface WinDotsProps {
  score: number
  target: number
  /** Character shown for a won point (e.g. "●" for Black, "○" for White) */
  filled: string
  /** Character shown for a remaining point */
  empty: string
}

export default function WinDots({ score, target, filled, empty }: WinDotsProps) {
  return (
    <span className="font-body text-sm tracking-wider">
      {Array.from({ length: target }, (_, i) => (
        <span key={i} style={{ color: i < score ? undefined : "hsl(var(--muted-foreground))" }}>
          {i < score ? filled : empty}
        </span>
      ))}
    </span>
  )
}
