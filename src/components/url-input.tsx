"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { ArrowRight, FileSpreadsheet, Sparkles, Upload } from "lucide-react";
import { deduplicateDomains, normalizeUrl } from "@/lib/utils";

const MAX_DOMAINS = 25;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

const SAMPLE = [
  "hubspot.com",
  "freshworks.com",
  "zoho.com",
  "pipedrive.com",
  "notion.so",
  "canva.com",
  "chargebee.com",
  "https://www.hubspot.com/",
  "close.com",
  "apollo.io",
].join("\n");

export interface UrlInputResult {
  domains: string[];
  duplicatesRemoved: number;
}

export function UrlInput({ initialText, onNext }: { initialText: string; onNext: (text: string, r: UrlInputResult) => void }) {
  const [text, setText] = useState(initialText);
  const [csvNote, setCsvNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    const lines = text.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
    const normalized = lines.map(normalizeUrl);
    const valid = normalized.filter((d) => DOMAIN_RE.test(d));
    const invalid = lines.length - valid.length;
    const { unique, duplicatesRemoved } = deduplicateDomains(valid);
    return { unique, duplicatesRemoved, invalid };
  }, [text]);

  const tooMany = parsed.unique.length > MAX_DOMAINS;

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const fields = (res.meta.fields ?? []).map((f) => f.toLowerCase().trim());
        const original = res.meta.fields ?? [];
        const idx = fields.findIndex((f) => ["domain", "website", "url", "website url", "company website"].includes(f));
        const key = original[idx >= 0 ? idx : 0];
        const values = res.data.map((row) => (row[key] ?? "").trim()).filter(Boolean);
        setText((prev) => [prev.trim(), ...values].filter(Boolean).join("\n"));
        setCsvNote(`Imported ${values.length} rows from "${key}" column of ${file.name}`);
      },
      error: () => setCsvNote("Could not read that CSV file."),
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Which companies should we qualify?</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Paste websites (one per line) or upload a CSV. Max {MAX_DOMAINS}.</p>
          </div>
          <button
            type="button"
            onClick={() => setText(SAMPLE)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-500/20 dark:text-violet-300"
          >
            <Sparkles className="h-4 w-4" /> Try sample list
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={11}
          spellCheck={false}
          placeholder={"stripe.com\nhttps://www.notion.so\nfreshworks.com"}
          className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-950"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <Upload className="h-4 w-4" /> Upload CSV
            </button>
            {csvNote && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <FileSpreadsheet className="h-3.5 w-3.5" /> {csvNote}
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={parsed.unique.length === 0 || tooMany}
            onClick={() => onNext(text, { domains: parsed.unique, duplicatesRemoved: parsed.duplicatesRemoved })}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next: Define ICP <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <aside className="space-y-3">
        <Stat label="Unique companies" value={parsed.unique.length} tone={tooMany ? "bad" : "good"} />
        <Stat label="Duplicates removed" value={parsed.duplicatesRemoved} />
        <Stat label="Invalid entries skipped" value={parsed.invalid} tone={parsed.invalid ? "warn" : undefined} />
        {tooMany && <p className="text-sm text-red-500">Please keep it to {MAX_DOMAINS} companies per run.</p>}
        <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-xs leading-relaxed text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          URLs are normalized automatically: <code>https://www.Acme.com/about</code> becomes <code>acme.com</code>, and duplicates are merged before any scraping happens.
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" | "bad" }) {
  const color =
    tone === "bad" ? "text-red-500" : tone === "warn" ? "text-amber-500" : tone === "good" ? "text-emerald-500" : "";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
