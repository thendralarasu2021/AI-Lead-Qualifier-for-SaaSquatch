import { cn, getFitColor, getScoreBgColor } from "@/lib/utils";

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn("inline-flex min-w-11 justify-center rounded-md border px-2 py-0.5 text-sm font-semibold tabular-nums", getScoreBgColor(score))}>
      {score}
    </span>
  );
}

export function FitBadge({ fit }: { fit: string }) {
  return <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", getFitColor(fit))}>{fit}</span>;
}
