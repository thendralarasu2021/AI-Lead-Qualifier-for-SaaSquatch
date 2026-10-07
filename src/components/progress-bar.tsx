import { LoaderCircle, CircleCheck } from "lucide-react";

export function ProgressBar({ processed, total, running }: { processed: number; total: number; running: boolean }) {
  const pct = total ? Math.round((processed / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          {running ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-violet-500" />
          ) : (
            <CircleCheck className="h-4 w-4 text-emerald-500" />
          )}
          {running ? "Scraping, validating and scoring…" : "Enrichment complete"}
        </span>
        <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
          {processed}/{total} leads processed
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
