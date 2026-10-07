"use client";

import { useEffect } from "react";
import { ExternalLink, Globe, Mail, MapPin, Phone, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";
import type { EnrichedLead } from "@/lib/types";
import { FitBadge, ScoreBadge } from "./score-badge";

export function LeadDrawer({ lead, onClose }: { lead: EnrichedLead | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!lead) return null;
  const socials = Object.entries(lead.socialLinks).filter(([, v]) => Boolean(v)) as [string, string][];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <aside className="relative h-full w-full max-w-lg overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">{lead.companyName}</h3>
            <a href={`https://${lead.domain}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-violet-500 hover:underline">
              <Globe className="h-3.5 w-3.5" /> {lead.domain} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close drawer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {lead.aiScore && (
          <section className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex items-center gap-3">
              <ScoreBadge score={lead.aiScore.score} />
              <FitBadge fit={lead.aiScore.fit} />
              <span className="text-xs text-zinc-500">{lead.aiScore.industry}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-zinc-500">
                <Sparkles className="h-3 w-3" /> {lead.aiScore.source === "rules" ? "Rule-based" : "Gemini AI"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{lead.aiScore.reason}</p>
            <p className="mt-3 rounded-lg bg-white p-3 text-sm italic dark:bg-zinc-900">“{lead.aiScore.outreach_line}”</p>
          </section>
        )}

        <Section title="About">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{lead.description || "No description found."}</p>
          {lead.countryHint && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="h-3 w-3" /> {lead.countryHint}
            </p>
          )}
        </Section>

        <Section title={`Emails (${lead.emails.length})`}>
          {lead.emails.length === 0 && <Empty />}
          <ul className="space-y-2">
            {lead.emails.map((e) => (
              <li key={e.email} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                <span className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" /> {e.email}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">{e.type}</span>
                  {e.hasMX ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-500"><ShieldCheck className="h-3.5 w-3.5" /> MX ok</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-amber-500"><ShieldAlert className="h-3.5 w-3.5" /> no MX</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={`Phones (${lead.phones.length})`}>
          {lead.phones.length === 0 && <Empty />}
          <ul className="space-y-1">
            {lead.phones.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-zinc-400" /> {p}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Links">
          {socials.length === 0 && !lead.contactPageUrl && <Empty />}
          <div className="flex flex-wrap gap-2">
            {socials.map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs capitalize hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
                {name} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
            {lead.contactPageUrl && (
              <a href={lead.contactPageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
                Contact page <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </Section>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-zinc-400">Nothing found on public pages.</p>;
}
