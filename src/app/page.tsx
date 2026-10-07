"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, CircleCheck, Database, Info, RotateCcw, ShieldCheck, TriangleAlert, Zap } from "lucide-react";
import { Header } from "@/components/header";
import { StepIndicator } from "@/components/step-indicator";
import { UrlInput, type UrlInputResult } from "@/components/url-input";
import { ICPForm } from "@/components/icp-form";
import { SummaryCards } from "@/components/summary-cards";
import { ProgressBar } from "@/components/progress-bar";
import { ResultsTable } from "@/components/results-table";
import { LeadDrawer } from "@/components/lead-drawer";
import { ExportButtons } from "@/components/export-buttons";
import type { EnrichedLead, ICPConfig, ProgressUpdate, ResultsSummary } from "@/lib/types";

type Step = 1 | 2 | 3;
type Toast = { kind: "success" | "error"; message: string } | null;

const EMPTY_ICP: ICPConfig = { targetIndustry: "", targetLocation: "", companyType: "B2B", whatISell: "" };

function pendingLead(domain: string): EnrichedLead {
  return { id: domain, domain, companyName: domain, description: "", emails: [], phones: [], socialLinks: {}, status: "pending" };
}

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [inputText, setInputText] = useState("");
  const [input, setInput] = useState<UrlInputResult>({ domains: [], duplicatesRemoved: 0 });
  const [icp, setIcp] = useState<ICPConfig>(EMPTY_ICP);
  const [leads, setLeads] = useState<EnrichedLead[]>([]);
  const [processed, setProcessed] = useState(0);
  const [serverDuplicates, setServerDuplicates] = useState(0);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<EnrichedLead | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((t: NonNullable<Toast>) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const summary: ResultsSummary = useMemo(
    () => ({
      totalLeads: leads.length,
      highFitLeads: leads.filter((l) => l.aiScore?.fit === "High").length,
      verifiedEmails: leads.reduce((n, l) => n + l.emails.filter((e) => e.hasMX).length, 0),
      duplicatesRemoved: input.duplicatesRemoved + serverDuplicates,
    }),
    [leads, input.duplicatesRemoved, serverDuplicates],
  );

  const rulesCount = leads.filter((l) => l.aiScore?.source === "rules").length;

  async function runEnrichment() {
    setStep(3);
    setRunning(true);
    setProcessed(0);
    setServerDuplicates(0);
    setLeads(input.domains.map(pendingLead));

    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains: input.domains, icp }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const update = JSON.parse(line) as ProgressUpdate;
          if (typeof update.duplicatesRemoved === "number") setServerDuplicates(update.duplicatesRemoved);
          if (update.type === "result" && update.lead) {
            const lead = update.lead;
            setLeads((prev) => prev.map((l) => (l.domain === lead.domain ? lead : l)));
            setProcessed(update.processed);
          }
        }
      }
      showToast({ kind: "success", message: "All leads processed" });
    } catch (e) {
      showToast({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong" });
      setLeads((prev) =>
        prev.map((l) => (l.status === "pending" ? { ...l, status: "failed", errorMessage: "Request interrupted" } : l)),
      );
    } finally {
      setRunning(false);
    }
  }

  function startOver() {
    setStep(1);
    setLeads([]);
    setProcessed(0);
    setSelected(null);
  }

  return (
    <div className="gradient-bg min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {step === 1 && (
          <section className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Turn a list of websites into{" "}
              <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">qualified leads</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-500 dark:text-zinc-400">
              LeadLens scrapes public company pages, validates every email, removes duplicates and uses AI to rank each company
              against your ideal customer, so sales reps call the best leads first.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <Pill icon={<Zap className="h-3.5 w-3.5" />} text="AI fit score + outreach opener" />
              <Pill icon={<ShieldCheck className="h-3.5 w-3.5" />} text="MX-verified emails" />
              <Pill icon={<Database className="h-3.5 w-3.5" />} text="24h cache for instant re-runs" />
              <Pill icon={<CircleCheck className="h-3.5 w-3.5" />} text="Respects robots.txt" />
            </div>
          </section>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <StepIndicator step={step} disabled={running} onStepClick={(s) => setStep(s)} />
          {step === 3 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={running}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3.5 py-2 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4" /> Edit ICP &amp; re-run
              </button>
              <ExportButtons leads={leads} onExported={(m) => showToast({ kind: "success", message: m })} />
              <button
                type="button"
                disabled={running}
                onClick={startOver}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3.5 py-2 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="h-4 w-4" /> New search
              </button>
            </div>
          )}
        </div>

        {step === 1 && (
          <UrlInput
            initialText={inputText}
            onNext={(text, r) => {
              setInputText(text);
              setInput(r);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <ICPForm icp={icp} onChange={setIcp} onBack={() => setStep(1)} onRun={runEnrichment} count={input.domains.length} />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <SummaryCards summary={summary} />
            <ProgressBar processed={processed} total={leads.length} running={running} />
            {!running && rulesCount > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  AI scoring was unavailable for {rulesCount} {rulesCount === 1 ? "lead" : "leads"}, so a transparent rule-based score is shown
                  instead. Check the <code>GEMINI_API_KEY</code> configuration and re-run for AI reasons and personalised openers.
                </span>
              </div>
            )}
            <ResultsTable leads={leads} onSelect={setSelected} />
            <p className="text-center text-xs text-zinc-500">
              Only public business pages are scraped (home, about, contact). robots.txt rules are respected and requests are rate-limited.
            </p>
          </div>
        )}
      </main>

      <LeadDrawer lead={selected} onClose={() => setSelected(null)} />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm shadow-xl dark:bg-zinc-900 ${
            toast.kind === "success" ? "toast-success border-zinc-200 dark:border-zinc-800" : "toast-error border-zinc-200 dark:border-zinc-800"
          }`}
        >
          {toast.kind === "success" ? <CircleCheck className="h-4 w-4 text-emerald-500" /> : <TriangleAlert className="h-4 w-4 text-red-500" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 dark:border-zinc-800 dark:bg-zinc-900/60">
      {icon} {text}
    </span>
  );
}
