"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Ban, Check, Copy, Globe, Mail, Phone, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import type { EnrichedLead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FitBadge, ScoreBadge } from "./score-badge";

type FitFilter = "All" | "High" | "Medium" | "Low";

export function ResultsTable({ leads, onSelect }: { leads: EnrichedLead[]; onSelect: (lead: EnrichedLead) => void }) {
  const [query, setQuery] = useState("");
  const [fit, setFit] = useState<FitFilter>("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((l) => !q || `${l.companyName} ${l.domain} ${l.aiScore?.industry ?? ""}`.toLowerCase().includes(q))
      .filter((l) => fit === "All" || l.aiScore?.fit === fit)
      .filter((l) => !verifiedOnly || l.emails.some((e) => e.hasMX))
      .sort((a, b) => {
        const sa = a.aiScore?.score ?? -1;
        const sb = b.aiScore?.score ?? -1;
        return sortDesc ? sb - sa : sa - sb;
      });
  }, [leads, query, fit, verifiedOnly, sortDesc]);

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, domain or industry"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
          {(["All", "High", "Medium", "Low"] as FitFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFit(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium",
                fit === f ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="accent-violet-600" />
          Has verified email
        </label>
        <button
          type="button"
          onClick={() => setSortDesc((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800"
        >
          <ArrowUpDown className="h-3.5 w-3.5" /> Score {sortDesc ? "high → low" : "low → high"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Fit</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Why this lead</th>
              <th className="px-4 py-3">Outreach opener</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((lead) => {
              if (lead.status === "pending" || lead.status === "processing") {
                return (
                  <tr key={lead.domain}>
                    <td className="px-4 py-4">
                      <p className="font-medium">{lead.domain}</p>
                      <p className="text-xs text-zinc-400">Analyzing…</p>
                    </td>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <td key={i} className="px-4 py-4">
                        <div className="skeleton-shimmer h-4 w-full max-w-32 rounded" />
                      </td>
                    ))}
                  </tr>
                );
              }
              if (lead.status === "failed" || lead.status === "blocked") {
                return (
                  <tr key={lead.domain} className="bg-red-500/[0.03]">
                    <td className="px-4 py-4 font-medium">{lead.domain}</td>
                    <td colSpan={6} className="px-4 py-4 text-sm text-zinc-500">
                      <span className="inline-flex items-center gap-2">
                        {lead.status === "blocked" ? <Ban className="h-4 w-4 text-amber-500" /> : <TriangleAlert className="h-4 w-4 text-red-500" />}
                        {lead.errorMessage ?? "Could not process this website"}
                      </span>
                    </td>
                  </tr>
                );
              }
              const verified = lead.emails.filter((e) => e.hasMX).length;
              return (
                <tr key={lead.domain} onClick={() => onSelect(lead)} className="cursor-pointer transition hover:bg-violet-500/[0.04]">
                  <td className="px-4 py-4">
                    <p className="font-medium">{lead.companyName}</p>
                    <p className="flex items-center gap-1 text-xs text-zinc-500">
                      <Globe className="h-3 w-3" /> {lead.domain}
                      {lead.cachedResult && <span className="ml-1 rounded bg-sky-500/10 px-1.5 text-[10px] text-sky-500">cached</span>}
                    </p>
                  </td>
                  <td className="px-4 py-4">{lead.aiScore && <ScoreBadge score={lead.aiScore.score} />}</td>
                  <td className="px-4 py-4">{lead.aiScore && <FitBadge fit={lead.aiScore.fit} />}</td>
                  <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">{lead.aiScore?.industry ?? "—"}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {lead.emails.length}
                        {verified > 0 && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-500">
                            <ShieldCheck className="h-3 w-3" /> {verified} verified
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {lead.phones.length}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-64 px-4 py-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{lead.aiScore?.reason}</td>
                  <td className="max-w-72 px-4 py-4">
                    {lead.aiScore?.outreach_line && (
                      <div className="flex items-start gap-2">
                        <p className="line-clamp-2 text-xs italic text-zinc-600 dark:text-zinc-300">“{lead.aiScore.outreach_line}”</p>
                        <button
                          type="button"
                          aria-label="Copy outreach line"
                          onClick={(e) => {
                            e.stopPropagation();
                            copy(lead.aiScore!.outreach_line, lead.domain);
                          }}
                          className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                        >
                          {copied === lead.domain ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
