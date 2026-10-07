"use client";

import Papa from "papaparse";
import { Download, FileSpreadsheet } from "lucide-react";
import type { EnrichedLead } from "@/lib/types";

function bestEmail(lead: EnrichedLead): string {
  const valid = lead.emails.filter((e) => e.hasMX);
  return (valid.find((e) => e.type === "personal") ?? valid[0] ?? lead.emails[0])?.email ?? "";
}

function download(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({ leads, onExported }: { leads: EnrichedLead[]; onExported: (msg: string) => void }) {
  const done = leads.filter((l) => l.status === "completed");
  const stamp = new Date().toISOString().slice(0, 10);

  function exportCSV() {
    const rows = done.map((l) => ({
      Company: l.companyName,
      Domain: l.domain,
      Score: l.aiScore?.score ?? "",
      Fit: l.aiScore?.fit ?? "",
      Industry: l.aiScore?.industry ?? "",
      "Best Email": bestEmail(l),
      "All Emails": l.emails.map((e) => `${e.email}${e.hasMX ? "" : " (unverified)"}`).join("; "),
      Phones: l.phones.join("; "),
      LinkedIn: l.socialLinks.linkedin ?? "",
      Twitter: l.socialLinks.twitter ?? "",
      "Contact Page": l.contactPageUrl ?? "",
      Country: l.countryHint ?? "",
      Reason: l.aiScore?.reason ?? "",
      "Outreach Line": l.aiScore?.outreach_line ?? "",
    }));
    download(Papa.unparse(rows), `leadlens-leads-${stamp}.csv`);
    onExported(`Exported ${rows.length} leads to CSV`);
  }

  function exportHubSpot() {
    const rows = done.map((l) => ({
      "Company name": l.companyName,
      "Website URL": `https://${l.domain}`,
      Email: bestEmail(l),
      "Phone Number": l.phones[0] ?? "",
      Industry: l.aiScore?.industry ?? "",
      "Lead Score": l.aiScore?.score ?? "",
      Notes: [l.aiScore?.reason, l.aiScore?.outreach_line && `Opener: ${l.aiScore.outreach_line}`].filter(Boolean).join(" | "),
    }));
    download(Papa.unparse(rows), `leadlens-hubspot-import-${stamp}.csv`);
    onExported(`Exported ${rows.length} leads in HubSpot import format`);
  }

  const disabled = done.length === 0;
  const btn =
    "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} onClick={exportCSV} className={`${btn} border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800`}>
        <Download className="h-4 w-4" /> Export CSV
      </button>
      <button type="button" disabled={disabled} onClick={exportHubSpot} className={`${btn} bg-orange-500 text-white hover:bg-orange-400`}>
        <FileSpreadsheet className="h-4 w-4" /> Export for HubSpot
      </button>
    </div>
  );
}
