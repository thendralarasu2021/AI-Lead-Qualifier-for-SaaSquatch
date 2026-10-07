"use client";

import { ArrowLeft, Sparkles, Target } from "lucide-react";
import type { ICPConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const INDUSTRIES = ["SaaS", "Fintech", "Healthcare", "E-commerce", "Marketing Agency", "IT Services", "Manufacturing", "Real Estate", "Education"];

export function ICPForm({
  icp,
  onChange,
  onBack,
  onRun,
  count,
}: {
  icp: ICPConfig;
  onChange: (icp: ICPConfig) => void;
  onBack: () => void;
  onRun: () => void;
  count: number;
}) {
  const set = <K extends keyof ICPConfig>(key: K, value: ICPConfig[K]) => onChange({ ...icp, [key]: value });
  const ready = icp.targetIndustry.trim().length > 0 && icp.whatISell.trim().length > 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-violet-500" /> Who is your ideal customer?
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            LeadLens scores every company against this profile, so your team calls the best-fit leads first.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({
              targetIndustry: "SaaS",
              targetLocation: "United States",
              companyType: "B2B",
              whatISell: "An AI-powered lead generation and sales prospecting platform that helps SMB sales teams find and qualify leads faster.",
            })
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-500/20 dark:text-violet-300"
        >
          <Sparkles className="h-4 w-4" /> Use SaaSquatch example
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Target industry">
          <input
            list="industries"
            value={icp.targetIndustry}
            onChange={(e) => set("targetIndustry", e.target.value)}
            placeholder="e.g. SaaS"
            className={inputCls}
          />
          <datalist id="industries">
            {INDUSTRIES.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </Field>

        <Field label="Target location">
          <input
            value={icp.targetLocation}
            onChange={(e) => set("targetLocation", e.target.value)}
            placeholder="e.g. United States, India, Global"
            className={inputCls}
          />
        </Field>

        <Field label="Company type">
          <div className="grid grid-cols-3 gap-2">
            {(["B2B", "B2C", "Both"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("companyType", t)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                  icp.companyType === t
                    ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-300"
                    : "border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="What do you sell?" className="md:col-span-2">
          <textarea
            value={icp.whatISell}
            onChange={(e) => set("whatISell", e.target.value)}
            rows={3}
            placeholder="One or two lines about your product. The AI uses this to judge fit and write the outreach opener."
            className={cn(inputCls, "resize-y")}
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={onRun}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" /> Qualify {count} {count === 1 ? "lead" : "leads"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
