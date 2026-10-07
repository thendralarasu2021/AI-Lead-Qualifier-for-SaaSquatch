import { CircleCheck, Mail, Target, Users } from "lucide-react";
import type { ResultsSummary } from "@/lib/types";

export function SummaryCards({ summary }: { summary: ResultsSummary }) {
  const cards = [
    { label: "Total leads", value: summary.totalLeads, icon: Users, color: "text-violet-500 bg-violet-500/10" },
    { label: "High-fit leads", value: summary.highFitLeads, icon: Target, color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Verified emails", value: summary.verifiedEmails, icon: Mail, color: "text-sky-500 bg-sky-500/10" },
    { label: "Duplicates removed", value: summary.duplicatesRemoved, icon: CircleCheck, color: "text-amber-500 bg-amber-500/10" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
