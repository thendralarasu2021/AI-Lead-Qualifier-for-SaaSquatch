import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Add companies", "Define your ICP", "Qualified leads"];

export function StepIndicator({
  step,
  onStepClick,
  disabled,
}: {
  step: 1 | 2 | 3;
  onStepClick?: (step: 1 | 2 | 3) => void;
  disabled?: boolean;
}) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              disabled={!done || disabled || !onStepClick}
              onClick={() => onStepClick?.(n as 1 | 2 | 3)}
              className={cn("flex items-center gap-2 rounded-lg", done && !disabled && onStepClick && "cursor-pointer hover:opacity-80")}
              title={done ? `Go back to: ${label}` : undefined}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  done && "bg-emerald-500 text-white",
                  active && "bg-violet-600 text-white shadow-lg shadow-violet-600/30",
                  !done && !active && "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </span>
              <span className={cn("hidden text-sm sm:inline", active ? "font-medium" : "text-zinc-500 dark:text-zinc-400")}>
                {label}
              </span>
            </button>
            {n < STEPS.length && <span className="h-px w-6 bg-zinc-300 sm:w-12 dark:bg-zinc-700" />}
          </li>
        );
      })}
    </ol>
  );
}
