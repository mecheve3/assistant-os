interface MomentumBarProps {
  score: number;
  compact?: boolean;
}

export function MomentumBar({ score, compact = false }: MomentumBarProps) {
  const color =
    score >= 8 ? "bg-teal" : score >= 5 ? "bg-warn" : "bg-danger";

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-px">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`rounded-sm transition-colors ${
              compact ? "w-2 h-1.5" : "w-3 h-2"
            } ${i < score ? color : "bg-raised"}`}
          />
        ))}
      </div>
      {!compact && (
        <span className="font-mono text-xs text-bright">
          {score}
          <span className="text-muted">/10</span>
        </span>
      )}
    </div>
  );
}
